from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_superuser
from app.crud.holidays import create_holiday, delete_holiday, get_holiday, list_holidays, update_holiday
from app.models.models import Holiday, User
from app.schemas.holiday import HolidayCreate, HolidayResponse, HolidayUpdate

router = APIRouter(prefix="/holidays", tags=["Holidays"])


@router.get("/", response_model=list[HolidayResponse])
def read_holidays(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return list_holidays(db)


@router.post("/", response_model=HolidayResponse, status_code=status.HTTP_201_CREATED)
def add_holiday(
    holiday_in: HolidayCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_superuser),
):
    new_holiday = Holiday(**holiday_in.model_dump())
    try:
        return create_holiday(db, new_holiday)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A holiday already exists on this date.")


@router.put("/{holiday_id}", response_model=HolidayResponse)
def edit_holiday(
    holiday_id: int,
    holiday_in: HolidayUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_superuser),
):
    holiday = get_holiday(db, holiday_id)
    if holiday is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holiday not found")

    updates = holiday_in.model_dump(exclude_unset=True)
    try:
        return update_holiday(db, holiday, **updates)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A holiday already exists on this date.")


@router.delete("/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_superuser),
):
    holiday = get_holiday(db, holiday_id)
    if holiday is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holiday not found")

    delete_holiday(db, holiday)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
