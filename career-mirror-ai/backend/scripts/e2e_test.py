"""End-to-end API smoke test for Career Mirror AI.

Run with:  python scripts/e2e_test.py   (backend must be running on :8000)
"""
import json
import os
import sys
import time

import httpx

BASE = os.getenv("API_BASE", "http://localhost:8000")
EMAIL = "test.user@example.com"
PASSWORD = "TestPass123"
ADMIN_EMAIL = "admin@careermirror.dev"
ADMIN_PASS = "AdminPass123"

RESULTS = []


def check(name, condition, extra=""):
    status = "PASS" if condition else "FAIL"
    RESULTS.append((status, name))
    print(f"[{status}] {name} {extra}")
    if not condition:
        raise SystemExit(1)


def cleanup():
    """Remove test users and their data so the test is idempotent."""
    from pymongo import MongoClient
    db = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=3000)["career_mirror_ai"]
    users = list(db["users"].find({"email": {"$in": [EMAIL, ADMIN_EMAIL]}}, {"_id": 1}))
    for u in users:
        db["users"].delete_one({"_id": u["_id"]})
        db["resumes"].delete_many({"user_id": u["_id"]})
        db["job_descriptions"].delete_many({"user_id": u["_id"]})
        db["analyses"].delete_many({"user_id": u["_id"]})
        db["learning_progress"].delete_many({"user_id": u["_id"]})
        db["notifications"].delete_many({"user_id": u["_id"]})
        db["password_reset_tokens"].delete_many({"user_id": u["_id"]})
        db["ai_usage"].delete_many({"user_id": u["_id"]})


