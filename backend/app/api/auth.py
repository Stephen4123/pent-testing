from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
import uuid
from datetime import datetime, timedelta
from app.db.models import User, PasswordResetToken
from app.db.schemas import UserCreate, UserLogin, UserResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.core.security import get_password_hash, verify_password, create_access_token

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if username or email exists
    user = db.query(User).filter(
        (User.username == user_in.username) | (User.email == user_in.email)
    ).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_password,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

from fastapi.security import OAuth2PasswordRequestForm

@router.post("/login")
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
        
    access_token = create_access_token(subject=str(user.id))
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "username": user.username,
        "is_admin": user.is_admin,
        "message": "Login successful"
    }

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # We don't want to leak whether an email exists or not, so we just return success
        # but in this mock environment, we'll return a detail so they know it failed if testing
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User with this email not found")
        
    token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(hours=1)
    
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    db.add(reset_token)
    db.commit()
    
    # In a real application, we would send an email here.
    # For now, return the token in the response so the frontend can display it for testing.
    return {"message": "Password reset token generated", "token": token}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_entry = db.query(PasswordResetToken).filter(PasswordResetToken.token == req.token).first()
    
    if not reset_entry:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
        
    if reset_entry.expires_at < datetime.utcnow():
        db.delete(reset_entry)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token has expired")
        
    user = db.query(User).filter(User.id == reset_entry.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    user.hashed_password = get_password_hash(req.new_password)
    db.delete(reset_entry) # Consume the token
    db.commit()
    
    return {"message": "Password successfully reset"}
