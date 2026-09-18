from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Locate .env in backend directory or root repository directory
_backend_dir = Path(__file__).resolve().parent.parent
_root_dir = _backend_dir.parent

class Settings(BaseSettings):
    database_hostname: str
    database_port: str = "3306"
    database_password: str = "localhost"
    database_name: str
    database_username: str = "root"
    secret_key: str = ""
    algorithm: str
    access_token_expire_minutes: int

    # Comma-separated list of allowed frontend origins, e.g. "http://localhost:5173,https://commhub.example.org"
    cors_origins: str = ""

    model_config = SettingsConfigDict(
        env_file=(_backend_dir / ".env", _root_dir / ".env", ".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
