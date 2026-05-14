"""Email notification service using SMTP."""

import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import structlog

from config import settings

logger = structlog.get_logger()

RESET_EMAIL_SUBJECT = "Reset your Pipelined password"
VERIFICATION_EMAIL_SUBJECT = "Verify your Pipelined account"


class EmailService:
    """Send transactional emails via SMTP."""

    def _build_reset_message(self, to_email: str, reset_link: str) -> MIMEMultipart:
        """Construct the password reset email as a MIMEMultipart message."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = RESET_EMAIL_SUBJECT
        msg["From"] = settings.smtp_from_email
        msg["To"] = to_email

        text_body = (
            "You requested a password reset for your Pipelined account.\n\n"
            f"Click the link below to reset your password (valid for 1 hour):\n\n"
            f"{reset_link}\n\n"
            "If you did not request this, you can safely ignore this email."
        )
        html_body = (
            "<p>You requested a password reset for your Pipelined account.</p>"
            f"<p><a href='{reset_link}'>Reset your password</a> (valid for 1 hour)</p>"
            "<p>If you did not request this, you can safely ignore this email.</p>"
        )

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        return msg

    def _send_smtp(self, to_email: str, message: MIMEMultipart) -> None:
        """Deliver the message via SMTP (blocking)."""
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.sendmail(settings.smtp_from_email, to_email, message.as_string())

    def _build_verification_message(self, to_email: str, verify_link: str) -> MIMEMultipart:
        """Construct the email verification message as a MIMEMultipart message."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = VERIFICATION_EMAIL_SUBJECT
        msg["From"] = settings.smtp_from_email
        msg["To"] = to_email

        text_body = (
            "Welcome to Pipelined! Please verify your email address.\n\n"
            f"Click the link below to verify your account (valid for 24 hours):\n\n"
            f"{verify_link}\n\n"
            "If you did not create a Pipelined account, you can safely ignore this email."
        )
        html_body = (
            "<p>Welcome to Pipelined! Please verify your email address.</p>"
            f"<p><a href='{verify_link}'>Verify your account</a> (valid for 24 hours)</p>"
            "<p>If you did not create a Pipelined account, you can safely ignore this email.</p>"
        )
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        return msg

    async def send_verification_email(self, to_email: str, raw_token: str) -> None:
        """Send an email verification link to the user."""
        verify_link = f"{settings.frontend_url}/verify-email?token={raw_token}"
        if not settings.smtp_host or settings.smtp_host == "localhost":
            logger.info(
                "email_suppressed_dev_mode",
                to=to_email,
                subject=VERIFICATION_EMAIL_SUBJECT,
                verify_link=verify_link,
            )
            return
        message = self._build_verification_message(to_email, verify_link)
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(None, self._send_smtp, to_email, message)
        except (smtplib.SMTPException, OSError) as exc:
            logger.error("verification_email_failed", to=to_email, error=str(exc))
            return
        logger.info("verification_email_sent", to=to_email)

    async def send_password_reset_email(self, to_email: str) -> None:
        """Send a password reset email linking to the reset page (token delivered via cookie)."""
        if not settings.smtp_host or settings.smtp_host == "localhost":
            logger.info("email_suppressed_dev_mode", to=to_email, subject=RESET_EMAIL_SUBJECT)
            return
        reset_link = f"{settings.frontend_url}/reset-password"
        message = self._build_reset_message(to_email, reset_link)
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(None, self._send_smtp, to_email, message)
        except (smtplib.SMTPException, OSError) as exc:
            logger.error("password_reset_email_failed", to=to_email, error=str(exc))
            return
        logger.info("password_reset_email_sent", to=to_email)

    async def send_text_email(self, to_email: str, subject: str, body: str) -> None:
        """Send a plain-text email. Logs only when smtp_host is unset (dev/test mode)."""
        if not settings.smtp_host or settings.smtp_host == "localhost":
            logger.info("email_suppressed_dev_mode", to=to_email, subject=subject)
            return
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from_email
        msg["To"] = to_email
        msg.attach(MIMEText(body, "plain"))
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(None, self._send_smtp, to_email, msg)
        except (smtplib.SMTPException, OSError) as exc:
            logger.error("text_email_failed", to=to_email, subject=subject, error=str(exc))
            return
        logger.info("text_email_sent", to=to_email, subject=subject)


email_service = EmailService()
