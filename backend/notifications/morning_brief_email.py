"""Plain-text email formatting and delivery for morning briefs."""

from config import settings
from notifications.email_service import email_service

MORNING_BRIEF_SUBJECT_PREFIX = "Your Pipelined morning brief — "


def format_morning_brief_email(brief_doc: dict, display_name: str = "there") -> tuple[str, str]:
    """Return (subject, plain-text body) for a stored morning brief document."""
    summary = brief_doc.get("summary_line", "Your daily action list")
    subject = f"{MORNING_BRIEF_SUBJECT_PREFIX}{summary}"
    sections = brief_doc.get("sections", {})
    lines = [
        f"Hi {display_name},",
        "",
        summary,
        "",
        f"View your full brief: {settings.frontend_url}/brief",
        "",
    ]

    section_labels = {
        "follow_ups": "Follow-ups",
        "interviews": "Interviews",
        "high_matches": "High matches",
        "pending_approvals": "Pending approvals",
    }
    for key, label in section_labels.items():
        items = sections.get(key, [])
        if not items:
            continue
        lines.append(label + ":")
        for item in items:
            lines.append(f"  • {item.get('title', 'Item')}")
            body = item.get("body")
            if body:
                lines.append(f"    {body}")
            action_url = item.get("action_url")
            if action_url:
                link = action_url if action_url.startswith("http") else f"{settings.frontend_url}{action_url}"
                lines.append(f"    {link}")
        lines.append("")

    lines += [
        "---",
        "Pipelined Morning Brief",
        "Manage preferences in Settings > Notifications.",
    ]
    return subject, "\n".join(lines)


async def send_morning_brief_email(user_doc: dict, brief_doc: dict) -> bool:
    """Send the morning brief email when the user has an email address."""
    email = user_doc.get("email")
    if not email:
        return False
    display_name = user_doc.get("display_name", "there")
    subject, body = format_morning_brief_email(brief_doc, display_name)
    await email_service.send_text_email(email, subject, body)
    return True
