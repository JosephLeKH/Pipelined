"""Pydantic output schemas for the Interview Prep Agent."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from ai.next_action import NextAction


class CompensationData(BaseModel):
    p25_total_comp: str = Field(description="25th percentile total comp, e.g. '$180k'")
    median_total_comp: str
    p75_total_comp: str
    base_range: str = Field(description="Base salary range, e.g. '$160k–$200k'")
    notes: str
    sources: list[str]


class InterviewRound(BaseModel):
    name: str
    description: str
    what_to_expect: str


class InterviewProcess(BaseModel):
    total_rounds: int
    duration_weeks: str
    difficulty: str
    rounds: list[InterviewRound]
    recent_questions: list[str]
    tips: list[str]
    sources: list[str]


class CompanyIntel(BaseModel):
    what_theyre_building: str
    tech_stack: list[str]
    culture_signals: list[str]
    recent_news: list[str]
    red_flags: list[str]
    green_flags: list[str]


class PersonalizedNotes(BaseModel):
    salary_context: str
    experience_gaps: list[str]
    relevant_experience: list[str]
    questions_to_ask: list[str]


class InterviewBriefing(BaseModel):
    company: str
    role: str
    generated_at: datetime
    compensation: CompensationData
    interview_process: InterviewProcess
    company_intel: CompanyIntel
    personalized: PersonalizedNotes
    next_action: NextAction | None = None


class MockInterviewMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class MockInterviewRequest(BaseModel):
    message: str = Field(default="", max_length=4000)
    history: list[MockInterviewMessage] = Field(default_factory=list, max_length=20)
    end_session: bool = False
