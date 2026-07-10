from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_employees: int
    leaves_pending: int
    leaves_approved: int
    leaves_rejected: int
