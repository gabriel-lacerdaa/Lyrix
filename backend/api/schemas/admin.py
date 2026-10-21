"""Formatos de entrada e saída das rotas de curadoria (/admin)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from api.models import JobStatus, SongStatus, SyncMethod, SyncSource, VideoKind
from api.schemas.songs import LyricLineOut


class ImportRequest(BaseModel):
    url: str = Field(min_length=1, examples=["https://www.youtube.com/watch?v=XXXXXXXXXXX"])


class SimilarSong(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    artist: str
    status: SongStatus


class ImportPreview(BaseModel):
    """Dados do vídeo validado, com artista e título sugeridos para você confirmar."""

    youtube_video_id: str
    video_title: str
    channel_title: str
    video_duration_ms: int
    thumbnail_url: str | None
    video_kind: VideoKind
    suggested_artist: str
    suggested_title: str
    similar_songs: list[SimilarSong]


class SongCreate(BaseModel):
    youtube_video_id: str = Field(min_length=11, max_length=11)
    artist: str = Field(min_length=1, max_length=300)
    title: str = Field(min_length=1, max_length=300)
    video_kind: VideoKind | None = None


class SongUpdate(BaseModel):
    """Edições da revisão. Só os campos enviados são alterados."""

    artist: str | None = Field(default=None, min_length=1, max_length=300)
    title: str | None = Field(default=None, min_length=1, max_length=300)
    video_kind: VideoKind | None = None
    lyrics_plain: str | None = None
    lrc_raw: str | None = None
    offset_ms: int | None = Field(default=None, ge=-600_000, le=600_000)
    cefr_level: str | None = Field(default=None, pattern=r"^(A1|A2|B1|B2|C1|C2)$")


class LyricsSubmit(BaseModel):
    text: str = Field(min_length=1)


class ReprocessRequest(BaseModel):
    method: SyncMethod = SyncMethod.AUTO


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    method: SyncMethod
    status: JobStatus
    step: str | None
    log: str
    error: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


class AdminSongSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    youtube_video_id: str
    title: str
    artist: str
    video_kind: VideoKind
    status: SongStatus
    warnings_count: int
    updated_at: datetime


class AdminSongOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    youtube_video_id: str
    title: str
    artist: str
    video_title: str
    channel_title: str
    video_kind: VideoKind
    video_duration_ms: int
    thumbnail_url: str | None
    lyrics_plain: str | None
    lrc_raw: str | None
    offset_ms: int
    sync_source: SyncSource | None
    synced_on_video_id: str | None
    sync_warnings: list[dict]
    lrc_candidates: dict
    status: SongStatus
    cefr_level: str | None
    created_at: datetime
    updated_at: datetime
    reviewed_at: datetime | None
    published_at: datetime | None
    lines: list[LyricLineOut]
    latest_job: JobOut | None
