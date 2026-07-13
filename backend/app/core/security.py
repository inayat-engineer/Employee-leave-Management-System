import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, token_version: int, expires_delta: timedelta | None = None) -> str:
    """
    `token_version` is embedded in every JWT and compared against the user's
    current DB value on every request. Bumping the DB value (on password
    reset / password change) instantly invalidates every previously issued
    token, even though JWTs are otherwise stateless.
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"sub": subject, "ver": token_version, "exp": expire}
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def generate_invite_token() -> str:
    """Raw, single-use token. Only ever emailed to the user — never stored raw."""
    return secrets.token_urlsafe(32)


def hash_token(raw_token: str) -> str:
    """
    Deterministic hash used to store invite/reset/email-change tokens in the DB.
    Two benefits over storing the raw token:
      1. A DB dump/leak doesn't hand out live, usable tokens.
      2. Lookups compare hashes (fixed-length, opaque) instead of directly
         indexing on attacker-controllable raw secrets.
    SHA-256 (not bcrypt) is intentional here: these tokens are already
    high-entropy random values (32 bytes via secrets.token_urlsafe), not
    low-entropy human passwords, so a fast deterministic hash is correct
    and lets us look them up with a plain equality query.
    """
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()