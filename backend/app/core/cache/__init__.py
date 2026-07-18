import redis
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

redis_client = None
try:
    if hasattr(settings, 'REDIS_URL'):
        redis_client = redis.from_url(settings.REDIS_URL)
        logger.info("Redis client initialized successfully")
except Exception as e:
    logger.warning(f"Redis not available: {e}")

def cache(ttl: int = 300):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Simple cache implementation
            # TODO: Implement actual Redis caching
            return await func(*args, **kwargs)
        return wrapper
    return decorator
