from sqlalchemy.orm import Session

from app.models.models import Holiday


def list_holidays(db: Session) -> list[Holiday]:
    return db.query(Holiday).order_by(Holiday.date.asc()).all()


def get_holiday(db: Session, holiday_id: int) -> Holiday | None:
    return db.query(Holiday).filter(Holiday.id == holiday_id).first()


def create_holiday(db: Session, holiday: Holiday) -> Holiday:
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday


def update_holiday(db: Session, holiday: Holiday, **updates) -> Holiday:
    for field, value in updates.items():
        setattr(holiday, field, value)
    db.commit()
    db.refresh(holiday)
    return holiday


def delete_holiday(db: Session, holiday: Holiday) -> None:
    db.delete(holiday)
    db.commit()
