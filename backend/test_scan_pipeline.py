import asyncio
import sys
import os
import requests
import json
import time

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Wait for server to start
time.sleep(2)

def test_live_scan():
    # Target URL with a simulated SQL injection (localhost handles this in engine.py)
    target = "http://localhost:8005" 
    
    print(f"[+] Starting live scan targeting: {target}")
    
    # 1. Trigger the scan session
    post_url = "http://localhost:8005/api/scans"
    try:
        res = requests.post(post_url, json={"target_url": target}, timeout=5.0)
        if res.status_code != 200:
            print(f"[-] Failed to start scan. Status: {res.status_code}")
            return
        
        scan_data = res.json()
        scan_id = scan_data["id"]
        print(f"[+] Scan started successfully! Session ID: {scan_id}")
    except Exception as e:
        print(f"[-] Error connecting to backend API: {e}")
        return

    # 2. Poll the status until completed
    status_url = f"http://localhost:8005/api/scans/{scan_id}/status"
    findings_url = f"http://localhost:8005/api/scans/{scan_id}/findings"
    
    print("\n[+] Monitoring Scan Progress:")
    print("--------------------------------------------------")
    
    completed = False
    while not completed:
        try:
            status_res = requests.get(status_url, timeout=5.0)
            if status_res.status_code == 200:
                data = status_res.json()
                status = data["status"]
                stage = data["current_stage"]
                progress = data["progress_percentage"]
                
                print(f"[{progress}%] Stage: {stage} | Status: {status}")
                
                if status in ["COMPLETED", "FAILED"]:
                    completed = True
                    break
            else:
                print(f"[-] Status check returned code: {status_res.status_code}")
        except Exception as e:
            print(f"[-] Status check error: {e}")
            
        time.sleep(1.5)
        
    print("--------------------------------------------------")
    print("[+] Scan finished!")
    
    # 3. Pull and print findings
    try:
        findings_res = requests.get(findings_url, timeout=5.0)
        if findings_res.status_code == 200:
            findings = findings_res.json()
            print(f"\n[+] Scan Results Summary: Discovered {len(findings)} vulnerabilities")
            for f in findings:
                print(f"\n- Finding: {f['title']}")
                print(f"  Severity: {f['severity']}")
                print(f"  Confidence: {f['confidence']}")
                print(f"  Remediation: {f['remediation'][:120]}...")
        else:
            print("[-] Failed to fetch findings list.")
    except Exception as e:
        print(f"[-] Error retrieving final findings: {e}")

if __name__ == "__main__":
    test_live_scan()
