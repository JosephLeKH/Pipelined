"""Tests for NextAction model and AI response schemas with next_action field."""

import pytest
from bson import ObjectId

from ai.next_action import VALID_INTENTS, NextAction
from applications.apply_pack.schemas import ApplyPackResponse
from applications.interview_prep.fit_score_schemas import FitScoreResponse
from applications.interview_prep.schemas import InterviewBriefing
from applications.resume_insights.schemas import ResumeInsightsResponse


class TestNextActionModel:
    """Test the NextAction Pydantic model."""

    def test_next_action_valid_intents(self):
        """Verify VALID_INTENTS constant includes expected intents."""
        assert "copy" in VALID_INTENTS
        assert "navigate" in VALID_INTENTS
        assert "note" in VALID_INTENTS
        assert "schedule" in VALID_INTENTS

    def test_next_action_validates_intent(self):
        """Verify intent field validates against VALID_INTENTS."""
        action = NextAction(
            label="Copy this",
            intent="copy",
            payload={"text": "hello"},
        )
        assert action.intent == "copy"

    def test_next_action_rejects_invalid_intent(self):
        """Verify invalid intent raises ValueError."""
        with pytest.raises(ValueError, match="intent must be one of"):
            NextAction(
                label="Invalid",
                intent="auto_apply",
                payload={},
            )

    def test_next_action_serialization(self):
        """Verify next_action serializes and deserializes correctly."""
        original = NextAction(
            label="Copy draft",
            intent="copy",
            payload={"text": "cover letter text"},
        )
        dumped = original.model_dump()
        restored = NextAction.model_validate(dumped)
        assert restored.label == "Copy draft"
        assert restored.intent == "copy"
        assert restored.payload["text"] == "cover letter text"


class TestApplyPackResponse:
    """Test ApplyPackResponse schema with next_action."""

    def test_apply_pack_response_with_next_action(self):
        """Verify ApplyPackResponse includes optional next_action."""
        response = ApplyPackResponse(
            cover_letter="Dear hiring manager...",
            linkedin_note="Great to connect!",
            next_action=NextAction(
                label="Copy cover letter draft",
                intent="copy",
                payload={"text": "Dear hiring manager..."},
            ),
        )
        assert response.next_action is not None
        assert response.next_action.intent == "copy"
        assert response.next_action.label == "Copy cover letter draft"

    def test_apply_pack_response_without_next_action(self):
        """Verify ApplyPackResponse works with next_action=None."""
        response = ApplyPackResponse(
            cover_letter="Dear hiring manager...",
            linkedin_note="Great to connect!",
        )
        assert response.next_action is None


class TestFitScoreResponse:
    """Test FitScoreResponse schema with next_action."""

    def test_fit_score_response_low_score_navigate_to_resume(self):
        """Verify low fit score (< 70) suggests navigating to Resume Insights."""
        response = FitScoreResponse(
            score=65,
            reason="Missing some key skills",
            next_action=NextAction(
                label="Open Resume Insights",
                intent="navigate",
                payload={"to": "/dashboard/app123?tab=resume"},
            ),
        )
        assert response.score == 65
        assert response.next_action.intent == "navigate"
        assert "/dashboard/app123?tab=resume" in response.next_action.payload["to"]

    def test_fit_score_response_high_score_navigate_to_apply_pack(self):
        """Verify high fit score (>= 70) suggests navigating to Apply Pack."""
        response = FitScoreResponse(
            score=85,
            reason="Excellent match",
            next_action=NextAction(
                label="Open Apply Pack",
                intent="navigate",
                payload={"to": "/dashboard/app123?tab=apply-pack"},
            ),
        )
        assert response.score == 85
        assert response.next_action.intent == "navigate"
        assert "/dashboard/app123?tab=apply-pack" in response.next_action.payload["to"]

    def test_fit_score_response_without_next_action(self):
        """Verify FitScoreResponse works with next_action=None."""
        response = FitScoreResponse(
            score=75,
            reason="Good fit",
        )
        assert response.next_action is None


class TestResumeInsightsResponse:
    """Test ResumeInsightsResponse schema with next_action."""

    def test_resume_insights_response_with_next_action(self):
        """Verify ResumeInsightsResponse includes optional next_action."""
        response = ResumeInsightsResponse(
            keyword_gaps=["Kubernetes", "Terraform"],
            section_suggestions=["Add a projects section"],
            overall_summary="Add cloud infrastructure skills",
            next_action=NextAction(
                label="Open in editor",
                intent="navigate",
                payload={"to": "/settings/resume"},
            ),
        )
        assert response.next_action is not None
        assert response.next_action.intent == "navigate"
        assert response.next_action.label == "Open in editor"


class TestInterviewBriefingResponse:
    """Test InterviewBriefing schema with next_action."""

    def test_interview_briefing_with_next_action(self):
        """Verify InterviewBriefing includes optional next_action."""
        from datetime import datetime

        briefing = InterviewBriefing(
            company="Acme Corp",
            role="Software Engineer",
            generated_at=datetime.now(),
            compensation={"p25_total_comp": "$180k", "median_total_comp": "$200k",
                         "p75_total_comp": "$220k", "base_range": "$160k–$200k",
                         "notes": "Competitive", "sources": []},
            interview_process={"total_rounds": 4, "duration_weeks": "2-3",
                              "difficulty": "Medium", "rounds": [],
                              "recent_questions": [], "tips": [],
                              "sources": []},
            company_intel={"what_theyre_building": "Cloud tools",
                          "tech_stack": ["Python"],
                          "culture_signals": ["Remote-friendly"],
                          "recent_news": [],
                          "red_flags": [],
                          "green_flags": []},
            personalized={"salary_context": "Good market rate",
                         "experience_gaps": [],
                         "relevant_experience": ["5 years Python"],
                         "questions_to_ask": []},
            next_action=NextAction(
                label="Start mock interview",
                intent="navigate",
                payload={"to": "/dashboard/app123?tab=mock-interview"},
            ),
        )
        assert briefing.next_action is not None
        assert briefing.next_action.intent == "navigate"
        assert "mock-interview" in briefing.next_action.payload["to"]

    def test_interview_briefing_without_next_action(self):
        """Verify InterviewBriefing works with next_action=None."""
        from datetime import datetime

        briefing = InterviewBriefing(
            company="Acme Corp",
            role="Software Engineer",
            generated_at=datetime.now(),
            compensation={"p25_total_comp": "$180k", "median_total_comp": "$200k",
                         "p75_total_comp": "$220k", "base_range": "$160k–$200k",
                         "notes": "Competitive", "sources": []},
            interview_process={"total_rounds": 4, "duration_weeks": "2-3",
                              "difficulty": "Medium", "rounds": [],
                              "recent_questions": [], "tips": [],
                              "sources": []},
            company_intel={"what_theyre_building": "Cloud tools",
                          "tech_stack": ["Python"],
                          "culture_signals": ["Remote-friendly"],
                          "recent_news": [],
                          "red_flags": [],
                          "green_flags": []},
            personalized={"salary_context": "Good market rate",
                         "experience_gaps": [],
                         "relevant_experience": ["5 years Python"],
                         "questions_to_ask": []},
        )
        assert briefing.next_action is None
