import requests
from typing import List, Dict

def analyze_security_headers(response: requests.Response) -> List[Dict[str, str]]:
    """
    Checks HTTP response headers for missing or misconfigured security policies.
    Returns a list of dicts summarizing findings.
    """
    findings = []
    headers = response.headers

    # 1. Content-Security-Policy (CSP)
    csp = headers.get("Content-Security-Policy")
    if not csp:
        findings.append({
            "header": "Content-Security-Policy",
            "status": "MISSING",
            "severity": "HIGH",
            "desc": "Protects against Cross-Site Scripting (XSS) and data injection attacks by restricting source loading origins."
        })
    elif "unsafe-inline" in csp or "unsafe-eval" in csp:
        findings.append({
            "header": "Content-Security-Policy",
            "status": "WEAK",
            "severity": "MEDIUM",
            "desc": "CSP allows 'unsafe-inline' or 'unsafe-eval', weakening script execution safeguards."
        })

    # 2. Strict-Transport-Security (HSTS)
    hsts = headers.get("Strict-Transport-Security")
    if not hsts:
        findings.append({
            "header": "Strict-Transport-Security",
            "status": "MISSING",
            "severity": "MEDIUM",
            "desc": "Enforces secure HTTPS connections, preventing man-in-the-middle SSL stripping attacks."
        })

    # 3. X-Frame-Options (Clickjacking protection)
    xfo = headers.get("X-Frame-Options")
    if not xfo:
        findings.append({
            "header": "X-Frame-Options",
            "status": "MISSING",
            "severity": "MEDIUM",
            "desc": "Prevents clickjacking attacks by restricting whether page can be framed in iframes."
        })

    # 4. X-Content-Type-Options (MIME Sniffing)
    xcto = headers.get("X-Content-Type-Options")
    if not xcto:
        findings.append({
            "header": "X-Content-Type-Options",
            "status": "MISSING",
            "severity": "LOW",
            "desc": "Prevents the browser from MIME-sniffing response content, forcing it to respect the declared Content-Type."
        })
    elif xcto.lower() != "nosniff":
        findings.append({
            "header": "X-Content-Type-Options",
            "status": "MISCONFIGURED",
            "severity": "LOW",
            "desc": "Header should be set strictly to 'nosniff'."
        })

    # 5. Referrer-Policy
    ref_policy = headers.get("Referrer-Policy")
    if not ref_policy:
        findings.append({
            "header": "Referrer-Policy",
            "status": "MISSING",
            "severity": "INFO",
            "desc": "Controls how much referrer information is sent along with HTTP request headers."
        })

    return findings
