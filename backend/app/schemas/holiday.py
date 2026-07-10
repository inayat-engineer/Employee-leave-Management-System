from datetime import date as date_type, datetime

from pydantic import BaseModel, ConfigDict


class HolidayBase(BaseModel):
    name: str
    date: date_type
    description: str | None = None


class HolidayCreate(HolidayBase):
    pass


class HolidayUpdate(BaseModel):
    name: str | None = None
    date: date_type | None = None
    description: str | None = None


class HolidayResponse(HolidayBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
