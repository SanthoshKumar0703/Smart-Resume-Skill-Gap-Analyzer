"""Admin API: dashboard, user/skill/resource/analysis management, AI usage."""
import logging
from collections import Counter
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import (
    AI_USAGE,
    ANALYSES,
    JOBS,
    LEARNING_RESOURCES,
    LEARNING_PROGRESS,
    NOTIFICATIONS,
    RECOMMENDATIONS,
    RESUMES,
    SETTINGS,
    SKILLS,
    USERS,
    get_db,
    utcnow,
)
from app.deps import create_notification, get_admin_user

logger = logging.getLogger("careermirror.admin")

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _user_out(u):
    return {
        "id": str(u["_id"]),
        "full_name": u.get("full_name", ""),
        "email": u.get("email", ""),
        "role": u.get("role", "user"),
        "active": u.get("active", True),
        "google_id": bool(u.get("google_id")),
        "last_login": u.get("last_login").isoformat() if u.get("last_login") else None,
        "created_at": u.get("created_at").isoformat() if u.get("created_at") else None,
    }


def _analysis_admin_out(d):
    return {
        "id": str(d["_id"]),
        "user_id": str(d.get("user_id", "")),
        "user_name": d.get("user_name", ""),
        "job_title": d.get("job_title"),
        "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
        "overall_score": d.get("overall_score"),
        "skill_stats": d.get("skill_stats", {}),
        "matched_skills": d.get("matched_skills", []),
        "missing_skills": d.get("missing_skills", []),
    }


@router.get("/dashboard")
def dashboard(admin=Depends(get_admin_user)):
    db = get_db()
    now = utcnow()

    total_users = db[USERS].count_documents({})
    active_users = db[USERS].count_documents({"active": True})
    total_resumes = db[RESUMES].count_documents({})
    total_analyses = db[ANALYSES].count_documents({})

    avg_score_doc = db[ANALYSES].aggregate([{"$group": {"_id": None, "avg": {"$avg": "$overall_score"}}}])
    avg_score = next(avg_score_doc, {}).get("avg", 0) or 0

    # most common missing skills
    missing_counter = Counter()
    for doc in db[ANALYSES].find({"missing_skills": {"$exists": True}}, {"missing_skills": 1}):
        for s in doc.get("missing_skills", []):
            missing_counter[s.get("name", "")] += 1
    top_missing = [{"name": k, "count": v} for k, v in missing_counter.most_common(10)]

    # most analyzed job roles
    roles_counter = Counter()
    for doc in db[ANALYSES].find({"job_title": {"$exists": True}}, {"job_title": 1}):
        if doc.get("job_title"):
            roles_counter[doc["job_title"]] += 1
    top_roles = [{"title": k, "count": v} for k, v in roles_counter.most_common(8)]

    # user growth (last 14 days)
    user_growth = []
    for i in range(13, -1, -1):
        day = now - timedelta(days=i)
        start = datetime(day.year, day.month, day.day)
        end = start + timedelta(days=1)
        user_growth.append({"date": start.strftime("%b %d"),
                            "count": db[USERS].count_documents({"created_at": {"$gte": start, "$lt": end}})})

    # analysis volume (last 14 days)
    analysis_volume = []
    for i in range(13, -1, -1):
        day = now - timedelta(days=i)
        start = datetime(day.year, day.month, day.day)
        end = start + timedelta(days=1)
        analysis_volume.append({"date": start.strftime("%b %d"),
                                "count": db[ANALYSES].count_documents({"created_at": {"$gte": start, "$lt": end}})})

    # match score distribution
    buckets = [{"label": "0-20", "min": 0, "max": 20}, {"label": "21-40", "min": 21, "max": 40},
               {"label": "41-60", "min": 41, "max": 60}, {"label": "61-80", "min": 61, "max": 80},
               {"label": "81-100", "min": 81, "max": 100}]
    score_dist = []
    for b in buckets:
        score_dist.append({"range": b["label"], "count": db[ANALYSES].count_documents(
            {"overall_score": {"$gte": b["min"], "$lte": b["max"]}})})

    # popular technologies across resumes
    tech_counter = Counter()
    for doc in db[RESUMES].find({"extracted.technologies": {"$exists": True}}, {"extracted.technologies": 1}):
        for t in doc.get("extracted", {}).get("technologies", [])[:25]:
            tech_counter[t] += 1
    top_tech = [{"name": k, "count": v} for k, v in tech_counter.most_common(10)]

    recent_users = [_user_out(u) for u in db[USERS].find().sort("created_at", -1).limit(6)]
    recent_analyses = [_analysis_admin_out(d) for d in db[ANALYSES].find().sort("created_at", -1).limit(6)]

    return {
        "stats": {
            "total_users": total_users, "active_users": active_users,
            "total_resumes": total_resumes, "total_analyses": total_analyses,
            "avg_match_score": round(avg_score, 1),
        },
        "top_missing_skills": top_missing,
        "top_roles": top_roles,
        "user_growth": user_growth,
        "analysis_volume": analysis_volume,
        "score_distribution": score_dist,
        "top_technologies": top_tech,
        "recent_users": recent_users,
        "recent_analyses": recent_analyses,
    }


