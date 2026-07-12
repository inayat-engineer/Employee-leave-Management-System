import math

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from datetime import datetime, timedelta

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, require_superuser
from app.core.email import send_invite_email
from app.core.limiter import limiter
from app.core.security import generate_invite_token, get_password_hash
from app.crud.users import (
    create_user,
    delete_user,
    get_or_create_leave_balance,
    get_user,
    list_users,
    update_user,
)
from app.models.models import User
from app.schemas.leave_balance import LeaveBalanceResponse
from app.schemas.pagination import PaginatedUsers
from app.schemas.user import EmployeeInvite, UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/employees", tags=["Employees"])


def _ensure_employee_access(current_user: User, target_user: User) -> None:
    if not current_user.is_superuser and current_user.id != target_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


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
        invite_token=token,
        invite_token_expires_at=datetime.utcnow() + timedelta(hours=settings.INVITE_TOKEN_EXPIRE_HOURS),
    )
    created = create_user(db, new_user)

    activation_link = f"{settings.FRONTEND_URL}/activate/{token}"
    send_invite_email(to_email=created.email, full_name=created.full_name, activation_link=activation_link)

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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_user = get_user(db, user_id)
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    _ensure_employee_access(current_user, target_user)

    updates = user_in.model_dump(exclude_unset=True)

    if not current_user.is_superuser:
        allowed_self_fields = {"full_name", "email", "password", "phone_number", "profile_picture_url"}
        disallowed = set(updates) - allowed_self_fields
        if disallowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not permitted to update: {', '.join(sorted(disallowed))}",
            )

    password = updates.pop("password", None)
    if password is not None:
        updates["hashed_password"] = get_password_hash(password)

    return update_user(db, target_user, **updates)


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
