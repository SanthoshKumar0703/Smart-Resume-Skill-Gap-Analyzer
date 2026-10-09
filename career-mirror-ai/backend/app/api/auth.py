"""Authentication API: register, login, Google OAuth, password reset."""
import logging
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.database import PASSWORD_RESET_TOKENS, USERS, get_db, utcnow
from app.deps import get_current_user, public_user
from app.schemas import (
    AuthResponse,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UserPublic,
)
from app.utils.emails import log_dev_reset_link, send_password_reset_email
from app.utils.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    sha256_hex,
    verify_password,
)
from app.utils.validation import validate_email, validate_password_strength

logger = logging.getLogger("careermirror.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])

RESET_TOKEN_TTL_MINUTES = 60


def _maybe_promote_admin(email: str) -> str:
    """ADMIN_BOOTSTRAP_EMAIL: the specified account becomes admin (dev tool)."""
    if settings.ADMIN_BOOTSTRAP_EMAIL and email == settings.ADMIN_BOOTSTRAP_EMAIL:
        return "admin"
    return "user"


def _issue_token(user) -> AuthResponse:
    token = create_access_token(str(user["_id"]), user.get("role", "user"))
    return AuthResponse(token=token, user=UserPublic(**public_user(user)))


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest):
    db = get_db()
    site = db["settings"].find_one({"key": "site_options"}) or {}
    if not (site.get("value") or {}).get("allow_registration", True):
        raise HTTPException(status_code=403, detail="Registration is currently disabled by the administrator.")

    email = validate_email(payload.email)
    name = (payload.full_name or "").strip()
    if len(name) < 2:
        raise HTTPException(status_code=422, detail="Full name must be at least 2 characters.")
    if not payload.terms_accepted:
        raise HTTPException(status_code=422, detail="You must accept the Terms & Conditions.")
    validate_password_strength(payload.password)

    if db[USERS].find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered. Try logging in instead.")

    user = {
        "full_name": name,
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": _maybe_promote_admin(email),
        "active": True,
        "google_id": None,
        "avatar": None,
        "verified_skills": [],
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    result = db[USERS].insert_one(user)
    user["_id"] = result.inserted_id
    logger.info("New user registered: %s (role=%s)", email, user["role"])
    return _issue_token(user)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    db = get_db()
    email = validate_email(payload.email)
    if not payload.password:
        raise HTTPException(status_code=422, detail="Password is required.")

    user = db[USERS].find_one({"email": email})
    if user is None or not user.get("password_hash"):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password. If you signed up with Google, use Google login.",
        )
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact support.")

    # dev convenience: promote the bootstrap admin on login too
    if settings.ADMIN_BOOTSTRAP_EMAIL and email == settings.ADMIN_BOOTSTRAP_EMAIL and user.get("role") != "admin":
        db[USERS].update_one({"_id": user["_id"]}, {"$set": {"role": "admin"}})
        user["role"] = "admin"

    db[USERS].update_one({"_id": user["_id"]}, {"$set": {"last_login": utcnow()}})
    return _issue_token(user)


