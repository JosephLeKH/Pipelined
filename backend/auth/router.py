"""Auth route handlers: register, login, logout, me, and token refresh."""

from datetime import datetime, timezone

import jwt
import structlog
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response

from auth import service as auth_service
from auth.dependencies import get_current_user
from auth.email_verification import create_verification_token
from auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GithubAuthRequest,
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPayload,
    UpdateUserRequest,
    UserResponse,
)
from auth.oauth_service import (
    GithubCodeError,
    GoogleTokenError,
    github_auth as github_auth_service,
)
from auth.service import (
    REFRESH_TOKEN_TYPE,
    RESET_TOKEN_TTL_HOURS,
    CurrentPasswordIncorrectError,
    DuplicateEmailError,
    PasswordWeakError,
    TokenExpiredError,
    TokenInvalidError,
    change_password,
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    delete_user,
    reset_password,
    update_user_profile,
    verify_password,
)
from notifications.email_service import email_service
from config import settings
from middleware.csrf import CSRF_COOKIE_NAME, generate_csrf_token
from middleware.rate_limit import limiter

logger = structlog.get_logger()

router = APIRouter(prefix="/api/auth", tags=["auth"])

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
RESET_TOKEN_COOKIE = "reset_token"
ACCESS_MAX_AGE = settings.jwt_access_ttl_minutes * 60
REFRESH_MAX_AGE = settings.jwt_refresh_ttl_days * 24 * 60 * 60
RESET_TOKEN_MAX_AGE = RESET_TOKEN_TTL_HOURS * 3600


def _set_cookie(response: Response, key: str, value: str, max_age: int) -> None:
    """Set an httpOnly cookie. secure=True in prod; False when DEBUG=True."""
    response.set_cookie(
        key=key, value=value, max_age=max_age,
        httponly=True, secure=not settings.debug, samesite="lax",
    )


def _set_auth_cookies(response: Response, user_id: str) -> None:
    """Set httpOnly access and refresh token cookies on the response."""
    _set_cookie(response, ACCESS_COOKIE, create_access_token(user_id), ACCESS_MAX_AGE)
    _set_cookie(response, REFRESH_COOKIE, create_refresh_token(user_id), REFRESH_MAX_AGE)


@router.post("/register", status_code=201)
@limiter.limit(settings.rate_limit_auth)
async def register(
    request: Request,
    body: RegisterRequest,
    response: Response,
) -> dict:
    """Register a new user, send verification email, and set auth cookies."""
    try:
        user = await auth_service.create_user(body.email, body.password, body.display_name, body.referral_code)
    except DuplicateEmailError as exc:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "DUPLICATE_EMAIL",
                "message": f"An account with {exc.email} already exists.",
            },
        )

    raw_token = await create_verification_token(str(user["_id"]))
    await email_service.send_verification_email(body.email, raw_token)
    _set_auth_cookies(response, str(user["_id"]))
    logger.info("user_registered", user_id=str(user["_id"]))
    return {"data": UserResponse.from_doc(user)}


@router.post("/login", status_code=200)
@limiter.limit(settings.rate_limit_auth)
async def login(
    request: Request,
    body: LoginRequest,
    response: Response,
) -> dict:
    """Authenticate with email/password and set auth cookies."""
    user = await auth_service.get_user_by_email(body.email)
    if user is None or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_CREDENTIALS", "message": "Incorrect email or password."},
        )

    _set_auth_cookies(response, str(user["_id"]))
    logger.info("user_logged_in", user_id=str(user["_id"]))
    return {"data": UserResponse.from_doc(user)}


@router.post("/logout", status_code=204)
async def logout(response: Response) -> None:
    """Clear auth cookies to log out the current user."""
    response.delete_cookie(ACCESS_COOKIE)
    response.delete_cookie(REFRESH_COOKIE)


