from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from api.models.base import Base, enum_type, utcnow
from api.models.enums import TranslationKind


class TranslationCache(Base):
    """Tradução de um trecho (palavra ou frase curta), compartilhada entre usuários. Nunca a letra inteira."""

    __tablename__ = "translation_cache"

    # SHA-256 de "kind|source_lang|target_lang|texto normalizado" (veja services/translation.py).
    key_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    kind: Mapped[TranslationKind] = mapped_column(enum_type(TranslationKind))
    source_lang: Mapped[str] = mapped_column(String(8))
    target_lang: Mapped[str] = mapped_column(String(8))
    source_text: Mapped[str] = mapped_column(Text)
    translation: Mapped[str] = mapped_column(Text)
    provider: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
