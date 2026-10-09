"""Skill gap analysis engine.

Semantic + alias + fuzzy matching against the skill knowledge base,
weighted scoring (configurable via admin settings), gap explanations
and personalized recommendations. Fully local - no paid APIs.
"""
import logging
import re
from difflib import SequenceMatcher

from app.ai.embeddings import semantic_sims, similarity
from app.data.skill_data import DEGREE_LABELS, SKILLS

logger = logging.getLogger("careermirror.matcher")

# Classification thresholds
SEMANTIC_MATCHED = 0.85
SEMANTIC_PARTIAL = 0.55
FUZZY_MATCHED = 92
FUZZY_PARTIAL = 70

DEFAULT_WEIGHTS = {
    "required_skills": 0.45,
    "preferred_skills": 0.20,
    "experience": 0.15,
    "education": 0.10,
    "projects": 0.05,
    "certifications": 0.05,
}

EDU_RANK = {"high_school": 0, "diploma": 1, "bachelors": 2, "masters": 3, "phd": 4}
EDU_KEYWORDS = {
    "high_school": ["high school", "12th", "secondary"],
    "diploma": ["diploma", "associate"],
    "bachelors": ["bachelor", "b.tech", "b.e", "b.sc", "bca", "b.com", "b.a", "llb", "bba", "bs "],
    "masters": ["master", "m.tech", "m.sc", "mba", "m.com", "m.a", "llm", "ms "],
    "phd": ["phd", "doctorate", "doctor of philosophy"],
}

_IMPORTANCE_WEIGHT = {"high": 1.0, "medium": 0.75, "low": 0.55}


def normalize(name: str) -> str:
    return re.sub(r"[^a-z0-9+#.]", "", (name or "").lower())


def _kb_entry(name: str) -> dict:
    return SKILLS.get(name, {})


def _alias_sets(name: str):
    entry = _kb_entry(name)
    return {normalize(name), *[normalize(a) for a in entry.get("aliases", [])]}


def _related_sets(name: str):
    return {normalize(r) for r in _kb_entry(name).get("related", [])}


def classify_skill(jd_skill: str, candidate_names: list[str],
                   candidate_sims: list[float] | None = None) -> dict:
    """Classify one JD skill against the candidate's skills.

    candidate_sims (optional) are precomputed cosine similarities of
    jd_skill vs each candidate — avoids repeated model encodes.
    Returns {"status": "matched"|"partial"|"missing", "reason": str,
             "candidate_skill": str|None, "similarity": float}
    """
    jd_norm = normalize(jd_skill)
    jd_aliases = _alias_sets(jd_skill)
    jd_related = _related_sets(jd_skill)

    best = {"status": "missing", "reason": f"No experience with {jd_skill} found in the resume.",
            "candidate_skill": None, "similarity": 0.0}

    for idx, cand in enumerate(candidate_names):
        cand_norm = normalize(cand)
        if cand_norm == jd_norm:
            return {"status": "matched", "reason": "Exact match.", "candidate_skill": cand, "similarity": 1.0}
        cand_aliases = _alias_sets(cand)
        if jd_norm in cand_aliases or cand_norm in jd_aliases:
            return {"status": "matched", "reason": f"Match via alias ({cand}).",
                    "candidate_skill": cand, "similarity": 1.0}

        sim = candidate_sims[idx] if candidate_sims is not None else similarity(jd_skill, cand)
        ratio = SequenceMatcher(None, jd_norm, cand_norm).ratio() * 100

        if sim >= SEMANTIC_MATCHED or ratio >= FUZZY_MATCHED:
            if sim >= best["similarity"]:
                best = {"status": "matched",
                        "reason": f"Semantically matches {cand} (similarity {sim:.2f}).",
                        "candidate_skill": cand, "similarity": sim}

        elif sim >= SEMANTIC_PARTIAL or ratio >= FUZZY_PARTIAL:
            if sim >= best["similarity"]:
                best = {"status": "partial",
                        "reason": f"Partially related to {cand} (similarity {sim:.2f}).",
                        "candidate_skill": cand, "similarity": sim}

    # related-technology overlap -> partial (explicit knowledge, avoids false positives)
    if best["status"] == "missing":
        jd_category = _kb_entry(jd_skill).get("category")
        related_hits = []
        for cand in candidate_names:
            cand_related = _related_sets(cand)
            if jd_norm in cand_related or normalize(cand) in jd_related:
                related_hits.append(cand)
        if related_hits:
            # prefer a related skill from the same domain (e.g. Flask for FastAPI)
            same_category = [c for c in related_hits
                             if _kb_entry(c).get("category") == jd_category]
            chosen = (same_category or related_hits)[0]
            best = {"status": "partial",
                    "reason": f"Related technology: candidate knows {chosen}.",
                    "candidate_skill": chosen, "similarity": 0.5}
    return best


