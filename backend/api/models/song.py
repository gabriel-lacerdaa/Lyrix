from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.models.base import Base, JsonType, enum_type, new_id, utcnow
from api.models.enums import JobStatus, SongStatus, SyncSource, VideoKind

if TYPE_CHECKING:
    from api.models.job import Job
    from api.models.lyric_line import LyricLine


class Song(Base):
    """Uma música do acervo curado: vídeo do YouTube + letra sincronizada (LRC)."""

    __tablename__ = "songs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    youtube_video_id: Mapped[str] = mapped_column(String(11), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    artist: Mapped[str] = mapped_column(String(300))

    # Dados do vídeo, vindos da YouTube Data API.
    video_title: Mapped[str] = mapped_column(String(500))
    channel_title: Mapped[str] = mapped_column(String(300))
    video_kind: Mapped[VideoKind] = mapped_column(enum_type(VideoKind))
    video_duration_ms: Mapped[int]
    thumbnail_url: Mapped[str | None] = mapped_column(String(500))

    # Letra e sincronização.
    lyrics_plain: Mapped[str | None] = mapped_column(Text)
    lrc_raw: Mapped[str | None] = mapped_column(Text)
    # Quanto o vídeo está atrasado em relação ao LRC: tempoDaLetra = tempoDoVídeo − offset_ms.
    offset_ms: Mapped[int] = mapped_column(default=0)
    sync_source: Mapped[SyncSource | None] = mapped_column(enum_type(SyncSource))
    # ID do vídeo cujo áudio foi usado para medir o LRC (None quando veio pronto da LRCLIB).
    synced_on_video_id: Mapped[str | None] = mapped_column(String(11))
    sync_warnings: Mapped[list[dict]] = mapped_column(JsonType, default=list)
    # Versões alternativas para comparar na revisão: {"lrclib": "...", "aligned": "...", ...}.
    lrc_candidates: Mapped[dict] = mapped_column(JsonType, default=dict)

    status: Mapped[SongStatus] = mapped_column(enum_type(SongStatus), default=SongStatus.DRAFT, index=True)
    cefr_level: Mapped[str | None] = mapped_column(String(2))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    lines: Mapped[list[LyricLine]] = relationship(
        back_populates="song", cascade="all, delete-orphan", order_by="LyricLine.line_index"
    )
    jobs: Mapped[list[Job]] = relationship(
        back_populates="song", cascade="all, delete-orphan", order_by="Job.created_at"
    )

    @property
    def latest_job(self) -> Job | None:
        return self.jobs[-1] if self.jobs else None

    @property
    def has_active_job(self) -> bool:
        job = self.latest_job
        return job is not None and job.status in (JobStatus.QUEUED, JobStatus.RUNNING)

    @property
    def warnings_count(self) -> int:
        return len(self.sync_warnings or [])
