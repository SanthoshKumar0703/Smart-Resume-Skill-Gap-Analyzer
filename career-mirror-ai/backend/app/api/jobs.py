"""Job description API: create (text or file), list, retrieve, delete."""
from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.database import JOBS, get_db, utcnow
from app.deps import ensure_ownership, get_current_user
from app.services.jd_parser import parse_job_description
from app.services.resume_parser import ResumeParseError, parse_docx, parse_pdf

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _job_out(doc):
    return {
        "id": str(doc["_id"]),
        "title": doc.get("title"),
        "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
        "parsed": doc.get("parsed"),
        "preview": (doc.get("text") or "")[:200],
    }


@router.post("", status_code=201)
def create_job(payload: dict, user=Depends(get_current_user)):
    description = (payload.get("description") or "").strip()
    title = (payload.get("title") or "").strip() or "Untitled Role"
    if not description:
        raise HTTPException(status_code=422, detail="Job description is empty.")
    if len(description) > 60000:
        raise HTTPException(status_code=422, detail="Job description must be under 60,000 characters.")
    try:
        parsed = parse_job_description(description)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    parsed["title"] = title

    doc = {
        "user_id": user["_id"],
        "title": title,
        "text": description,
        "parsed": parsed,
        "created_at": utcnow(),
    }
    db = get_db()
    result = db[JOBS].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _job_out(doc)


@router.post("/upload", status_code=201)
async def create_job_from_file(
    file: UploadFile = File(...),
    title: str = Form("Untitled Role"),
    user=Depends(get_current_user),
):
    filename = (file.filename or "").lower()
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="The uploaded file is empty.")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Job description file must be smaller than 10 MB.")
    ext = "." + filename.rsplit(".", 1)[-1] if "." in filename else ""
    try:
        if ext == ".pdf":
            text = parse_pdf(content)
        elif ext == ".docx":
            text = parse_docx(content)
        elif ext == ".txt":
            text = content.decode("utf-8", errors="replace")
        else:
            raise ResumeParseError("Job description file must be a PDF, DOCX or TXT file.")
    except ResumeParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not text.strip():
        raise HTTPException(status_code=422, detail="Job description is empty.")
    return create_job({"title": title, "description": text}, user)


@router.get("")
def list_jobs(user=Depends(get_current_user)):
    db = get_db()
    docs = db[JOBS].find({"user_id": user["_id"]}).sort("created_at", -1).limit(50)
    return {"jobs": [_job_out(d) for d in docs]}


@router.get("/{job_id}")
def get_job(job_id: str, user=Depends(get_current_user)):
    db = get_db()
    return _job_out(ensure_ownership(db, JOBS, job_id, user["_id"], "job description"))


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: str, user=Depends(get_current_user)):
    db = get_db()
    ensure_ownership(db, JOBS, job_id, user["_id"], "job description")
    db[JOBS].delete_one({"_id": ObjectId(job_id)})