def _experience_score(candidate_years, required_years) -> float:
    if not required_years:
        return 1.0 if candidate_years > 0 else 0.7
    if candidate_years <= 0:
        return 0.0
    return round(min(1.0, candidate_years / required_years), 2)


def _education_level(candidate_edu: str) -> int:
    text = (candidate_edu or "").lower()
    if not text or text == "not specified":
        return 1  # assume at least diploma-level basics; neutral-ish
    for level in ["phd", "masters", "bachelors", "diploma", "high_school"]:
        if any(kw.strip() in text for kw in EDU_KEYWORDS[level]):
            return EDU_RANK[level]
    return 1


def _education_score(candidate_edu: str, required_edu: str) -> float:
    if not required_edu or required_edu == "Not specified":
        return 1.0
    req_level = None
    for key, label in DEGREE_LABELS.items():
        if label == required_edu:
            req_level = key
            break
    if req_level is None:
        text = required_edu.lower()
        for level in ["phd", "masters", "bachelors", "diploma", "high_school"]:
            if any(kw.strip() in text for kw in EDU_KEYWORDS[level]):
                req_level = level
                break
    if req_level is None:
        return 1.0
    cand_rank = _education_level(candidate_edu)
    req_rank = EDU_RANK[req_level]
    if cand_rank >= req_rank:
        return 1.0
    if cand_rank == req_rank - 1:
        return 0.4
    return 0.0


def _certification_score(candidate_certs: list, required_certs: list) -> float:
    if not required_certs:
        return 1.0
    if not candidate_certs:
        return 0.0
    cand = " ".join(c.lower() for c in candidate_certs)
    found = sum(1 for c in required_certs if c.lower() in cand)
    return round(found / len(required_certs), 2)


def _project_score(candidate_projects: list, responsibilities: list) -> float:
    if not responsibilities:
        return 1.0
    job_mentions_projects = any(
        re.search(r"(build|develop|design|create|ship|implement|launch)", r.lower())
        for r in responsibilities
    )
    if not job_mentions_projects:
        return 1.0
    if candidate_projects:
        return 1.0
    return 0.3


def weighted_skill_score(skills: list, importance_weighted: bool = True) -> float:
    if not skills:
        return 0.0
    total = 0.0
    weight_sum = 0.0
    for s in skills:
        w = _IMPORTANCE_WEIGHT.get(s.get("importance", "medium"), 0.75) if importance_weighted else 1.0
        total += s.get("weight", 0.0) * w
        weight_sum += w
    return round(total / weight_sum if weight_sum else 0.0, 4)