# ---------------- Users ----------------
@router.get("/users")
def list_users(search: str = Query("", max_length=100), role: str = Query(""),
               status: str = Query(""), admin=Depends(get_admin_user)):
    db = get_db()
    query = {}
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    if role in ("user", "admin"):
        query["role"] = role
    if status in ("active", "inactive"):
        query["active"] = status == "active"
    users = list(db[USERS].find(query).sort("created_at", -1).limit(500))
    return {"users": [_user_out(u) for u in users], "total": len(users)}


@router.put("/users/{user_id}")
def update_user(user_id: str, payload: dict, admin=Depends(get_admin_user)):
    db = get_db()
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=422, detail="Invalid user identifier.")
    user = db[USERS].find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if str(user["_id"]) == str(admin["_id"]) and payload.get("active") is False:
        raise HTTPException(status_code=422, detail="You cannot deactivate your own account.")

    update = {}
    if "role" in payload:
        if payload["role"] not in ("user", "admin"):
            raise HTTPException(status_code=422, detail="Role must be 'user' or 'admin'.")
        update["role"] = payload["role"]
    if "active" in payload:
        update["active"] = bool(payload["active"])
    if update:
        update["updated_at"] = utcnow()
        db[USERS].update_one({"_id": user["_id"]}, {"$set": update})
    return {"message": "User updated."}


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, admin=Depends(get_admin_user)):
    db = get_db()
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=422, detail="Invalid user identifier.")
    if str(user_id) == str(admin["_id"]):
        raise HTTPException(status_code=422, detail="You cannot delete your own account.")
    result = db[USERS].delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")


# ---------------- Resumes ----------------
@router.get("/resumes")
def list_resumes(search: str = Query("", max_length=100), admin=Depends(get_admin_user)):
    db = get_db()
    query = {}
    if search:
        query["filename"] = {"$regex": search, "$options": "i"}
    docs = list(db[RESUMES].find(query).sort("created_at", -1).limit(200))
    return {"resumes": [{
        "id": str(d["_id"]),
        "user_id": str(d.get("user_id", "")),
        "filename": d.get("filename"),
        "size": d.get("size", 0),
        "name": (d.get("extracted") or {}).get("name", ""),
        "skills_count": len((d.get("extracted") or {}).get("skills", [])),
        "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
    } for d in docs]}


@router.delete("/resumes/{resume_id}", status_code=204)
def delete_resume_admin(resume_id: str, admin=Depends(get_admin_user)):
    db = get_db()
    if not ObjectId.is_valid(resume_id):
        raise HTTPException(status_code=422, detail="Invalid resume identifier.")
    db[RESUMES].delete_one({"_id": ObjectId(resume_id)})


