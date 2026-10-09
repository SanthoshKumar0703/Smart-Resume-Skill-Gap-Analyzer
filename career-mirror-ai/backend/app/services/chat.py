"""AI Career Assistant.

Primary: local Ollama (e.g. llama3.2:3b) when available.
Fallback: a deterministic answer engine built from the user's real
analysis data - no paid API required for core functionality.
"""
import logging
import re

import httpx

from app.config import settings

logger = logging.getLogger("careermirror.chat")

_FALLBACK_INTRO = (
    "I'm running on the local answer engine (Ollama is not connected), "
    "so my replies are generated from your actual analysis data."
)

_FALLBACK_TEMPLATE = (
    "I'm Career Mirror AI's local assistant. "
)


def ollama_available() -> bool:
    try:
        r = httpx.get(f"{settings.OLLAMA_URL}/api/tags", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def ask_ollama(prompt: str, context: dict, model: str | None = None) -> str | None:
    """Ask Ollama. Returns None on any failure."""
    try:
        system = (
            "You are Career Mirror AI, a career coach helping a job seeker improve their "
            "resume-to-job alignment. Be specific, structured and encouraging. Use the "
            "candidate's real analysis data when relevant.\n\nCandidate context:\n"
            + _format_context(context)
        )
        payload = {
            "model": model or settings.OLLAMA_MODEL,
            "prompt": f"{system}\n\nUser question: {prompt}",
            "stream": False,
            "options": {"temperature": 0.4, "num_predict": 700},
        }
        r = httpx.post(
            f"{settings.OLLAMA_URL}/api/generate",
            json=payload,
            timeout=settings.OLLAMA_TIMEOUT_SECONDS,
        )
        if r.status_code != 200:
            logger.warning("Ollama returned status %s", r.status_code)
            return None
        data = r.json()
        return (data.get("response") or "").strip() or None
    except Exception as exc:
        logger.info("Ollama unavailable: %s", exc)
        return None


def _format_context(context: dict) -> str:
    lines = []
    if context.get("analysis"):
        a = context["analysis"]
        lines.append(f"- Job title: {a.get('job_title') or 'Unknown'}")
        lines.append(f"- Overall match: {a.get('overall_score')}%")
        lines.append(f"- Matched skills: {', '.join(m['name'] for m in a.get('matched_skills', [])[:15])}")
        lines.append(f"- Partial skills: {', '.join(p['name'] for p in a.get('partial_skills', [])[:10])}")
        lines.append(f"- Missing skills: {', '.join(m['name'] for m in a.get('missing_skills', [])[:15])}")
        if a.get("recommendations"):
            lines.append("- Top recommendations: " + "; ".join(
                r["title"] for r in a["recommendations"][:5]))
    if context.get("learning_progress"):
        completed = [p["skill"] for p in context["learning_progress"] if p.get("status") == "completed"]
        if completed:
            lines.append(f"- Skills completed in learning roadmap: {', '.join(completed[:10])}")
    if context.get("years_experience"):
        lines.append(f"- Candidate years of experience: {context['years_experience']}")
    return "\n".join(lines)


# ------------------------------------------------------------------
# Deterministic fallback engine
# ------------------------------------------------------------------
def _latest_analysis(context: dict) -> dict | None:
    return context.get("analysis")


def _fallback_reply(question: str, context: dict) -> str:
    q = question.lower()
    analysis = _latest_analysis(context)

    if not analysis:
        return (
            "I don't have any analysis data yet. Upload your resume, add a target job "
            "description, and run an analysis - then I can tell you exactly which skills "
            "you're missing and how to close the gaps."
        )

    missing = [m["name"] for m in analysis.get("missing_skills", [])]
    partial = [p["name"] for p in analysis.get("partial_skills", [])]
    matched = [m["name"] for m in analysis.get("matched_skills", [])]
    overall = analysis.get("overall_score", 0)
    recs = analysis.get("recommendations", [])

    if re.search(r"\b(missing|gap|what.*lack|weak|need to learn|should i learn)\b", q):
        if not missing and not partial:
            return (f"Great news - you have no significant skill gaps for this role! "
                    f"Your match is {overall}%. Keep your portfolio fresh and focus on interviews.")
        lines = [f"Based on your latest analysis ({overall}% match), your gaps are:"]
        if missing:
            lines.append("\nMissing skills (highest priority first):")
            for m in missing[:8]:
                lines.append(f"  - {m}")
        if partial:
            lines.append("\nPartially matched skills (worth deepening):")
            for p in analysis.get("partial_skills", [])[:5]:
                lines.append(f"  - {p['name']} (you have {p.get('candidate_skill')})")
        lines.append("\nThe fastest wins are usually the high-priority missing skills - see your "
                     "Learning Roadmap for a phased plan.")
        return "\n".join(lines)

    if re.search(r"\b(score|low|why.*match|percentage|compatib)\b", q):
        return (
            f"Your current match for this role is {overall}%. Here's the breakdown:\n"
            + "\n".join(
                f"  - {b['factor']}: {b['score']}% (weight {int(b['weight']*100)}%)"
                for b in analysis.get("breakdown", []))
            + (f"\n\nThe biggest lever is usually Required Skills "
               f"({int(analysis['weights'].get('required_skills', 0.45)*100)}% of the score). "
               f"Closing your top gaps could move you well past 80%.")
        )

    if re.search(r"\b(improve|better|how.*(learn|master)|courses?|resources)\b", q):
        m = re.search(r"\b(react|python|docker|aws|kubernetes|mongodb|fastapi|sql|node|typescript|java|flutter|graphql|redis|postgres|machine learning|ai|llm)\b", q)
        target = m.group(1).capitalize() if m else None
        if target:
            for item in analysis.get("missing_skills", []) + analysis.get("partial_skills", []):
                if item["name"].lower() == target.lower():
                    lines = [f"To improve your {target}:", f"  - {item.get('practice') or item.get('recommendation')}"]
                    if item.get("resources"):
                        lines.append("  - Resources:")
                        for r in item["resources"][:3]:
                            lines.append(f"      * {r['title']} - {r['url']}")
                    return "\n".join(lines)
            return (f"Your resume already lists {target} as a strength. To go further, build a "
                    f"portfolio project with it and be ready to explain design decisions in interviews.")
        return (
            "Here's how to improve overall:\n"
            + "\n".join(f"  - {r['title']}: {r['action']}" for r in recs[:4])
            + "\n\nTrack each skill in your Learning Roadmap - completing skills updates future analyses."
        )

    if re.search(r"\b(first|start|begin|priority|order)\b", q):
        roadmap = context.get("roadmap") or analysis.get("roadmap") or []
        if roadmap:
            first = roadmap[0]
            return (f"Start with **{first['skill']}** ({first['phase_title']}). It's "
                    f"{first['difficulty_label'].lower()} difficulty, ~{first['effort_hours']} hours of effort. "
                    f"Practice task: {first['practice_task']}. When you complete it, move to "
                    f"{roadmap[1]['skill'] if len(roadmap) > 1 else 'the next phase'}.")
        return "Check your Learning Roadmap - it lists the best order to close your gaps."

    if re.search(r"\b(project|portfolio|build)\b", q):
        ideas = [r.get("project_idea") for r in recs if r.get("project_idea")][:4]
        if ideas:
            return "Portfolio project ideas mapped to your gaps:\n" + "\n".join(f"  - {i}" for i in ideas)
        return "A strong rule: build one project per gap and put it live (deploy it). That converts 'knows about' into 'has built'."

    if re.search(r"\b(prepar|interview|role|job)\b", q):
        return (
            f"For this {analysis.get('job_title') or 'role'} interview:\n"
            f"  1. Be ready to demo projects for: {', '.join(matched[:6])}\n"
            f"  2. For partial matches ({', '.join(p['name'] for p in partial[:4]) or 'none'}), "
            f"be honest and show active learning.\n"
            f"  3. Prepare behavioral stories showing impact, not just tasks."
        )

    if re.search(r"\b(roadmap|plan|schedule|how long)\b", q):
        roadmap = context.get("roadmap") or analysis.get("roadmap") or []
        if roadmap:
            total = sum(r.get("effort_hours", 10) for r in roadmap)
            return (f"Your roadmap has {len(roadmap)} steps totalling ~{total} hours. "
                    f"At 1 hour/day that's about {max(1, round(total/30))} months. "
                    f"First step: {roadmap[0]['skill']}.")
        return "Run an analysis first, then I can build your roadmap."

    if re.search(r"\b(thank|great|awesome|nice|good)\b", q):
        return "You're welcome! Keep tracking your progress - every completed skill raises your next analysis score."

    # Generic but still grounded
    return (
        f"Here's where you stand: {overall}% match with {len(matched)} matched, "
        f"{len(partial)} partial and {len(missing)} missing skills for "
        f"{analysis.get('job_title') or 'your target role'}.\n\n"
        f"Top next step: {(recs[0]['title'] if recs else 'complete your first roadmap step')}. "
        f"You can ask me: 'What skills am I missing?', 'Why is my score low?', "
        f"'How can I improve my React skills?', 'What should I learn first?'"
    )


def answer_question(question: str, context: dict) -> dict:
    """Return {"reply": str, "mode": "ollama"|"local", "model": str}."""
    if not question or not question.strip():
        return {"reply": "Please ask me a question about your career or analysis.", "mode": "local", "model": "fallback"}

    if settings.OPENAI_API_KEY:
        # Optional: if a user configures OpenAI, we still prefer local first
        # (per project requirements). Kept intentionally unused by default.
        pass

    if ollama_available():
        reply = ask_ollama(question.strip(), context)
        if reply:
            return {"reply": reply, "mode": "ollama", "model": settings.OLLAMA_MODEL}
        return {"reply": _fallback_reply(question, context),
                "mode": "local",
                "model": "fallback",
                "notice": "Ollama responded with an error, so I used the local answer engine."}

    return {"reply": _fallback_reply(question, context), "mode": "local", "model": "fallback"}
