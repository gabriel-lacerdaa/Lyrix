"""Operações sobre músicas compartilhadas pelas rotas e pelo worker."""

from sqlalchemy.orm import Session

from api.models import Job, LyricLine, Song, SongStatus, SyncMethod, SyncSource
from api.services.lrc import VALIDATION_CODES, parse_lrc, validate_lines


def apply_lrc(
    db: Session,
    song: Song,
    lrc_text: str,
    *,
    source: SyncSource,
    synced_on_video_id: str | None,
    extra_warnings: list[dict] | None = None,
) -> None:
    """Salva o LRC na música, recria as linhas (lyric_lines) e recalcula os avisos."""
    lines = parse_lrc(lrc_text)
    song.lrc_raw = lrc_text
    song.sync_source = source
    song.synced_on_video_id = synced_on_video_id
    # Apaga as linhas antigas antes de inserir as novas, por causa da restrição única (song_id, line_index).
    song.lines.clear()
    db.flush()
    song.lines.extend(LyricLine(line_index=i, start_ms=line.start_ms, text=line.text) for i, line in enumerate(lines))
    song.sync_warnings = [*(extra_warnings or []), *validate_lines(lines, song.video_duration_ms, song.offset_ms)]


def refresh_warnings(song: Song) -> None:
    """Recalcula só os avisos de validação (ex.: depois de mudar o offset), mantendo os demais."""
    kept = [w for w in (song.sync_warnings or []) if w.get("code") not in VALIDATION_CODES]
    lines = parse_lrc(song.lrc_raw or "")
    song.sync_warnings = [*kept, *validate_lines(lines, song.video_duration_ms, song.offset_ms)] if lines else kept


def enqueue_job(db: Session, song: Song, method: SyncMethod) -> Job:
    job = Job(song=song, method=method)
    song.status = SongStatus.PROCESSING
    db.add(job)
    return job
