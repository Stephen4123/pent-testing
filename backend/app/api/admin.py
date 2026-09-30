from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User, ScanSession, SystemSettings, ApiKey
from app.api.deps import get_current_admin_user
from typing import List
from pydantic import BaseModel
from datetime import datetime
from app.core.security import get_password_hash
import secrets

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin_user)]
)

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserCreateAdmin(BaseModel):
    username: str
    email: str
    password: str
    is_admin: bool = False

class SystemSettingsUpdate(BaseModel):
    max_concurrent_scans: int = None
    max_requests_per_second: int = None

class ApiKeyCreate(BaseModel):
    label: str

@router.get("/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "is_active": u.is_active, "is_admin": u.is_admin, "created_at": u.created_at} for u in users]

@router.post("/users")
def create_user(user_in: UserCreateAdmin, db: Session = Depends(get_db)):
    existing = db.query(User).filter((User.username == user_in.username) | (User.email == user_in.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_password,
        is_admin=user_in.is_admin,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    return {"message": "User created successfully"}

@router.patch("/users/{user_id}/status")
def update_user_status(user_id: str, status_update: UserStatusUpdate, db: Session = Depends(get_db)):
    try:
        import uuid
        parsed_id = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
        
    user = db.query(User).filter(User.id == parsed_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = status_update.is_active
    db.commit()
    return {"message": f"User status updated to {'active' if user.is_active else 'suspended'}"}

@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    try:
        import uuid
        parsed_id = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
        
    user = db.query(User).filter(User.id == parsed_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


@router.get("/scans")
def get_all_scans(db: Session = Depends(get_db)):
    scans = db.query(ScanSession).order_by(ScanSession.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "target": s.target.url if s.target else "Unknown",
            "status": s.status,
            "created_at": s.created_at,
            "completed_at": s.updated_at,
            "username": s.user.username if s.user else "Unknown",
            "user_id": s.user_id
        }
        for s in scans
    ]

@router.delete("/scans/{scan_id}")
def delete_scan(scan_id: str, db: Session = Depends(get_db)):
    try:
        import uuid
        parsed_id = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan ID format")
    scan = db.query(ScanSession).filter(ScanSession.id == parsed_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    db.delete(scan)
    db.commit()
    return {"message": "Scan deleted successfully"}

@router.get("/settings")
def get_system_settings(db: Session = Depends(get_db)):
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return {
        "max_concurrent_scans": settings.max_concurrent_scans,
        "max_requests_per_second": settings.max_requests_per_second
    }

@router.patch("/settings")
def update_system_settings(settings_update: SystemSettingsUpdate, db: Session = Depends(get_db)):
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings()
        db.add(settings)
        
    if settings_update.max_concurrent_scans is not None:
        settings.max_concurrent_scans = settings_update.max_concurrent_scans
    if settings_update.max_requests_per_second is not None:
        settings.max_requests_per_second = settings_update.max_requests_per_second
        
    db.commit()
    return {"message": "Settings updated successfully"}

@router.post("/scans/{scan_id}/terminate")
def terminate_scan(scan_id: str, db: Session = Depends(get_db)):
    try:
        import uuid
        parsed_id = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan ID format")
    scan = db.query(ScanSession).filter(ScanSession.id == parsed_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    if scan.status not in ["PENDING", "VALIDATING", "RECON", "PLANNING", "DISCOVERY", "AI_PROCESSING", "VALIDATION", "RISK_ANALYSIS", "REPORTING"]:
         raise HTTPException(status_code=400, detail=f"Cannot terminate scan in state {scan.status}")

    scan.status = "TERMINATED"
    db.commit()
    
    # Optional: We could also tell the celery worker to stop if implemented
    return {"message": "Scan terminated successfully"}

@router.get("/apikeys")
def get_all_apikeys(db: Session = Depends(get_db)):
    keys = db.query(ApiKey).order_by(ApiKey.created_at.desc()).all()
    return [
        {
            "id": k.id,
            "label": k.label,
            "key_fragment": k.key_fragment,
            "created_at": k.created_at
        }
        for k in keys
    ]

@router.post("/apikeys")
def create_apikey(key_in: ApiKeyCreate, db: Session = Depends(get_db)):
    raw_key = "as_" + secrets.token_hex(32)
    fragment = "as_••••••••" + raw_key[-4:]
    
    new_key = ApiKey(
        label=key_in.label,
        key_value=raw_key,
        key_fragment=fragment
    )
    db.add(new_key)
    db.commit()
    db.refresh(new_key)
    
    return {
        "id": new_key.id,
        "label": new_key.label,
        "key_fragment": new_key.key_fragment,
        "created_at": new_key.created_at,
        "key_value": raw_key # Return only once
    }

@router.delete("/apikeys/{key_id}")
def delete_apikey(key_id: str, db: Session = Depends(get_db)):
    try:
        import uuid
        parsed_id = uuid.UUID(key_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid key ID format")
    
    key = db.query(ApiKey).filter(ApiKey.id == parsed_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API Key not found")
        
    db.delete(key)
    db.commit()
    return {"message": "API Key revoked successfully"}
