from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.models import User
from app.schemas.user import AcceptInvite, InviteDetails
from app.schemas.tokens import Token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact HR for access.",
        )
    access_token = create_access_token(subject=user.email)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout():
    return {"detail": "Successfully logged out. Please delete the token on the client side."}


@router.get("/invite/{token}", response_model=InviteDetails)
def get_invite_details(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.invite_token == token).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite link is invalid.")

    if user.invite_token_expires_at is None or user.invite_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This invite link has expired. Ask HR to resend it.")

    if user.hashed_password is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This invite has already been used.")

    return InviteDetails(full_name=user.full_name, email=user.email)


@router.post("/accept-invite", response_model=Token)
def accept_invite(payload: AcceptInvite, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.invite_token == payload.token).first()
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

    access_token = create_access_token(subject=user.email)
    return {"access_token": access_token, "token_type": "bearer"}
