"""FastAPI dependencies: current user / admin / db access helpers."""
import logging

import jwt as pyjwt
from bson import ObjectId
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.database import (
    ANALYSES,
    JOBS,
    LEARNING_PROGRESS,
    NOTIFICATIONS,
    RESUMES,
    SETTINGS,
    USERS,
    get_db,
)

logger = logging.getLogger("careermirror.deps")

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    db = get_db()
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required. Please log in.")
    token = credentials.credentials
    try:
        payload = pyjwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=401, detail="Invalid authentication token.")
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Your session has expired. Please log in again.")
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")

    user = db[USERS].find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=401, detail="Account not found.")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact support.")
    return user


def get_admin_user(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


def public_user(user) -> dict:
    return {
        "id": str(user["_id"]),
        "full_name": user.get("full_name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "active": user.get("active", True),
        "avatar": user.get("avatar"),
        "created_at": user.get("created_at").isoformat() if user.get("created_at") else None,
    }


def get_scoring_weights(db) -> dict:
    doc = db[SETTINGS].find_one({"key": "scoring_weights"})
    return (doc or {}).get("value", {})


def get_site_options(db) -> dict:
    doc = db[SETTINGS].find_one({"key": "site_options"})
    return (doc or {}).get("value", {})


def create_notification(db, user_id, title, message, ntype="info", link=None):
    db[NOTIFICATIONS].insert_one({
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": ntype,
        "link": link,
        "read": False,
        "created_at": _now(),
    })


def _now():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc)


def ensure_ownership(db, collection, doc_id: str, user_id: str, label: str):
    from bson import ObjectId
    if not ObjectId.is_valid(doc_id):
        raise HTTPException(status_code=422, detail=f"Invalid {label} identifier.")
    doc = db[collection].find_one({"_id": ObjectId(doc_id)})
    if doc is None:
        raise HTTPException(status_code=404, detail=f"{label.capitalize()} not found.")
    if str(doc.get("user_id")) != str(user_id):
        raise HTTPException(status_code=403, detail="You do not have access to this resource.")
    return doc
