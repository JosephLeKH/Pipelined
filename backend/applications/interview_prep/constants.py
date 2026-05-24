"""Interview prep and mock interview constants."""

INTERVIEW_ROUND_FOCUS: dict[str, str] = {
    "phone": (
        "Focus on recruiter-screen topics: background summary, motivation, role fit, "
        "salary expectations, and logistics."
    ),
    "technical": (
        "Focus on coding, algorithms, system design, and technical depth — include "
        "recent questions and difficulty signals for this round."
    ),
    "hm": (
        "Focus on hiring-manager topics: team fit, leadership, project impact, "
        "collaboration style, and scope of the role."
    ),
    "onsite": (
        "Focus on full onsite loop structure: multiple stakeholders, culture signals, "
        "cross-functional questions, and stamina across back-to-back rounds."
    ),
    "final": (
        "Focus on closing-round topics: executive alignment, strategic vision, "
        "offer-readiness, and high-level company direction."
    ),
}

MOCK_INTERVIEW_MAX_TURNS = 10
MOCK_INTERVIEW_DAILY_SESSION_LIMIT = 3
MOCK_INTERVIEW_RATE_LIMIT = "30/hour"
MOCK_INTERVIEW_MAX_TOKENS = 600
MOCK_INTERVIEW_DEBRIEF_MAX_TOKENS = 900
MOCK_INTERVIEW_TEMPERATURE = 0.5
MOCK_INTERVIEW_TIMEOUT_SECONDS = 45.0
