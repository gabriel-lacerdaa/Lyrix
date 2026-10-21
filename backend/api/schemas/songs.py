"""Formatos de resposta das rotas públicas, usadas pelo app."""

from pydantic import BaseModel, ConfigDict


class LyricLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    line_index: int
    start_ms: int
    text: str


class SongSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    artist: str
    thumbnail_url: str | None
    video_duration_ms: int
    cefr_level: str | None


class SongDetail(SongSummary):
    youtube_video_id: str
    offset_ms: int
    lines: list[LyricLineOut]
