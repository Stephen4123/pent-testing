import asyncio
import os
import time
import requests
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import ScanSession, ScanStatus, ScanFinding, SeverityLevel, FindingStatus, Target
from app.core.config import settings

# Import real Recon modules
from app.modules.recon.target_validation import validate_target
from app.modules.recon.dns_enum import enumerate_dns
from app.modules.recon.subdomain_enum import enumerate_subdomains
from app.modules.recon.tech_detect import detect_technologies
from app.modules.recon.header_analysis import analyze_security_headers

# Import AI & Discovery & Validation & Risk & Reporting modules
from app.modules.ai.planner import generate_scan_plan
from app.modules.ai.processing import enrich_finding_with_ai
from app.modules.discovery.ssl_scanner import run_ssl_scan
from app.modules.discovery.api_scanner import run_api_scan
from app.modules.discovery.nuclei_scanner import run_nuclei_scan
from app.modules.discovery.zap_scanner import run_zap_scan
from app.modules.discovery.contract import FindingModel
from app.modules.validation.deduplicator import deduplicate_findings
from app.modules.validation.verifier import verify_findings
from app.modules.risk.analyzer import analyze_vulnerability_risk
from app.modules.reporting.generator import compile_scan_report
from app.modules.reporting.pdf_generator import generate_pdf_report

# In-memory stores for logs and recon details
scan_logs = {}
scan_recon = {}

def get_scan_logs(scan_id: str):
    return scan_logs.get(str(scan_id), [])

def get_scan_recon(scan_id: str):
    return scan_recon.get(str(scan_id), {
        "subdomains": [],
        "technologies": [],
        "ports": [],
        "dns_records": {}
    })

def add_log(scan_id: str, tag: str, message: str):
    scan_id = str(scan_id)
    if scan_id not in scan_logs:
        scan_logs[scan_id] = []
    timestamp = datetime.now().strftime("%H:%M:%S")
    scan_logs[scan_id].append({
        "time": timestamp,
        "tag": tag,
        "text": message
    })

def check_terminated(scan_id: str, db: Session) -> bool:
    from app.db.models import ScanSession, ScanStatus
    import uuid
    try:
        parsed_id = uuid.UUID(str(scan_id))
    except ValueError:
        return False
    session = db.query(ScanSession).filter(ScanSession.id == parsed_id).first()
    if session and session.status == ScanStatus.TERMINATED:
        return True
    return False

