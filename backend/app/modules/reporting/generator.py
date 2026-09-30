import datetime
from typing import List, Dict, Any
from app.modules.discovery.contract import FindingModel

def compile_scan_report(
    target_url: str,
    duration_seconds: float,
    recon_summary: Dict[str, Any],
    findings: List[FindingModel],
    ai_summary: str = ""
) -> Dict[str, Any]:
    """
    Consolidates scan configurations, discovery assets, parsed findings, and AI executive summaries
    into a unified JSON report schema.
    """
    # Count severities
    severities = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
    for finding in findings:
        sev = finding.severity.upper()
        if sev in severities:
            severities[sev] += 1
        else:
            severities["INFO"] += 1
            
    report = {
        "report_metadata": {
            "target_url": target_url,
            "scan_date": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "scan_duration": f"{duration_seconds:.2f} seconds",
            "total_findings": len(findings),
            "severity_summary": severities,
        },
        "reconnaissance": {
            "resolved_ip": recon_summary.get("ip", "Unknown"),
            "dns_records": recon_summary.get("dns_records", {}),
            "subdomains": recon_summary.get("subdomains", []),
            "detected_technologies": recon_summary.get("technologies", [])
        },
        "executive_summary": ai_summary if ai_summary else "Automated security audit was successfully completed. Review findings and remediation guidelines.",
        "findings": [
            {
                "title": f.title,
                "description": f.description,
                "severity": f.severity,
                "confidence": f.confidence,
                "cve_id": f.cve_id,
                "remediation": f.remediation,
                "evidence": f.evidence,
                "source_scanner": f.source_scanner
            }
            for f in findings
        ]
    }
    
    return report
