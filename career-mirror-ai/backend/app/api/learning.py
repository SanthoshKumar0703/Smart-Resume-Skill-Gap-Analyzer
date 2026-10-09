"""Learning progress & roadmap API."""
from fastapi import APIRouter, Depends, HTTPException

from app.database import ANALYSES, LEARNING_PROGRESS, get_db, utcnow
from app.deps import create_notification, get_current_user

router = APIRouter(prefix="/api/learning", tags=["learning"])

VALID_STATUSES = {"not_started", "learning", "practicing", "completed"}


@router.get("/roadmap")
def get_roadmap(user=Depends(get_current_user)):
    db = get_db()
    analysis = db[ANALYSES].find_one(
        {"user_id": user["_id"]}, sort=[("created_at", -1)]
    )
    progress_docs = list(db[LEARNING_PROGRESS].find({"user_id": user["_id"]}))
    progress = {p["skill"]: p for p in progress_docs}

    steps = []
    if analysis:
        for step in analysis.get("roadmap", []):
            skill = step["skill"]
            p = progress.get(skill)
            step = {**step}
            step["status"] = p["status"] if p else step.get("status", "not_started")
            step["updated_at"] = p.get("updated_at").isoformat() if p and p.get("updated_at") else None
            steps.append(step)

    completed = sum(1 for s in steps if s["status"] == "completed")
    total_hours = sum(s.get("effort_hours", 10) for s in steps)
    done_hours = sum(s.get("effort_hours", 10) for s in steps
                     if s["status"] == "completed")
    return {
        "job_title": analysis.get("job_title") if analysis else None,
        "analysis_id": str(analysis["_id"]) if analysis else None,
        "steps": steps,
        "summary": {
            "total_steps": len(steps),
            "completed": completed,
            "in_progress": sum(1 for s in steps if s["status"] in ("learning", "practicing")),
            "progress_pct": round(100 * completed / len(steps), 1) if steps else 0,
            "total_hours": total_hours,
            "hours_done": done_hours,
        },
    }


@router.post("/progress")
def update_progress(payload: dict, user=Depends(get_current_user)):
    db = get_db()
    skill = (payload.get("skill") or "").strip()
    status = (payload.get("status") or "").strip()
    if not skill:
        raise HTTPException(status_code=422, detail="Skill name is required.")
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid status. Use one of: " + ", ".join(sorted(VALID_STATUSES)))

    db[LEARNING_PROGRESS].update_one(
        {"user_id": user["_id"], "skill": skill},
        {"$set": {"status": status, "updated_at": utcnow()}},
        upsert=True,
    )
    if status == "completed":
        # completed skills count as candidate skills in future analyses
        create_notification(
            db, user["_id"], "Learning milestone reached 🎉",
            f"You marked {skill} as completed. It will now count toward your next analyses.",
            "milestone", link="/app/progress"
        )
    return {"skill": skill, "status": status, "message": "Progress updated."}


@router.get("/progress")
def get_progress(user=Depends(get_current_user)):
    db = get_db()
    docs = list(db[LEARNING_PROGRESS].find({"user_id": user["_id"]}).sort("updated_at", -1))
    return {"progress": [
        {"skill": d["skill"], "status": d["status"],
         "updated_at": d["updated_at"].isoformat() if d.get("updated_at") else None}
        for d in docs
    ]}
