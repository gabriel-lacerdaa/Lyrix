from collections.abc import Iterator

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session, sessionmaker

from api.config import get_settings

_settings = get_settings()
engine = create_engine(_settings.database_url)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

REQUIRED_TABLES = ("songs", "lyric_lines", "jobs", "translation_cache")


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_tables() -> None:
    """As tabelas são criadas manualmente com schemas.sql; aqui só confere se elas existem."""
    missing = [table for table in REQUIRED_TABLES if not inspect(engine).has_table(table)]
    if missing:
        command = (
            f"psql -h {_settings.postgres_host} -p {_settings.postgres_port} "
            f"-U {_settings.postgres_user} -d {_settings.postgres_db} -f schemas.sql"
        )
        raise RuntimeError(f"Tabelas ausentes no banco: {', '.join(missing)}. Crie-as com: {command}")
