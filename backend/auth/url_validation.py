"""Validate user-supplied HTTP(S) URLs against SSRF targets."""

import ipaddress
from urllib.parse import urlparse

BLOCKED_HOSTNAMES: frozenset[str] = frozenset({
    "localhost",
    "metadata.google.internal",
    "metadata.google",
})

PRIVATE_URL_ERROR = "careers_url must not target private or internal networks"


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
    )


def validate_public_http_url(url: str) -> None:
    """Raise ValueError when url targets private, link-local, or metadata hosts."""
    parsed = urlparse(url.strip())
    host = parsed.hostname
    if not host:
        raise ValueError("careers_url must include a valid hostname")

    host_lower = host.lower().rstrip(".")
    if host_lower in BLOCKED_HOSTNAMES:
        raise ValueError(PRIVATE_URL_ERROR)

    bracketed = host_lower.strip("[]")
    try:
        ip = ipaddress.ip_address(bracketed)
    except ValueError:
        return

    if _is_blocked_ip(ip):
        raise ValueError(PRIVATE_URL_ERROR)
