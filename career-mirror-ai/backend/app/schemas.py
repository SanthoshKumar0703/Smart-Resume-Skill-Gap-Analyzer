"""Pydantic request/response schemas for the API."""
from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------- Auth ----------------
class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: str
    password: str
    terms_accepted: bool = False


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    email: str
    new_password: str


class UserPublic(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    active: bool
    avatar: Optional[str] = None
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


# ---------------- Resumes ----------------
class ResumeExtracted(BaseModel):
    name: str = ""
    contact: dict = {}
    skills: list = []
    technical_skills: list = []
    soft_skills: list = []
    experience: dict = {}
    education: dict = {}
    certifications: list = []
    projects: list = []
    technologies: list = []
    job_titles: list = []
    years_of_experience: float = 0


class ResumeOut(BaseModel):
    id: str
    filename: str
    size: int
    created_at: str
    extracted: Optional[ResumeExtracted] = None


# ---------------- Jobs ----------------
class JobCreateRequest(BaseModel):
    title: Optional[str] = None
    description: str


class JobOut(BaseModel):
    id: str
    title: Optional[str] = None
    created_at: str
    parsed: dict = {}


# ---------------- Analysis ----------------
class AnalysisRequest(BaseModel):
    resume_id: str
    job_id: str
    include_verified_skills: bool = True


class WhatIfRequest(BaseModel):
    analysis_id: Optional[str] = None
    resume_id: Optional[str] = None
    job_id: Optional[str] = None
    skills: list[str] = Field(default_factory=list)


class AnalysisOut(BaseModel):
    id: str
    user_id: str
    resume_id: str
    job_id: str
    job_title: Optional[str] = None
    created_at: str
    overall_score: float
    skill_match: float
    experience_match: float
    education_match: float
    project_match: float
    certification_match: float
    weights: dict
    matched_skills: list
    partial_skills: list
    missing_skills: list
    skill_stats: dict
    breakdown: list
    recommendations: list
    roadmap: list
    candidate_profile: dict


# ---------------- Learning ----------------
class ProgressUpdateRequest(BaseModel):
    skill: str
    status: str  # not_started | learning | practicing | completed


# ---------------- Chat ----------------
class ChatRequest(BaseModel):
    message: str


# ---------------- Notifications ----------------
class NotificationCreate(BaseModel):
    type: str = "info"
    title: str
    message: str
    user_id: Optional[str] = None  # None = broadcast


# ---------------- Admin ----------------
class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    active: Optional[bool] = None


class SkillCreate(BaseModel):
    name: str
    category: str = "Other"
    aliases: list[str] = []
    related: list[str] = []
    importance: str = "medium"
    difficulty: int = 2
    effort_hours: int = 10
    why: str = ""
    practice: str = ""
    project: str = ""
    resources: list[dict] = []


class SkillUpdate(BaseModel):
    category: Optional[str] = None
    aliases: Optional[list[str]] = None
    related: Optional[list[str]] = None
    importance: Optional[str] = None
    difficulty: Optional[int] = None
    effort_hours: Optional[int] = None
    why: Optional[str] = None
    practice: Optional[str] = None
    project: Optional[str] = None
    resources: Optional[list[dict]] = None


class ResourceCreate(BaseModel):
    name: str
    category: str = "Other"
    skill: str = ""
    type: str = "course"
    url: str
    level: str = "beginner"
    description: str = ""


class ResourceUpdate(BaseModel):
    category: Optional[str] = None
    skill: Optional[str] = None
    type: Optional[str] = None
    url: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None


class SettingsUpdate(BaseModel):
    key: str
    value: dict[str, Any]
