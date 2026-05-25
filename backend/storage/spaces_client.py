"""DigitalOcean Spaces (S3-compatible) blob storage helpers."""

import asyncio

import boto3
import structlog
from botocore.exceptions import BotoCoreError, ClientError

from config import settings

logger = structlog.get_logger()


class SpacesError(Exception):
    """Raised when a Spaces operation fails."""


_client = None


def spaces_configured() -> bool:
    """Return True if Spaces credentials and bucket are set."""
    return bool(
        settings.spaces_access_key
        and settings.spaces_secret_key
        and settings.spaces_bucket
    )


def _resolved_endpoint_url() -> str:
    """Return the configured endpoint URL or derive it from the region."""
    if settings.spaces_endpoint_url:
        return settings.spaces_endpoint_url
    return f"https://{settings.spaces_region}.digitaloceanspaces.com"


def _get_client():
    """Return a cached boto3 S3 client pointed at Spaces."""
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            region_name=settings.spaces_region,
            endpoint_url=_resolved_endpoint_url(),
            aws_access_key_id=settings.spaces_access_key,
            aws_secret_access_key=settings.spaces_secret_key,
        )
    return _client


async def upload_bytes(key: str, data: bytes, content_type: str) -> None:
    """Upload bytes to Spaces under the given key. Raises SpacesError on failure."""
    if not spaces_configured():
        raise SpacesError("Spaces is not configured")

    def _put() -> None:
        _get_client().put_object(
            Bucket=settings.spaces_bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
            ACL="private",
        )

    try:
        await asyncio.to_thread(_put)
    except (BotoCoreError, ClientError) as exc:
        logger.warning("spaces_upload_failed", key=key, error=str(exc))
        raise SpacesError(str(exc)) from exc

    logger.info("spaces_upload_succeeded", key=key, bytes=len(data))


async def download_bytes(key: str) -> bytes:
    """Download bytes from Spaces. Raises SpacesError on failure."""
    if not spaces_configured():
        raise SpacesError("Spaces is not configured")

    def _get() -> bytes:
        response = _get_client().get_object(Bucket=settings.spaces_bucket, Key=key)
        return response["Body"].read()

    try:
        return await asyncio.to_thread(_get)
    except (BotoCoreError, ClientError) as exc:
        logger.warning("spaces_download_failed", key=key, error=str(exc))
        raise SpacesError(str(exc)) from exc


async def delete_object(key: str) -> None:
    """Delete an object from Spaces. Logs but does not raise on missing keys."""
    if not spaces_configured():
        return

    def _delete() -> None:
        _get_client().delete_object(Bucket=settings.spaces_bucket, Key=key)

    try:
        await asyncio.to_thread(_delete)
    except (BotoCoreError, ClientError) as exc:
        logger.warning("spaces_delete_failed", key=key, error=str(exc))
        return

    logger.info("spaces_delete_succeeded", key=key)
