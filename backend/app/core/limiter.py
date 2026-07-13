from slowapi import Limiter
from starlette.requests import Request


def get_real_client_ip(request: Request) -> str:
    """
    In this deployment, only Nginx ever talks to the backend directly —
    `request.client.host` is always the Nginx container's address, never
    the actual visitor. That would put every real user into the SAME
    rate-limit bucket (one person's failed logins could lock out everyone).

    Nginx sets X-Forwarded-For to $remote_addr (see nginx.conf) — it
    OVERWRITES the header rather than appending to it, so any value a
    client tries to send for X-Forwarded-For is discarded before it ever
    reaches this code. That's what makes it safe to trust here: this value
    is only ever the IP nginx itself observed, never attacker-controlled.

    Do NOT change this to trust a client-appended value (e.g. nginx's
    $proxy_add_x_forwarded_for) — that would let a client spoof this
    header and get a fresh rate-limit bucket on every request.

    Falls back to request.client.host for local dev without Nginx in front.
    If a real upstream proxy/load balancer is ever placed in front of
    nginx, this trust boundary must be re-verified.
    """
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_real_client_ip)