"""Auth route handlers: register, login, logout, me, and token refresh."""

import jwt
import structlog
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response

from auth import service as auth_service
from auth.dependencies import get_current_user
from auth.schemas import GoogleAuthRequest, LoginRequest, RegisterRequest, UserResponse
from auth.service import (
    GoogleTokenError,
    REFRESH_TOKEN_TYPE,
    DuplicateEmailError,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from config import settings
from middleware.rate_limit import limiter

logger = structlog.get_logger()

router = APIRouter(prefix="/api/auth", tags=["auth"])

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
ACCESS_MAX_AGE = settings.jwt_access_ttl_minutes * 60
REFRESH_MAX_AGE = settings.jwt_refresh_ttl_days * 24 * 60 * 60


def _set_auth_cookies(response: Response, user_id: str) -> None:
    """Set httpOnly access and refresh token cookies on the response."""
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=create_access_token(user_id),
        max_age=ACCESS_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="lax",
    )
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=create_refresh_token(user_id),
        max_age=REFRESH_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="lax",
    )


@router.post("/register", status_code=201)
@limiter.limit(settings.rate_limit_auth)
async def register(
    request: Request,
    body: RegisterRequest,
    response: Response,
) -> dict:
    """Register a new user and set auth cookies."""
    try:
        user = await auth_service.create_user(body.email, body.password, body.display_name)
    except DuplicateEmailError as exc:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "DUPLICATE_EMAIL",
                "message": f"An account with {exc.email} already exists.",
            },
        )

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
async def me(user: dict = Depends(get_current_user)) -> dict:
    """Return the currently authenticated user's profile."""
    return {"data": UserResponse.from_doc(user)}


@router.post("/refresh", status_code=200)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
) -> dict:
    """Issue a new access token using the refresh token cookie."""
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

    user = await auth_service.get_user_by_id(payload.sub)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail={"code": "USER_NOT_FOUND", "message": "User no longer exists."},
        )

    response.set_cookie(
        key=ACCESS_COOKIE,
        value=create_access_token(payload.sub),
        max_age=ACCESS_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="lax",
    )
    logger.info("token_refreshed", user_id=payload.sub)
    return {"data": UserResponse.from_doc(user)}


@router.get("/extension-token", status_code=200)
async def extension_token(user: dict = Depends(get_current_user)) -> dict:
    """Issue a short-lived JWT for use by the Chrome extension as a Bearer token."""
    token = create_access_token(str(user["_id"]))
    logger.info("extension_token_issued", user_id=str(user["_id"]))
    return {"data": {"token": token}}


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
