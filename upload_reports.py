import os
import sys
import json
import uuid
from datetime import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import Base, ScanSession, Target, ScanStatus

engine = create_engine('postgresql://postgres:password@localhost:5433/pentest')
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

reports_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports')
if not os.path.exists(reports_dir):
    print(f"Reports directory {reports_dir} does not exist.")
    exit(1)

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
    
    json_path = os.path.join(reports_dir, json_filename)
    pdf_path = os.path.join(reports_dir, f"scan_report_{scan_id_str}.pdf")
    
    if not os.path.exists(pdf_path):
        continue
        
    try:
        with open(json_path, 'r', encoding='utf-8') as jf:
            report_json = json.load(jf)
        with open(pdf_path, 'rb') as pf:
            report_pdf = pf.read()
            
        if not session:
            target_url = report_json.get('report_metadata', {}).get('target_url', 'http://unknown-historical-target.com')
            target = db.query(Target).filter(Target.url == target_url).first()
            if not target:
                target = Target(url=target_url)
                db.add(target)
                db.commit()
                db.refresh(target)
                
            session = ScanSession(
                id=scan_id,
                target_id=target.id,
                status=ScanStatus.COMPLETED,
                current_stage="7. COMPLETED",
                progress_percentage=100,
                profile="historical",
                report_json=report_json,
                report_pdf=report_pdf
            )
            db.add(session)
        else:
            session.report_json = report_json
            session.report_pdf = report_pdf
            
        db.commit()
        uploaded_count += 1
        print(f"Uploaded {scan_id_str}")
    except Exception as e:
        print(f"Failed to upload {scan_id_str}: {e}")
        db.rollback()

print(f"Successfully uploaded {uploaded_count} historical reports to the database.")
