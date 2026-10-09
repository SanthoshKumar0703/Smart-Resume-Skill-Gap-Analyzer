"""Health endpoint."""
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health():
    db = get_db()
    try:
        db.command("ping")
        mongo_status = "connected"
        status = "ok"
    except Exception as exc:
        mongo_status = f"error: {exc}"
        status = "degraded"
    return {
        "status": status,
        "service": "Career Mirror AI",
        "version": "1.0.0",
        "mongo": mongo_status,
        "embedding_model": settings.EMBEDDING_MODEL,
        "time": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }
