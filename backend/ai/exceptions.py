"""Domain exceptions for AI operations."""


class AIQuotaExceededError(Exception):
    """Raised when OpenRouter/LLM provider returns 429 quota exceeded."""

    def __init__(self, message: str = "AI quota reached — try again in a few minutes.") -> None:
        self.message = message
        super().__init__(message)
