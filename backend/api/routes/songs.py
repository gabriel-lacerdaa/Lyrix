"""Rotas públicas usadas pelo app: só músicas publicadas."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from api.database import get_db
from api.models import Song, SongStatus
from api.schemas.songs import SongDetail, SongSummary

router = APIRouter(prefix="/songs", tags=["app"])


@router.get("", response_model=list[SongSummary])
def list_songs(db: Session = Depends(get_db)) -> list[Song]:
    stmt = select(Song).where(Song.status == SongStatus.PUBLISHED).order_by(Song.title, Song.artist)
    return list(db.scalars(stmt))


@router.get("/{song_id}", response_model=SongDetail)
def get_song(song_id: str, db: Session = Depends(get_db)) -> Song:
    stmt = (
        select(Song)
        .where(Song.id == song_id, Song.status == SongStatus.PUBLISHED)
        .options(selectinload(Song.lines))
    )
    song = db.scalar(stmt)
    if song is None:
        raise HTTPException(404, "Música não encontrada.")
    return song
