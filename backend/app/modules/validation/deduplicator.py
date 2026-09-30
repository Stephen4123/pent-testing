from typing import List, Dict, Any
from app.modules.discovery.contract import FindingModel

def deduplicate_findings(findings: List[FindingModel]) -> List[FindingModel]:
    """
    Deduplicates scanner findings based on CVE ID, target URL/evidence, and title keywords.
    Collapses matching duplicates, merges their evidence, and preserves high severity.
    """
    unique_findings = []
    
    for finding in findings:
        is_duplicate = False
        
        # Normalize fields for matching
        title_lower = finding.title.lower()
        cve_id = finding.cve_id
        url = finding.evidence.get("url", finding.evidence.get("matched_at", "")) if finding.evidence else ""
        
        # Check against already added findings
        for existing in unique_findings:
            existing_title_lower = existing.title.lower()
            existing_cve = existing.cve_id
            existing_url = existing.evidence.get("url", existing.evidence.get("matched_at", "")) if existing.evidence else ""
            
            # Match condition 1: Same non-null CVE ID and target scope
            if cve_id and existing_cve and cve_id == existing_cve:
                is_duplicate = True
                
            # Match condition 2: Similar security header vulnerabilities on the same URL
            elif "header" in title_lower and "header" in existing_title_lower:
                # Extract header name from title if possible (e.g. "Content-Security-Policy")
                header_names = ["content-security-policy", "strict-transport-security", "x-frame-options", "x-content-type-options", "referrer-policy"]
                for header in header_names:
                    if header in title_lower and header in existing_title_lower and url == existing_url:
                        is_duplicate = True
                        break
                        
            # Match condition 3: SQL Injection reports on the same URL path
            elif "sql injection" in title_lower and "sql injection" in existing_title_lower:
                if url == existing_url:
                    is_duplicate = True
                    
            if is_duplicate:
                # Update existing finding with merged details
                # 1. Elevate severity if the new one is higher
                severity_ranks = {"CRITICAL": 5, "HIGH": 4, "MEDIUM": 3, "LOW": 2, "INFO": 1}
                new_rank = severity_ranks.get(finding.severity, 1)
                existing_rank = severity_ranks.get(existing.severity, 1)
                if new_rank > existing_rank:
                    existing.severity = finding.severity
                    
                # 2. Append scanner name to sources if not already present
                if finding.source_scanner not in existing.source_scanner:
                    existing.source_scanner = f"{existing.source_scanner}, {finding.source_scanner}"
                    
                # 3. Merge evidence dictionaries
                if existing.evidence and finding.evidence:
                    # Capture request/response parameters from the duplicate to enrich evidence
                    for k, v in finding.evidence.items():
                        if k not in existing.evidence:
                            existing.evidence[k] = v
                        elif isinstance(existing.evidence[k], dict) and isinstance(v, dict):
                            existing.evidence[k].update(v)
                            
                break
                
        if not is_duplicate:
            unique_findings.append(finding)
            
    return unique_findings
