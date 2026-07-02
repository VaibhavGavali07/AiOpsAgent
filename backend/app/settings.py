from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always resolve .env from the project root regardless of where uvicorn is launched from.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_api_key: str = Field(..., description="Bearer/API-key auth token")
    fernet_key: str = Field(..., description="Fernet symmetric key for credential encryption")
    database_url: str = "sqlite+aiosqlite:///./opsintel.db"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173"

    # Observability
    langsmith_tracing: bool = False
    langsmith_api_key: str = ""
    langsmith_project: str = "opsintel"

    # ServiceNow connector (optional)
    servicenow_instance_url: str = ""
    servicenow_username: str = ""
    servicenow_password: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