def run_scan_simulation(scan_id: str):
    """
    Main autonomous scanning orchestration pipeline.
    Runs all stages of the scan sequentially and saves findings to the DB and reports.
    """
    db: Session = SessionLocal()
    session = None
    import uuid
    import time
    start_time = time.time()
    
    try:
        parsed_id = uuid.UUID(str(scan_id))
        session = db.query(ScanSession).filter(ScanSession.id == parsed_id).first()
        if not session:
            return
        
        target = db.query(Target).filter(Target.id == session.target_id).first()
        target_url = target.url if target else "http://localhost:8000"
        
        scan_id = str(scan_id)
        # Initialize logs
        scan_logs[scan_id] = []
        add_log(scan_id, "INF", f"Initializing security scan for target: {target_url}")
        
        # ==========================================
        # STAGE 1: TARGET VALIDATION
        # ==========================================
        session.status = ScanStatus.VALIDATING
        session.current_stage = "1. VALIDATION"
        session.progress_percentage = 10
        db.commit()
        add_log(scan_id, "INF", "Starting target validation checks...")
        
        val_result = validate_target(target_url, safe_mode=settings.SAFE_MODE)
        if not val_result["valid"]:
            session.status = ScanStatus.FAILED
            session.current_stage = "FAILED"
            db.commit()
            add_log(scan_id, "ERR", f"Target validation failed: {val_result['error']}")
            return
            
        resolved_ip = val_result["ip"]
        hostname = val_result["hostname"]
        add_log(scan_id, "INF", f"Target resolution successful for {target_url} ({resolved_ip})")
        add_log(scan_id, "INF", f"HTTP GET handshake completed with status: {val_result['status_code']}")
        time.sleep(1)
        
        if check_terminated(scan_id, db): return
        
        # ==========================================
        # STAGE 2: RECONNAISSANCE
        # ==========================================
        session.status = ScanStatus.RECON
        session.current_stage = "2. RECON"
        session.progress_percentage = 25
        db.commit()
        add_log(scan_id, "INF", "Beginning reconnaissance phase...")
        
        # 1. Run real DNS enum
        add_log(scan_id, "INF", f"Resolving DNS records for {hostname}...")
        dns_records = enumerate_dns(hostname)
        add_log(scan_id, "INF", f"Discovered DNS record types: {', '.join([k for k, v in dns_records.items() if len(v) > 0])}")
        
        # 2. Run real Subdomain enum
        add_log(scan_id, "INF", f"Brute forcing subdomains for {hostname}...")
        subdomains = enumerate_subdomains(hostname)
        add_log(scan_id, "INF", f"Subdomain enumeration complete. Discovered {len(subdomains)} subdomains.")
        
        # 3. Get HTTP response for tech stack & headers checks
        add_log(scan_id, "INF", "Analyzing HTTP headers and cookies...")
        try:
            response = requests.get(target_url, timeout=5, headers={"User-Agent": "AutoSec-Scanner/1.0"})
        except Exception:
            response = None
            
        # 4. Run real Tech Detect
        technologies = []
        if response:
            technologies = detect_technologies(target_url, response)
        add_log(scan_id, "INF", f"Technology profile: {', '.join(technologies) if technologies else 'Generic Web Server'}")
        
        # 5. Run real Header Analysis
        insecure_headers = []
        if response:
            insecure_headers = analyze_security_headers(response)
        add_log(scan_id, "INF", f"Completed HTTP header analysis. Flagged {len(insecure_headers)} misconfigurations.")
        
        ports = []
            
        # Populate real Recon details in memory
        scan_recon[scan_id] = {
            "subdomains": subdomains,
            "technologies": technologies if technologies else [],
            "ports": ports,
            "dns_records": dns_records
        }
        
        # Log target validation and recon to file
        try:
            recon_log_data = {
                "validation": {
                    "url": target_url,
                    "ip": resolved_ip,
                    "hostname": hostname
                },
                "recon": scan_recon[scan_id]
            }
            reports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "reports")
            os.makedirs(reports_dir, exist_ok=True)
            import json
            with open(os.path.join(reports_dir, f"recon_log_{scan_id}.json"), "w") as f:
                json.dump(recon_log_data, f, indent=2)
            add_log(scan_id, "INF", "Successfully logged target validation and recon data to file.")
        except Exception as e:
            add_log(scan_id, "ERR", f"Failed to log recon data to file: {str(e)}")
            
        time.sleep(1)
        
        if check_terminated(scan_id, db): return
        
        # ==========================================
        # STAGE 3: AI PLANNING
        # ==========================================
        session.status = ScanStatus.PLANNING
        session.current_stage = "3. AI PLANNING"
        session.progress_percentage = 45
        db.commit()
        
        add_log(scan_id, "AI", "Core AI engine parsing reconnaissance results and scheduling active payloads.")
        plan = generate_scan_plan(
            scan_recon[scan_id]["technologies"],
            hostname,
            scan_recon[scan_id]["dns_records"]
        )
        
        for step in plan:
            add_log(scan_id, "AI", f"Scheduled: {step.get('scanner')} - {step.get('description')}")
            
        add_log(scan_id, "INF", f"Planning completed. Scheduled {len(plan)} vulnerability discovery scanners.")
        time.sleep(1)
        
        if check_terminated(scan_id, db): return
        
        # ==========================================
        # STAGE 4: DISCOVERY (VULNERABILITY SCANS)
        # ==========================================
        session.status = ScanStatus.DISCOVERY
        session.current_stage = "4. DISCOVERY"
        session.progress_percentage = 65
        db.commit()
        
        add_log(scan_id, "INF", "Executing active vulnerability scanners in queue...")
        raw_findings: list[FindingModel] = []
        
        # 1. First add header analysis findings to raw findings list
        severity_mapping = {
            "HIGH": "HIGH",
            "MEDIUM": "MEDIUM",
            "LOW": "LOW",
            "INFO": "INFO"
        }
        
        for sec_header in insecure_headers:
            raw_findings.append(FindingModel(
                title=f"Missing or Weak {sec_header['header']} Header",
                description=f"The HTTP response header '{sec_header['header']}' is {sec_header['status'].lower()}. {sec_header['desc']}",
                severity=severity_mapping.get(sec_header["severity"], "MEDIUM"),
                confidence="High",
                cve_id=f"CVE-HEADER-{sec_header['header'].upper()}",
                remediation=f"Configure your web server (Nginx/Apache) or application headers to serve a secure '{sec_header['header']}' value.",
                evidence={
                    "request": f"GET / HTTP/1.1\nHost: {hostname}",
                    "response": f"HTTP/1.1 {response.status_code if response else 200} OK\nServer: Nginx\n(Insecure/Missing Header)"
                },
                source_scanner="Header Analysis"
            ))
            
        # 2. Iterate and run the planned scanners
        for step in plan:
            scanner_name = step.get("scanner")
            
            if session.profile == "recon" and scanner_name in ["zap_scanner", "nuclei_scanner", "api_scanner"]:
                add_log(scan_id, "INF", f"Skipping {scanner_name} (Reconnaissance Only Profile)")
                continue
                
            add_log(scan_id, "INF", f"Launching scan module: {scanner_name}...")
            
            if scanner_name == "ssl_scanner":
                ssl_res = run_ssl_scan(target_url)
                raw_findings.extend(ssl_res.findings)
                add_log(scan_id, "INF", f"SSL scan completed. Flagged {len(ssl_res.findings)} issues.")
                
            elif scanner_name == "api_scanner":
                api_res = run_api_scan(target_url)
                raw_findings.extend(api_res.findings)
                add_log(scan_id, "INF", f"API scan completed. Flagged {len(api_res.findings)} issues.")
                
            elif scanner_name == "nuclei_scanner":
                if session.profile == "quick":
                    add_log(scan_id, "INF", "Quick Scan Profile: Executing lightweight Nuclei templates...")
                nuclei_res = run_nuclei_scan(target_url)
                raw_findings.extend(nuclei_res.findings)
                add_log(scan_id, "INF", f"Nuclei scan completed. Flagged {len(nuclei_res.findings)} issues.")
                
            elif scanner_name == "zap_scanner":
                if session.profile == "quick":
                    add_log(scan_id, "INF", "Quick Scan Profile: Running ZAP in fast-mode (no deep spidering)...")
                zap_res = run_zap_scan(target_url)
                raw_findings.extend(zap_res.findings)
                add_log(scan_id, "INF", f"ZAP DAST scan completed. Flagged {len(zap_res.findings)} issues.")
                
        add_log(scan_id, "INF", f"All active scanners executed. Collected {len(raw_findings)} raw vulnerability reports.")
        time.sleep(1)
        
        if check_terminated(scan_id, db): return
        
        # ==========================================
        # STAGE 5: AI PROCESSING
        # ==========================================
        session.status = ScanStatus.AI_PROCESSING
        session.current_stage = "5. PROCESSING"
        session.progress_percentage = 80
        db.commit()
        
        add_log(scan_id, "AI", f"Querying Gemini models to refine description logs and write remediation details...")
        enriched_findings = []
        
        for finding in raw_findings:
            add_log(scan_id, "AI", f"Enriching finding: {finding.title}...")
            # Query Gemini to enrich the finding
            enriched_fields = enrich_finding_with_ai({
                "title": finding.title,
                "description": finding.description,
                "severity": finding.severity,
                "cve_id": finding.cve_id,
                "evidence": finding.evidence,
                "source_scanner": finding.source_scanner
            })
            
            finding.description = enriched_fields.get("description", finding.description)
            finding.remediation = enriched_fields.get("remediation", finding.remediation)
            finding.severity = enriched_fields.get("severity", finding.severity)
            enriched_findings.append(finding)
            
        add_log(scan_id, "INF", "Vulnerability data processing complete.")
        time.sleep(1)
        
        if check_terminated(scan_id, db): return
        
        # ==========================================
        # STAGE 6: VALIDATION & RISK ANALYSIS
        # ==========================================
        session.status = ScanStatus.VALIDATION
        session.current_stage = "6. VALIDATION"
        session.progress_percentage = 90
        db.commit()
        
        add_log(scan_id, "INF", "Deduplicating findings from overlapping scanner tools...")
        deduped = deduplicate_findings(enriched_findings)
        add_log(scan_id, "INF", f"Deduplication complete. Reduced finding set from {len(enriched_findings)} to {len(deduped)} unique alerts.")
        
        add_log(scan_id, "INF", "Running check-back probes to verify vulnerabilities status...")
        verified = verify_findings(deduped, target_url)
        
        # Calculate CVSS scores & save findings to PostgreSQL database
        add_log(scan_id, "INF", "Calculating risk index and CVSS scores...")
        
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
        
        db_findings = []
        for finding in verified:
            risk = analyze_vulnerability_risk(finding)
            
            # Map severity and status
            db_sev = severity_db_mapping.get(risk.get("severity"), SeverityLevel.MEDIUM)
            db_status = status_db_mapping.get(finding.status, FindingStatus.UNVERIFIED)
            
            db_findings.append(ScanFinding(
                scan_id=parsed_id,
                title=finding.title,
                description=f"{finding.description}\n\n**Business Impact:** {risk.get('business_impact')}",
                severity=db_sev,
                confidence=finding.confidence,
                cve_id=finding.cve_id,
                remediation=finding.remediation,
                evidence=finding.evidence,
                source_scanner=finding.source_scanner,
                status=db_status
            ))
            
        db.add_all(db_findings)
        db.commit()
        add_log(scan_id, "INF", f"Vulnerabilities validation completed. Stored {len(db_findings)} issues in Database.")
        time.sleep(1)
        
        if check_terminated(scan_id, db): return
        
        # ==========================================
        # STAGE 7: COMPLETED (REPORTING)
        # ==========================================
        session.status = ScanStatus.REPORTING
        session.current_stage = "7. COMPLETED"
        session.progress_percentage = 95
        db.commit()
        
        add_log(scan_id, "INF", "Aggregating audit logs and compiling final report documentation...")
        
        # Call Gemini to write a high-level executive overview of the entire scan
        ai_exec_summary = ""
        try:
            from google import genai
            from google.genai import types
            api_key = settings.GEMINI_API_KEY or settings.LLM_API_KEY
            if api_key:
                client = genai.Client(api_key=api_key)
                prompt = f"""
                Write a 3-4 sentence professional executive summary for a security penetration test conducted on target '{target_url}'.
                Total vulnerabilities identified: {len(db_findings)}.
                Severity overview: Critical ({sum(1 for f in verified if f.severity.upper() == 'CRITICAL')}), High ({sum(1 for f in verified if f.severity.upper() == 'HIGH')}), Medium ({sum(1 for f in verified if f.severity.upper() == 'MEDIUM')}).
                Make it sound like an official security auditor summary.
                """
                response = client.models.generate_content(
                    model="gemini-3.5-flash",
                    contents=prompt
                )
                ai_exec_summary = response.text
        except Exception:
            pass
            
        # Compile Report JSON
        duration_seconds = time.time() - start_time
        report_json = compile_scan_report(
            target_url=target_url,
            duration_seconds=duration_seconds,
            recon_summary={
                "ip": resolved_ip,
                "dns_records": scan_recon[scan_id]["dns_records"],
                "subdomains": scan_recon[scan_id]["subdomains"],
                "technologies": scan_recon[scan_id]["technologies"]
            },
            findings=verified,
            ai_summary=ai_exec_summary
        )
        
        # Save to PostgreSQL Database directly from memory
        session.report_pdf = generate_pdf_report(report_json)
        session.report_json = report_json
        
        session.status = ScanStatus.COMPLETED
        session.progress_percentage = 100
        db.commit()
        
        add_log(scan_id, "INF", "Security scan lifecycle complete. Reports generated successfully.")
        
    except Exception as e:
        print(f"Error in scan orchestration: {e}")
        import traceback
        traceback.print_exc()
        if session:
            session.status = ScanStatus.FAILED
            session.current_stage = "FAILED"
            db.commit()
            add_log(scan_id, "ERR", f"Scan crashed: {str(e)}")
    finally:
        db.close()
