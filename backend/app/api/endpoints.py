from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio

from app.db.session import get_db
from app.db.models import Target, ScanSession, ScanFinding, ScanStatus, SeverityLevel, User
from app.db.schemas import TargetCreate, ScanSessionCreate, ScanSessionResponse, ScanFindingResponse, ScanStatusResponse
from app.orchestrator.engine import run_scan_simulation, get_scan_logs, get_scan_recon
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/dashboard/stats")
async def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scan_query = db.query(ScanSession)
    finding_query = db.query(ScanFinding).join(ScanSession)
    
    if not current_user.is_admin:
        scan_query = scan_query.filter(ScanSession.user_id == current_user.id)
        finding_query = finding_query.filter(ScanSession.user_id == current_user.id)

    # 1. Total scans
    total_scans = scan_query.count()
    
    # 2. Active scans
    active_scans = scan_query.filter(
        ScanSession.status.in_([
            ScanStatus.PENDING, ScanStatus.VALIDATING, ScanStatus.RECON, 
            ScanStatus.PLANNING, ScanStatus.DISCOVERY, ScanStatus.AI_PROCESSING, 
            ScanStatus.VALIDATION
        ])
    ).count()
    
    # 3. Critical findings
    critical_findings = finding_query.filter(ScanFinding.severity == SeverityLevel.CRITICAL).count()
    
    # 4. Severity breakdown
    severity_breakdown = [
        {"name": "Critical", "value": finding_query.filter(ScanFinding.severity == SeverityLevel.CRITICAL).count(), "color": "var(--severity-critical)"},
        {"name": "High", "value": finding_query.filter(ScanFinding.severity == SeverityLevel.HIGH).count(), "color": "var(--severity-high)"},
        {"name": "Medium", "value": finding_query.filter(ScanFinding.severity == SeverityLevel.MEDIUM).count(), "color": "var(--severity-medium)"},
        {"name": "Low", "value": finding_query.filter(ScanFinding.severity == SeverityLevel.LOW).count(), "color": "var(--severity-low)"},
    ]
    
    # 5. Recent scans
    recent_sessions = scan_query.order_by(ScanSession.created_at.desc()).limit(4).all()
    recent_scans = []
    for session in recent_sessions:
        target = db.query(Target).filter(Target.id == session.target_id).first()
        # Find max severity
        findings = db.query(ScanFinding).filter(ScanFinding.scan_id == session.id).all()
        max_cvss = 1.0
        cvss_label = "Info"
        color = "var(--text-muted)"
        
        has_critical = any(f.severity == SeverityLevel.CRITICAL for f in findings)
        has_high = any(f.severity == SeverityLevel.HIGH for f in findings)
        has_medium = any(f.severity == SeverityLevel.MEDIUM for f in findings)
        has_low = any(f.severity == SeverityLevel.LOW for f in findings)
        
        if has_critical:
            max_cvss = 9.5
            cvss_label = "Critical"
            color = "var(--severity-critical)"
        elif has_high:
            max_cvss = 8.0
            cvss_label = "High"
            color = "var(--severity-high)"
        elif has_medium:
            max_cvss = 5.5
            cvss_label = "Medium"
            color = "var(--severity-medium)"
        elif has_low:
            max_cvss = 3.0
            cvss_label = "Low"
            color = "var(--severity-low)"
            
        recent_scans.append({
            "id": session.id,
            "target": target.url if target else "Unknown",
            "cvss": max_cvss,
            "cvssLabel": cvss_label,
            "color": color,
            "date": session.created_at.strftime("%b %d, %Y"),
            "time": session.created_at.strftime("%H:%M:%S UTC")
        })
        
    # 6. Activity data (Last 7 Days)
    activity_data = []
    today = datetime.now()
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.strftime("%a")
        day_start = datetime(day.year, day.month, day.day, 0, 0, 0)
        day_end = datetime(day.year, day.month, day.day, 23, 59, 59)
        scans_count = scan_query.filter(ScanSession.created_at.between(day_start, day_end)).count()
        activity_data.append({
            "day": day_str,
            "scans": scans_count
        })
        
    completed_scans = scan_query.filter(ScanSession.status == ScanStatus.COMPLETED).all()
    avg_scan_time_str = "0m"
    if completed_scans:
        total_seconds = sum((s.updated_at - s.created_at).total_seconds() for s in completed_scans)
        avg_seconds = total_seconds / len(completed_scans)
        avg_minutes = int(avg_seconds // 60)
        avg_scan_time_str = f"{avg_minutes}m" if avg_minutes > 0 else f"{int(avg_seconds)}s"

    return {
        "total_scans": total_scans,
        "active_scans": active_scans,
        "critical_findings": critical_findings,
        "avg_scan_time": avg_scan_time_str,
        "severity_breakdown": severity_breakdown,
        "recent_scans": recent_scans,
        "activity_data": activity_data
    }

@router.post("/scans", response_model=ScanSessionResponse)
async def launch_scan(payload: ScanSessionCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Check or Create Target
    target = db.query(Target).filter(Target.url == payload.target_url).first()
    if not target:
        target = Target(url=payload.target_url)
        db.add(target)
        db.commit()
        db.refresh(target)
        
    # 2. Create ScanSession attached to current_user
    session = ScanSession(
        target_id=target.id,
        user_id=current_user.id,
        status=ScanStatus.PENDING,
        current_stage="1. VALIDATION",
        progress_percentage=0,
        profile=payload.profile
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # 3. Queue manager will pick up the scan automatically
    
    return session

@router.post("/scans/{scan_id}/terminate")
async def terminate_scan(scan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(ScanSession).filter(ScanSession.id == scan_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    if session.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    if session.status in [ScanStatus.COMPLETED, ScanStatus.FAILED, ScanStatus.TERMINATED]:
        return {"message": "Scan already finished"}
        
    session.status = ScanStatus.TERMINATED
    session.current_stage = "TERMINATED"
    db.commit()
    
    from app.orchestrator.engine import add_log
    add_log(scan_id, "WRN", "Scan manually terminated by user.")
    
    return {"message": "Scan terminated successfully"}

@router.get("/scans")
async def get_scans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(ScanSession).order_by(ScanSession.created_at.desc())
    if not current_user.is_admin:
        query = query.filter(ScanSession.user_id == current_user.id)
        
    sessions = query.all()
    results = []
    
    for session in sessions:
        target = db.query(Target).filter(Target.id == session.target_id).first()
        findings = db.query(ScanFinding).filter(ScanFinding.scan_id == session.id).all()
        
        critical_count = sum(1 for f in findings if f.severity == SeverityLevel.CRITICAL)
        high_count = sum(1 for f in findings if f.severity == SeverityLevel.HIGH)
        
        duration = "Total: 12m"
        if session.status == ScanStatus.COMPLETED:
            duration = "Total: 10m 15s"
        elif session.status == ScanStatus.FAILED:
            duration = "Crashed after 2m"
        elif session.status == ScanStatus.TERMINATED:
            duration = "Terminated"
        else:
            duration = "Running..."
            
        results.append({
            "id": session.id,
            "target": target.url if target else "Unknown",
            "status": session.status.value,
            "statusClass": f"badge-{session.status.value.lower()}",
            "critical": critical_count if session.status in [ScanStatus.COMPLETED, ScanStatus.DISCOVERY, ScanStatus.AI_PROCESSING, ScanStatus.VALIDATION, ScanStatus.TERMINATED] else None,
            "high": high_count if session.status in [ScanStatus.COMPLETED, ScanStatus.DISCOVERY, ScanStatus.AI_PROCESSING, ScanStatus.VALIDATION, ScanStatus.TERMINATED] else None,
            "date": session.created_at.strftime("%b %d, %Y"),
            "duration": duration
        })
        
    return results

@router.get("/scans/{scan_id}/status", response_model=ScanStatusResponse)
async def get_scan_status(scan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        import uuid
        parsed_id = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan ID format")
    session = db.query(ScanSession).filter(ScanSession.id == parsed_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Scan session not found")
        
    if session.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    findings = db.query(ScanFinding).filter(ScanFinding.scan_id == parsed_id).all()
    
    critical_count = sum(1 for f in findings if f.severity == SeverityLevel.CRITICAL)
    high_count = sum(1 for f in findings if f.severity == SeverityLevel.HIGH)
    medium_count = sum(1 for f in findings if f.severity == SeverityLevel.MEDIUM)
    low_count = sum(1 for f in findings if f.severity == SeverityLevel.LOW)
    
    all_stages = [
        "1. VALIDATION",
        "2. RECON",
        "3. AI PLANNING",
        "4. DISCOVERY",
        "5. PROCESSING",
        "6. VALIDATION",
        "7. COMPLETED"
    ]
    
    current_idx = 0
    if session.current_stage in all_stages:
        current_idx = all_stages.index(session.current_stage)
        
    stages_completed = all_stages[:current_idx]
    stages_remaining = all_stages[current_idx + 1:]
    
    logs = get_scan_logs(scan_id)
    recon = get_scan_recon(scan_id)
    
    return {
        "scan_id": session.id,
        "status": session.status,
        "current_stage": session.current_stage,
        "progress_percentage": session.progress_percentage,
        "stages_completed": stages_completed,
        "stages_remaining": stages_remaining,
        "live_findings_count": {
            "critical": critical_count,
            "high": high_count,
            "medium": medium_count,
            "low": low_count
        },
        "recon_summary": recon,
        "log_entries": logs,
        "created_at": session.created_at,
        "updated_at": session.updated_at
    }

@router.get("/scans/{scan_id}/findings", response_model=List[ScanFindingResponse])
async def get_scan_findings(scan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        import uuid
        parsed_id = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan ID format")
        
    session = db.query(ScanSession).filter(ScanSession.id == parsed_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Scan session not found")
        
    if session.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    findings = db.query(ScanFinding).filter(ScanFinding.scan_id == parsed_id).all()
    return findings

import json
from fastapi import Response

@router.get("/scans/{scan_id}/json")
async def get_scan_report_json(scan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        import uuid
        parsed_id = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan ID format")
        
    session = db.query(ScanSession).filter(ScanSession.id == parsed_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Scan not found")
    if session.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden")

    if not session.report_json:
        raise HTTPException(status_code=404, detail="JSON report not found or scan is not completed yet.")
        
    return Response(
        content=json.dumps(session.report_json, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=scan_report_{scan_id}.json"}
    )

@router.get("/scans/{scan_id}/pdf")
async def get_scan_report_pdf(scan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        import uuid
        parsed_id = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan ID format")
        
    session = db.query(ScanSession).filter(ScanSession.id == parsed_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Scan not found")
    if session.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden")

    if not session.report_pdf:
        raise HTTPException(status_code=404, detail="PDF report not found or scan is not completed yet.")
        
    return Response(
        content=session.report_pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=scan_report_{scan_id}.pdf"}
    )