def main():
    cleanup()
    client = httpx.Client(base_url=BASE, timeout=60)

    # health
    r = client.get("/api/health")
    check("health endpoint", r.status_code == 200 and r.json().get("mongo") == "connected", r.text[:120])

    # register user
    r = client.post("/api/auth/register", json={
        "full_name": "Test User", "email": EMAIL, "password": PASSWORD, "terms_accepted": True})
    check("register user", r.status_code == 201, r.text[:200])
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # duplicate email
    r = client.post("/api/auth/register", json={
        "full_name": "Test User", "email": EMAIL, "password": PASSWORD, "terms_accepted": True})
    check("duplicate email rejected", r.status_code == 409, r.text[:100])

    # login
    r = client.post("/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    check("login", r.status_code == 200)
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # wrong password
    r = client.post("/api/auth/login", json={"email": EMAIL, "password": "WrongPass123"})
    check("wrong password rejected", r.status_code == 401)

    # me
    r = client.get("/api/auth/me", headers=headers)
    check("auth/me", r.status_code == 200 and r.json()["email"] == EMAIL)

    # upload DOCX resume
    samples = os.path.join(os.path.dirname(__file__), "..", "..", "samples")
    with open(os.path.join(samples, "sample_resume.docx"), "rb") as f:
        r = client.post("/api/resumes/upload", headers=headers, files={"file": ("resume.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    check("upload DOCX resume", r.status_code == 201, r.text[:200])
    resume_docx = r.json()
    check("resume extraction (name)", resume_docx["extracted"]["name"].lower().find("aarav") >= 0,
          resume_docx["extracted"].get("name", ""))
    check("resume extraction (skills)", len(resume_docx["extracted"]["skills"]) > 15,
          str(len(resume_docx["extracted"]["skills"])) + " skills")

    # upload PDF resume
    with open(os.path.join(samples, "sample_resume.pdf"), "rb") as f:
        r = client.post("/api/resumes/upload", headers=headers, files={"file": ("resume.pdf", f, "application/pdf")})
    check("upload PDF resume", r.status_code == 201, r.text[:200])
    resume_pdf = r.json()

    # invalid file type
    r = client.post("/api/resumes/upload", headers=headers, files={"file": ("notes.txt", b"hello world", "text/plain")})
    check("invalid file type rejected", r.status_code == 415, r.text[:120])

    # create job description
    with open(os.path.join(samples, "sample_job_description.txt"), encoding="utf-8") as f:
        jd = f.read()
    r = client.post("/api/jobs", headers=headers, json={"title": "Full Stack Developer (React + Python)", "description": jd})
    check("create job description", r.status_code == 201, r.text[:200])
    job = r.json()
    parsed = job["parsed"]
    check("JD parsing (required skills)", len(parsed["required_skills"]) >= 8,
          str([s["name"] for s in parsed["required_skills"]]))
    check("JD parsing (experience)", parsed["experience_required"] == 3,
          str(parsed.get("experience_required")))
    check("JD parsing (education)", parsed["education_required"] == "Bachelor's degree",
          str(parsed.get("education_required")))
    check("JD parsing (certifications)", len(parsed["certifications_required"]) >= 1,
          str(parsed.get("certifications_required")))

    # run analysis
    r = client.post("/api/analysis", headers=headers,
                    json={"resume_id": resume_docx["id"], "job_id": job["id"]})
    check("run analysis", r.status_code == 201, r.text[:300])
    analysis = r.json()
    score = analysis["overall_score"]
    print(f"  >>> OVERALL SCORE: {score}%  (must depend on actual data)")
    check("score in valid range", 0 <= score <= 100)
    check("score is data-driven (not 0/100 edge)", 20 < score < 95, f"score={score}")
    names = {s["name"] for s in analysis["matched_skills"]}
    check("Python matched", "Python" in names)
    check("React matched", "React" in names)
    check("MongoDB matched", "MongoDB" in names)
    missing_names = {s["name"] for s in analysis["missing_skills"]}
    check("Docker identified as gap", "Docker" in missing_names, str(sorted(missing_names))[:200])
    check("AWS identified as gap", "AWS" in missing_names)
    check("Kubernetes identified as gap", "Kubernetes" in missing_names)
    partial_names = {s["name"] for s in analysis["partial_skills"]}
    check("FastAPI partial (via Flask)", "FastAPI" in partial_names, str(sorted(partial_names))[:200])
    check("recommendations generated", len(analysis["recommendations"]) >= 4)
    check("roadmap generated", len(analysis["roadmap"]) >= 4)
    check("breakdown present", len(analysis["breakdown"]) == 6)

    # analysis history
    r = client.get("/api/analysis", headers=headers)
    check("analysis history", r.status_code == 200 and len(r.json()["analyses"]) >= 1)

    # what-if simulator
    r = client.post("/api/analysis/what-if", headers=headers,
                    json={"analysis_id": analysis["id"], "skills": ["Docker", "AWS"]})
    check("what-if simulator", r.status_code == 200, r.text[:200])
    whatif = r.json()
    print(f"  >>> What-if: base {score}% + Docker+AWS = {whatif['projected_score']}%")
    check("what-if increases score", whatif["projected_score"] > score,
          f"{score} -> {whatif['projected_score']}")

    # learning progress + roadmap
    r = client.get("/api/learning/roadmap", headers=headers)
    check("roadmap fetch", r.status_code == 200 and len(r.json()["steps"]) >= 4)
    first_skill = r.json()["steps"][0]["skill"]
    r = client.post("/api/learning/progress", headers=headers,
                    json={"skill": first_skill, "status": "completed"})
    check("mark progress", r.status_code == 200)
    r = client.get("/api/learning/roadmap", headers=headers)
    check("progress reflected in roadmap", r.json()["steps"][0]["status"] == "completed")

    # notifications
    r = client.get("/api/notifications", headers=headers)
    check("notifications created", r.status_code == 200 and len(r.json()["notifications"]) >= 1)
    r = client.get("/api/notifications/unread-count", headers=headers)
    check("unread count", r.status_code == 200 and r.json()["count"] >= 1)
    nid = r.json()  # noop
    notifs = client.get("/api/notifications", headers=headers).json()["notifications"]
    r = client.put(f"/api/notifications/{notifs[0]['id']}/read", headers=headers)
    check("mark notification read", r.status_code == 200)

    # chat (fallback local engine - Ollama not installed)
    r = client.post("/api/chat", headers=headers, json={"message": "What skills am I missing?"})
    check("chat fallback reply", r.status_code == 200 and len(r.json()["reply"]) > 50, r.text[:200])
    check("chat mode is local", r.json()["mode"] == "local", r.text[:120])

    # forgot password (dev fallback)
    r = client.post("/api/auth/forgot-password", json={"email": EMAIL})
    check("forgot password dev fallback", r.status_code == 200 and r.json().get("dev_mode") is True,
          r.text[:200])
    dev_link = r.json().get("dev_link")
    check("dev reset link returned", bool(dev_link))

    # reset password with token
    token_part = dev_link.split("token=")[1].split("&")[0]
    r = client.post("/api/auth/reset-password",
                    json={"token": token_part, "email": EMAIL, "new_password": "NewPass456"})
    check("reset password", r.status_code == 200, r.text[:200])
    # old password no longer works, new one does
    r = client.post("/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    check("old password invalid after reset", r.status_code == 401)
    r = client.post("/api/auth/login", json={"email": EMAIL, "password": "NewPass456"})
    check("new password works", r.status_code == 200)
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # ---- ADMIN ----
    r = client.post("/api/auth/register", json={
        "full_name": "Admin User", "email": ADMIN_EMAIL, "password": ADMIN_PASS, "terms_accepted": True})
    check("admin bootstrap register", r.status_code == 201)
    admin_token = r.json()["token"]
    check("bootstrap role=admin", r.json()["user"]["role"] == "admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # non-admin blocked from admin API
    r = client.get("/api/admin/dashboard", headers=headers)
    check("non-admin blocked from admin API", r.status_code == 403)

    r = client.get("/api/admin/dashboard", headers=admin_headers)
    check("admin dashboard", r.status_code == 200, r.text[:200])
    dash = r.json()
    check("admin stats", dash["stats"]["total_users"] >= 2 and dash["stats"]["total_analyses"] >= 1)
    check("admin charts", len(dash["user_growth"]) == 14 and len(dash["score_distribution"]) == 5)

    r = client.get("/api/admin/users", headers=admin_headers)
    check("admin list users", r.status_code == 200 and len(r.json()["users"]) >= 2)

    r = client.get("/api/admin/analyses", headers=admin_headers)
    check("admin list analyses", r.status_code == 200 and len(r.json()["analyses"]) >= 1)

    r = client.get("/api/admin/skills", headers=admin_headers)
    check("admin list skills", r.status_code == 200 and len(r.json()["skills"]) >= 50)

    r = client.post("/api/admin/skills", headers=admin_headers, json={
        "name": "TestSkillXYZ", "category": "Testing", "importance": "medium"})
    check("admin create skill", r.status_code == 201, r.text[:150])
    r = client.get("/api/admin/skills?search=TestSkillXYZ", headers=admin_headers)
    sid = r.json()["skills"][0]["id"]
    r = client.put(f"/api/admin/skills/{sid}", headers=admin_headers, json={"importance": "high"})
    check("admin update skill", r.status_code == 200)
    r = client.delete(f"/api/admin/skills/{sid}", headers=admin_headers)
    check("admin delete skill", r.status_code == 204)

    r = client.get("/api/admin/ai-usage", headers=admin_headers)
    check("admin ai-usage", r.status_code == 200 and r.json()["total_calls"] >= 3, r.text[:150])

    r = client.put("/api/admin/settings", headers=admin_headers,
                   json={"key": "scoring_weights",
                         "value": {"required_skills": 0.5, "preferred_skills": 0.2,
                                   "experience": 0.1, "education": 0.1,
                                   "projects": 0.05, "certifications": 0.05}})
    check("admin update scoring weights", r.status_code == 200, r.text[:150])
    r = client.put("/api/admin/settings", headers=admin_headers,
                   json={"key": "scoring_weights",
                         "value": {"required_skills": 0.9}})
    check("admin weights validation (sum != 1)", r.status_code == 422)

    # admin broadcast notification
    r = client.post("/api/admin/notifications", headers=admin_headers,
                    json={"title": "Hello everyone", "message": "Testing broadcast"})
    check("admin broadcast notification", r.status_code == 201, r.text[:150])
    r = client.get("/api/notifications", headers=headers)
    check("broadcast received by user", any(n["title"] == "Hello everyone" for n in r.json()["notifications"]))

    # google auth without config -> clear error
    r = client.post("/api/auth/google", json={"credential": "abc"})
    check("google auth not configured -> clear error", r.status_code == 503, r.text[:150])

    # role change
    users = client.get("/api/admin/users?search=test.user", headers=admin_headers).json()["users"]
    target = next(u for u in users if u["email"] == EMAIL)
    r = client.put(f"/api/admin/users/{target['id']}", headers=admin_headers, json={"active": False})
    check("admin deactivate user", r.status_code == 200)
    r = client.post("/api/auth/login", json={"email": EMAIL, "password": "NewPass456"})
    check("deactivated user cannot log in", r.status_code == 403, r.text[:150])
    r = client.put(f"/api/admin/users/{target['id']}", headers=admin_headers, json={"active": True})
    check("admin reactivate user", r.status_code == 200)

    print("\n================ E2E RESULTS ================")
    passed = sum(1 for s, _ in RESULTS if s == "PASS")
    print(f"{passed}/{len(RESULTS)} checks passed")
    if passed != len(RESULTS):
        sys.exit(1)
    print("ALL CHECKS PASSED ✅")


if __name__ == "__main__":
    main()
