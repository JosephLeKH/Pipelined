"""Tests for Sentry PII scrubbing rules."""

import pytest

from observability.sentry_scrub import scrub_pii


class TestSentryPiiScrubbing:
    """Test PII scrubbing for email, company, and auth headers."""

    def test_scrub_user_email(self):
        """Verify user email is masked."""
        event = {"user": {"email": "john@example.com", "id": "user123"}}
        result = scrub_pii(event, {})

        assert result["user"]["email"] == "***@***.***"
        assert result["user"]["id"] == "user123"

    def test_scrub_extra_email(self):
        """Verify email in extra context is masked."""
        event = {"extra": {"email": "jane@example.com", "action": "login"}}
        result = scrub_pii(event, {})

        assert result["extra"]["email"] == "***@***.***"
        assert result["extra"]["action"] == "login"

    def test_scrub_company_name(self):
        """Verify company name in extra context is masked."""
        event = {"extra": {"company": "Acme Corp"}}
        result = scrub_pii(event, {})

        assert result["extra"]["company"] == "***REDACTED***"

    def test_scrub_authorization_header(self):
        """Verify Authorization header is removed."""
        event = {
            "request": {
                "headers": {
                    "Authorization": "Bearer token123",
                    "User-Agent": "Mozilla/5.0",
                }
            }
        }
        result = scrub_pii(event, {})

        assert "Authorization" not in result["request"]["headers"]
        assert result["request"]["headers"]["User-Agent"] == "Mozilla/5.0"

    def test_scrub_email_in_url(self):
        """Verify email patterns in request URL are masked."""
        event = {
            "request": {
                "url": "https://example.com/apply?email=alice@example.com&name=Alice"
            }
        }
        result = scrub_pii(event, {})

        assert "alice@example.com" not in result["request"]["url"]
        assert "***@***.***" in result["request"]["url"]
        assert "name=Alice" in result["request"]["url"]

    def test_scrub_email_in_message(self):
        """Verify email patterns in message are masked."""
        event = {"message": "User bob@example.com failed to login"}
        result = scrub_pii(event, {})

        assert "bob@example.com" not in result["message"]
        assert "***@***.***" in result["message"]
        assert "failed to login" in result["message"]

    def test_scrub_email_in_breadcrumbs(self):
        """Verify email patterns in breadcrumbs are masked."""
        event = {
            "breadcrumbs": [
                {
                    "message": "User charlie@example.com submitted form",
                    "data": {"email": "dave@example.com", "status": "pending"},
                }
            ]
        }
        result = scrub_pii(event, {})

        assert "charlie@example.com" not in result["breadcrumbs"][0]["message"]
        assert "dave@example.com" not in result["breadcrumbs"][0]["data"]["email"]
        assert result["breadcrumbs"][0]["data"]["email"] == "***@***.***"
        assert result["breadcrumbs"][0]["data"]["status"] == "pending"

    def test_scrub_preserves_other_fields(self):
        """Verify scrubbing preserves unrelated event fields."""
        event = {
            "level": "error",
            "logger": "myapp.service",
            "platform": "python",
            "timestamp": 1234567890,
            "extra": {"trace_id": "abc123"},
        }
        result = scrub_pii(event, {})

        assert result["level"] == "error"
        assert result["logger"] == "myapp.service"
        assert result["platform"] == "python"
        assert result["timestamp"] == 1234567890
        assert result["extra"]["trace_id"] == "abc123"

    def test_scrub_with_no_pii(self):
        """Verify scrubbing handles events with no PII gracefully."""
        event = {"level": "info", "message": "User logged in successfully"}
        result = scrub_pii(event, {})

        assert result is not None
        assert result["level"] == "info"
        assert result["message"] == "User logged in successfully"

    def test_scrub_with_multiple_emails(self):
        """Verify multiple email addresses are all masked."""
        event = {
            "message": "emails: alice@example.com, bob@example.com, charlie@example.com"
        }
        result = scrub_pii(event, {})

        assert result["message"].count("***@***.***") == 3
        assert "@example.com" not in result["message"]
