"""Rotas da curadoria: importar vídeo, gerar o LRC (em segundo plano), revisar e publicar."""

import re
import secrets
import unicodedata

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.config import get_settings
from api.database import get_db
from api.models import Song, SongStatus, SyncMethod, SyncSource
from api.models.base import utcnow
from api.schemas.admin import (
    AdminSongOut,
    AdminSongSummary,
    ImportPreview,
    ImportRequest,
    LyricsSubmit,
    ReprocessRequest,
    SimilarSong,
    SongCreate,
    SongUpdate,
)
from api.services import youtube
from api.services.lrc import parse_lrc
from api.services.metadata import guess_song_info
from api.services.songs import apply_lrc, enqueue_job, refresh_warnings


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    token = get_settings().admin_token
    if token and not secrets.compare_digest(x_admin_token or "", token):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token de administrador inválido.")


router = APIRouter(prefix="/admin/songs", tags=["curadoria"], dependencies=[Depends(require_admin)])


def _get_song(db: Session, song_id: str) -> Song:
    song = db.get(Song, song_id)
    if song is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Música não encontrada.")
    return song


def _ensure_idle(song: Song) -> None:
    if song.has_active_job:
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta música ainda está sendo processada.")


def _load_playable_video(db: Session, video_id: str) -> youtube.VideoInfo:
    """Valida duplicidade e se o vídeo pode tocar no app. Lança HTTPException com o motivo."""
    existing = db.scalar(select(Song).where(Song.youtube_video_id == video_id))
    if existing is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, {"message": "Este vídeo já está no acervo.", "song_id": existing.id}
        )
    if not get_settings().youtube_api_key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "YOUTUBE_API_KEY não configurada no .env.")
    try:
        video = youtube.fetch_video(video_id)
    except youtube.YouTubeError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc
    if video is None:
        raise HTTPException(422, "Vídeo não encontrado no YouTube.")
    problems = youtube.playback_problems(video)
    if problems:
        raise HTTPException(
            422,
            {"message": "Este vídeo não pode ser usado no app.", "problems": problems},
        )
    return video


@router.post("/import", response_model=ImportPreview)
def preview_import(body: ImportRequest, db: Session = Depends(get_db)) -> ImportPreview:
    """Passo 1: valida o link e devolve os dados sugeridos. Não salva nada."""
    video_id = youtube.extract_video_id(body.url)
    if video_id is None:
        raise HTTPException(422, "Link do YouTube inválido.")
    video = _load_playable_video(db, video_id)
    kind, artist, title = guess_song_info(video)
    similar = db.scalars(
        select(Song).where(func.lower(Song.artist) == artist.lower(), func.lower(Song.title) == title.lower())
    )
    return ImportPreview(
        youtube_video_id=video.video_id,
        video_title=video.title,
        channel_title=video.channel_title,
        video_duration_ms=video.duration_ms,
        thumbnail_url=video.thumbnail_url,
        video_kind=kind,
        suggested_artist=artist,
        suggested_title=title,
        similar_songs=[SimilarSong.model_validate(song) for song in similar],
    )


@router.post("", response_model=AdminSongOut, status_code=status.HTTP_201_CREATED)
def create_song(body: SongCreate, db: Session = Depends(get_db)) -> Song:
    """Passo 2: salva a música como rascunho e coloca na fila a geração do LRC."""
    video = _load_playable_video(db, body.youtube_video_id)
    guessed_kind, _, _ = guess_song_info(video)
    song = Song(
        youtube_video_id=video.video_id,
        artist=body.artist.strip(),
        title=body.title.strip(),
        video_title=video.title,
        channel_title=video.channel_title,
        video_kind=body.video_kind or guessed_kind,
        video_duration_ms=video.duration_ms,
        thumbnail_url=video.thumbnail_url,
    )
    db.add(song)
    enqueue_job(db, song, SyncMethod.AUTO)
    db.commit()
    return song


@router.get("", response_model=list[AdminSongSummary])
def list_admin_songs(
    song_status: SongStatus | None = Query(default=None, alias="status"), db: Session = Depends(get_db)
) -> list[Song]:
    stmt = select(Song).order_by(Song.updated_at.desc())
    if song_status is not None:
        stmt = stmt.where(Song.status == song_status)
    return list(db.scalars(stmt))


