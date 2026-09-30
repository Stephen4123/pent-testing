import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, Boolean, LargeBinary, Uuid
from sqlalchemy import JSON
from sqlalchemy.orm import declarative_base, relationship
import enum

Base = declarative_base()

class ScanStatus(str, enum.Enum):
    PENDING = "PENDING"
    VALIDATING = "VALIDATING"
    RECON = "RECON"
    PLANNING = "PLANNING"
    DISCOVERY = "DISCOVERY"
    AI_PROCESSING = "AI_PROCESSING"
    VALIDATION = "VALIDATION"
    RISK_ANALYSIS = "RISK_ANALYSIS"
    REPORTING = "REPORTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    TERMINATED = "TERMINATED"

class SeverityLevel(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"

class FindingStatus(str, enum.Enum):
    UNVERIFIED = "UNVERIFIED"
    VERIFIED = "VERIFIED"
    DUPLICATE = "DUPLICATE"
    FALSE_POSITIVE = "FALSE_POSITIVE"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sessions = relationship("ScanSession", back_populates="user")

class Target(Base):
    __tablename__ = "targets"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    url = Column(String(2048), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sessions = relationship("ScanSession", back_populates="target", cascade="all, delete-orphan")

class ScanSession(Base):
    __tablename__ = "scan_sessions"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_id = Column(Uuid(as_uuid=True), ForeignKey("targets.id"))
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(Enum(ScanStatus), default=ScanStatus.PENDING)
    current_stage = Column(String(100), nullable=True)
    progress_percentage = Column(Integer, default=0)
    profile = Column(String(50), default="full")
    report_json = Column(JSON, nullable=True)
    report_pdf = Column(LargeBinary, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    target = relationship("Target", back_populates="sessions")
    user = relationship("User", back_populates="sessions")
    findings = relationship("ScanFinding", back_populates="session", cascade="all, delete-orphan")

class ScanFinding(Base):
    __tablename__ = "scan_findings"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(Uuid(as_uuid=True), ForeignKey("scan_sessions.id"))
    title = Column(String(256), nullable=False)
    description = Column(String, nullable=True)
    severity = Column(Enum(SeverityLevel), nullable=True)
    confidence = Column(String(50), nullable=True)
    cve_id = Column(String(50), nullable=True)
    remediation = Column(String, nullable=True)
    evidence = Column(JSON, nullable=True)
    source_scanner = Column(String(100), nullable=True)
    status = Column(Enum(FindingStatus), default=FindingStatus.UNVERIFIED)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    session = relationship("ScanSession", back_populates="findings")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")

class SystemSettings(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, default=1)
    max_concurrent_scans = Column(Integer, default=5, nullable=False)
    max_requests_per_second = Column(Integer, default=50, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label = Column(String(100), nullable=False)
    key_value = Column(String(255), nullable=False)
    key_fragment = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
