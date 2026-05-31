"""State machine to parse <step>...</step> tags from token stream."""

from enum import Enum


class ParserState(Enum):
    """Parser states for step tag detection."""

    NORMAL = "normal"
    IN_STEP = "in_step"
    CLOSING_STEP = "closing_step"


class StepParser:
    """Parse <step>...</step> tags from streaming text tokens."""

    def __init__(self):
        self.state = ParserState.NORMAL
        self.current_step = ""
        self.buffer = ""

    def feed(self, token: str) -> list[tuple[str, str]]:
        """Feed a token and return list of (type, content) tuples: ("step", text) or ("token", text).

        Types:
        - ("step", "step content without tags") — complete step found
        - ("token", "text") — regular token, not in step
        """
        events: list[tuple[str, str]] = []
        self.buffer += token

        while self.buffer:
            if self.state == ParserState.NORMAL:
                # Look for opening <step> tag
                step_start = self.buffer.find("<step>")
                if step_start == -1:
                    # No step tag found; yield everything as tokens
                    events.append(("token", self.buffer))
                    self.buffer = ""
                else:
                    # Found opening tag
                    if step_start > 0:
                        events.append(("token", self.buffer[:step_start]))
                    self.buffer = self.buffer[step_start + 6:]  # Skip '<step>'
                    self.state = ParserState.IN_STEP
                    self.current_step = ""

            elif self.state == ParserState.IN_STEP:
                # Look for closing </step> tag
                step_end = self.buffer.find("</step>")
                if step_end == -1:
                    # Not found yet; accumulate in current_step
                    self.current_step += self.buffer
                    self.buffer = ""
                else:
                    # Found closing tag
                    self.current_step += self.buffer[:step_end]
                    self.buffer = self.buffer[step_end + 7:]  # Skip '</step>'
                    if self.current_step.strip():
                        events.append(("step", self.current_step.strip()))
                    self.current_step = ""
                    self.state = ParserState.NORMAL

        return events

    def flush(self) -> list[tuple[str, str]]:
        """Return any remaining buffered data (if parser ends mid-step, still return it)."""
        events: list[tuple[str, str]] = []
        if self.state == ParserState.IN_STEP and self.current_step.strip():
            # We're still in a step; flush it as a step (incomplete)
            events.append(("step", self.current_step.strip()))
            self.current_step = ""
        elif self.buffer:
            events.append(("token", self.buffer))
        self.state = ParserState.NORMAL
        self.buffer = ""
        return events
