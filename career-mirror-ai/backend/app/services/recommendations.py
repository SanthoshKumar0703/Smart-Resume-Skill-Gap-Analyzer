"""Personalized recommendations + learning roadmap generation.

Every recommendation maps directly to an identified gap - nothing random.
"""
import logging

from app.data.skill_data import SKILLS

logger = logging.getLogger("careermirror.recommend")

_PRIORITY_LABEL = {"high": "High", "medium": "Medium", "low": "Low"}


def build_recommendations(analysis: dict, job_title: str | None) -> list:
    """Generate recommendations from an analysis result."""
    recs = []

    missing = sorted(analysis.get("missing_skills", []),
                     key=lambda s: (0 if s.get("importance") == "high" else 1, s.get("difficulty", 3)))
    partial = analysis.get("partial_skills", [])

    for s in missing[:6]:
        recs.append({
            "category": "Skill Gap",
            "skill": s["name"],
            "priority": _PRIORITY_LABEL.get(s.get("importance", "medium"), "Medium"),
            "title": f"Learn {s['name']}",
            "description": s.get("why", ""),
            "action": s.get("recommendation", f"Learn {s['name']} fundamentals and build a small project with it."),
            "practice_task": s.get("practice", ""),
            "project_idea": s.get("project", ""),
            "resources": s.get("resources", []),
            "effort_hours": s.get("effort_hours", 15),
        })

    for s in partial[:4]:
        cand = s.get("candidate_skill")
        recs.append({
            "category": "Skill Refinement",
            "skill": s["name"],
            "priority": _PRIORITY_LABEL.get(s.get("importance", "medium"), "Medium"),
            "title": f"Deepen {s['name']} (from {cand})",
            "description": s.get("reason", ""),
            "action": f"Go beyond {cand} and complete a production-grade {s['name']} project to prove depth.",
            "practice_task": f"Build one non-trivial project using {s['name']} and document it.",
            "project_idea": f"Rebuild a real feature of {job_title or 'your target role'} using {s['name']}.",
            "resources": SKILLS.get(s["name"], {}).get("resources", []),
            "effort_hours": SKILLS.get(s["name"], {}).get("effort_hours", 15),
        })

    # Overall advice
    stats = analysis.get("skill_stats", {})
    overall = analysis.get("overall_score", 0)
    if overall < 50:
        recs.insert(0, {
            "category": "Strategy",
            "skill": None,
            "priority": "High",
            "title": "Build a foundation plan",
            "description": f"You match {stats.get('matched', 0)} of {stats.get('total', 0)} listed skills "
                           f"({overall:.0f}% overall). Focus on the highest-priority gaps first.",
            "action": "Start with the first phase of your learning roadmap and schedule 1-2 hours daily.",
            "practice_task": "Complete the Phase 1 skills before applying to this role.",
            "project_idea": "Combine the roadmap's practice tasks into one portfolio project.",
            "resources": [],
            "effort_hours": 20,
        })
    elif overall >= 80:
        recs.insert(0, {
            "category": "Strategy",
            "skill": None,
            "priority": "High",
            "title": "You're a strong candidate - prepare to interview",
            "description": f"Your profile matches {overall:.0f}% of this job. Focus on interview preparation "
                           f"and any remaining partial matches.",
            "action": "Practice system design and behavioral interviews for this role.",
            "practice_task": "Run 2 mock interviews focused on your matched skills.",
            "project_idea": "Polish your best project and prepare a 10-minute demo.",
            "resources": [],
            "effort_hours": 10,
        })

    return recs


def build_roadmap(analysis: dict, job_title: str | None) -> list:
    """Turn missing/partial skills into a phased learning roadmap."""
    steps = []

    def entry_for(skill: dict, phase: int, phase_title: str):
        return {
            "skill": skill["name"],
            "phase": phase,
            "phase_title": phase_title,
            "difficulty": skill.get("difficulty", 2),
            "difficulty_label": {1: "Beginner", 2: "Beginner", 3: "Intermediate",
                                 4: "Advanced", 5: "Advanced"}.get(skill.get("difficulty", 2)),
            "effort_hours": skill.get("effort_hours", 15),
            "importance": skill.get("importance", "medium"),
            "resources": skill.get("resources", []),
            "practice_task": skill.get("practice", "") or f"Learn {skill['name']} fundamentals.",
            "project_idea": skill.get("project", ""),
            "status": "not_started",
        }

    missing = sorted(analysis.get("missing_skills", []),
                     key=lambda s: (0 if s.get("importance") == "high" else 1,
                                    0 if s.get("required") else 1,
                                    s.get("difficulty", 3)))
    partial = analysis.get("partial_skills", [])

    phase_defs = [
        (1, "Foundations - learn the fundamentals"),
        (2, "Core Competency - build working knowledge"),
        (3, "Advanced & Hands-On - deepen with practice"),
        (4, "Ship It - portfolio project & deployment"),
    ]
    all_skills = missing + partial
    for idx, skill in enumerate(all_skills[:12]):
        phase_no, phase_title = phase_defs[min(idx // 3, 3)]
        steps.append(entry_for(skill, phase_no, phase_title))

    if not steps:
        steps.append({
            "skill": job_title or "Target Role",
            "phase": 1,
            "phase_title": "You're aligned - keep sharpening",
            "difficulty": 1,
            "difficulty_label": "Beginner",
            "effort_hours": 5,
            "importance": "medium",
            "resources": [],
            "practice_task": "Keep your portfolio updated and practice interview questions.",
            "project_idea": "Add one more production-grade feature to your best project.",
            "status": "not_started",
        })
    return steps
