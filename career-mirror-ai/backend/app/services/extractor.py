"""NLP-based information extraction from resume text.

Works fully offline:
  - section detection via heading patterns
  - skill detection against the built-in knowledge base (+ alias expansion)
  - contact info via regex
  - experience / years-of-experience estimation from date ranges
  - education level inference
  - certification detection
  - optional spaCy NER enhancement when the model is installed
"""
import logging
import re
from difflib import SequenceMatcher

from app.data.skill_data import (
    CERT_PATTERNS,
    DEGREES,
    DEGREE_LABELS,
    JOB_TITLE_PATTERNS,
    SECTION_PATTERNS,
    SKILLS,
)

logger = logging.getLogger("careermirror.extractor")

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(
    r"(?:\+?\d{1,3}[\s\-.]?)?(?:\(?\d{2,5}\)?[\s\-.]?)?\d{3,5}(?:[\s\-.]\d{3,5}){1,3}"
)
URL_RE = re.compile(r"(?:https?://)?(?:www\.)?([a-z0-9\-]+\.(?:com|in|io|dev|org|me|net|ai|github\.io))[^\s]*", re.I)
LINKEDIN_RE = re.compile(r"linkedin\.com/in/[\w\-]+", re.I)
GITHUB_RE = re.compile(r"github\.com/[\w\-]+", re.I)
DATE_RANGE_RE = re.compile(
    r"\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{4}|(?:spring|summer|fall|winter)\s*\d{4})"
    r"\s*(?:-|–|—|to|until|till)\s*"
    r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{4}|present|now|current|till date|today)\b",
    re.I,
)
YEARS_PHRASE_RE = re.compile(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?|yr)\s+of\s+(?:experience|exp)", re.I)

MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}

# Skills that are really domain labels - avoid treating them as literal tech
NOISE_SKILLS = {"sql", "api", "rest", "software", "computer", "team"}


def _normalize_token(tok: str) -> str:
    return re.sub(r"[^a-z0-9+#.]", "", tok.lower()).strip()


def _clean_text(text: str) -> str:
    text = text.replace("\r", "\n")
    # strip PDF glyph artifacts like (cid:127)
    text = re.sub(r"\(cid:\d+\)", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text)


def detect_sections(text: str) -> dict:
    """Map section type -> list of (start, end) line indices."""
    lines = text.split("\n")
    sections = {}
    current = None
    start = 0
    for idx, line in enumerate(lines):
        stripped = line.strip().strip("·•").strip()
        lowered = stripped.lower()
        if not lowered or len(stripped) > 60:
            continue
        matched = None
        for section_type, patterns in SECTION_PATTERNS.items():
            if any(re.search(p, lowered) for p in patterns):
                # Avoid matching words inside sentences (e.g. "experience" mid-line)
                if re.match(r"^[a-z /&+.,\-]+$", lowered):
                    matched = section_type
                    break
        if matched:
            if current:
                sections.setdefault(current, []).append((start, idx))
            current = matched
            start = idx
    if current:
        sections.setdefault(current, []).append((start, len(lines)))
    return sections


def get_section_text(text: str, section_type: str) -> str:
    lines = text.split("\n")
    chunks = detect_sections(text).get(section_type, [])
    return "\n\n".join("\n".join(lines[s:e]) for s, e in chunks)


def extract_name(text: str, sections: dict) -> str:
    """Name heuristic: first short non-contact line, boosted by spaCy NER if available."""
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    candidate = None
    for ln in lines[:12]:
        if len(ln) > 60 or not ln or re.match(r"^[\d@+|/\\.\-]+$", ln):
            continue
        if EMAIL_RE.search(ln) or PHONE_RE.search(ln) or URL_RE.search(ln):
            continue
        if re.match(r"^(resume|curriculum vitae|cv|profile)$", ln.lower()):
            continue
        # person-name-like line: letters/spaces/punctuation, at least two words
        if re.match(r"^[A-Za-z][A-Za-z .'\-]{2,}$", ln) and " " in ln:
            if re.search(r"(experience|skills?|education|project|summary|objective|certifications|achievements)",
                         ln.lower()):
                continue
            candidate = ln
            break
    if candidate is None:
        candidate = lines[0] if lines else ""
    # spaCy NER enhancement
    try:
        import spacy
        nlp = _get_spacy()
        doc = nlp(candidate or "")
        persons = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
        if persons:
            candidate = persons[0]
    except Exception:
        pass
    candidate = re.sub(r"\s+", " ", candidate or "").strip(" |,;-")
    # pretty-print ALL-CAPS names (e.g. "AARAV SHARMA" -> "Aarav Sharma")
    if candidate and candidate.isupper():
        candidate = candidate.title()
    return candidate[:80] if candidate else ""


_nlp_spacy = None


def _get_spacy():
    global _nlp_spacy
    if _nlp_spacy is None:
        import spacy
        try:
            _nlp_spacy = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning("spaCy model not found - run: python -m spacy download en_core_web_sm")
            _nlp_spacy = None
    return _nlp_spacy