def compute_analysis(candidate: dict, job: dict, weights: dict | None = None) -> dict:
    """Main analysis pipeline. candidate/job are structured dicts from
    the resume extractor / JD parser (possibly enriched with verified skills)."""
    weights = {**DEFAULT_WEIGHTS, **(weights or {})}
    weights = {k: float(v) for k, v in weights.items()}

    candidate_skill_names = [s["name"] if isinstance(s, dict) else s for s in candidate.get("skills", [])]
    verified = [v["name"] for v in candidate.get("verified_skills", [])]
    all_candidate_names = list(dict.fromkeys(candidate_skill_names + verified))

    # ---- classify skills ----
    matched, partial, missing = [], [], []
    processed_names = set()

    def process(skill_list, kind):
        for s in skill_list:
            name = s["name"] if isinstance(s, dict) else s
            if name in processed_names:
                continue  # already classified as required - avoid duplicates
            processed_names.add(name)
            entry = _kb_entry(name)
            # one batched encode per JD skill (fast) — falls back gracefully
            sims = semantic_sims(name, all_candidate_names)
            result = classify_skill(name, all_candidate_names, sims)
            item = {
                "name": name,
                "category": (s.get("category") if isinstance(s, dict) else None) or entry.get("category", "Other"),
                "importance": (s.get("importance") if isinstance(s, dict) else None) or entry.get("importance", "medium"),
                "required": kind == "required",
            }
            if result["status"] == "matched":
                item.update({
                    "candidate_skill": result["candidate_skill"],
                    "similarity": round(result["similarity"], 2),
                    "reason": result["reason"],
                    "source": "verified" if result["candidate_skill"] in verified else "resume",
                })
                matched.append(item)
            elif result["status"] == "partial":
                item.update({
                    "candidate_skill": result["candidate_skill"],
                    "similarity": round(result["similarity"], 2),
                    "reason": result["reason"],
                })
                partial.append(item)
            else:
                item.update({
                    "why": entry.get("why", f"{name} is commonly expected for this type of role."),
                    "recommendation": entry.get("practice") or f"Learn the fundamentals of {name} and build a small project with it.",
                    "practice": entry.get("practice", ""),
                    "project": entry.get("project", ""),
                    "difficulty": entry.get("difficulty", 2),
                    "effort_hours": entry.get("effort_hours", 15),
                    "resources": entry.get("resources", []),
                })
                missing.append(item)

    process(job.get("required_skills", []), "required")
    process(job.get("preferred_skills", []), "preferred")

    # ---- factor scores ----
    required_list = job.get("required_skills", [])
    preferred_list = job.get("preferred_skills", [])

    def factor(skills, items):
        """Fraction of listed skills fully matched (1.0), half-matched (0.5)."""
        if not skills:
            return 1.0
        by_name = {it["name"]: it for it in items}
        total = 0.0
        for s in skills:
            name = s["name"] if isinstance(s, dict) else s
            it = by_name.get(name)
            if not it:
                continue
            sim = it.get("similarity", 0.0)
            if sim >= 0.99:
                total += 1.0
            elif sim >= 0.4:
                total += 0.5
        return round(total / len(skills), 4)

    required_skill_score = factor(required_list, matched + partial)
    preferred_skill_score = factor(preferred_list, matched + partial)

    cand_years = candidate.get("years_of_experience", 0) or 0
    exp_score = _experience_score(cand_years, job.get("experience_required"))
    edu_score = _education_score(candidate.get("education_level", "Not specified"),
                                 job.get("education_required", "Not specified"))
    cert_score = _certification_score(candidate.get("certifications", []),
                                      job.get("certifications_required", []))
    proj_score = _project_score(candidate.get("projects", []), job.get("responsibilities", []))

    factor_scores = {
        "required_skills": required_skill_score,
        "preferred_skills": preferred_skill_score,
        "experience": exp_score,
        "education": edu_score,
        "projects": proj_score,
        "certifications": cert_score,
    }

    overall = round(100 * sum(weights[k] * factor_scores[k] for k in weights), 1)
    overall = max(0, min(100, overall))

    skill_match = round(100 * (0.6 * required_skill_score + 0.4 * preferred_skill_score), 1)

    # ---- breakdown with explanations ----
    labels = {
        "required_skills": "Required Skills",
        "preferred_skills": "Preferred Skills",
        "experience": "Experience",
        "education": "Education",
        "projects": "Projects",
        "certifications": "Certifications",
    }
    details = {
        "required_skills": f"{sum(1 for m in matched if m.get('required'))}/{len(required_list)} required skills fully matched"
                           if required_list else "No explicit required skills listed",
        "preferred_skills": f"{sum(1 for m in matched if not m.get('required'))}/{len(preferred_list)} preferred skills fully matched"
                            if preferred_list else "No explicit preferred skills listed",
        "experience": f"Candidate has {cand_years}y vs {job.get('experience_phrase') or (str(job.get('experience_required')) + 'y' if job.get('experience_required') else 'no explicit requirement')} required",
        "education": f"Candidate: {candidate.get('education_level', 'Not specified')} vs Required: {job.get('education_required', 'Not specified')}",
        "projects": f"{len(candidate.get('projects', []))} project(s) on resume"
                    + ("" if job.get("responsibilities") else " (JD lists no project-building duties)"),
        "certifications": f"{len([c for c in candidate.get('certifications', []) if c])} certification(s) vs {len(job.get('certifications_required', []))} requested",
    }
    breakdown = [
        {
            "factor": labels[k],
            "key": k,
            "score": round(100 * factor_scores[k], 1),
            "weight": weights[k],
            "weighted": round(100 * weights[k] * factor_scores[k], 1),
            "details": details[k],
        }
        for k in weights
    ]

    # ---- skill stats ----
    total_required = len(required_list) + len(preferred_list)
    skill_stats = {
        "total": total_required,
        "matched": len(matched),
        "partial": len(partial),
        "missing": len(missing),
        "matched_pct": round(100 * len(matched) / total_required, 1) if total_required else 100.0,
        "partial_pct": round(100 * len(partial) / total_required, 1) if total_required else 0.0,
        "missing_pct": round(100 * len(missing) / total_required, 1) if total_required else 0.0,
    }

    return {
        "overall_score": overall,
        "skill_match": skill_match,
        "experience_match": round(100 * exp_score, 1),
        "education_match": round(100 * edu_score, 1),
        "project_match": round(100 * proj_score, 1),
        "certification_match": round(100 * cert_score, 1),
        "weights": weights,
        "matched_skills": matched,
        "partial_skills": partial,
        "missing_skills": missing,
        "skill_stats": skill_stats,
        "breakdown": breakdown,
        "candidate_profile": {
            "years_of_experience": cand_years,
            "education_level": candidate.get("education_level", "Not specified"),
            "project_count": len(candidate.get("projects", [])),
            "certification_count": len(candidate.get("certifications", [])),
        },
    }
