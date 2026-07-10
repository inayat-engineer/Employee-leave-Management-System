from pydantic import BaseModel

from app.schemas.user import UserResponse


class PaginatedUsers(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    limit: int
    total_pages: int
