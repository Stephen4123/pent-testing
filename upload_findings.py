import os
import sys
import json
import uuid
from datetime import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import Base, ScanSession, Target, ScanStatus, ScanFinding, SeverityLevel, FindingStatus

engine = create_engine('postgresql://postgres:password@localhost:5433/pentest')
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

reports_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports')
files = os.listdir(reports_dir)
json_files = [f for f in files if f.startswith('scan_report_') and f.endswith('.json')]

uploaded_count = 0
for json_filename in json_files:
    scan_id_str = json_filename.replace('scan_report_', '').replace('.json', '')
    
    try:
        scan_id = uuid.UUID(scan_id_str)
    except ValueError:
        continue
        
    session = db.query(ScanSession).filter(ScanSession.id == scan_id).first()
    if not session:
        continue
        
    json_path = os.path.join(reports_dir, json_filename)
    
    try:
        with open(json_path, 'r', encoding='utf-8') as jf:
            report_json = json.load(jf)
            
        findings_data = report_json.get('findings', [])
        
        severity_db_mapping = {
            "CRITICAL": SeverityLevel.CRITICAL,
            "HIGH": SeverityLevel.HIGH,
            "MEDIUM": SeverityLevel.MEDIUM,
            "LOW": SeverityLevel.LOW,
            "INFO": SeverityLevel.INFO
        }
        
        status_db_mapping = {
            "VERIFIED": FindingStatus.VERIFIED,
            "UNVERIFIED": FindingStatus.UNVERIFIED,
            "DUPLICATE": FindingStatus.DUPLICATE,
            "FALSE_POSITIVE": FindingStatus.FALSE_POSITIVE
        }
        
        # Delete old findings if any (to avoid duplicates if run multiple times)
        db.query(ScanFinding).filter(ScanFinding.scan_id == scan_id).delete()
        
        db_findings = []
        for finding in findings_data:
            db_sev = severity_db_mapping.get(finding.get("severity", "MEDIUM").upper(), SeverityLevel.MEDIUM)
            # Default to verified for historical reports
            db_status = status_db_mapping.get(finding.get("status", "VERIFIED").upper(), FindingStatus.VERIFIED)
            
            db_findings.append(ScanFinding(
                scan_id=scan_id,
                title=finding.get("title", "Unknown"),
                description=finding.get("description", ""),
                severity=db_sev,
                confidence=finding.get("confidence", "High"),
                cve_id=finding.get("cve_id", ""),
                remediation=finding.get("remediation", ""),
                evidence=finding.get("evidence", {}),
                source_scanner=finding.get("source_scanner", "Unknown"),
                status=db_status
            ))
            
        db.add_all(db_findings)
        db.commit()
        uploaded_count += len(db_findings)
        print(f"Uploaded {len(db_findings)} findings for {scan_id_str}")
    except Exception as e:
        print(f"Failed to upload findings for {scan_id_str}: {e}")
        db.rollback()

print(f"Successfully uploaded {uploaded_count} historical findings to the database.")
