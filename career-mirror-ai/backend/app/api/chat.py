"""AI Career Assistant chat API."""
import logging

from fastapi import APIRouter, Depends, HTTPException

from app.database import AI_USAGE, ANALYSES, LEARNING_PROGRESS, get_db, utcnow
from app.deps import get_current_user
from app.services.chat import answer_question

logger = logging.getLogger("careermirror.chatapi")

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _build_context(user) -> dict:
    db = get_db()
    analysis = db[ANALYSES].find_one({"user_id": user["_id"]}, sort=[("created_at", -1)])
    context = {"analysis": None, "roadmap": [], "learning_progress": []}
    if analysis:
        context["analysis"] = analysis
        context["roadmap"] = analysis.get("roadmap", [])
    progress = list(db[LEARNING_PROGRESS].find({"user_id": user["_id"]}))
    context["learning_progress"] = [
        {"skill": p["skill"], "status": p["status"]} for p in progress
    ]
    return context


@router.post("")
def chat(payload: dict, user=Depends(get_current_user)):
    message = (payload.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=422, detail="Message is empty.")

    context = _build_context(user)
    result = answer_question(message, context)

    db = get_db()
    db[AI_USAGE].insert_one({
        "user_id": user["_id"],
        "endpoint": "chat",
        "model": result.get("model", "fallback"),
        "mode": result.get("mode", "local"),
        "details": message[:200],
        "created_at": utcnow(),
    })
    return result
