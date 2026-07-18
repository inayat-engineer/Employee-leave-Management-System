from sqlalchemy.orm import Session
from app.models.models import Notification

class NotificationService:
    def __init__(self, db: Session):
        self.db = db
    
    async def create_notification(self, user_id: int, message: str, type: str = "info") -> dict:
        notification = Notification(
            user_id=user_id,
            message=message,
            type=type,
            read=False
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification
