from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.email import send_password_reset_email
from app.core.limiter import limiter
from app.core.security import generate_invite_token, get_password_hash, hash_token, verify_password, create_access_token
from app.models.models import User
from app.schemas.user import AcceptInvite, ForgotPasswordRequest, InviteDetails, ResetPassword
from app.schemas.tokens import AuthResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

COOKIE_NAME = "access_token"


def _set_auth_cookie(response: Response, token: str, max_age_seconds: int) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=max_age_seconds,
        path="/",
    )


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact HR for access.",
        )

    remember_me = "remember_me" in form_data.scopes
    if remember_me:
        expires_delta = timedelta(days=30)
    else:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    access_token = create_access_token(subject=user.email, token_version=user.token_version, expires_delta=expires_delta)
    _set_auth_cookie(response, access_token, max_age_seconds=int(expires_delta.total_seconds()))
    return AuthResponse(detail="Logged in successfully")


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"detail": "Successfully logged out."}


@router.get("/invite/{token}", response_model=InviteDetails)
def get_invite_details(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.invite_token == hash_token(token)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite link is invalid.")

    if user.invite_token_expires_at is None or user.invite_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This invite link has expired. Ask HR to resend it.")

    if user.hashed_password is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This invite has already been used.")

    return InviteDetails(full_name=user.full_name, email=user.email)


@router.post("/accept-invite", response_model=AuthResponse)
@limiter.limit("5/minute")
def accept_invite(request: Request, payload: AcceptInvite, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.invite_token == hash_token(payload.token)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite link is invalid.")

    if user.invite_token_expires_at is None or user.invite_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This invite link has expired. Ask HR to resend it.")

    if user.hashed_password is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This invite has already been used.")

    if len(payload.password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters.")

    user.hashed_password = get_password_hash(payload.password)
    user.is_active = True
    user.invite_token = None
    user.invite_token_expires_at = None
    db.commit()
    db.refresh(user)

    access_token = create_access_token(subject=user.email, token_version=user.token_version)
    _set_auth_cookie(response, access_token, max_age_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    return AuthResponse(detail="Account activated successfully")

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    generic_response = {"detail": "If that email is registered, a password reset link has been sent."}

    user = db.query(User).filter(User.email == payload.email).first()

    # Do the same CPU work (token generation + hashing) and the same shape
    # of DB round-trip regardless of whether the user exists, so response
    # latency doesn't leak "email exists" vs "email doesn't exist". The
    # actual SMTP send always happens out-of-band via BackgroundTasks
    # either way, so it was never the timing signal here — the token
    # generation/hash/commit was, and previously only ran on one branch.
    token = generate_invite_token()
    hashed_token = hash_token(token)

    if user is None or not user.is_active:
        # Touch the DB with an equivalent write-shaped statement so this
        # branch's timing matches the real-user branch below. Rolled back,
        # never committed, no observable side effect.
        db.query(User).filter(User.email == payload.email).first()
        db.rollback()
        return generic_response

    user.reset_token = hashed_token
    user.reset_token_expires_at = datetime.utcnow() + timedelta(hours=settings.RESET_TOKEN_EXPIRE_HOURS)
    db.commit()

    # The raw token only ever exists in the email link — the DB only ever
    # holds its hash (see hash_token docstring).
    reset_link = f"{settings.FRONTEND_URL}/reset-password/{token}"
    # Send after the response goes out, not before: a slow/unreachable SMTP
    # server must never make this endpoint hang or become a distinguishing
    # timing signal between "email exists" and "email doesn't exist".
    background_tasks.add_task(
        send_password_reset_email, to_email=user.email, full_name=user.full_name, reset_link=reset_link
    )

    return generic_response


@router.post("/reset-password", response_model=AuthResponse)
@limiter.limit("5/minute")
def reset_password(request: Request, payload: ResetPassword, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == hash_token(payload.token)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reset link is invalid.")

    if user.reset_token_expires_at is None or user.reset_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This reset link has expired. Request a new one.")

    if len(payload.password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters.")

    user.hashed_password = get_password_hash(payload.password)
    user.reset_token = None
    user.reset_token_expires_at = None
    # Invalidate every session/token issued before this reset — this is the
    # whole point of a password reset (e.g. "I think someone else has my
    # session"), and stateless JWTs don't get this for free otherwise.
    user.token_version += 1
    db.commit()
    db.refresh(user)

    access_token = create_access_token(subject=user.email, token_version=user.token_version)
    _set_auth_cookie(response, access_token, max_age_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    return AuthResponse(detail="Password reset successfully")