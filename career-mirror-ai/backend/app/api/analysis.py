"""Analysis API: run the skill-gap engine, history, what-if simulator."""
import logging
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import AI_USAGE, ANALYSES, JOBS, RESUMES, get_db, utcnow
from app.deps import (
    create_notification,
    ensure_ownership,
    get_current_user,
    get_scoring_weights,
)
from app.services.recommendations import build_recommendations, build_roadmap
from app.services.skill_matcher import compute_analysis
from app.utils.validation import validate_analysis_inputs

logger = logging.getLogger("careermirror.analysis")

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


def _candidate_profile(resume_doc, verified_skills: list) -> dict:
    extracted = resume_doc.get("extracted", {})
    return {
        "skills": extracted.get("skills", []),
        "verified_skills": [
            {"name": v["name"], "status": v.get("status")}
            for v in verified_skills if v.get("status") == "completed"
        ],
        "years_of_experience": extracted.get("years_of_experience", 0),
        "education_level": (extracted.get("education") or {}).get("level", "Not specified"),
        "certifications": extracted.get("certifications", []),
        "projects": extracted.get("projects", []),
    }


def _job_profile(job_doc) -> dict:
    parsed = job_doc.get("parsed", {})
    return {
        "required_skills": parsed.get("required_skills", []),
        "preferred_skills": parsed.get("preferred_skills", []),
        "experience_required": parsed.get("experience_required"),
        "experience_phrase": parsed.get("experience_phrase"),
        "education_required": parsed.get("education_required", "Not specified"),
        "certifications_required": parsed.get("certifications_required", []),
        "responsibilities": parsed.get("responsibilities", []),
    }


def _run_and_build(resume_doc, job_doc, user, include_verified: bool = True) -> dict:
    db = get_db()
    verified = []
    if include_verified:
        progress = db["learning_progress"].find({"user_id": user["_id"]})
        verified = [
            {"name": p["skill"], "status": p["status"]}
            for p in progress if p.get("status") in ("completed", "practicing")
        ]
    candidate = _candidate_profile(resume_doc, verified)
    job_profile = _job_profile(job_doc)
    weights = get_scoring_weights(db)

    analysis = compute_analysis(candidate, job_profile, weights)
    job_title = job_doc.get("title") or "Untitled Role"
    recommendations = build_recommendations(analysis, job_title)
    roadmap = build_roadmap(analysis, job_title)
    analysis["recommendations"] = recommendations
    analysis["roadmap"] = roadmap
    return analysis, job_title


def _analysis_out(doc):
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc["user_id"]),
        "resume_id": str(doc.get("resume_id", "")),
        "job_id": str(doc.get("job_id", "")),
        "job_title": doc.get("job_title"),
        "resume_name": doc.get("resume_name"),
        "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
        "overall_score": doc.get("overall_score"),
        "skill_match": doc.get("skill_match"),
        "experience_match": doc.get("experience_match"),
        "education_match": doc.get("education_match"),
        "project_match": doc.get("project_match"),
        "certification_match": doc.get("certification_match"),
        "weights": doc.get("weights"),
        "matched_skills": doc.get("matched_skills", []),
        "partial_skills": doc.get("partial_skills", []),
        "missing_skills": doc.get("missing_skills", []),
        "skill_stats": doc.get("skill_stats", {}),
        "breakdown": doc.get("breakdown", []),
        "recommendations": doc.get("recommendations", []),
        "roadmap": doc.get("roadmap", []),
        "candidate_profile": doc.get("candidate_profile", {}),
        "mode": doc.get("mode", "local"),
    }


@router.post("", status_code=201)
def create_analysis(payload: dict, user=Depends(get_current_user)):
    db = get_db()
    resume_id = payload.get("resume_id", "")
    job_id = payload.get("job_id", "")
    include_verified = payload.get("include_verified_skills", True)
    validate_analysis_inputs(resume_id, job_id)

    resume_doc = ensure_ownership(db, RESUMES, resume_id, user["_id"], "resume")
    job_doc = ensure_ownership(db, JOBS, job_id, user["_id"], "job description")

    analysis, job_title = _run_and_build(resume_doc, job_doc, user, include_verified)

    doc = {
        "user_id": user["_id"],
        "resume_id": ObjectId(resume_id),
        "job_id": ObjectId(job_id),
        "job_title": job_title,
        "resume_name": resume_doc.get("filename"),
        **analysis,
        "created_at": utcnow(),
    }
    result = db[ANALYSES].insert_one(doc)
    doc["_id"] = result.inserted_id

    db[AI_USAGE].insert_one({
        "user_id": user["_id"],
        "endpoint": "analysis",
        "model": "skill-matcher-local",
        "details": f"job_title={job_title}, score={analysis['overall_score']}",
        "created_at": utcnow(),
    })
    create_notification(
        db, user["_id"], "Analysis completed",
        f"Your {job_title} analysis is ready: {analysis['overall_score']:.0f}% match. "
        f"{len(analysis['missing_skills'])} skills to close.",
        "analysis", link="/app/history"
    )
    return _analysis_out(doc)


