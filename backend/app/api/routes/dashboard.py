from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_superuser
from app.models.models import Leave, LeaveStatus, User
from app.schemas.dashboard import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=DashboardStats)
def read_dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_superuser),
):
    total_employees = db.query(User).count()
    leaves_pending = db.query(Leave).filter(Leave.status == LeaveStatus.pending).count()
    leaves_approved = db.query(Leave).filter(Leave.status == LeaveStatus.approved).count()
    leaves_rejected = db.query(Leave).filter(Leave.status == LeaveStatus.rejected).count()

    return DashboardStats(
	total_employees=total_employees,
	leaves_pending=leaves_pending,
	leaves_approved=leaves_approved,
	leaves_rejected=leaves_rejected,
    )
