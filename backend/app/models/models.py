import enum
from datetime import datetime, date

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Text, Enum, ForeignKey
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class LeaveStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class LeaveType(str, enum.Enum):
    casual = "casual"
    sick = "sick"
    annual = "annual"
    wedding = "wedding"
    family_emergency = "family_emergency"
    personal = "personal"
    other = "other"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    department = Column(String(100), nullable=True)
    designation = Column(String(100), nullable=True)
    phone_number = Column(String(30), nullable=True)
    profile_picture_url = Column(String(255), nullable=True)
    joining_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    invite_token = Column(String(255), nullable=True, unique=True, index=True)
    invite_token_expires_at = Column(DateTime, nullable=True)
    reset_token = Column(String(255), nullable=True, unique=True, index=True)
    reset_token_expires_at = Column(DateTime, nullable=True)

    # Bumped on every password change/reset. Embedded in issued JWTs ("ver"
    # claim) so bumping this instantly invalidates every previously issued
    # session token, even though tokens are otherwise stateless.
    token_version = Column(Integer, default=0, nullable=False)

    # Self-service email changes go through verification before they take
    # effect: `email` is only overwritten once the link sent to the *new*
    # address is clicked, so a hijacked session can't silently take over
    # the account's identity.
    pending_email = Column(String(150), nullable=True)
    email_change_token = Column(String(255), nullable=True, unique=True, index=True)
    email_change_token_expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    leave_balance = relationship(
        "LeaveBalance",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    leaves = relationship(
        "Leave",
        back_populates="employee",
        foreign_keys="Leave.employee_id",
        cascade="all, delete-orphan",
    )


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    casual_leave_total = Column(Integer, default=12, nullable=False)
    casual_leave_used = Column(Integer, default=0, nullable=False)
    sick_leave_total = Column(Integer, default=10, nullable=False)
    sick_leave_used = Column(Integer, default=0, nullable=False)
    annual_leave_total = Column(Integer, default=15, nullable=False)
    annual_leave_used = Column(Integer, default=0, nullable=False)

    user = relationship("User", back_populates="leave_balance")


class Leave(Base):
    __tablename__ = "leaves"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    leave_type = Column(Enum(LeaveType), default=LeaveType.casual, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(Enum(LeaveStatus), default=LeaveStatus.pending, nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("User", back_populates="leaves", foreign_keys=[employee_id])
    approver = relationship("User", foreign_keys=[approver_id])


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    date = Column(Date, nullable=False, unique=True, index=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    message = Column(String(255), nullable=False)
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])