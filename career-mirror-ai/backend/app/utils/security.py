"""Password hashing (bcrypt) and JWT helpers.

bcrypt >= 4.1 raises ValueError for passwords longer than 72 bytes,
so we explicitly truncate to 72 bytes before hashing - this avoids the
well-known Passlib/bcrypt incompatibility on Windows.
"""
import logging
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings

logger = logging.getLogger("careermirror.security")

MAX_BCRYPT_BYTES = 72


def _prep(password: str) -> bytes:
    return password.encode("utf-8")[:MAX_BCRYPT_BYTES]


def hash_password(password: str) -> str:
    """Hash a plain-text password with bcrypt."""
    return bcrypt.hashpw(_prep(password), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(_prep(password), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: str, role: str, extra: dict | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises jwt.PyJWTError on failure."""
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


def generate_reset_token() -> str:
    """Cryptographically secure random token for password reset."""
    import secrets

    return secrets.token_urlsafe(48)


def sha256_hex(value: str) -> str:
    import hashlib

    return hashlib.sha256(value.encode("utf-8")).hexdigest()
