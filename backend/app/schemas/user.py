from datetime import date, datetime
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


def _validate_profile_picture_url(v: str | None) -> str | None:
    if v is None or v == "":
        return v
    parsed = urlparse(v)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("profile_picture_url must start with http:// or https://")
    if not parsed.netloc:
        raise ValueError("profile_picture_url must be a valid URL")
    return v


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    department: str | None = None
    designation: str | None = None
    phone_number: str | None = None
    profile_picture_url: str | None = None
    joining_date: date | None = None

    @field_validator("profile_picture_url")
    @classmethod
    def validate_profile_picture_url(cls, v: str | None) -> str | None:
        return _validate_profile_picture_url(v)


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    department: str | None = None
    designation: str | None = None
    phone_number: str | None = None
    profile_picture_url: str | None = None
    joining_date: date | None = None
    is_active: bool | None = None

    # Required (server-enforced) whenever a user changes their OWN password
    # or email — step-up re-auth so a hijacked/stolen session cookie alone
    # isn't enough to take over the account. Not required when HR edits
    # someone else's record (an admin action, not a self-service one).
    current_password: str | None = None

    @field_validator("profile_picture_url")
    @classmethod
    def validate_profile_picture_url(cls, v: str | None) -> str | None:
        return _validate_profile_picture_url(v)


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmployeeInvite(BaseModel):
    full_name: str
    email: EmailStr
    department: str | None = None
    designation: str | None = None
    joining_date: date | None = None


class InviteDetails(BaseModel):
    full_name: str
    email: EmailStr


class AcceptInvite(BaseModel):
    token: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    token: str
    password: str