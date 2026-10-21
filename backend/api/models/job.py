from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.models.base import Base, enum_type, new_id, utcnow
from api.models.enums import JobStatus, SyncMethod

if TYPE_CHECKING:
    from api.models.song import Song


class Job(Base):
    """Tarefa de processamento em segundo plano (busca da letra e geração do LRC), executada pelo worker."""

    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    song_id: Mapped[str] = mapped_column(String(36), ForeignKey("songs.id", ondelete="CASCADE"), index=True)
    method: Mapped[SyncMethod] = mapped_column(enum_type(SyncMethod), default=SyncMethod.AUTO)
    status: Mapped[JobStatus] = mapped_column(enum_type(JobStatus), default=JobStatus.QUEUED, index=True)
    step: Mapped[str | None] = mapped_column(String(50))
    log: Mapped[str] = mapped_column(Text, default="")
    error: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    song: Mapped[Song] = relationship(back_populates="jobs")
