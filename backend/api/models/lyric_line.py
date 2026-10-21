from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.models.base import Base

if TYPE_CHECKING:
    from api.models.song import Song


class LyricLine(Base):
    """Linha da letra já com o tempo de início, gerada a partir do lrc_raw da música."""

    __tablename__ = "lyric_lines"
    __table_args__ = (UniqueConstraint("song_id", "line_index"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    song_id: Mapped[str] = mapped_column(String(36), ForeignKey("songs.id", ondelete="CASCADE"), index=True)
    line_index: Mapped[int]
    start_ms: Mapped[int]
    # Texto vazio = trecho instrumental (apaga o destaque no app).
    text: Mapped[str] = mapped_column(Text)

    song: Mapped[Song] = relationship(back_populates="lines")
