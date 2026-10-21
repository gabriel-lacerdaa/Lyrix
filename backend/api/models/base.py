import uuid
from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import JSON, Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase

# JSONB no PostgreSQL (como em schemas.sql).
JsonType = JSON().with_variant(JSONB(), "postgresql")


class Base(DeclarativeBase):
    pass


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def enum_type(enum_cls: type[StrEnum]) -> Enum:
    """Guarda o valor do enum como texto (VARCHAR + CHECK em schemas.sql, sem tipo ENUM nativo)."""
    return Enum(
        enum_cls,
        native_enum=False,
        length=32,
        values_callable=lambda members: [member.value for member in members],
    )
