"""OAuth business logic: Google ID token verification and GitHub OAuth code exchange."""

import asyncio
from datetime import datetime, timezone

import httpx
import structlog
from motor.motor_asyncio import AsyncIOMotorCollection

from auth.constants import DEFAULT_STAGES, DEFAULT_TIMEZONE
from config import settings
from database import get_collection

logger = structlog.get_logger()

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


class GoogleTokenError(Exception):
    """Raised when Google ID token verification fails."""


class GithubCodeError(Exception):
    """Raised when GitHub OAuth code exchange or profile fetch fails."""


async def google_verify_id_token(id_token: str) -> dict:
    """Verify a Google ID token and return its claims.

    Raises GoogleTokenError if the token is invalid or Google returns non-200.
    """
    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(
            GOOGLE_TOKENINFO_URL, params={"id_token": id_token}
        )
    if response.status_code != 200:
        raise GoogleTokenError("Google token verification failed")
    return response.json()


async def get_or_create_google_user(
    google_id: str, email: str, display_name: str
) -> dict:
    """Return an existing user (looked up by google_id or email) or create one.

    If an existing user is found by email but lacks google_id, the field is linked.
    """
    users = get_collection("users")

    user, email_user = await asyncio.gather(
        users.find_one({"google_id": google_id}),
        users.find_one({"email": email}),
    )

    if user is not None:
        return user

    if email_user is not None:
        if not email_user.get("google_id"):
            await users.update_one(
                {"_id": email_user["_id"]}, {"$set": {"google_id": google_id}}
            )
            email_user["google_id"] = google_id
        return email_user

    doc: dict = {
        "email": email,
        "google_id": google_id,
        "display_name": display_name,
        "password_hash": None,
        "default_stages": DEFAULT_STAGES,
        "timezone": DEFAULT_TIMEZONE,
        "digest_enabled": True,
        "email_verified": True,
        "created_at": datetime.now(timezone.utc),
    }
    result = await users.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("google_user_created", user_id=str(result.inserted_id), email=email)
    return doc


async def _exchange_github_code(code: str) -> str:
    """Exchange a GitHub OAuth code for an access token.

    Raises GithubCodeError if the exchange fails or returns an error.
    """
    async with httpx.AsyncClient() as http_client:
        resp = await http_client.post(
            GITHUB_TOKEN_URL,
            json={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
    if resp.status_code != 200:
        raise GithubCodeError("GitHub token exchange returned non-200")
    data = resp.json()
    access_token = data.get("access_token")
    if not access_token:
        raise GithubCodeError(f"GitHub token exchange error: {data.get('error', 'unknown')}")
    return access_token


async def _fetch_github_profile(access_token: str) -> tuple[dict, str | None]:
    """Fetch GitHub user profile and primary verified email.

    Returns (profile_dict, primary_email | None).
    Raises GithubCodeError on HTTP failure.
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }
    async with httpx.AsyncClient() as http_client:
        profile_resp, emails_resp = await asyncio.gather(
            http_client.get(GITHUB_USER_URL, headers=headers),
            http_client.get(GITHUB_EMAILS_URL, headers=headers),
        )

    if profile_resp.status_code != 200:
        raise GithubCodeError("GitHub profile fetch failed")

    profile = profile_resp.json()
    primary_email: str | None = profile.get("email")

    if emails_resp.status_code == 200:
        emails = emails_resp.json()
        for entry in emails:
            if entry.get("primary") and entry.get("verified"):
                primary_email = entry["email"]
                break

    return profile, primary_email


async def _insert_github_user(
    users: AsyncIOMotorCollection,
    github_id: str,
    email: str | None,
    display_name: str,
    avatar_url: str | None,
) -> dict:
    """Insert a new GitHub-authenticated user document and return it."""
    doc: dict = {
        "email": email,
        "github_id": github_id,
        "avatar_url": avatar_url,
        "display_name": display_name,
        "password_hash": None,
        "default_stages": DEFAULT_STAGES,
        "timezone": DEFAULT_TIMEZONE,
        "digest_enabled": True,
        "email_verified": True,
        "created_at": datetime.now(timezone.utc),
    }
    result = await users.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("github_user_created", user_id=str(result.inserted_id), email=email)
    return doc


async def get_or_create_github_user(
    github_id: str, email: str | None, display_name: str, avatar_url: str | None
) -> dict:
    """Return an existing user (by github_id or email) or create one.

    If an existing user is found by email but lacks github_id, the fields are linked.
    """
    users = get_collection("users")

    github_user = await users.find_one({"github_id": github_id})
    email_user = await users.find_one({"email": email}) if email else None

    if github_user is not None:
        return github_user

    if email_user is not None:
        if not email_user.get("github_id"):
            update: dict = {"github_id": github_id}
            if avatar_url:
                update["avatar_url"] = avatar_url
            await users.update_one({"_id": email_user["_id"]}, {"$set": update})
            email_user["github_id"] = github_id
            if avatar_url:
                email_user["avatar_url"] = avatar_url
        return email_user

    return await _insert_github_user(users, github_id, email, display_name, avatar_url)


async def github_auth(code: str) -> dict:
    """Exchange a GitHub OAuth code and return the user document.

    Raises GithubCodeError on any GitHub API failure.
    """
    access_token = await _exchange_github_code(code)
    profile, email = await _fetch_github_profile(access_token)

    github_id = str(profile["id"])
    display_name: str = (
        profile.get("name") or profile.get("login") or (email.split("@")[0] if email else github_id)
    )
    avatar_url: str | None = profile.get("avatar_url")

    return await get_or_create_github_user(github_id, email, display_name, avatar_url)
