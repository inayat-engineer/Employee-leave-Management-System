from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Controls Python traceback leakage in HTTP error responses.
    # Must be False in any deployed environment.
    DEBUG: bool = False

    # Controls Swagger/ReDoc visibility. Independent of DEBUG —
    # docs should stay visible even in a secure, non-debug deployment.
    ENABLE_DOCS: bool = True

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    SMTP_FROM_EMAIL: str
    SMTP_FROM_NAME: str = "LeaveOps HR"
    FRONTEND_URL: str = "http://localhost:5173"
    INVITE_TOKEN_EXPIRE_HOURS: int = 72

    # One-time bootstrap for the first superuser on a fresh database.
    # Self-disables automatically once any user exists — safe to leave set.
    BOOTSTRAP_SUPERUSER_EMAIL: str | None = None
    BOOTSTRAP_SUPERUSER_PASSWORD: str | None = None
    BOOTSTRAP_SUPERUSER_FULL_NAME: str = "HR Admin"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
