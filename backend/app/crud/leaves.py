from sqlalchemy.orm import Session

from app.crud.users import get_or_create_leave_balance
from app.models.models import Leave, LeaveBalance, LeaveStatus, LeaveType


class InsufficientLeaveBalanceError(Exception):
    """Raised when approving a leave would exceed the employee's remaining balance."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class InvalidLeaveTransitionError(Exception):
    """Raised when trying to approve/reject a leave that isn't currently pending."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


# Only these leave types are tracked against a numeric balance today.
# wedding / family_emergency / personal / other have no cap (known, pre-existing scope decision).
LEAVE_TYPE_BALANCE_FIELDS = {
    LeaveType.casual: ("casual_leave_total", "casual_leave_used"),
    LeaveType.sick: ("sick_leave_total", "sick_leave_used"),
    LeaveType.annual: ("annual_leave_total", "annual_leave_used"),
}


def calculate_leave_duration(leave: Leave) -> int:
    """Inclusive day count: Mon-Mon = 1 day, Mon-Tue = 2 days."""
    return (leave.end_date - leave.start_date).days + 1


def get_leave(db: Session, leave_id: int) -> Leave | None:
    return db.query(Leave).filter(Leave.id == leave_id).first()


def list_leaves(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: LeaveStatus | None = None,
    search: str | None = None,
) -> list[Leave]:
    query = db.query(Leave)
    if status is not None:
        query = query.filter(Leave.status == status)
    if search:
        like_pattern = f"%{search}%"
        query = query.filter(Leave.reason.ilike(like_pattern))
    return query.order_by(Leave.created_at.desc()).offset(skip).limit(limit).all()


def list_leaves_for_user(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
) -> list[Leave]:
    query = db.query(Leave).filter(Leave.employee_id == user_id)
    if search:
        like_pattern = f"%{search}%"
        query = query.filter(Leave.reason.ilike(like_pattern))
    return query.order_by(Leave.created_at.desc()).offset(skip).limit(limit).all()


def has_overlapping_leave(db: Session, employee_id: int, start_date, end_date) -> bool:
    """Checks for any pending or approved leave that overlaps the given date range."""
    return (
        db.query(Leave)
        .filter(
            Leave.employee_id == employee_id,
            Leave.status.in_([LeaveStatus.pending, LeaveStatus.approved]),
            Leave.start_date <= end_date,
            Leave.end_date >= start_date,
        )
        .first()
        is not None
    )


def create_leave(db: Session, leave: Leave) -> Leave:
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


def approve_leave(db: Session, leave: Leave, approver_id: int) -> Leave:
    # Re-fetch the leave row WITH a lock before trusting its status. Without
    # this, two concurrent approve calls (double-click, two HR tabs, two HR
    # accounts) can both pass the `status == pending` check below using a
    # stale in-memory copy, both deduct balance, and both commit — a classic
    # check-then-act race that silently overdraws the balance the check
    # right below is supposed to prevent.
    locked_leave = (
        db.query(Leave).filter(Leave.id == leave.id).with_for_update().one()
    )

    if locked_leave.status != LeaveStatus.pending:
        raise InvalidLeaveTransitionError(
            f"Cannot approve a leave request that is already {locked_leave.status.value}."
        )

    balance_fields = LEAVE_TYPE_BALANCE_FIELDS.get(locked_leave.leave_type)
    if balance_fields is not None:
        total_field, used_field = balance_fields

        # Lock the employee's balance row too: two DIFFERENT pending leave
        # requests for the same employee, approved concurrently, must not
        # both read the same "remaining" value before either writes back.
        balance = (
            db.query(LeaveBalance)
            .filter(LeaveBalance.user_id == locked_leave.employee_id)
            .with_for_update()
            .first()
        )
        if balance is None:
            balance = get_or_create_leave_balance(db, locked_leave.employee_id)

        duration = calculate_leave_duration(locked_leave)
        remaining = getattr(balance, total_field) - getattr(balance, used_field)

        if duration > remaining:
            raise InsufficientLeaveBalanceError(
                f"Insufficient {locked_leave.leave_type.value} leave balance: "
                f"requested {duration} day(s), {remaining} day(s) remaining."
            )

        setattr(balance, used_field, getattr(balance, used_field) + duration)
        db.add(balance)

    locked_leave.status = LeaveStatus.approved
    locked_leave.approver_id = approver_id
    db.commit()
    db.refresh(locked_leave)
    return locked_leave


def reject_leave(db: Session, leave: Leave, approver_id: int) -> Leave:
    # Same reasoning as approve_leave: lock before checking status so a
    # concurrent approve/reject on the same leave can't both go through.
    locked_leave = (
        db.query(Leave).filter(Leave.id == leave.id).with_for_update().one()
    )

    if locked_leave.status != LeaveStatus.pending:
        raise InvalidLeaveTransitionError(
            f"Cannot reject a leave request that is already {locked_leave.status.value}."
        )

    locked_leave.status = LeaveStatus.rejected
    locked_leave.approver_id = approver_id
    db.commit()
    db.refresh(locked_leave)
    return locked_leave


def delete_leave(db: Session, leave: Leave) -> None:
    # Once HR has made a decision, the record is permanent — preserves the
    # audit trail. Only requests still awaiting a decision can be withdrawn.
    if leave.status != LeaveStatus.pending:
        raise InvalidLeaveTransitionError(
            f"Cannot delete a leave request that is already {leave.status.value}. "
            "Only pending requests can be withdrawn."
        )

    db.delete(leave)
    db.commit()