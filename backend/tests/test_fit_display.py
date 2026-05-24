"""Tests for applications/fit_display.py — unified fit score read-time merge."""

from applications.fit_display import SOURCE_AI_ANALYSIS, SOURCE_FIT_SCORE, get_display_fit


def test_get_display_fit_prefers_ai_analysis():
    app = {
        "ai_analysis": {"fit_score": 85, "summary": "Strong match"},
        "fit_score": 60,
        "fit_score_reason": "Fallback reason",
    }

    result = get_display_fit(app)

    assert result == {
        "score": 85,
        "reason": "Strong match",
        "source": SOURCE_AI_ANALYSIS,
    }


def test_get_display_fit_falls_back_to_top_level_fit_score():
    app = {"fit_score": 72, "fit_score_reason": "Good overlap"}

    result = get_display_fit(app)

    assert result == {
        "score": 72,
        "reason": "Good overlap",
        "source": SOURCE_FIT_SCORE,
    }


def test_get_display_fit_returns_none_when_no_score():
    assert get_display_fit({}) is None
    assert get_display_fit({"ai_analysis": {"fit_score": None}}) is None


def test_get_display_fit_falls_back_when_ai_analysis_score_is_null():
    app = {
        "ai_analysis": {"fit_score": None, "summary": "Pending"},
        "fit_score": 55,
        "fit_score_reason": "Interview prep score",
    }

    result = get_display_fit(app)

    assert result == {
        "score": 55,
        "reason": "Interview prep score",
        "source": SOURCE_FIT_SCORE,
    }
