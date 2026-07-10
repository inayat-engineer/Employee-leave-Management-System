from pydantic import BaseModel, ConfigDict


class LeaveBalanceResponse(BaseModel):
    id: int
    user_id: int
    casual_leave_total: int
    casual_leave_used: int
    sick_leave_total: int
    sick_leave_used: int
    annual_leave_total: int
    annual_leave_used: int

    model_config = ConfigDict(from_attributes=True)