"""MongoDB connection, indexes and seed data handling."""
import logging
from datetime import datetime, timezone

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from app.config import settings

logger = logging.getLogger("careermirror.db")

_client = None
_db = None


def utcnow():
    """Naive UTC datetime - PyMongo returns naive datetimes, so we keep
    everything naive internally to make comparisons consistent."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_db():
    """Return the lazily-initialised database handle."""
    global _client, _db
    if _db is not None:
        return _db
    _client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=4000)
    _db = _client[settings.MONGODB_DB_NAME]
    return _db


def ping():
    """Raise ConnectionFailure if MongoDB is unreachable."""
    db = get_db()
    db.command("ping")


# Collection names
USERS = "users"
RESUMES = "resumes"
JOBS = "job_descriptions"
ANALYSES = "analyses"
SKILLS = "skills"
RECOMMENDATIONS = "recommendations"
LEARNING_RESOURCES = "learning_resources"
LEARNING_PROGRESS = "learning_progress"
NOTIFICATIONS = "notifications"
PASSWORD_RESET_TOKENS = "password_reset_tokens"
AI_USAGE = "ai_usage"
SETTINGS = "settings"


def _ensure_indexes(db):
    db[USERS].create_index([("email", ASCENDING)], unique=True)
    # partial index: unique only among docs that actually have a google_id string
    # (sparse indexes still index explicit nulls, which breaks multiple local accounts)
    if "google_id_1" in db[USERS].index_information():
        db[USERS].drop_index("google_id_1")
    db[USERS].create_index(
        [("google_id", ASCENDING)],
        unique=True,
        partialFilterExpression={"google_id": {"$type": "string"}},
    )
    db[USERS].create_index([("created_at", DESCENDING)])

    db[RESUMES].create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db[JOBS].create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])

    db[ANALYSES].create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db[ANALYSES].create_index([("score", DESCENDING)])
    db[ANALYSES].create_index([("job_title", ASCENDING)])

    db[SKILLS].create_index([("name", ASCENDING)], unique=True)
    db[SKILLS].create_index([("category", ASCENDING)])

    db[LEARNING_PROGRESS].create_index(
        [("user_id", ASCENDING), ("skill", ASCENDING)], unique=True
    )
    db[LEARNING_RESOURCES].create_index([("name", ASCENDING)], unique=True)

    db[NOTIFICATIONS].create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db[NOTIFICATIONS].create_index([("user_id", ASCENDING), ("read", ASCENDING)])

    db[PASSWORD_RESET_TOKENS].create_index([("token_hash", ASCENDING)], unique=True)
    db[PASSWORD_RESET_TOKENS].create_index([("expires_at", ASCENDING)])
    db[AI_USAGE].create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db[SETTINGS].create_index([("key", ASCENDING)], unique=True)


DEFAULT_WEIGHTS = {
    "required_skills": 0.45,
    "preferred_skills": 0.20,
    "experience": 0.15,
    "education": 0.10,
    "projects": 0.05,
    "certifications": 0.05,
}

DEFAULT_SITE_OPTIONS = {
    "allow_registration": True,
    "maintenance_mode": False,
    "site_name": "Career Mirror AI",
    "tagline": "Smart Resume Skill Gap Analyzer",
}


def _seed_settings(db):
    """Insert default settings documents (upsert without overwriting admin edits)."""
    if db[SETTINGS].count_documents({"key": "scoring_weights"}) == 0:
        db[SETTINGS].insert_one(
            {"key": "scoring_weights", "value": DEFAULT_WEIGHTS, "updated_at": utcnow()}
        )
    if db[SETTINGS].count_documents({"key": "site_options"}) == 0:
        db[SETTINGS].insert_one(
            {"key": "site_options", "value": DEFAULT_SITE_OPTIONS, "updated_at": utcnow()}
        )


def _seed_skills(db):
    """Seed the skill knowledge base if missing (preserves admin edits)."""
    from app.data.skill_data import SKILLS as SKILLS_DATA

    bulk = []
    existing = set(db[SKILLS].distinct("name"))
    for name, data in SKILLS_DATA.items():
        if name not in existing:
            bulk.append(
                {
                    "name": name,
                    "category": data.get("category", "Other"),
                    "aliases": data.get("aliases", []),
                    "related": data.get("related", []),
                    "importance": data.get("importance", "medium"),
                    "difficulty": data.get("difficulty", 2),
                    "effort_hours": data.get("effort_hours", 10),
                    "why": data.get("why", ""),
                    "practice": data.get("practice", ""),
                    "project": data.get("project", ""),
                    "resources": data.get("resources", []),
                    "seeded": True,
                    "created_at": utcnow(),
                    "updated_at": utcnow(),
                }
            )
    if bulk:
        db[SKILLS].insert_many(bulk)
        logger.info("Seeded %d skills", len(bulk))


def _seed_resources(db):
    """Seed curated learning resources if missing."""
    from app.data.skill_data import RESOURCE_LIBRARY as RESOURCE_LIBRARY_DATA

    bulk = []
    existing = set(db[LEARNING_RESOURCES].distinct("name"))
    for name, data in RESOURCE_LIBRARY_DATA.items():
        if name not in existing:
            bulk.append({**data, "name": name, "created_at": utcnow(), "updated_at": utcnow()})
    if bulk:
        db[LEARNING_RESOURCES].insert_many(bulk)
        logger.info("Seeded %d learning resources", len(bulk))


def init_db():
    """Connect, verify, create indexes and seed reference data."""
    try:
        db = get_db()
        ping()
    except (ConnectionFailure, ServerSelectionTimeoutError) as exc:
        raise ConnectionError(
            f"MongoDB connection failed at {settings.MONGODB_URI}. "
            f"Make sure MongoDB is running. Details: {exc}"
        ) from exc

    _ensure_indexes(db)
    _seed_settings(db)
    _seed_skills(db)
    _seed_resources(db)
    logger.info("Database '%s' ready at %s", settings.MONGODB_DB_NAME, settings.MONGODB_URI)
    return db
