"""Resume upload / list / retrieval API."""
from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.database import RESUMES, get_db, utcnow
from app.deps import ensure_ownership, get_current_user
from app.services.extractor import extract_resume
from app.services.resume_parser import ResumeParseError, parse_resume
from app.utils.validation import validate_resume_upload

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


def _resume_out(doc):
    return {
        "id": str(doc["_id"]),
        "filename": doc.get("filename"),
        "size": doc.get("size", 0),
        "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
        "extracted": doc.get("extracted"),
        "has_text": bool(doc.get("text")),
    }


@router.post("/upload", status_code=201)
async def upload_resume(file: UploadFile = File(...), user=Depends(get_current_user)):
    db = get_db()
    content, ext = await validate_resume_upload(file)

    try:
        text = parse_resume(content, ext)
    except ResumeParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    try:
        extracted = extract_resume(text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    doc = {
        "user_id": user["_id"],
        "filename": file.filename or f"resume{ext}",
        "content_type": file.content_type,
        "extension": ext,
        "size": len(content),
        "text": text[:60000],
        "extracted": extracted,
        "created_at": utcnow(),
    }
    result = db[RESUMES].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _resume_out(doc)


@router.get("")
def list_resumes(user=Depends(get_current_user)):
    db = get_db()
    docs = db[RESUMES].find({"user_id": user["_id"]}).sort("created_at", -1).limit(50)
    return {"resumes": [_resume_out(d) for d in docs]}


@router.get("/{resume_id}")
def get_resume(resume_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = ensure_ownership(db, RESUMES, resume_id, user["_id"], "resume")
    return _resume_out(doc)


@router.delete("/{resume_id}", status_code=204)
def delete_resume(resume_id: str, user=Depends(get_current_user)):
    db = get_db()
    ensure_ownership(db, RESUMES, resume_id, user["_id"], "resume")
    db[RESUMES].delete_one({"_id": ObjectId(resume_id)})


@router.put("/{resume_id}/extracted")
def update_extracted(resume_id: str, payload: dict, user=Depends(get_current_user)):
    """Save user edits to the extracted resume profile."""
    db = get_db()
    doc = ensure_ownership(db, RESUMES, resume_id, user["_id"], "resume")
    current = doc.get("extracted", {})
    allowed_keys = {
        "name", "contact", "skills", "technical_skills", "soft_skills",
        "experience", "education", "certifications", "projects",
        "technologies", "job_titles", "years_of_experience",
    }
    updates = {k: v for k, v in payload.items() if k in allowed_keys}

    # keep raw_text intact; merge contact safely
    if "contact" in updates and isinstance(updates["contact"], dict):
        merged_contact = {**current.get("contact", {}), **updates["contact"]}
        updates["contact"] = merged_contact
    if "experience" in updates and isinstance(updates["experience"], dict):
        merged_exp = {**current.get("experience", {}), **updates["experience"]}
        # years_of_experience is stored at top level too
        if "years_of_experience" in updates["experience"]:
            updates["years_of_experience"] = updates["experience"]["years_of_experience"]
        updates["experience"] = merged_exp

    if "years_of_experience" in updates:
        try:
            updates["years_of_experience"] = max(0, min(50, float(updates["years_of_experience"])))
        except (TypeError, ValueError):
            updates.pop("years_of_experience", None)

    if not updates:
        raise HTTPException(status_code=422, detail="No editable fields were provided.")

    new_extracted = {**current, **updates}
    db[RESUMES].update_one({"_id": doc["_id"]}, {"$set": {"extracted": new_extracted, "updated_at": utcnow()}})
    return {"message": "Extracted profile updated.", "extracted": new_extracted}