@router.get("/me", status_code=200)
async def me(response: Response, user: dict = Depends(get_current_user)) -> dict:
    """Return the currently authenticated user's profile and seed the CSRF cookie."""
    csrf_token = generate_csrf_token()
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        secure=not settings.debug,
        samesite="strict",
    )
    return {"data": UserResponse.from_doc(user)}


@router.patch("/me", status_code=200)
async def update_me(
    body: UpdateUserRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Update the current user's profile settings (default_stages and/or timezone)."""
    updated = await update_user_profile(
        str(user["_id"]),
        body.default_stages,
        body.timezone,
        body.digest_enabled,
        body.weekly_goal,
        morning_brief_enabled=body.morning_brief_enabled,
        morning_brief_hour=body.morning_brief_hour,
        morning_brief_email=body.morning_brief_email,
        morning_brief_in_app=body.morning_brief_in_app,
        weekly_digest_enabled=body.weekly_digest_enabled,
        autopilot_enabled=body.autopilot_enabled,
        autopilot_min_match_score=body.autopilot_min_match_score,
        autopilot_max_daily=body.autopilot_max_daily,
        agent_profile=body.agent_profile.model_dump() if body.agent_profile else None,
    )
    logger.info("user_profile_updated", user_id=str(user["_id"]))
    return {"data": UserResponse.from_doc(updated)}


def _decode_refresh_token(refresh_token: str | None) -> TokenPayload:
    """Validate and decode a refresh token cookie; raise HTTPException on any failure."""
    if not refresh_token:
        raise HTTPException(
            status_code=401,
            detail={"code": "MISSING_TOKEN", "message": "Refresh token required."},
        )
    try:
        payload = decode_token(refresh_token)
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or expired refresh token."},
        )
    if payload.type != REFRESH_TOKEN_TYPE:
        raise HTTPException(
            status_code=401,
            detail={"code": "WRONG_TOKEN_TYPE", "message": "Refresh token required."},
        )
    return payload


@router.post("/refresh", status_code=200)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
) -> dict:
    """Issue a new access token using the refresh token cookie."""
    payload = _decode_refresh_token(refresh_token)

    user = await auth_service.get_user_by_id(payload.sub)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail={"code": "USER_NOT_FOUND", "message": "User no longer exists."},
        )

    tokens_invalidated_at = user.get("tokens_invalidated_at")
    if tokens_invalidated_at is not None and payload.iat is not None:
        invalidated = tokens_invalidated_at if tokens_invalidated_at.tzinfo else tokens_invalidated_at.replace(tzinfo=timezone.utc)
        if datetime.fromtimestamp(payload.iat, tz=timezone.utc) < invalidated:
            raise HTTPException(
                status_code=401,
                detail={"code": "TOKEN_INVALIDATED", "message": "Token has been invalidated. Please log in again."},
            )

    _set_cookie(response, ACCESS_COOKIE, create_access_token(payload.sub), ACCESS_MAX_AGE)
    logger.info("token_refreshed", user_id=payload.sub)
    return {"data": UserResponse.from_doc(user)}


@router.get("/extension-token", status_code=200)
async def extension_token(user: dict = Depends(get_current_user)) -> dict:
    """Issue a short-lived JWT for use by the Chrome extension as a Bearer token."""
    token = create_access_token(str(user["_id"]))
    logger.info("extension_token_issued", user_id=str(user["_id"]))
    return {"data": {"token": token, "display_name": user.get("display_name", "")}}


@router.post("/google", status_code=200)
async def google_auth(body: GoogleAuthRequest, response: Response) -> dict:
    """Sign in or register with a Google ID token."""
    try:
        claims = await auth_service.google_verify_id_token(body.id_token)
    except GoogleTokenError:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "INVALID_GOOGLE_TOKEN",
                "message": "Google token verification failed.",
            },
        )

    google_id: str = claims["sub"]
    email: str = claims["email"]
    display_name: str = claims.get("name") or email.split("@")[0]

    user = await auth_service.get_or_create_google_user(google_id, email, display_name)
    _set_auth_cookies(response, str(user["_id"]))
    logger.info("google_user_authenticated", user_id=str(user["_id"]))
    return {"data": UserResponse.from_doc(user)}


