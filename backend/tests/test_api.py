import pytest
import os
import sys

# Override the database URL to use SQLite for testing BEFORE any app imports
os.environ["DATABASE_URL"] = "sqlite:///./test_api_db.sqlite"

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.db.models import Base
from app.db.session import engine
from app.modules.discovery.contract import FindingModel
from app.modules.validation.deduplicator import deduplicate_findings
from app.modules.ai.planner import generate_scan_plan

# Ensure database tables exist for tests
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_health_check():
    """
    Verifies that the /api/health endpoint is online and functional.
    """
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "AutoSec Backend"}

def test_dashboard_stats():
    """
    Verifies that the /api/dashboard/stats endpoint returns correctly structured dashboard metrics.
    """
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_scans" in data
    assert "active_scans" in data
    assert "critical_findings" in data
    assert "severity_breakdown" in data
    assert "recent_scans" in data

def test_scans_endpoints():
    """
    Verifies scan launching triggers correct status updates in the lifecycle databases.
    """
    response = client.get("/api/scans")
    assert response.status_code == 200
    initial_count = len(response.json())
    
    payload = {"target_url": "http://localhost:8000"}
    post_res = client.post("/api/scans", json=payload)
    assert post_res.status_code == 200
    scan_data = post_res.json()
    assert "id" in scan_data
    assert scan_data["status"] == "PENDING"
    
    get_res = client.get("/api/scans")
    assert get_res.status_code == 200
    assert len(get_res.json()) == initial_count + 1

def test_deduplicator():
    finding1 = FindingModel(
        title="SQL Injection in /api",
        description="test",
        severity="MEDIUM",
        confidence="High",
        cve_id="CVE-2023-1234",
        remediation="fix",
        evidence={"url": "http://target/api"},
        source_scanner="ScannerA"
    )
    finding2 = FindingModel(
        title="SQL injection found in /api",
        description="test 2",
        severity="HIGH",
        confidence="High",
        cve_id="CVE-2023-1234",
        remediation="fix",
        evidence={"url": "http://target/api"},
        source_scanner="ScannerB"
    )
    findings = [finding1, finding2]
    deduped = deduplicate_findings(findings)
    assert len(deduped) == 1
    assert deduped[0].severity == "HIGH"
    assert "ScannerA" in deduped[0].source_scanner
    assert "ScannerB" in deduped[0].source_scanner

def test_ai_planner():
    tech = ["nginx", "mysql"]
    plan = generate_scan_plan(tech, "localhost", {})
    assert len(plan) > 0
    scanners = [p["scanner"] for p in plan]
    # Local fallback rules should include API scanner based on generic rules
    assert "api_scanner" in scanners
