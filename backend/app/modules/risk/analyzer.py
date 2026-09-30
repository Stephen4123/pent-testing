import random
from typing import Dict, Any
from app.modules.discovery.contract import FindingModel

def calculate_cvss_score(severity: str, confidence: str) -> float:
    """
    Calculates a CVSS-like score (0.0 to 10.0) based on severity level and verification confidence.
    """
    severity_bases = {
        "CRITICAL": 9.0,
        "HIGH": 7.0,
        "MEDIUM": 4.0,
        "LOW": 1.0,
        "INFO": 0.0
    }
    
    base_score = severity_bases.get(severity.upper(), 4.0)
    
    # Adjust score slightly based on confidence
    # (Verified vulnerabilities are slightly higher in priority)
    adjustment = 0.0
    if confidence == "High":
        adjustment = 0.5
    elif confidence == "Low":
        adjustment = -0.5
        
    # Final score constrained between brackets
    score = base_score + adjustment
    
    if severity == "CRITICAL":
        return max(9.0, min(10.0, score))
    elif severity == "HIGH":
        return max(7.0, min(8.9, score))
    elif severity == "MEDIUM":
        return max(4.0, min(6.9, score))
    elif severity == "LOW":
        return max(1.0, min(3.9, score))
        
    return 0.0

def analyze_vulnerability_risk(finding: FindingModel) -> Dict[str, Any]:
    """
    Analyzes finding metrics, maps severity classifications, estimates CVSS scores,
    and returns risk summaries.
    """
    severity = finding.severity.upper()
    confidence = finding.confidence
    
    # Calculate score
    cvss = calculate_cvss_score(severity, confidence)
    
    # Generate business impact estimates
    impact_descriptions = {
        "CRITICAL": "Complete compromise of application data, unauthorized access to databases, or remote system execution.",
        "HIGH": "Exfiltration of sensitive customer data, endpoint authentication bypass, or service manipulation.",
        "MEDIUM": "Exposure of cryptographic channels, user session hijacking, or clickjacking UI manipulations.",
        "LOW": "Information disclosures, MIME sniffing vulnerabilities, or system information exposures.",
        "INFO": "Minor configuration exposures or policy absences."
    }
    
    impact = impact_descriptions.get(severity, "General system configuration exposure.")
    
    return {
        "cvss_score": round(cvss, 1),
        "severity": severity,
        "business_impact": impact
    }
