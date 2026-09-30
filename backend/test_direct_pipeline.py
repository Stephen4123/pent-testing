import asyncio
import sys
import os
import json

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.db.models import Base, Target, ScanSession, ScanStatus, ScanFinding
from app.db.session import engine
from app.orchestrator.engine import run_scan_simulation, get_scan_logs, get_scan_recon

async def main():
    # 1. Initialize Database Tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # 2. Setup Target URL
    # We will use example.com as target. Since settings.SAFE_MODE is True by default,
    # target validation will fail on public URLs unless we disable SAFE_MODE or target localhost/127.0.0.1.
    # Let's target http://127.0.0.1:8000 to test target validation successfully (it resolves to loopback)
    # But wait, to avoid the uvicorn deadlock, we can mock requests to not block, or simply scan a loopback IP
    # that has a service running, or we can temporarily mock target_validation to succeed.
    # Let's just scan http://127.0.0.1:8000, and we'll temporarily mock the HTTP reachability check in target_validation
    # so it succeeds without making a blocking HTTP get request to our own server, avoiding deadlock.
    target_url = "http://127.0.0.1:8000"
    
    print("==================================================")
    print("           REAL SCAN ORCHESTRATION RUN            ")
    print("==================================================")
    print(f"[+] Initializing target: {target_url}")
    
    # Add target to DB
    target = db.query(Target).filter(Target.url == target_url).first()
    if not target:
        target = Target(url=target_url)
        db.add(target)
        db.commit()
        db.refresh(target)
        
    # Create ScanSession
    session = ScanSession(
        target_id=target.id,
        status=ScanStatus.PENDING,
        current_stage="1. VALIDATION",
        progress_percentage=0
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    scan_id = session.id
    print(f"[+] Session created in database with ID: {scan_id}")
    print("[+] Launching orchestrator pipeline in background...\n")
    
    # 3. Execute the orchestrator loop directly
    # We run the async function run_scan_simulation directly in this thread context
    task = asyncio.create_task(run_scan_simulation(scan_id))
    
    # Poll progress from DB and print logs
    last_log_idx = 0
    completed = False
    
    while not completed:
        await asyncio.sleep(1.0)
        
        # Refresh session status from database
        db.refresh(session)
        status = session.status
        stage = session.current_stage
        progress = session.progress_percentage
        
        # Print new logs
        logs = get_scan_logs(scan_id)
        if len(logs) > last_log_idx:
            for log in logs[last_log_idx:]:
                tag_label = f"[{log['tag']}]"
                print(f"{log['time']} {tag_label:<6} {log['text']}")
            last_log_idx = len(logs)
            
        print(f"--> [Progress: {progress}%] Stage: {stage} | Status: {status}")
        
        if status.value in ["COMPLETED", "FAILED"]:
            completed = True
            break
            
    # Wait for task completion
    await task
    
    print("\n==================================================")
    print("                 SCAN RESULTS                     ")
    print("==================================================")
    
    # 4. Fetch and print findings from database
    findings = db.query(ScanFinding).filter(ScanFinding.scan_id == scan_id).all()
    print(f"[+] Discovered {len(findings)} verified findings:")
    
    for f in findings:
        print(f"\n- Finding: {f.title}")
        print(f"  Severity: {f.severity.value}")
        print(f"  Confidence: {f.confidence}")
        print(f"  Remediation: {f.reremedy if hasattr(f, 'reremedy') else f.remediation}")
        
    db.close()

if __name__ == "__main__":
    asyncio.run(main())
