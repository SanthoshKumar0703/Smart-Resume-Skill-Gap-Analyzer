"""Input validation helpers with clear, user-friendly error messages."""
import re

from fastapi import HTTPException, UploadFile

from app.config import settings

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")

ALLOWED_RESUME_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".docx"}

# Files that fail text extraction still get a meaningful error
EMPTY_FILE_THRESHOLD = 64  # bytes


def validate_email(email: str) -> str:
    email = (email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=422, detail="Email address is required.")
    if len(email) > 254:
        raise HTTPException(status_code=422, detail="Email address is too long.")
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="Invalid email address.")
    return email


def validate_password_strength(password: str) -> None:
    if not password:
        raise HTTPException(status_code=422, detail="Password is required.")
    if len(password) < 8:
        raise HTTPException(
            status_code=422, detail="Password must be at least 8 characters long."
        )
    if len(password) > 128:
        raise HTTPException(status_code=422, detail="Password must not exceed 128 characters.")
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    if not (has_upper and has_lower and has_digit):
        raise HTTPException(
            status_code=422,
            detail="Password must include upper-case, lower-case letters and a number.",
        )


async def validate_resume_upload(file: UploadFile) -> tuple[bytes, str]:
    """Validate a resume upload; returns (content_bytes, extension)."""
    filename = (file.filename or "").strip().replace("\\", "/").split("/")[-1]
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if ext not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(
            status_code=415, detail="Resume must be a PDF or DOCX file."
        )

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=422, detail="The uploaded file is empty.")
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Resume must be smaller than {settings.MAX_UPLOAD_MB} MB.",
        )
    if len(content) < EMPTY_FILE_THRESHOLD:
        raise HTTPException(
            status_code=422, detail="The file does not contain a readable document."
        )
    return content, ext


def validate_analysis_inputs(resume_id: str, job_id: str) -> None:
    from bson import ObjectId

    for value, label in ((resume_id, "resume"), (job_id, "job description")):
        if not value:
            raise HTTPException(status_code=422, detail=f"Select a {label} first.")
        if not ObjectId.is_valid(value):
            raise HTTPException(status_code=422, detail=f"Invalid {label} identifier.")