@router.get("")
def list_analyses(
    search: str = Query("", max_length=100),
    min_score: float | None = Query(None, ge=0, le=100),
    max_score: float | None = Query(None, ge=0, le=100),
    sort: str = Query("newest"),
    limit: int = Query(50, ge=1, le=200),
    user=Depends(get_current_user),
):
    db = get_db()
    query = {"user_id": user["_id"]}
    if search:
        query["job_title"] = {"$regex": search, "$options": "i"}
    if min_score is not None or max_score is not None:
        score_q = {}
        if min_score is not None:
            score_q["$gte"] = min_score
        if max_score is not None:
            score_q["$lte"] = max_score
        query["overall_score"] = score_q

    sort_map = {"newest": ("created_at", -1), "oldest": ("created_at", 1),
                "highest": ("overall_score", -1), "lowest": ("overall_score", 1)}
    sort_key, sort_dir = sort_map.get(sort, sort_map["newest"])
    docs = db[ANALYSES].find(query).sort(sort_key, sort_dir).limit(limit)
    return {"analyses": [_analysis_out(d) for d in docs]}


@router.get("/{analysis_id}")
def get_analysis(analysis_id: str, user=Depends(get_current_user)):
    db = get_db()
    return _analysis_out(ensure_ownership(db, ANALYSES, analysis_id, user["_id"], "analysis"))


@router.delete("/{analysis_id}", status_code=204)
def delete_analysis(analysis_id: str, user=Depends(get_current_user)):
    db = get_db()
    ensure_ownership(db, ANALYSES, analysis_id, user["_id"], "analysis")
    db[ANALYSES].delete_one({"_id": ObjectId(analysis_id)})


@router.post("/what-if")
def what_if(payload: dict, user=Depends(get_current_user)):
    """Simulate adding skills. Uses analysis_id (recomputes with added skills)
    or resume_id + job_id for a fresh simulation."""
    db = get_db()
    skills_to_add = [s.strip() for s in payload.get("skills", []) if s.strip()]
    analysis_id = payload.get("analysis_id")
    resume_id = payload.get("resume_id")
    job_id = payload.get("job_id")

    if analysis_id:
        analysis_doc = ensure_ownership(db, ANALYSES, analysis_id, user["_id"], "analysis")
        resume_id = str(analysis_doc["resume_id"])
        job_id = str(analysis_doc["job_id"])
    if not resume_id or not job_id:
        raise HTTPException(status_code=422, detail="Provide analysis_id (or resume_id + job_id) for the simulation.")

    resume_doc = ensure_ownership(db, RESUMES, resume_id, user["_id"], "resume")
    job_doc = ensure_ownership(db, JOBS, job_id, user["_id"], "job description")

    candidate = _candidate_profile(resume_doc, [])
    existing = {s["name"] for s in candidate["skills"]}
    for name in skills_to_add:
        if name not in existing:
            candidate["skills"].append({"name": name, "category": "Simulated",
                                        "importance": "high", "source": "simulated"})
    job_profile = _job_profile(job_doc)
    weights = get_scoring_weights(db)
    result = compute_analysis(candidate, job_profile, weights)

    db[AI_USAGE].insert_one({
        "user_id": user["_id"], "endpoint": "what-if",
        "model": "skill-matcher-local",
        "details": f"simulated={skills_to_add}",
        "created_at": utcnow(),
    })
    return {
        "base_score": analysis_doc.get("overall_score") if analysis_id else None,
        "projected_score": result["overall_score"],
        "delta": None,
        "matched_skills": result["matched_skills"],
        "partial_skills": result["partial_skills"],
        "missing_skills": result["missing_skills"],
        "skill_stats": result["skill_stats"],
        "breakdown": result["breakdown"],
    }