def extract_contact(text: str) -> dict:
    contact = {}
    emails = EMAIL_RE.findall(text)
    if emails:
        contact["email"] = emails[0]
    phones = PHONE_RE.findall(text)
    if phones:
        # pick the most plausible phone (10-13 digits)
        phones = sorted({p for p in phones if re.sub(r"\D", "", p) and len(re.sub(r"\D", "", p)) >= 10},
                        key=lambda p: len(re.sub(r"\D", "", p)))
        if phones:
            contact["phone"] = phones[0]
    linkedin = LINKEDIN_RE.search(text)
    if linkedin:
        contact["linkedin"] = linkedin.group(0)
    github = GITHUB_RE.search(text)
    if github:
        contact["github"] = github.group(0)
    return contact


def extract_skills(text: str, sections: dict) -> list:
    """Find skills from the knowledge base present in the resume text."""
    from app.data.skill_data import SKILLS as KB

    # Build search text: full text + skills section emphasised
    full = text.lower()
    skills_section = get_section_text(text, "skills").lower()
    search_space = full + "\n" + skills_section * 3  # emphasise skills section

    found = []
    for name, data in KB.items():
        patterns = [name] + data.get("aliases", [])
        for pat in patterns:
            pattern = r"(?<![a-z0-9+#.])" + re.escape(_normalize_token(pat).replace(".", r"\.")) + r"(?![a-z0-9+#])"
            if re.search(pattern, search_space):
                found.append({
                    "name": name,
                    "category": data.get("category", "Other"),
                    "aliases": data.get("aliases", []),
                    "importance": data.get("importance", "medium"),
                    "source": "resume",
                })
                break
    # Also catch skills named with camel-case / punctuation variants not in KB (e.g. "NodeJS")
    for token in set(re.findall(r"\b[A-Za-z][A-Za-z0-9+#.]{2,25}\b", skills_section)):
        tok = _normalize_token(token)
        if tok in NOISE_SKILLS or len(tok) < 3:
            continue
        for name in KB:
            if _normalize_token(name) == tok or tok in {_normalize_token(a) for a in KB[name]["aliases"]}:
                break
        else:
            # fuzzy-match against KB names to catch misspellings
            best = max(KB, key=lambda k: SequenceMatcher(None, tok, _normalize_token(k)).ratio())
            if SequenceMatcher(None, tok, _normalize_token(best)).ratio() >= 0.85 and best not in [f["name"] for f in found]:
                found.append({"name": best, "category": KB[best]["category"], "aliases": KB[best]["aliases"],
                              "importance": KB[best]["importance"], "source": "resume"})
    # dedupe, keep order
    seen = set()
    result = []
    for item in found:
        if item["name"] not in seen:
            seen.add(item["name"])
            result.append(item)
    return result


def _parse_month_year(value: str):
    value = value.strip().lower()
    m = re.match(r"([a-z]+)\.?\s*(\d{4})", value)
    if m:
        return MONTHS.get(m.group(1)[:3], 1), int(m.group(2))
    m = re.match(r"(\d{4})", value)
    if m:
        return 1, int(m.group(1))
    return None, None


def estimate_years_of_experience(text: str) -> float:
    """Estimate total years of experience from date ranges and explicit phrases."""
    explicit = YEARS_PHRASE_RE.findall(text)
    if explicit:
        return round(float(explicit[0]), 1)

    months = 0.0
    for m in DATE_RANGE_RE.finditer(text):
        start_raw, end_raw = m.group(1), m.group(2)
        sm, sy = _parse_month_year(start_raw)
        em, ey = _parse_month_year(end_raw)
        if not sy or not ey:
            continue
        if end_raw.lower() in ("present", "now", "current", "till date", "today"):
            ey = 2026  # reference year; resume dates are in the past
        if ey < sy:
            continue
        months += max(0, (ey - sy) * 12 + (em or 1) - (sm or 1) + 1)
    return round(min(months / 12.0, 40), 1)


def extract_experience(text: str, sections: dict) -> dict:
    exp_text = get_section_text(text, "experience")
    lines = [ln.strip() for ln in exp_text.split("\n") if ln.strip()]
    entries = []
    current = None

    def title_hint(ln: str):
        return any(re.search(r"\b" + p + r"\b", ln.lower()) for p in JOB_TITLE_PATTERNS)

    for ln in lines:
        date_m = DATE_RANGE_RE.search(ln)
        if date_m:
            # a new entry block starts at a date line
            if current is not None and current.get("dates"):
                entries.append(current)
                current = None
            if current is None:
                current = {"title": "", "company": "", "dates": "", "bullets": []}
            current["dates"] = f"{date_m.group(1)} - {date_m.group(2)}"
            rest = (ln[: date_m.start()] + ln[date_m.end():]).strip(" |,;-")
            if rest and title_hint(rest) and not current["title"]:
                parts = re.split(r"\s*\|\s*|\s+[|\u2014-]\s+|\s+at\s+", rest, maxsplit=1)
                current["title"] = parts[0].strip()
                if len(parts) > 1:
                    current["company"] = parts[1].strip()
            continue

        if title_hint(ln):
            # a new entry starts when the current one is complete (title + dates)
            if current is not None and current.get("title") and current.get("dates"):
                entries.append(current)
                current = None
            if current is None:
                current = {"title": "", "company": "", "dates": "", "bullets": []}
            parts = re.split(r"\s*\|\s*|\s+[|\u2014-]\s+|\s+at\s+", ln, maxsplit=1)
            if not current["title"]:
                current["title"] = parts[0].strip()
            if len(parts) > 1 and not current["company"]:
                current["company"] = parts[1].strip()
            continue

        if current is None:
            continue
        if current.get("title") and current.get("dates"):
            # body line of the current entry
            if len(ln) < 140:
                current["bullets"].append(ln)
            continue
        if not re.match(r"^[•\-*\d.]", ln):
            if not current["title"] and len(ln) < 100:
                current["title"] = ln
            elif not current["company"] and len(ln) < 90:
                current["company"] = ln
        elif len(ln) < 140:
            current["bullets"].append(ln)

    if current is not None and current.get("dates"):
        entries.append(current)

    return {
        "entries": entries[:20],
        "years_of_experience": estimate_years_of_experience(text),
        "job_titles": [e["title"] for e in entries if e.get("title")][:10],
        "companies": [e["company"] for e in entries if e.get("company")][:10],
    }