@router.get("/{song_id}", response_model=AdminSongOut)
def get_admin_song(song_id: str, db: Session = Depends(get_db)) -> Song:
    return _get_song(db, song_id)


@router.patch("/{song_id}", response_model=AdminSongOut)
def update_song(song_id: str, body: SongUpdate, db: Session = Depends(get_db)) -> Song:
    """Salva as edições da revisão (texto, LRC, offset...). Um LRC enviado aqui passa a ser 'manual'."""
    song = _get_song(db, song_id)
    _ensure_idle(song)
    changes = body.model_dump(exclude_unset=True)
    lrc_raw = changes.pop("lrc_raw", None)
    for field, value in changes.items():
        setattr(song, field, value)

    if lrc_raw is not None:
        if not parse_lrc(lrc_raw):
            raise HTTPException(422, "O LRC enviado não tem nenhuma linha com tempo.")
        # Editado na tela de revisão, sobre o próprio vídeo.
        apply_lrc(db, song, lrc_raw, source=SyncSource.MANUAL, synced_on_video_id=song.youtube_video_id)
        if song.status in (SongStatus.DRAFT, SongStatus.FAILED, SongStatus.WAITING_LYRICS):
            song.status = SongStatus.READY_FOR_REVIEW
    elif "offset_ms" in changes:
        refresh_warnings(song)
    db.commit()
    return song


@router.post("/{song_id}/lyrics", response_model=AdminSongOut, status_code=status.HTTP_202_ACCEPTED)
def submit_lyrics(song_id: str, body: LyricsSubmit, db: Session = Depends(get_db)) -> Song:
    """Envia a letra (quando a LRCLIB não tem) e coloca na fila o alinhamento automático."""
    song = _get_song(db, song_id)
    _ensure_idle(song)
    if song.status is SongStatus.PUBLISHED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Tire a música do ar antes de reprocessar.")
    song.lyrics_plain = body.text
    enqueue_job(db, song, SyncMethod.ALIGN)
    db.commit()
    return song


@router.post("/{song_id}/reprocess", response_model=AdminSongOut, status_code=status.HTTP_202_ACCEPTED)
def reprocess_song(song_id: str, body: ReprocessRequest, db: Session = Depends(get_db)) -> Song:
    """Gera o LRC de novo: auto, lrclib (LRC pronto) ou align (alinhamento no áudio do vídeo)."""
    song = _get_song(db, song_id)
    _ensure_idle(song)
    if song.status is SongStatus.PUBLISHED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Tire a música do ar antes de reprocessar.")
    enqueue_job(db, song, body.method)
    db.commit()
    return song


@router.post("/{song_id}/publish", response_model=AdminSongOut)
def publish_song(song_id: str, db: Session = Depends(get_db)) -> Song:
    song = _get_song(db, song_id)
    _ensure_idle(song)
    if not any(line.text for line in song.lines):
        raise HTTPException(status.HTTP_409_CONFLICT, "A música ainda não tem letra sincronizada.")
    now = utcnow()
    song.status = SongStatus.PUBLISHED
    song.reviewed_at = now
    song.published_at = now
    db.commit()
    return song


@router.post("/{song_id}/unpublish", response_model=AdminSongOut)
def unpublish_song(song_id: str, db: Session = Depends(get_db)) -> Song:
    song = _get_song(db, song_id)
    if song.status is not SongStatus.PUBLISHED:
        raise HTTPException(status.HTTP_409_CONFLICT, "A música não está publicada.")
    song.status = SongStatus.READY_FOR_REVIEW
    db.commit()
    return song


@router.delete("/{song_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_song(song_id: str, db: Session = Depends(get_db)) -> Response:
    song = _get_song(db, song_id)
    _ensure_idle(song)
    if song.status is SongStatus.PUBLISHED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Tire a música do ar antes de excluir.")
    db.delete(song)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{song_id}/lrc", response_class=Response)
def download_lrc(song_id: str, db: Session = Depends(get_db)) -> Response:
    """Baixa o arquivo .lrc atual da música."""
    song = _get_song(db, song_id)
    if not song.lrc_raw:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "A música ainda não tem LRC.")
    ascii_name = unicodedata.normalize("NFKD", f"{song.artist} - {song.title}").encode("ascii", "ignore").decode()
    filename = re.sub(r"[^A-Za-z0-9 ._-]", "", ascii_name).strip() or song.id
    return Response(
        content=song.lrc_raw,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}.lrc"'},
    )
