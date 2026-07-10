from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.models import LeaveStatus, LeaveType


class LeaveBase(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str = Field(min_length=10, max_length=500)

    @field_validator("end_date")
    @classmethod
    def end_date_after_start(cls, v, info):
        start = info.data.get("start_date")
        if start and v < start:
            raise ValueError("end_date must be on or after start_date")
        return v


class LeaveCreate(LeaveBase):
    pass


class LeaveUpdate(BaseModel):
    status: LeaveStatus


class LeaveResponse(LeaveBase):
    id: int
    employee_id: int
    status: LeaveStatus
    approver_id: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
