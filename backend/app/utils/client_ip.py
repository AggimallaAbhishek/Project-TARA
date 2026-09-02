"""Resolve the originating client IP, without trusting the header blindly."""

import logging
from ipaddress import ip_address, ip_network

from fastapi import Request

logger = logging.getLogger(__name__)

UNKNOWN_CLIENT = "unknown"

# Private/loopback ranges: a reverse proxy or load balancer in front of this app
# is reached over one of these, so only then is X-Forwarded-For meaningful. A
# request arriving directly from the public internet can set the header to
# anything, and trusting it would let one caller forge unlimited identities and
# evade the login rate limit entirely.
DEFAULT_TRUSTED_PROXY_NETWORKS = (
    ip_network("127.0.0.0/8"),
    ip_network("::1/128"),
    ip_network("10.0.0.0/8"),
    ip_network("172.16.0.0/12"),
    ip_network("192.168.0.0/16"),
    ip_network("fc00::/7"),
)


def _is_trusted_proxy(host: str) -> bool:
    try:
        address = ip_address(host)
    except ValueError:
        return False
    return any(address in network for network in DEFAULT_TRUSTED_PROXY_NETWORKS)


def client_ip(request: Request) -> str:
    """Best-effort originating IP for rate-limit keying.

    ``request.client.host`` is the socket peer. Behind Vercel, nginx, or any load
    balancer that is the proxy's address, identical for every user - so keying a
    limit on it turns a per-client budget into a global one that a single abusive
    caller can exhaust for everybody.

    X-Forwarded-For is honoured only when the peer is itself a trusted proxy, and
    the *rightmost* entry the proxy appended is used rather than the leftmost,
    which a client can pre-populate.
    """
    peer = request.client.host if request.client else None
    if not peer:
        return UNKNOWN_CLIENT
    if not _is_trusted_proxy(peer):
        return peer

    forwarded = request.headers.get("x-forwarded-for", "")
    candidates = [part.strip() for part in forwarded.split(",") if part.strip()]
    for candidate in reversed(candidates):
        try:
            ip_address(candidate)
        except ValueError:
            continue
        if not _is_trusted_proxy(candidate):
            return candidate
    # All hops were proxies (or the header was absent/garbage): fall back to the
    # peer rather than inventing an identity.
    return peer