@router.post("/google", response_model=AuthResponse)
def google_auth(payload: GoogleAuthRequest):
    if not settings.google_configured:
        raise HTTPException(
            status_code=503,
            detail="Google authentication is not configured. Add GOOGLE_CLIENT_ID and "
                   "GOOGLE_CLIENT_SECRET to backend/.env",
        )
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token

        import base64
        import json

        token_parts = payload.credential.split(".")
        token_payload = json.loads(
            base64.urlsafe_b64decode(
                 token_parts[1] + "=" * (-len(token_parts[1]) % 4)
            )
        )

        print("GOOGLE TOKEN AUDIENCE:", repr(token_payload.get("aud")))
        print("BACKEND CLIENT ID:", repr(settings.GOOGLE_CLIENT_ID))
        print("TOKEN AUD LENGTH:", len(token_payload.get("aud", "")))
        print("CLIENT ID LENGTH:", len(settings.GOOGLE_CLIENT_ID))

        info = google_id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
       )
    except ValueError as exc:
        logger.warning("Google token verification failed: %s", exc)
        raise HTTPException(status_code=401, detail=f"Google authentication failed: {exc}") from exc
    except Exception as exc:
        logger.warning("Google verification error: %s", exc)
        raise HTTPException(status_code=401, detail="Google authentication failed. Please try again.") from exc

    email = (info.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=422, detail="Google account has no email address.")
    name = info.get("name") or email.split("@")[0]
    google_id = str(info.get("sub", ""))

    db = get_db()
    user = db[USERS].find_one({"email": email})
    if user is None:
        user = {
            "full_name": name,
            "email": email,
            "password_hash": None,
            "role": _maybe_promote_admin(email),
            "active": True,
            "google_id": google_id,
            "avatar": info.get("picture"),
            "verified_skills": [],
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = db[USERS].insert_one(user)
        user["_id"] = result.inserted_id
        logger.info("New Google user: %s", email)
    else:
        # link Google identity to the existing account
        db[USERS].update_one(
            {"_id": user["_id"]},
            {"$set": {"google_id": google_id, "last_login": utcnow(),
                      "avatar": user.get("avatar") or info.get("picture")}},
        )
        user["google_id"] = google_id
        if not user.get("active", True):
            raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact support.")
    return _issue_token(user)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    db = get_db()
    email = validate_email(payload.email)
    user = db[USERS].find_one({"email": email})
    if user is None:
        # Do not leak whether the email exists
        return {"message": "If that email is registered, a reset link has been sent.", "dev_mode": False}

    token = generate_reset_token()
    db[PASSWORD_RESET_TOKENS].insert_one({
        "user_id": user["_id"],
        "token_hash": sha256_hex(token),
        "expires_at": utcnow() + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
        "used": False,
        "created_at": utcnow(),
    })
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}&email={email}"

    if settings.smtp_configured:
        try:
            send_password_reset_email(email, reset_url)
            return {"message": "If that email is registered, a reset link has been sent.", "dev_mode": False}
        except RuntimeError as exc:
            logger.error("SMTP failure: %s", exc)
            raise HTTPException(status_code=500, detail=str(exc))
    else:
        # Development fallback: log the link to the backend console
        log_dev_reset_link(email, reset_url)
        return {
            "message": "Development mode: SMTP not configured. The reset link was printed to the backend console.",
            "dev_mode": True,
            "dev_link": reset_url,
        }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest):
    db = get_db()
    email = validate_email(payload.email)
    if not payload.token:
        raise HTTPException(status_code=422, detail="Reset token is missing.")
    validate_password_strength(payload.new_password)

    token_doc = db[PASSWORD_RESET_TOKENS].find_one({"token_hash": sha256_hex(payload.token)})
    if token_doc is None or token_doc.get("used"):
        raise HTTPException(status_code=400, detail="This reset link is invalid or has already been used.")
    if token_doc["expires_at"] < utcnow():
        raise HTTPException(status_code=400, detail="This reset link has expired. Request a new one.")
    user = db[USERS].find_one({"_id": token_doc["user_id"]})
    if user is None or user.get("email") != email:
        raise HTTPException(status_code=400, detail="This reset link does not match your account.")

    db[USERS].update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(payload.new_password), "updated_at": utcnow()}},
    )
    db[PASSWORD_RESET_TOKENS].update_many(
        {"user_id": user["_id"]}, {"$set": {"used": True}}
    )
    return {"message": "Password updated successfully. You can now log in with your new password."}


@router.get("/me", response_model=UserPublic)
def me(user=Depends(get_current_user)):
    return UserPublic(**public_user(user))


# ---------------- Profile management ----------------
@router.put("/profile")
def update_profile(payload: dict, user=Depends(get_current_user)):
    db = get_db()
    name = (payload.get("full_name") or "").strip()
    if len(name) < 2:
        raise HTTPException(status_code=422, detail="Full name must be at least 2 characters.")
    db[USERS].update_one({"_id": user["_id"]},
                         {"$set": {"full_name": name, "updated_at": utcnow()}})
    return {"message": "Profile updated."}


@router.put("/profile/password")
def update_password(payload: dict, user=Depends(get_current_user)):
    db = get_db()
    current = payload.get("current_password", "")
    new_password = payload.get("new_password", "")
    if not user.get("password_hash"):
        raise HTTPException(status_code=422, detail="Your account uses Google login — set a password via 'Forgot password'.")
    if not verify_password(current, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    validate_password_strength(new_password)
    db[USERS].update_one({"_id": user["_id"]},
                         {"$set": {"password_hash": hash_password(new_password), "updated_at": utcnow()}})
    return {"message": "Password updated successfully."}


@router.delete("/profile", status_code=204)
def delete_profile(user=Depends(get_current_user)):
    """Delete the account and all associated data."""
    db = get_db()
    uid = user["_id"]
    db[USERS].delete_one({"_id": uid})
    for collection in ("resumes", "job_descriptions", "analyses", "learning_progress",
                       "notifications", "password_reset_tokens", "ai_usage"):
        db[collection].delete_many({"user_id": uid})
    return None
