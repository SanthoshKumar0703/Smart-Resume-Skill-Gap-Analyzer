"""Notifications API."""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import NOTIFICATIONS, get_db, utcnow
from app.deps import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _out(doc):
    return {
        "id": str(doc["_id"]),
        "type": doc.get("type", "info"),
        "title": doc.get("title", ""),
        "message": doc.get("message", ""),
        "link": doc.get("link"),
        "read": doc.get("read", False),
        "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
    }


@router.get("")
def list_notifications(limit: int = Query(30, ge=1, le=100), user=Depends(get_current_user)):
    db = get_db()
    docs = db[NOTIFICATIONS].find({"user_id": user["_id"]}).sort("created_at", -1).limit(limit)
    return {"notifications": [_out(d) for d in docs]}


@router.get("/unread-count")
def unread_count(user=Depends(get_current_user)):
    db = get_db()
    count = db[NOTIFICATIONS].count_documents({"user_id": user["_id"], "read": False})
    return {"count": count}


@router.put("/{notification_id}/read")
def mark_read(notification_id: str, user=Depends(get_current_user)):
    db = get_db()
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=422, detail="Invalid notification identifier.")
    result = db[NOTIFICATIONS].update_one(
        {"_id": ObjectId(notification_id), "user_id": user["_id"]},
        {"$set": {"read": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return {"message": "Marked as read."}


@router.put("/read-all")
def mark_all_read(user=Depends(get_current_user)):
    db = get_db()
    db[NOTIFICATIONS].update_many(
        {"user_id": user["_id"], "read": False}, {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read."}