# ---------------- Analyses ----------------
@router.get("/analyses")
def list_analyses(search: str = Query("", max_length=100), sort: str = Query("newest"),
                  admin=Depends(get_admin_user)):
    db = get_db()
    query = {}
    if search:
        query["job_title"] = {"$regex": search, "$options": "i"}
    sort_map = {"newest": ("created_at", -1), "oldest": ("created_at", 1),
                "highest": ("overall_score", -1), "lowest": ("overall_score", 1)}
    key, direction = sort_map.get(sort, sort_map["newest"])

    user_names = {}
    for u in db[USERS].find({}, {"full_name": 1}):
        user_names[str(u["_id"])] = u.get("full_name", "")

    docs = list(db[ANALYSES].find(query).sort(key, direction).limit(300))
    out = []
    for d in docs:
        item = _analysis_admin_out(d)
        item["user_name"] = user_names.get(item["user_id"], "Unknown")
        out.append(item)
    return {"analyses": out}


@router.delete("/analyses/{analysis_id}", status_code=204)
def delete_analysis_admin(analysis_id: str, admin=Depends(get_admin_user)):
    db = get_db()
    if not ObjectId.is_valid(analysis_id):
        raise HTTPException(status_code=422, detail="Invalid analysis identifier.")
    db[ANALYSES].delete_one({"_id": ObjectId(analysis_id)})


# ---------------- Skills ----------------
def _skill_out(s):
    return {
        "id": str(s["_id"]),
        "name": s.get("name"),
        "category": s.get("category", "Other"),
        "aliases": s.get("aliases", []),
        "related": s.get("related", []),
        "importance": s.get("importance", "medium"),
        "difficulty": s.get("difficulty", 2),
        "effort_hours": s.get("effort_hours", 10),
        "why": s.get("why", ""),
        "practice": s.get("practice", ""),
        "project": s.get("project", ""),
        "resources": s.get("resources", []),
        "seeded": s.get("seeded", False),
        "created_at": s.get("created_at").isoformat() if s.get("created_at") else None,
    }


@router.get("/skills")
def list_skills(search: str = Query("", max_length=100), category: str = Query(""),
                admin=Depends(get_admin_user)):
    db = get_db()
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if category:
        query["category"] = category
    docs = list(db[SKILLS].find(query).sort("name", 1).limit(1000))
    return {"skills": [_skill_out(s) for s in docs]}


@router.get("/skills/categories")
def skill_categories(admin=Depends(get_admin_user)):
    db = get_db()
    return {"categories": sorted(db[SKILLS].distinct("category"))}


@router.post("/skills", status_code=201)
def create_skill(payload: dict, admin=Depends(get_admin_user)):
    db = get_db()
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="Skill name is required.")
    if db[SKILLS].find_one({"name": name}):
        raise HTTPException(status_code=409, detail="A skill with this name already exists.")
    doc = {
        "name": name,
        "category": (payload.get("category") or "Other").strip(),
        "aliases": [a.strip() for a in payload.get("aliases", []) if a.strip()],
        "related": [r.strip() for r in payload.get("related", []) if r.strip()],
        "importance": payload.get("importance", "medium"),
        "difficulty": int(payload.get("difficulty", 2)),
        "effort_hours": int(payload.get("effort_hours", 10)),
        "why": payload.get("why", ""),
        "practice": payload.get("practice", ""),
        "project": payload.get("project", ""),
        "resources": payload.get("resources", []),
        "seeded": False,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    result = db[SKILLS].insert_one(doc)
    return {"message": "Skill created.", "id": str(result.inserted_id)}


@router.put("/skills/{skill_id}")
def update_skill(skill_id: str, payload: dict, admin=Depends(get_admin_user)):
    db = get_db()
    if not ObjectId.is_valid(skill_id):
        raise HTTPException(status_code=422, detail="Invalid skill identifier.")
    skill = db[SKILLS].find_one({"_id": ObjectId(skill_id)})
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill not found.")
    update = {}
    for key in ("category", "importance", "why", "practice", "project"):
        if key in payload:
            update[key] = payload[key]
    for key in ("aliases", "related", "resources"):
        if key in payload:
            update[key] = payload[key] or []
    for key in ("difficulty", "effort_hours"):
        if key in payload:
            update[key] = int(payload[key])
    update["updated_at"] = utcnow()
    db[SKILLS].update_one({"_id": skill["_id"]}, {"$set": update})
    return {"message": "Skill updated."}


@router.delete("/skills/{skill_id}", status_code=204)
def delete_skill(skill_id: str, admin=Depends(get_admin_user)):
    db = get_db()
    if not ObjectId.is_valid(skill_id):
        raise HTTPException(status_code=422, detail="Invalid skill identifier.")
    db[SKILLS].delete_one({"_id": ObjectId(skill_id)})


# ---------------- Learning resources ----------------
def _resource_out(r):
    return {
        "id": str(r["_id"]),
        "name": r.get("name"),
        "category": r.get("category", "Other"),
        "skill": r.get("skill", ""),
        "type": r.get("type", "course"),
        "url": r.get("url", ""),
        "level": r.get("level", "beginner"),
        "description": r.get("description", ""),
        "created_at": r.get("created_at").isoformat() if r.get("created_at") else None,
    }


@router.get("/resources")
def list_resources(search: str = Query("", max_length=100), admin=Depends(get_admin_user)):
    db = get_db()
    query = {}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}},
                        {"skill": {"$regex": search, "$options": "i"}}]
    docs = list(db[LEARNING_RESOURCES].find(query).sort("name", 1).limit(500))
    return {"resources": [_resource_out(r) for r in docs]}


