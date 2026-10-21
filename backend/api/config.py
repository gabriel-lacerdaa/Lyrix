from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    """Configurações lidas do arquivo .env (veja .env.example)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # PostgreSQL com as tabelas criadas por schemas.sql. Os padrões são os do docker-compose.yml.
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "lyrix"
    postgres_user: str = "lyrix"
    postgres_password: str = "lyrix"

    youtube_api_key: str = ""
    # Vazio = rotas /admin abertas (uso só no localhost). Preenchido = exige o cabeçalho X-Admin-Token.
    admin_token: str = ""
    region_code: str = "BR"
    cors_origins: list[str] = ["http://localhost:5173"]

    # Tradução sob demanda (POST /translate). Chave vazia = rota responde 503.
    azure_translator_key: str = ""
    # Região do recurso Translator (ex.: brazilsouth). Obrigatória para recursos regionais; vazia para "global".
    azure_translator_region: str = ""
    azure_translator_endpoint: str = "https://api.cognitive.microsofttranslator.com"
    # "pt" é o português do Brasil na Azure ("pt-pt" é o de Portugal).
    translation_target_lang: str = "pt"

    lrclib_base_url: str = "https://lrclib.net/api"
    lrclib_user_agent: str = "Lyrix-curadoria/0.1 (desenvolvimento)"
    duration_tolerance_ms: int = 2000

    temp_dir: Path = Path("./tmp")
    whisper_model: str = "base"
    demucs_model: str = "htdemucs"
    worker_poll_seconds: float = 2.0

    @property
    def database_url(self) -> URL:
        # URL.create escapa caracteres especiais da senha (@, :, / etc.).
        return URL.create(
            "postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password,
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
