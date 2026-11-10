"""Resolve the real client address, optionally behind a trusted reverse proxy."""
from ipaddress import ip_address

from fastapi import Request

from app.config import get_settings


def get_client_ip(request: Request) -> str:
    """
    Return the client IP used for rate limiting and login lockout.

    Behind Render/Cloudflare every request arrives from the proxy address, so
    keying limits on request.client.host would throttle all visitors as one
    client. When TRUSTED_CLIENT_IP_HEADER is configured, use that header value
    (for example ``cf-connecting-ip``). Only enable it when the backend is not
    reachable without the proxy, because the header can otherwise be spoofed.
    """
    header_name = get_settings().TRUSTED_CLIENT_IP_HEADER.strip()
    if header_name:
        value = request.headers.get(header_name, "").strip()
        if value:
            try:
                return str(ip_address(value))
            except ValueError:
                pass
    return request.client.host if request.client else "unknown"
