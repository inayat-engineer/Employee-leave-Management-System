from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, date
from app.repositories.leave_repo import LeaveRepository
from app.repositories.employee_repo import EmployeeRepository
from app.core.exceptions import BusinessError, NotFoundError
import logging

logger = logging.getLogger(__name__)

class LeaveService:
    def __init__(self, db: Session):
        self.leave_repo = LeaveRepository(db)
        self.employee_repo = EmployeeRepository(db)
        self.db = db
    
    async def get_employee_balance(self, employee_id: int) -> dict:
        return await self.employee_repo.get_leave_balance(employee_id)
    
    async def apply_leave(self, employee_id: int, leave_data: dict, ip_address: str) -> dict:
        if await self.leave_repo.has_overlap(employee_id, leave_data['start_date'], leave_data['end_date']):
            raise BusinessError("Overlapping leave request exists")
        
        if (leave_data['start_date'] - date.today()).days < 2:
            raise BusinessError("Minimum 2 days notice required")
        
        leave = await self.leave_repo.create(employee_id, leave_data)
        return leave
    
    async def approve_leave(self, leave_id: int, hr_id: int, ip_address: str) -> dict:
        leave = await self.leave_repo.get_for_update(leave_id)
        if not leave:
            raise NotFoundError("Leave request not found")
        if leave.status != "pending":
            raise BusinessError(f"Cannot approve {leave.status} request")
        
        balance = await self.get_employee_balance(leave.employee_id)
        if balance.get(leave.leave_type, 0) < leave.days:
            raise BusinessError("Insufficient leave balance")
        
        approved_leave = await self.leave_repo.approve(leave_id, hr_id)
        await self.employee_repo.deduct_balance(leave.employee_id, leave.leave_type, leave.days)
        return approved_leave
