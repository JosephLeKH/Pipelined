"""Unit tests for copilot.step_parser.StepParser."""

import pytest

from copilot.step_parser import StepParser


class TestStepParser:
    """Test step tag parsing state machine."""

    def test_parse_empty_string(self):
        """Feed empty string returns no events."""
        parser = StepParser()
        events = parser.feed("")
        assert events == []

    def test_parse_plain_text(self):
        """Feed plain text (no step tags) returns token events."""
        parser = StepParser()
        events = parser.feed("Hello world")
        assert len(events) == 1
        assert events[0] == ("token", "Hello world")

    def test_parse_single_step_complete(self):
        """Feed complete step tag returns step event."""
        parser = StepParser()
        events = parser.feed("<step>Processing data</step>")
        assert len(events) == 1
        assert events[0] == ("step", "Processing data")

    def test_parse_step_with_text_before(self):
        """Feed text before step tag."""
        parser = StepParser()
        events = parser.feed("Start <step>Working</step>")
        assert len(events) == 2
        assert events[0] == ("token", "Start ")
        assert events[1] == ("step", "Working")

    def test_parse_step_with_text_after(self):
        """Feed text after step tag."""
        parser = StepParser()
        events = parser.feed("<step>Working</step> done")
        assert len(events) == 2
        assert events[0] == ("step", "Working")
        assert events[1] == ("token", " done")

    def test_parse_multiple_steps(self):
        """Feed multiple complete step tags."""
        parser = StepParser()
        text = "<step>First</step> text <step>Second</step>"
        events = parser.feed(text)
        assert len(events) == 3
        assert events[0] == ("step", "First")
        assert events[1] == ("token", " text ")
        assert events[2] == ("step", "Second")

    def test_parse_step_split_across_feeds(self):
        """Feed step tag with content split across chunks."""
        parser = StepParser()
        # Feed opening tag + partial content
        events1 = parser.feed("Hello <step>Dat")
        assert len(events1) == 1
        assert events1[0] == ("token", "Hello ")

        # Feed rest of content + complete closing tag
        events2 = parser.feed("a</step> world")
        assert len(events2) == 2
        assert events2[0] == ("step", "Data")
        assert events2[1] == ("token", " world")

    def test_parse_incomplete_step_flush(self):
        """Incomplete step tag flushed returns as step."""
        parser = StepParser()
        parser.feed("<step>Incomplete")
        events = parser.flush()
        # Incomplete step still flushed as step (not wrapped in closing tag)
        step_events = [e for e in events if e[0] == "step"]
        assert len(step_events) == 1
        assert step_events[0] == ("step", "Incomplete")

    def test_parse_step_with_multiline_content(self):
        """Step tag can contain newlines and multiple lines."""
        parser = StepParser()
        text = "<step>Line 1\nLine 2\nLine 3</step>"
        events = parser.feed(text)
        assert len(events) == 1
        assert events[0] == ("step", "Line 1\nLine 2\nLine 3")

    def test_parse_whitespace_stripped_from_steps(self):
        """Steps with surrounding whitespace are stripped."""
        parser = StepParser()
        events = parser.feed("<step>  Padded  </step>")
        assert events[0] == ("step", "Padded")

    def test_parse_empty_step_ignored(self):
        """Empty step tags produce no event."""
        parser = StepParser()
        events = parser.feed("<step></step>")
        assert events == []

    def test_parse_whitespace_only_step_ignored(self):
        """Step with only whitespace produces no event."""
        parser = StepParser()
        events = parser.feed("<step>   </step>")
        assert events == []

    def test_parse_nested_brackets_in_step(self):
        """Step content can contain angle brackets."""
        parser = StepParser()
        events = parser.feed("<step>Check [data] in <config></step>")
        assert len(events) == 1
        assert events[0] == ("step", "Check [data] in <config>")

    def test_parse_consecutive_steps(self):
        """Multiple steps in sequence."""
        parser = StepParser()
        text = "<step>First</step><step>Second</step>"
        events = parser.feed(text)
        assert len(events) == 2
        assert events[0] == ("step", "First")
        assert events[1] == ("step", "Second")

    def test_feed_resume_after_step(self):
        """Can continue feeding after first step is complete."""
        parser = StepParser()
        parser.feed("<step>First</step>")
        events = parser.feed(" and <step>Second</step> text")
        assert len(events) == 3
        assert events[0] == ("token", " and ")
        assert events[1] == ("step", "Second")
        assert events[2] == ("token", " text")

    def test_malformed_opening_tag_as_text(self):
        """Malformed opening (< but no step) treated as text."""
        parser = StepParser()
        events = parser.feed("Less than < sign here")
        assert len(events) == 1
        assert events[0] == ("token", "Less than < sign here")

    def test_step_only_closing_tag_as_text(self):
        """Stray closing tag treated as text when no open step."""
        parser = StepParser()
        events = parser.feed("Text </step> more text")
        assert len(events) == 1
        assert events[0] == ("token", "Text </step> more text")

    def test_flush_partial_text_returns_token(self):
        """Flush with buffered non-step text returns token."""
        parser = StepParser()
        events = parser.feed("plain text")
        # feed() already emits the token since no step tag is found
        assert len(events) == 1
        assert events[0] == ("token", "plain text")
        # flush() on already-processed text returns nothing
        flush_events = parser.flush()
        assert flush_events == []

    def test_flush_resets_state(self):
        """After flush, parser is ready for new input."""
        parser = StepParser()
        parser.feed("<step>First")
        parser.flush()
        events = parser.feed("Second")
        assert events[0] == ("token", "Second")
