import logging

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.crud.users import create_user, get_or_create_leave_balance
from app.models.models import User

logger = logging.getLogger(__name__)


def bootstrap_superuser() -> None:
    """
    Creates the first superuser account on a genuinely empty database,
    driven by BOOTSTRAP_SUPERUSER_EMAIL / BOOTSTRAP_SUPERUSER_PASSWORD.

    Safe to call on every startup: it only acts when zero users exist,
    so it is a true no-op after the first successful run.
    """
    if not settings.BOOTSTRAP_SUPERUSER_EMAIL or not settings.BOOTSTRAP_SUPERUSER_PASSWORD:
        return

    db = SessionLocal()
    try:
        existing_user_count = db.query(User).count()
        if existing_user_count > 0:
            # Bootstrap already happened at some point in the past — these
            # env vars are now a live, unused, privileged credential sitting
            # in plaintext config. Nag on every single startup until they're
            # removed, rather than silently doing nothing.
            logger.critical(
                "BOOTSTRAP_SUPERUSER_EMAIL/PASSWORD are still set but the users table "
                "is not empty — bootstrap already ran. Remove these two variables from "
                "your environment now; leaving them in place is a standing credential "
                "that grants superuser access to anyone who reads this config."
            )
            return

        new_user = User(
            full_name=settings.BOOTSTRAP_SUPERUSER_FULL_NAME,
            email=settings.BOOTSTRAP_SUPERUSER_EMAIL,
            hashed_password=get_password_hash(settings.BOOTSTRAP_SUPERUSER_PASSWORD),
            is_active=True,
            is_superuser=True,
        )
        created = create_user(db, new_user)
        get_or_create_leave_balance(db, created.id)

        logger.warning(
            "Bootstrap: created initial superuser '%s'. "
            "Consider removing BOOTSTRAP_SUPERUSER_* from the environment after first login.",
            created.email,
        )
    finally:
        db.close()