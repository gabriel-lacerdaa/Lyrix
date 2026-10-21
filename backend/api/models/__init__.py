"""Mapeamento SQLAlchemy das tabelas criadas por backend/schemas.sql (mantenha os dois iguais)."""

from api.models.base import Base
from api.models.enums import JobStatus, SongStatus, SyncMethod, SyncSource, TranslationKind, VideoKind
from api.models.job import Job
from api.models.lyric_line import LyricLine
from api.models.song import Song
from api.models.translation_cache import TranslationCache

__all__ = [
    "Base",
    "Job",
    "JobStatus",
    "LyricLine",
    "Song",
    "SongStatus",
    "SyncMethod",
    "SyncSource",
    "TranslationCache",
    "TranslationKind",
    "VideoKind",
]