@router.post("/resources", status_code=201)
def create_resource(payload: dict, admin=Depends(get_admin_user)):
    db = get_db()
    name = (payload.get("name") or "").strip()
    url = (payload.get("url") or "").strip()
    if not name or not url:
        raise HTTPException(status_code=422, detail="Resource name and URL are required.")
    if db[LEARNING_RESOURCES].find_one({"name": name}):
        raise HTTPException(status_code=409, detail="A resource with this name already exists.")
    doc = {**payload, "name": name, "url": url,
           "created_at": utcnow(), "updated_at": utcnow()}
    result = db[LEARNING_RESOURCES].insert_one(doc)
    return {"message": "Resource created.", "id": str(result.inserted_id)}


@router.put("/resources/{resource_id}")
def update_resource(resource_id: str, payload: dict, admin=Depends(get_admin_user)):
    db = get_db()
    if not ObjectId.is_valid(resource_id):
        raise HTTPException(status_code=422, detail="Invalid resource identifier.")
    update = {k: v for k, v in payload.items() if k in
              ("category", "skill", "type", "url", "level", "description") and v is not None}
    update["updated_at"] = utcnow()
    result = db[LEARNING_RESOURCES].update_one({"_id": ObjectId(resource_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found.")
    return {"message": "Resource updated."}


@router.delete("/resources/{resource_id}", status_code=204)
def delete_resource(resource_id: str, admin=Depends(get_admin_user)):
    db = get_db()
    if not ObjectId.is_valid(resource_id):
        raise HTTPException(status_code=422, detail="Invalid resource identifier.")
    db[LEARNING_RESOURCES].delete_one({"_id": ObjectId(resource_id)})


# ---------------- Recommendations ----------------
def _recommendation_out(r):
    return {
        "id": str(r["_id"]),
        "category": r.get("category", "General"),
        "title": r.get("title", ""),
        "description": r.get("description", ""),
        "tags": r.get("tags", []),
        "created_at": r.get("created_at").isoformat() if r.get("created_at") else None,
    }


@router.get("/recommendations")
def list_recommendations(search: str = Query("", max_length=100), admin=Depends(get_admin_user)):
    db = get_db()
    query = {}
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    docs = list(db[RECOMMENDATIONS].find(query).sort("created_at", -1).limit(300))
    return {"recommendations": [_recommendation_out(r) for r in docs]}


@router.post("/recommendations", status_code=201)
def create_recommendation(payload: dict, admin=Depends(get_admin_user)):
    db = get_db()
    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=422, detail="Recommendation title is required.")
    doc = {
        "category": payload.get("category", "General"),
        "title": title,
        "description": payload.get("description", ""),
        "tags": payload.get("tags", []),
        "created_at": utcnow(),
    }
    result = db[RECOMMENDATIONS].insert_one(doc)
    return {"message": "Recommendation created.", "id": str(result.inserted_id)}


@router.delete("/recommendations/{rec_id}", status_code=204)
def delete_recommendation(rec_id: str, admin=Depends(get_admin_user)):
    db = get_db()
    if not ObjectId.is_valid(rec_id):
        raise HTTPException(status_code=422, detail="Invalid recommendation identifier.")
    db[RECOMMENDATIONS].delete_one({"_id": ObjectId(rec_id)})


# ---------------- Notifications ----------------
@router.get("/notifications")
def admin_notifications(limit: int = Query(50, ge=1, le=200), admin=Depends(get_admin_user)):
    db = get_db()
    docs = list(db[NOTIFICATIONS].find().sort("created_at", -1).limit(limit))
    return {"notifications": [{
        "id": str(d["_id"]),
        "user_id": str(d.get("user_id", "")),
        "type": d.get("type", "info"),
        "title": d.get("title", ""),
        "message": d.get("message", ""),
        "read": d.get("read", False),
        "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
    } for d in docs]}


@router.post("/notifications", status_code=201)
def broadcast_notification(payload: dict, admin=Depends(get_admin_user)):
    db = get_db()
    title = (payload.get("title") or "").strip()
    message = (payload.get("message") or "").strip()
    if not title or not message:
        raise HTTPException(status_code=422, detail="Notification title and message are required.")
    user_id = payload.get("user_id")
    if user_id:
        create_notification(db, ObjectId(user_id), title, message, payload.get("type", "admin"))
        return {"message": "Notification sent to user."}
    users = db[USERS].find({}, {"_id": 1})
    count = 0
    for u in users:
        create_notification(db, u["_id"], title, message, payload.get("type", "admin"))
        count += 1
    return {"message": f"Notification broadcast to {count} users."}


@router.delete("/notifications/{notification_id}", status_code=204)
def delete_notification(notification_id: str, admin=Depends(get_admin_user)):
    db = get_db()
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=422, detail="Invalid notification identifier.")
    db[NOTIFICATIONS].delete_one({"_id": ObjectId(notification_id)})


# ---------------- AI usage ----------------
@router.get("/ai-usage")
def ai_usage(days: int = Query(14, ge=1, le=90), admin=Depends(get_admin_user)):
    db = get_db()
    since = utcnow() - timedelta(days=days)
    docs = list(db[AI_USAGE].find({"created_at": {"$gte": since}}))
    total = len(docs)
    by_endpoint = Counter(d.get("endpoint", "unknown") for d in docs)
    by_model = Counter(d.get("model", "unknown") for d in docs)

    per_day = []
    for i in range(days - 1, -1, -1):
        day = utcnow() - timedelta(days=i)
        start = datetime(day.year, day.month, day.day)
        end = start + timedelta(days=1)
        per_day.append({"date": start.strftime("%b %d"),
                        "count": sum(1 for d in docs if start <= d["created_at"] < end)})
    return {
        "total_calls": total,
        "by_endpoint": [{"name": k, "count": v} for k, v in by_endpoint.items()],
        "by_model": [{"name": k, "count": v} for k, v in by_model.items()],
        "per_day": per_day,
    }


# ---------------- Settings ----------------
@router.get("/settings")
def get_settings(admin=Depends(get_admin_user)):
    db = get_db()
    settings = {}
    for doc in db[SETTINGS].find():
        settings[doc["key"]] = doc.get("value")
    return {"settings": settings}


@router.put("/settings")
def update_settings(payload: dict, admin=Depends(get_admin_user)):
    db = get_db()
    key = (payload.get("key") or "").strip()
    value = payload.get("value")
    if key not in ("scoring_weights", "site_options"):
        raise HTTPException(status_code=422, detail="Unknown settings key.")
    if key == "scoring_weights" and isinstance(value, dict):
        total = sum(float(v) for v in value.values())
        if abs(total - 1.0) > 0.01:
            raise HTTPException(status_code=422,
                                detail="Scoring weights must sum to 1.0 (currently %.2f)." % total)
        value = {k: float(v) for k, v in value.items()}
    db[SETTINGS].update_one(
        {"key": key}, {"$set": {"value": value, "updated_at": utcnow()}}, upsert=True
    )
    return {"message": "Settings updated."}
