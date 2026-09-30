from pydantic import BaseModel, HttpUrl, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from app.db.models import ScanStatus, SeverityLevel, FindingStatus

class UserBase(BaseModel):
    username: str
    email: EmailStr
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class TargetBase(BaseModel):
    url: str

class TargetCreate(TargetBase):
    pass

class TargetResponse(TargetBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class ScanSessionCreate(BaseModel):
    target_url: str
    profile: Optional[str] = "full"
    options: Optional[Dict[str, bool]] = Field(default_factory=dict)

class ScanSessionResponse(BaseModel):
    id: UUID
    target_id: UUID
    status: ScanStatus
    current_stage: Optional[str] = None
    progress_percentage: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ScanFindingBase(BaseModel):
    title: str
    description: Optional[str] = None
    severity: Optional[SeverityLevel] = None
    confidence: Optional[str] = None
    cve_id: Optional[str] = None
    remediation: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None
    source_scanner: Optional[str] = None
    status: FindingStatus = FindingStatus.UNVERIFIED

class ScanFindingResponse(ScanFindingBase):
    id: UUID
    scan_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class ScanStatusResponse(BaseModel):
    scan_id: UUID
    status: ScanStatus
    current_stage: Optional[str] = None
    progress_percentage: int
    stages_completed: List[str]
    stages_remaining: List[str]
    live_findings_count: Dict[str, int]
    recon_summary: Optional[Dict[str, Any]] = None
    log_entries: List[Dict[str, str]]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