def extract_education(text: str, sections: dict) -> dict:
    edu_text = get_section_text(text, "education")
    if not edu_text.strip():
        edu_text = text  # fall back to whole text
    levels = set()
    entries = []
    for pattern, level in DEGREES:
        for m in re.finditer(pattern, edu_text.lower()):
            levels.add(level)
            snippet = edu_text[max(0, m.start() - 90):m.end() + 60].replace("\n", " ")
            snippet = re.sub(r"\s+", " ", snippet).strip()
            entries.append({"level": DEGREE_LABELS[level], "detail": snippet[:160]})
    order = ["phd", "masters", "bachelors", "diploma", "high_school"]
    best = next((DEGREE_LABELS[l] for l in order if l in levels), None)
    # dedupe entries
    seen = set()
    unique = []
    for e in entries:
        if e["detail"] not in seen:
            seen.add(e["detail"])
            unique.append(e)
    return {"level": best or "Not specified", "entries": unique[:6]}


def extract_certifications(text: str, sections: dict) -> list:
    cert_text = get_section_text(text, "certifications")
    found = []
    for pat in CERT_PATTERNS:
        pattern = r"\b" + re.escape(pat) + r"\b"
        if re.search(pattern, cert_text.lower()) or re.search(pattern, text.lower()):
            # capture the sentence/line containing it
            for line in (cert_text or text).split("\n"):
                if re.search(pattern, line.lower()):
                    found.append(line.strip()[:120])
                    break
            else:
                found.append(pat.title())
    seen = set()
    result = []
    for f in found:
        if f.lower() not in seen:
            seen.add(f.lower())
            result.append(f)
    return result[:12]


def extract_projects(text: str, sections: dict) -> list:
    proj_text = get_section_text(text, "projects")
    lines = [ln.strip() for ln in proj_text.split("\n") if ln.strip()]
    projects = []
    for ln in lines:
        if not ln or len(ln) > 140:
            continue
        if re.match(r"^[•\-*\d.]", ln):
            name = re.sub(r"^[•\-*\d.\s]+", "", ln).strip()
            # prefer the short name before a separator when present
            for sep in (":", "—", "–", " - "):
                if sep in name:
                    head = name.split(sep, 1)[0].strip()
                    if 2 < len(head) < 60:
                        name = head
                    break
            if 2 < len(name) < 80 and not re.match(r"^(skills?|tools?|tech|role|responsibilities)", name.lower()):
                projects.append(name)
        elif ":" in ln and len(ln) < 90 and not EMAIL_RE.search(ln):
            name = ln.split(":", 1)[0].strip()
            if 2 < len(name) < 60:
                projects.append(name)
    seen = set()
    result = []
    for p in projects:
        key = p.lower()
        if key not in seen:
            seen.add(key)
            result.append(p)
    return result[:15]


def extract_resume(text: str) -> dict:
    """Full extraction pipeline. Returns a structured resume object."""
    text = _clean_text(text)
    if not text.strip():
        raise ValueError("Resume text is empty after parsing.")
    sections = detect_sections(text)
    skills = extract_skills(text, sections)
    experience = extract_experience(text, sections)
    education = extract_education(text, sections)
    return {
        "raw_text": text[:60000],
        "name": extract_name(text, sections),
        "contact": extract_contact(text),
        "skills": skills,
        "technical_skills": [s["name"] for s in skills if s["category"] != "Soft Skills"],
        "soft_skills": [s["name"] for s in skills if s["category"] == "Soft Skills"],
        "experience": experience,
        "education": education,
        "certifications": extract_certifications(text, sections),
        "projects": extract_projects(text, sections),
        "technologies": [s["name"] for s in skills if s["category"] in
                         ("Programming Languages", "Frontend Development", "Backend Development",
                          "Databases & Storage", "DevOps & Cloud", "AI & Machine Learning")][:30],
        "job_titles": experience["job_titles"],
        "years_of_experience": experience["years_of_experience"],
    }
