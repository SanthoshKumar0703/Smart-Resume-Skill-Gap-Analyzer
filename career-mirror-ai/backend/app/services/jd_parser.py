"""Job description parsing - extracts structured requirements from JD text."""
import logging
import re

from app.data.skill_data import CERT_PATTERNS, DEGREES, DEGREE_LABELS, SKILLS

logger = logging.getLogger("careermirror.jdparser")

YEARS_RE = re.compile(r"(\d+)(?:\s*[-+to]+\s*(\d+))?\s*\+?\s*(?:years?|yrs?)\b", re.I)
RESPONSIBILITY_MARKERS = ["responsibilities", "what you'll do", "what you will do", "role & responsibilities",
                          "role and responsibilities", "key responsibilities", "duties", "job duties",
                          "day to day", "about the role", "the role", "your role"]
REQUIREMENT_MARKERS = ["requirements", "qualifications", "what we look for", "what we're looking for",
                       "what we are looking for", "skills & experience", "skills and experience",
                       "you should have", "must have", "minimum qualifications", "required skills",
                       "required experience", "what you bring", "about you", "who you are"]


def _norm(tok: str) -> str:
    return re.sub(r"[^a-z0-9+#.]", "", tok.lower())


def _find_skills(text: str) -> list:
    full = text.lower()
    found = []
    for name, data in SKILLS.items():
        for pat in [name] + data.get("aliases", []):
            pattern = r"(?<![a-z0-9+#.])" + re.escape(_norm(pat).replace(".", r"\.")) + r"(?![a-z0-9+#])"
            if re.search(pattern, full):
                found.append({"name": name, "category": data.get("category", "Other"),
                              "importance": data.get("importance", "medium")})
                break
    seen = set()
    result = []
    for f in found:
        if f["name"] not in seen:
            seen.add(f["name"])
            result.append(f)
    return result


def _split_sections(text: str) -> dict:
    """Naive but effective section split for JDs."""
    lines = text.split("\n")
    current = "body"
    sections = {"body": []}
    for line in lines:
        stripped = line.strip().strip("·•").strip()
        lowered = stripped.lower().rstrip(":")
        if 1 < len(lowered) < 60 and re.match(r"^[a-z &/+\-,'\.]+$", lowered):
            if any(m in lowered for m in RESPONSIBILITY_MARKERS):
                current = "responsibilities"
            elif any(m in lowered for m in REQUIREMENT_MARKERS):
                current = "requirements"
            elif lowered in ("nice to have", "nice to have:", "nice-to-have", "nice-to-haves",
                             "nice to haves", "preferred", "preferred qualifications",
                             "bonus", "bonus points", "bonus skills"):
                current = "preferred"
            elif re.search(r"(about|who we are|the company|our mission)", lowered):
                current = "company"
            sections.setdefault(current, []).append(stripped)
        else:
            sections.setdefault(current, []).append(line)
    return {k: "\n".join(v) for k, v in sections.items()}


def parse_job_description(text: str) -> dict:
    """Extract structured requirements from JD text."""
    text = (text or "").strip()
    if not text:
        raise ValueError("Job description is empty.")

    sections = _split_sections(text)
    req_text = sections.get("requirements", "") or text
    resp_text = sections.get("responsibilities", "") or text
    combined = req_text + "\n" + resp_text + "\n" + text

    all_skills = _find_skills(text)
    req_skills = _find_skills(req_text)
    pref_skills = _find_skills(sections.get("preferred", "")) if sections.get("preferred") else []

    # skills mentioned in the body but not clearly in the requirements block ->
    # treat as preferred unless they are clearly core (appear many times)
    from collections import Counter
    counts = Counter(s["name"] for s in all_skills)
    req_names = {s["name"] for s in req_skills}
    pref_names = {s["name"] for s in pref_skills}
    body_skills = [s for s in all_skills if s["name"] not in req_names and s["name"] not in pref_names]
    for s in body_skills:
        if counts[s["name"]] >= 2:
            req_skills.append(s)
        else:
            pref_skills.append(s)

    # years of experience required
    years_reqs = []
    for m in YEARS_RE.finditer(combined):
        lo = int(m.group(1))
        hi = int(m.group(2)) if m.group(2) else None
        years_reqs.append(lo if not hi else (lo + hi) / 2)
    exp_req = max(years_reqs) if years_reqs else None
    exp_phrase = None
    if exp_req:
        for m in YEARS_RE.finditer(combined):
            if m.group(1) and int(m.group(1)) == round(exp_req):
                exp_phrase = m.group(0)
                break
        if not exp_phrase:
            exp_phrase = f"{int(exp_req)} years"

    # education required
    edu_levels = []
    for pattern, level in DEGREES:
        if re.search(pattern, combined.lower()):
            edu_levels.append(level)
    order = ["phd", "masters", "bachelors", "diploma", "high_school"]
    edu = next((DEGREE_LABELS[l] for l in order if l in edu_levels), None)

    # certifications
    certs = [c for c in CERT_PATTERNS if re.search(re.escape(c), combined.lower())][:8]

    # responsibilities (bullet lines from responsibilities section)
    responsibilities = []
    for line in resp_text.split("\n"):
        stripped = line.strip()
        if re.match(r"^[•\-*\d.)\s]", stripped) and 10 < len(stripped) < 200:
            responsibilities.append(re.sub(r"^[•\-*\d.)\s]+", "", stripped).strip())
    if not responsibilities:
        responsibilities = [ln.strip() for ln in resp_text.split("\n") if ln.strip()][:8]

    return {
        "title": None,  # set by the user when creating the JD
        "raw_text": text[:60000],
        "required_skills": req_skills,
        "preferred_skills": pref_skills,
        "experience_required": exp_req,
        "experience_phrase": exp_phrase,
        "education_required": edu or "Not specified",
        "certifications_required": certs,
        "responsibilities": responsibilities[:15],
        "technologies": [s["name"] for s in all_skills if s["category"] in
                         ("Programming Languages", "Frontend Development", "Backend Development",
                          "Databases & Storage", "DevOps & Cloud", "AI & Machine Learning")][:30],
    }
