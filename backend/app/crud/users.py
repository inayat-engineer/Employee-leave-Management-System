from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.models import LeaveBalance, User


def get_user(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_leave_balance(db: Session, user_id: int) -> LeaveBalance | None:
    return db.query(LeaveBalance).filter(LeaveBalance.user_id == user_id).first()


def create_leave_balance(db: Session, user_id: int) -> LeaveBalance:
    leave_balance = LeaveBalance(user_id=user_id)
    db.add(leave_balance)
    db.commit()
    db.refresh(leave_balance)
    return leave_balance


def get_or_create_leave_balance(db: Session, user_id: int) -> LeaveBalance:
    leave_balance = get_leave_balance(db, user_id)
    if leave_balance is not None:
        return leave_balance
    return create_leave_balance(db, user_id)


def list_users(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    department: str | None = None,
    is_active: bool | None = None,
) -> tuple[list[User], int]:
    query = db.query(User)

    if search:
        like_pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(like_pattern),
                User.email.ilike(like_pattern),
                User.department.ilike(like_pattern),
                User.designation.ilike(like_pattern),
            )
        )

    if department:
        query = query.filter(User.department == department)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total = query.count()
    items = query.order_by(User.id).offset(skip).limit(limit).all()
    return items, total


def create_user(db: Session, user: User) -> User:
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, db_user: User, **updates) -> User:
    for key, value in updates.items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, db_user: User) -> None:
    db.delete(db_user)
    db.commit()
