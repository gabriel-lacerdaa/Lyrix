"""Processamento de uma tarefa: buscar a letra e gerar o LRC. Executado pelo worker, nunca dentro de uma requisição."""

import shutil

from sqlalchemy.orm import Session

from api.config import get_settings
from api.models import Job, JobStatus, Song, SongStatus, SyncMethod, SyncSource, VideoKind
from api.models.base import utcnow
from api.services import alignment, lrclib
from api.services.lrc import (
    build_lrc,
    clean_lyrics_text,
    estimate_offset,
    has_offset_tag,
    lyrics_from_lrc,
    parse_lrc,
    warning,
)
from api.services.lrclib import LrclibTrack
from api.services.songs import apply_lrc


class PipelineError(Exception):
    pass


def process_job(db: Session, job: Job) -> None:
    song = job.song
    try:
        _process(db, job, song)
    except Exception as exc:  # qualquer falha fica visível na curadoria em vez de derrubar o worker
        db.rollback()
        job.status = JobStatus.FAILED
        job.error = str(exc) or exc.__class__.__name__
        job.finished_at = utcnow()
        song.status = SongStatus.FAILED
        _log(db, job, f"Falhou: {job.error}", step="failed")


def _log(db: Session, job: Job, message: str, step: str | None = None) -> None:
    job.log = f"{job.log or ''}[{utcnow():%H:%M:%S}] {message}\n"
    if step:
        job.step = step
    db.commit()


def _finish(db: Session, job: Job, message: str, step: str) -> None:
    job.status = JobStatus.DONE
    job.finished_at = utcnow()
    _log(db, job, message, step=step)


def _process(db: Session, job: Job, song: Song) -> None:
    settings = get_settings()
    track: LrclibTrack | None = None

    if job.method is not SyncMethod.ALIGN or not song.lyrics_plain:
        _log(db, job, f"Buscando a letra na LRCLIB: {song.artist} – {song.title}", step="fetching_lyrics")
        track = lrclib.search_track(song.artist, song.title, song.video_duration_ms)
        if track is None:
            _log(db, job, "A LRCLIB não tem esta música.")
        else:
            kind = "com LRC" if track.synced_lyrics else "só texto"
            _log(db, job, f"LRCLIB: {track.artist_name} – {track.track_name} ({track.duration_ms / 1000:.0f} s, {kind}).")
            if track.synced_lyrics:
                song.lrc_candidates = {**(song.lrc_candidates or {}), "lrclib": track.synced_lyrics}
            if not song.lyrics_plain:
                song.lyrics_plain = track.plain_lyrics or lyrics_from_lrc(track.synced_lyrics or "")

    if not song.lyrics_plain:
        song.status = SongStatus.WAITING_LYRICS
        _finish(db, job, "Letra não encontrada. Envie a letra pela curadoria para gerar o LRC.", step="waiting_lyrics")
        return

    synced = track.synced_lyrics if track else None
    duration_ok = track is not None and abs(track.duration_ms - song.video_duration_ms) <= settings.duration_tolerance_ms

    if job.method is SyncMethod.LRCLIB or (job.method is SyncMethod.AUTO and synced and duration_ok):
        _apply_lrclib(db, job, song, synced, duration_ok)
    else:
        _apply_alignment(db, job, song)

    song.status = SongStatus.READY_FOR_REVIEW
    _finish(db, job, f"LRC gerado com {len(song.lines)} linhas. Revise antes de publicar.", step="ready_for_review")


def _apply_lrclib(db: Session, job: Job, song: Song, lrc: str | None, duration_ok: bool) -> None:
    if not lrc:
        raise PipelineError("A LRCLIB não tem LRC sincronizado para esta música. Use o método 'align'.")
    warnings = []
    if not duration_ok:
        warnings.append(
            warning("duration_mismatch", "A duração da música na LRCLIB é diferente da do vídeo. Confira o offset.")
        )
    if song.video_kind is VideoKind.CLIP:
        warnings.append(
            warning("clip_offset", "Vídeo do tipo clipe: o LRC da LRCLIB segue a versão do álbum. Confira o offset.")
        )
    if has_offset_tag(lrc):
        warnings.append(warning("offset_tag_ignored", "A tag [offset:] do LRC foi ignorada. Use o campo offset_ms."))

    song.offset_ms = 0
    apply_lrc(db, song, lrc, source=SyncSource.LRCLIB, synced_on_video_id=None, extra_warnings=warnings)
    _log(db, job, "LRC da LRCLIB aplicado.", step="validating")


def _apply_alignment(db: Session, job: Job, song: Song) -> None:
    settings = get_settings()
    texts = clean_lyrics_text(song.lyrics_plain or "")
    if not texts:
        raise PipelineError("A letra ficou vazia depois da limpeza.")

    work_dir = settings.temp_dir / job.id
    try:
        _log(db, job, "Baixando o áudio do vídeo (yt-dlp)...", step="downloading_audio")
        audio = alignment.download_audio(song.youtube_video_id, work_dir)
        _log(db, job, "Separando a voz (Demucs)...", step="separating_vocals")
        vocals = alignment.separate_vocals(audio, work_dir / "demucs", settings.demucs_model)
        _log(db, job, "Alinhando a letra com a voz (stable-ts)...", step="aligning")
        lines = alignment.align_lyrics(vocals, texts, settings.whisper_model)
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)

    lrc = build_lrc(lines, title=song.title, artist=song.artist, length_ms=song.video_duration_ms)
    candidates = {**(song.lrc_candidates or {}), "aligned": lrc}
    warnings = []
    if candidates.get("lrclib"):
        offset, outliers = estimate_offset(parse_lrc(candidates["lrclib"]), lines)
        if offset is not None:
            candidates["lrclib_estimated_offset_ms"] = offset
            warnings.append(
                warning(
                    "lrclib_offset_estimate",
                    f"Para usar o LRC da LRCLIB neste vídeo, o offset_ms seria {offset}. "
                    f"{outliers} linhas discordam mais de 1 s do alinhamento.",
                )
            )
    song.lrc_candidates = candidates
    song.offset_ms = 0
    apply_lrc(
        db, song, lrc, source=SyncSource.STABLE_TS, synced_on_video_id=song.youtube_video_id, extra_warnings=warnings
    )
    _log(db, job, "Alinhamento concluído.", step="validating")
