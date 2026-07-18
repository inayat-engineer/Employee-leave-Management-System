from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import Optional, List
from datetime import date
from app.models.models import Leave

class LeaveRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def get_paginated(self, employee_id: Optional[int] = None, status: Optional[str] = None, page: int = 1, limit: int = 20):
        query = self.db.query(Leave)
        if employee_id:
            query = query.filter(Leave.employee_id == employee_id)
        if status:
            query = query.filter(Leave.status == status)
        
        query = query.options(joinedload(Leave.employee), joinedload(Leave.approver))
        total = query.count()
        leaves = query.offset((page - 1) * limit).limit(limit).all()
        return leaves, total
    
    def get_for_update(self, leave_id: int) -> Optional[Leave]:
        return self.db.query(Leave).filter(Leave.id == leave_id).with_for_update().first()
    
    def has_overlap(self, employee_id: int, start_date: date, end_date: date) -> bool:
        return self.db.query(Leave).filter(
            and_(
                Leave.employee_id == employee_id,
                Leave.status.in_(["pending", "approved"]),
                or_(
                    and_(Leave.start_date <= end_date, Leave.end_date >= start_date)
                )
            )
        ).exists()
    
    def create(self, employee_id: int, data: dict):
        leave = Leave(employee_id=employee_id, **data)
        self.db.add(leave)
        self.db.commit()
        self.db.refresh(leave)
        return leave
    
    def approve(self, leave_id: int, hr_id: int):
        leave = self.db.query(Leave).filter(Leave.id == leave_id).first()
        leave.status = "approved"
        leave.approver_id = hr_id
        self.db.commit()
        self.db.refresh(leave)
        return leave