@router.post("/github", status_code=200)
async def github_auth(body: GithubAuthRequest, response: Response) -> dict:
    """Sign in or register with a GitHub OAuth authorization code."""
    try:
        user = await github_auth_service(body.code)
    except GithubCodeError as exc:
        logger.warning("github_auth_failed", error=str(exc))
        raise HTTPException(
            status_code=401,
            detail={
                "code": "INVALID_GITHUB_CODE",
                "message": "GitHub authentication failed.",
            },
        )

    _set_auth_cookies(response, str(user["_id"]))
    logger.info("github_user_authenticated", user_id=str(user["_id"]))
    return {"data": UserResponse.from_doc(user)}


@router.delete("/me", status_code=204)
async def delete_me(
    response: Response,
    user: dict = Depends(get_current_user),
) -> None:
    """Permanently delete the authenticated user and all their data."""
    await delete_user(str(user["_id"]))
    response.delete_cookie(ACCESS_COOKIE)
    response.delete_cookie(REFRESH_COOKIE)
    logger.info("user_account_deleted", user_id=str(user["_id"]))


@router.post("/change-password", status_code=200)
async def change_password_endpoint(
    body: ChangePasswordRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Change the authenticated user's password after verifying the current one."""
    try:
        await change_password(str(user["_id"]), body.current_password, body.new_password)
    except CurrentPasswordIncorrectError:
        raise HTTPException(
            status_code=400,
            detail={"code": "CURRENT_PASSWORD_INCORRECT", "message": "Current password is incorrect."},
        )
    except PasswordWeakError:
        raise HTTPException(
            status_code=400,
            detail={"code": "PASSWORD_TOO_WEAK", "message": "New password must have at least 8 characters, one uppercase letter, and one digit."},
        )
    logger.info("password_changed", user_id=str(user["_id"]))
    return {"data": {"message": "Password changed"}}


RESET_LINK_SENT_MESSAGE = "If that email is registered, a reset link has been sent."


@router.post("/forgot-password", status_code=200)
@limiter.limit(settings.rate_limit_auth)
async def forgot_password(request: Request, body: ForgotPasswordRequest, response: Response) -> dict:
    """Initiate a password reset; always returns 200 to prevent email enumeration."""
    raw_token, user = await create_password_reset_token(body.email)
    if user is not None:
        _set_cookie(response, RESET_TOKEN_COOKIE, raw_token, RESET_TOKEN_MAX_AGE)
        await email_service.send_password_reset_email(body.email)
    return {"data": {"message": RESET_LINK_SENT_MESSAGE}}


@router.post("/reset-password", status_code=200)
@limiter.limit(settings.rate_limit_auth)
async def reset_password_endpoint(
    request: Request,
    body: ResetPasswordRequest,
    response: Response,
    reset_token: str | None = Cookie(default=None),
) -> dict:
    """Reset a user's password using the reset token from the httpOnly cookie."""
    if not reset_token:
        raise HTTPException(
            status_code=400,
            detail={"code": "TOKEN_MISSING", "message": "No reset token found. Please use the link in your email."},
        )
    _reset_error_map = {
        TokenExpiredError: ("TOKEN_EXPIRED", "Password reset token has expired."),
        TokenInvalidError: ("TOKEN_INVALID", "Invalid password reset token."),
    }
    try:
        await reset_password(reset_token, body.new_password)
    except (TokenExpiredError, TokenInvalidError) as exc:
        code, message = _reset_error_map[type(exc)]
        raise HTTPException(status_code=400, detail={"code": code, "message": message})
    response.delete_cookie(RESET_TOKEN_COOKIE)
    return {"data": {"message": "Password reset successfully."}}


