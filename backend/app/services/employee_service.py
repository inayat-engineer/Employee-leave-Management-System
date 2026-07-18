from sqlalchemy.orm import Session
from app.repositories.employee_repo import EmployeeRepository
from app.core.exceptions import NotFoundError

class EmployeeService:
    def __init__(self, db: Session):
        self.repo = EmployeeRepository(db)
        self.db = db
    
    async def get_employee_with_balance(self, employee_id: int) -> dict:
        employee = await self.repo.get_by_id(employee_id)
        if not employee:
            raise NotFoundError("Employee not found")
        return employee
