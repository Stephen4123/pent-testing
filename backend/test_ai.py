import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Add backend to sys.path so we can import our app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.modules.ai.planner import generate_scan_plan
from app.modules.ai.processing import enrich_finding_with_ai

print("==================================================")
print("             AI ENGINE INTEGRATION TEST           ")
print("==================================================")

# 1. Test Planner
print("\n[+] Testing AI Planner Stage...")
mock_tech = ["React 18", "Nginx 1.24", "FastAPI (Python)"]
mock_host = "localhost"
mock_dns = {"A": ["127.0.0.1"], "MX": []}

print(f"Target info: Host: {mock_host}, Tech: {mock_tech}")
plan = generate_scan_plan(mock_tech, mock_host, mock_dns)
print("Planner output:")
import json
print(json.dumps(plan, indent=2))

# 2. Test Processing/Remediation
print("\n[+] Testing AI Findings Processor Stage...")
mock_finding = {
    "title": "SQL Injection in query parameter 'id'",
    "description": "Fuzzing /api/users?id=1 with time-based payloads caused a 5 second delay.",
    "severity": "CRITICAL",
    "cve_id": "CVE-2023-SQLI",
    "evidence": {
        "request": "GET /api/users?id=1%20AND%20(SELECT%201%20FROM%20(SELECT(SLEEP(5)))a) HTTP/1.1",
        "response": "Response latency: 5012ms"
    },
    "source_scanner": "api_scanner"
}

enriched = enrich_finding_with_ai(mock_finding)
print("Enriched vulnerability output:")
print(json.dumps(enriched, indent=2))
print("==================================================")
