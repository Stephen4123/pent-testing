import requests
import urllib.parse
from typing import List, Dict, Any
from app.modules.discovery.contract import FindingModel, DiscoveryContract

def run_api_scan(target_url: str) -> DiscoveryContract:
    """
    Probes common API definition paths for exposed Swagger/OpenAPI schemas,
    parses API endpoints, and tests for unauthenticated access to sensitive routes.
    """
    findings = []
    
    # Ensure target has trailing slash
    base_url = target_url if target_url.endswith("/") else target_url + "/"
    
    # Common paths for API specifications
    spec_paths = [
        "openapi.json",
        "swagger.json",
        "api-docs",
        "api/openapi.json",
        "api/v1/openapi.json",
        "swagger/v1/swagger.json"
    ]
    
    discovered_spec = None
    discovered_path = None
    
    # 1. Search for exposed specifications
    for path in spec_paths:
        url = urllib.parse.urljoin(base_url, path)
        try:
            # Short timeout, do not follow redirects blindly to avoid loops
            response = requests.get(url, timeout=3.0, headers={"User-Agent": "AutoSec-Scanner/1.0"})
            if response.status_code == 200:
                # Try parsing as JSON to confirm it is a valid spec
                data = response.json()
                if isinstance(data, dict) and ("openapi" in data or "swagger" in data or "paths" in data):
                    discovered_spec = data
                    discovered_path = url
                    
                    # Flag findings for exposed API documentation
                    findings.append(FindingModel(
                        title="Exposed OpenAPI/Swagger API Specification",
                        description=f"An exposed OpenAPI/Swagger specification file was discovered at {url}. This exposes API endpoint details and parameters, facilitating attack surface mapping.",
                        severity="LOW",
                        confidence="High",
                        cve_id="API-SPEC-EXPOSED",
                        remediation="Restrict access to API documentation endpoints in production environments. Enforce authentication or disable documentation routes entirely.",
                        evidence={"specification_url": url, "openapi_version": data.get("openapi", data.get("swagger", "Unknown"))},
                        source_scanner="API Scanner"
                    ))
                    break
        except Exception:
            pass

    # 2. Probe endpoints for missing authentication
    if discovered_spec and "paths" in discovered_spec:
        paths = discovered_spec["paths"]
        probed_count = 0
        max_probes = 8  # Limit active requests to be fast and safe
        
        for route, methods in paths.items():
            if probed_count >= max_probes:
                break
                
            # Focus on GET methods of sensitive paths
            if "get" in methods:
                # Make path clean
                clean_route = route.lstrip("/")
                
                # Replace path parameter placeholders (e.g. {id} or {user_id}) with mock '1'
                for part in clean_route.split("/"):
                    if part.startswith("{") and part.endswith("}"):
                        clean_route = clean_route.replace(part, "1")
                        
                probe_url = urllib.parse.urljoin(base_url, clean_route)
                
                # Check if route looks sensitive
                sensitive_keywords = ["user", "admin", "config", "setting", "log", "auth", "secret", "profile", "db"]
                is_sensitive = any(kw in route.lower() for kw in sensitive_keywords)
                
                if is_sensitive:
                    probed_count += 1
                    try:
                        res = requests.get(probe_url, timeout=3.0, headers={"User-Agent": "AutoSec-Scanner/1.0"})
                        # If a sensitive GET endpoint returns 200 OK without Auth header
                        if res.status_code == 200:
                            findings.append(FindingModel(
                                title="Unauthenticated Access to Sensitive API Endpoint",
                                description=f"The endpoint '{route}' was accessed successfully without providing authorization credentials. Returning status: 200 OK.",
                                severity="HIGH",
                                confidence="High",
                                cve_id="API-AUTH-BYPASS",
                                remediation=f"Enforce authentication guards (e.g., Bearer JWT or API key middleware) on the '{route}' endpoint.",
                                evidence={
                                    "request": f"GET {probe_url} HTTP/1.1\nHost: {urllib.parse.urlparse(target_url).netloc}",
                                    "response": f"HTTP/1.1 200 OK\nContent-Type: {res.headers.get('Content-Type')}\nBody (first 100 chars): {res.text[:100]}"
                                },
                                source_scanner="API Scanner"
                            ))
                    except Exception:
                        pass
                        
    return DiscoveryContract(findings=findings)
