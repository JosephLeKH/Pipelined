"""Unified fit score display — prefer ai_analysis, fall back to top-level fit_score."""

SOURCE_AI_ANALYSIS = "ai_analysis"
SOURCE_FIT_SCORE = "fit_score"


def get_display_fit(application: dict) -> dict | None:
    """Return unified fit display data or None when no score exists."""
    ai_analysis = application.get("ai_analysis") or {}
    ai_score = ai_analysis.get("fit_score")
    if ai_score is not None:
        return {
            "score": ai_score,
            "reason": ai_analysis.get("summary"),
            "source": SOURCE_AI_ANALYSIS,
        }

    top_score = application.get("fit_score")
    if top_score is not None:
        return {
            "score": top_score,
            "reason": application.get("fit_score_reason"),
            "source": SOURCE_FIT_SCORE,
        }

    return None
