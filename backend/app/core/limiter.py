from slowapi import Limiter
from starlette.requests import Request


def get_real_client_ip(request: Request) -> str:
    """
    In this deployment, only Nginx ever talks to the backend directly —
    `request.client.host` is always the Nginx container's address, never
    the actual visitor. That would put every real user into the SAME
    rate-limit bucket (one person's failed logins could lock out everyone).

    Nginx already sets X-Forwarded-For (see nginx.conf), so use the first
    (left-most, original client) address in that header instead. Falls back
    to request.client.host for local dev without Nginx in front.
    """
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_real_client_ip)