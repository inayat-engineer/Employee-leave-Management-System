from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_superuser
from app.core.limiter import limiter
from app.crud.leaves import (
    InsufficientLeaveBalanceError,
    InvalidLeaveTransitionError,
    approve_leave,
    create_leave,
    delete_leave,
    get_leave,
    list_leaves,
    list_leaves_for_user,
    reject_leave,
)
from app.crud.notifications import create_notification, notify_all_superusers
from app.models.models import Leave, LeaveStatus, User
from app.schemas.leave import LeaveCreate, LeaveResponse

router = APIRouter(prefix="/leaves", tags=["Leaves"])


def _ensure_leave_access(current_user: User, leave: Leave) -> None:
    if not current_user.is_superuser and leave.employee_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


@router.post("/", response_model=LeaveResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/hour")
def apply_leave(
    request: Request,
    leave_in: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_leave = Leave(
        employee_id=current_user.id,
        leave_type=leave_in.leave_type,
        start_date=leave_in.start_date,
        end_date=leave_in.end_date,
        reason=leave_in.reason,
        status=LeaveStatus.pending,
    )
    created = create_leave(db, new_leave)

    notify_all_superusers(
        db,
        message=f"{current_user.full_name} applied for {leave_in.leave_type.value.replace('_', ' ')} leave",
        link="/leave-requests",
        exclude_user_id=current_user.id,
    )

    return created


@router.get("/", response_model=list[LeaveResponse])
def read_all_leaves(
    db: Session = Depends(get_db),
    _: User = Depends(require_superuser),
    status_filter: LeaveStatus | None = Query(default=None, alias="status"),
):
    return list_leaves(db, status=status_filter)


@router.get("/me", response_model=list[LeaveResponse])
def read_my_leaves(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_leaves_for_user(db, current_user.id)


@router.get("/{leave_id}", response_model=LeaveResponse)
def read_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leave = get_leave(db, leave_id)
    if leave is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave not found")

    _ensure_leave_access(current_user, leave)
    return leave


@router.post("/{leave_id}/approve", response_model=LeaveResponse)
def approve_leave_request(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    leave = get_leave(db, leave_id)
    if leave is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave not found")

    try:
        updated = approve_leave(db, leave, current_user.id)
    except InvalidLeaveTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except InsufficientLeaveBalanceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    create_notification(
        db,
        user_id=updated.employee_id,
        message=f"Your {updated.leave_type.value.replace('_', ' ')} leave request was approved",
        link="/leave-history",
    )

    return updated


@router.post("/{leave_id}/reject", response_model=LeaveResponse)
def reject_leave_request(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    leave = get_leave(db, leave_id)
    if leave is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave not found")

    try:
        updated = reject_leave(db, leave, current_user.id)
    except InvalidLeaveTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    create_notification(
        db,
        user_id=updated.employee_id,
        message=f"Your {updated.leave_type.value.replace('_', ' ')} leave request was rejected",
        link="/leave-history",
    )

    return updated


@router.delete("/{leave_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leave = get_leave(db, leave_id)
    if leave is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave not found")

    _ensure_leave_access(current_user, leave)

    try:
        delete_leave(db, leave)
    except InvalidLeaveTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
