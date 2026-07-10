from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.crud.notifications import (
    count_unread,
    get_notification,
    list_notifications,
    mark_all_as_read,
    mark_as_read,
)
from app.models.models import User
from app.schemas.notification import NotificationListResponse, NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=NotificationListResponse)
def read_my_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = list_notifications(db, current_user.id, unread_only=unread_only)
    unread = count_unread(db, current_user.id)
    return NotificationListResponse(items=items, unread_count=unread)


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def read_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = get_notification(db, notification_id, current_user.id)
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return mark_as_read(db, notification)


@router.post("/read-all", status_code=status.HTTP_200_OK)
def read_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = mark_all_as_read(db, current_user.id)
    return {"marked_read": updated}
