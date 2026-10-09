import os
from pathlib import Path

from dotenv import load_dotenv

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
if ENV_FILE.exists():
    load_dotenv(ENV_FILE, override=True)
else:
    load_dotenv(override=True)


def _bool(value, default=False):
    if value is None or value == "":
        return default
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def _int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class Settings:
    # --- MongoDB ---
    MONGODB_URI: str = (os.getenv("MONGODB_URI", "mongodb://localhost:27017") or "").strip()
    MONGODB_DB_NAME: str = (os.getenv("MONGODB_DB_NAME", "career_mirror_ai") or "").strip()

    # --- JWT ---
    JWT_SECRET_KEY: str = (os.getenv("JWT_SECRET_KEY", "dev-secret-change-me-in-production") or "").strip()
    JWT_ALGORITHM: str = (os.getenv("JWT_ALGORITHM", "HS256") or "").strip()
    JWT_EXPIRE_MINUTES: int = _int(os.getenv("JWT_EXPIRE_MINUTES"), 10080)

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID: str = (os.getenv("GOOGLE_CLIENT_ID", "") or "").strip()
    GOOGLE_CLIENT_SECRET: str = (os.getenv("GOOGLE_CLIENT_SECRET", "") or "").strip()

    # --- SMTP ---
    SMTP_HOST: str = (os.getenv("SMTP_HOST", "") or "").strip()
    SMTP_PORT: int = _int(os.getenv("SMTP_PORT"), 587)
    SMTP_USERNAME: str = (os.getenv("SMTP_USERNAME", "") or "").strip()
    SMTP_PASSWORD: str = (os.getenv("SMTP_PASSWORD", "") or "").replace(" ", "").strip()
    SMTP_FROM: str = (os.getenv("SMTP_FROM", "Career Mirror AI <no-reply@careermirror.local>") or "").strip()
    SMTP_USE_TLS: bool = _bool(os.getenv("SMTP_USE_TLS"), True)

    # --- App ---
    FRONTEND_URL: str = (os.getenv("FRONTEND_URL", "http://localhost:5173") or "").strip()
    OPENAI_API_KEY: str = (os.getenv("OPENAI_API_KEY", "") or "").strip()

    # --- Admin bootstrap (dev convenience) ---
    ADMIN_BOOTSTRAP_EMAIL: str = os.getenv("ADMIN_BOOTSTRAP_EMAIL", "").strip().lower()

    # --- Local AI ---
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
    OLLAMA_TIMEOUT_SECONDS: int = _int(os.getenv("OLLAMA_TIMEOUT_SECONDS"), 45)
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    MODEL_CACHE_DIR: str = os.getenv("MODEL_CACHE_DIR", "")

    # --- Uploads ---
    MAX_UPLOAD_MB: int = _int(os.getenv("MAX_UPLOAD_MB"), 10)

    # --- CORS ---
    CORS_ORIGINS: list = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]

    @property
    def smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USERNAME and self.SMTP_PASSWORD)

    @property
    def google_configured(self) -> bool:
        return bool(self.GOOGLE_CLIENT_ID and self.GOOGLE_CLIENT_SECRET)


settings = Settings()
