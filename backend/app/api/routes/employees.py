import math

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from datetime import datetime, timedelta

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, require_superuser
from app.core.email import send_email_change_verification, send_invite_email
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    generate_invite_token,
    get_password_hash,
    hash_token,
    verify_password,
)
from app.crud.users import (
    create_user,
    delete_user,
    get_or_create_leave_balance,
    get_user,
    get_user_by_email,
    list_users,
    update_user,
)
from app.models.models import User
from app.schemas.leave_balance import LeaveBalanceResponse
from app.schemas.pagination import PaginatedUsers
from app.schemas.tokens import AuthResponse
from app.schemas.user import EmployeeInvite, UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/employees", tags=["Employees"])

COOKIE_NAME = "access_token"


def _set_auth_cookie(response: Response, token: str, max_age_seconds: int) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=max_age_seconds,
        path="/",
    )


def _ensure_employee_access(current_user: User, target_user: User) -> None:
    # 404, not 403: an employee probing other IDs should see the exact same
    # response whether that ID belongs to someone else or doesn't exist at
    # all. A distinguishable 403 would let them enumerate valid employee IDs.
    if not current_user.is_superuser and current_user.id != target_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")


@router.get("/", response_model=PaginatedUsers)
def list_employees(
    db: Session = Depends(get_db),
    _: User = Depends(require_superuser),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    department: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
):
    skip = (page - 1) * limit
    items, total = list_users(
        db,
        skip=skip,
        limit=limit,
        search=search,
        department=department,
        is_active=is_active,
    )
    total_pages = max(math.ceil(total / limit), 1)
    return PaginatedUsers(items=items, total=total, page=page, limit=limit, total_pages=total_pages)


@router.get("/me", response_model=UserResponse)
def read_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/{user_id}", response_model=UserResponse)
def read_employee(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_user = get_user(db, user_id)
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    _ensure_employee_access(current_user, target_user)
    return target_user


@router.post("/invite", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
def invite_employee(
    request: Request,
    invite_in: EmployeeInvite,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(require_superuser),
):
    existing_user = db.query(User).filter(User.email == invite_in.email).first()
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    token = generate_invite_token()
    new_user = User(
        full_name=invite_in.full_name,
        email=invite_in.email,
        department=invite_in.department,
        designation=invite_in.designation,
        joining_date=invite_in.joining_date,
        hashed_password=None,
        is_active=False,
        is_superuser=False,
        invite_token=hash_token(token),
        invite_token_expires_at=datetime.utcnow() + timedelta(hours=settings.INVITE_TOKEN_EXPIRE_HOURS),
    )
    created = create_user(db, new_user)

    activation_link = f"{settings.FRONTEND_URL}/activate/{token}"
    background_tasks.add_task(
        send_invite_email, to_email=created.email, full_name=created.full_name, activation_link=activation_link
    )

    return created


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_superuser),
):
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    new_user_data = user_in.model_dump(exclude={"password"}, exclude_unset=True)
    new_user_data["hashed_password"] = get_password_hash(user_in.password)
    new_user = User(**new_user_data)
    return create_user(db, new_user)


@router.put("/{user_id}", response_model=UserResponse)
def update_employee(
    user_id: int,
    user_in: UserUpdate,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_user = get_user(db, user_id)
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    _ensure_employee_access(current_user, target_user)

    is_self = target_user.id == current_user.id
    updates = user_in.model_dump(exclude_unset=True)
    current_password = updates.pop("current_password", None)

    if not current_user.is_superuser:
        allowed_self_fields = {"full_name", "email", "password", "phone_number", "profile_picture_url"}
        disallowed = set(updates) - allowed_self_fields
        if disallowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not permitted to update: {', '.join(sorted(disallowed))}",
            )

    changing_password = "password" in updates
    changing_own_email = is_self and "email" in updates

    # Step-up re-auth: a valid session alone must never be enough to change
    # the password or the login email on your OWN account — otherwise a
    # hijacked cookie (XSS, shared device, etc.) becomes a permanent
    # takeover instead of a temporary one. HR editing someone ELSE'S record
    # is a separate, already-privileged admin action and isn't gated here.
    if is_self and (changing_password or changing_own_email):
        if not current_password or not target_user.hashed_password or not verify_password(
            current_password, target_user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Current password is required and must be correct to change your password or email.",
            )

    password = updates.pop("password", None)
    if password is not None:
        updates["hashed_password"] = get_password_hash(password)
        if is_self:
            # Invalidate every other session issued before this change.
            updates["token_version"] = target_user.token_version + 1

    reissue_cookie_version: int | None = updates.get("token_version")

    if changing_own_email:
        # Never write `email` directly for a self-service change. Stage it
        # as pending_email behind a verification link sent to the NEW
        # address; the login email only flips once that link is clicked.
        new_email = updates.pop("email")
        if new_email != target_user.email:
            existing = get_user_by_email(db, new_email)
            if existing is not None and existing.id != target_user.id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

            token = generate_invite_token()
            updates["pending_email"] = new_email
            updates["email_change_token"] = hash_token(token)
            updates["email_change_token_expires_at"] = datetime.utcnow() + timedelta(
                hours=settings.EMAIL_CHANGE_TOKEN_EXPIRE_HOURS
            )
            verify_link = f"{settings.FRONTEND_URL}/verify-email-change/{token}"
            background_tasks.add_task(
                send_email_change_verification,
                to_email=new_email,
                full_name=target_user.full_name,
                verify_link=verify_link,
                expire_hours=settings.EMAIL_CHANGE_TOKEN_EXPIRE_HOURS,
            )

    updated = update_user(db, target_user, **updates)

    if reissue_cookie_version is not None and is_self:
        # The current request's own cookie would otherwise be invalidated
        # by the token_version bump above — reissue it so the user isn't
        # logged out of the session they're actively using right now.
        new_token = create_access_token(subject=updated.email, token_version=reissue_cookie_version)
        _set_auth_cookie(response, new_token, max_age_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

    return updated


@router.post("/verify-email-change/{token}", response_model=AuthResponse)
def verify_email_change(token: str, response: Response, db: Session = Depends(get_db)):
    """
    Public by design (like invite/reset links) — the token itself, sent only
    to the new address, is what proves the request is legitimate.
    """
    user = db.query(User).filter(User.email_change_token == hash_token(token)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification link is invalid.")

    if user.email_change_token_expires_at is None or user.email_change_token_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This verification link has expired. Request the email change again.",
        )

    if not user.pending_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No pending email change found.")

    existing = get_user_by_email(db, user.pending_email)
    if existing is not None and existing.id != user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user.email = user.pending_email
    user.pending_email = None
    user.email_change_token = None
    user.email_change_token_expires_at = None
    # Identity changed — every existing session (including the one that
    # requested the change) must re-authenticate with the new email.
    user.token_version += 1
    db.commit()

    response.delete_cookie(key=COOKIE_NAME, path="/")
    return AuthResponse(detail="Email address updated. Please log in again with your new email.")


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    target_user = get_user(db, user_id)
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    if current_user.id == target_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account.",
        )

    delete_user(db, target_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{user_id}/leave-balance", response_model=LeaveBalanceResponse)
def read_employee_leave_balance(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_user = get_user(db, user_id)
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    _ensure_employee_access(current_user, target_user)
    return get_or_create_leave_balance(db, user_id)