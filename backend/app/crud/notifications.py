from sqlalchemy.orm import Session

from app.models.models import Notification, User


def create_notification(db: Session, user_id: int, message: str, link: str | None = None) -> Notification:
    notification = Notification(user_id=user_id, message=message, link=link)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def notify_all_superusers(db: Session, message: str, link: str | None = None, exclude_user_id: int | None = None) -> None:
    superusers = db.query(User).filter(User.is_superuser == True).all()  # noqa: E712
    for superuser in superusers:
        if exclude_user_id is not None and superuser.id == exclude_user_id:
            continue
        create_notification(db, superuser.id, message, link)


def list_notifications(db: Session, user_id: int, unread_only: bool = False, limit: int = 20) -> list[Notification]:
    query = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only:
        query = query.filter(Notification.is_read == False)  # noqa: E712
    return query.order_by(Notification.created_at.desc()).limit(limit).all()


def count_unread(db: Session, user_id: int) -> int:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
        .count()
    )


def get_notification(db: Session, notification_id: int, user_id: int) -> Notification | None:
    return (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )


def mark_as_read(db: Session, notification: Notification) -> Notification:
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_as_read(db: Session, user_id: int) -> int:
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
        .update({"is_read": True})
    )
    db.commit()
    return updated
