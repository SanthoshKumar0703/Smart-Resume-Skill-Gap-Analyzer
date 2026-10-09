"""Career Mirror AI - FastAPI application entry point."""
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import admin, analysis, auth, chat, health, jobs, learning, notifications, resumes
from app.config import settings
from app.database import init_db
from app.utils.security import hash_password, verify_password

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("careermirror")

app = FastAPI(
    title="Career Mirror AI",
    description="Smart Resume Skill Gap Analyzer - API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- routers ----
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(resumes.router)
app.include_router(jobs.router)
app.include_router(analysis.router)
app.include_router(learning.router)
app.include_router(chat.router)
app.include_router(notifications.router)
app.include_router(admin.router)


@app.on_event("startup")
def startup():
    try:
        init_db()
    except ConnectionError as exc:
        logger.error("%s", exc)
        # Do not crash the API process - /api/health reports the DB state,
        # and endpoints return clear MongoDB errors.
    # Warm the embedding model in the background if available
    try:
        import threading
        from app.ai.embeddings import load_model

        threading.Thread(target=load_model, daemon=True).start()
    except Exception:
        pass


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again or contact support."},
    )


@app.get("/")
def root():
    return {"service": "Career Mirror AI API", "docs": "/docs", "health": "/api/health"}
