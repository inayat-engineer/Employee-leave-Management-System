from sqlalchemy.orm import Session

from app.crud.users import get_or_create_leave_balance
from app.models.models import Leave, LeaveStatus, LeaveType


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


def list_leaves(db: Session, skip: int = 0, limit: int = 100, status: LeaveStatus | None = None) -> list[Leave]:
    query = db.query(Leave)
    if status is not None:
        query = query.filter(Leave.status == status)
    return query.offset(skip).limit(limit).all()


def list_leaves_for_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> list[Leave]:
    return (
        db.query(Leave)
        .filter(Leave.employee_id == user_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_leave(db: Session, leave: Leave) -> Leave:
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


def approve_leave(db: Session, leave: Leave, approver_id: int) -> Leave:
    if leave.status != LeaveStatus.pending:
        raise InvalidLeaveTransitionError(
            f"Cannot approve a leave request that is already {leave.status.value}."
        )

    balance_fields = LEAVE_TYPE_BALANCE_FIELDS.get(leave.leave_type)
    if balance_fields is not None:
        total_field, used_field = balance_fields
        balance = get_or_create_leave_balance(db, leave.employee_id)
        duration = calculate_leave_duration(leave)
        remaining = getattr(balance, total_field) - getattr(balance, used_field)

        if duration > remaining:
            raise InsufficientLeaveBalanceError(
                f"Insufficient {leave.leave_type.value} leave balance: "
                f"requested {duration} day(s), {remaining} day(s) remaining."
            )

        setattr(balance, used_field, getattr(balance, used_field) + duration)
        db.add(balance)

    leave.status = LeaveStatus.approved
    leave.approver_id = approver_id
    db.commit()
    db.refresh(leave)
    return leave


def reject_leave(db: Session, leave: Leave, approver_id: int) -> Leave:
    if leave.status != LeaveStatus.pending:
        raise InvalidLeaveTransitionError(
            f"Cannot reject a leave request that is already {leave.status.value}."
        )

    leave.status = LeaveStatus.rejected
    leave.approver_id = approver_id
    db.commit()
    db.refresh(leave)
    return leave


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
