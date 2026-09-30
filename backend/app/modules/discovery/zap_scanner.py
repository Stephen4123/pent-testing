import time
import requests
import urllib.parse
from app.modules.discovery.contract import FindingModel, DiscoveryContract
from app.core.config import settings

def run_zap_scan(target_url: str) -> DiscoveryContract:
    """
    Interfaces with a running OWASP ZAP API daemon to trigger spidering and active scanning.
    If the ZAP API is unreachable, logs a warning and exits gracefully.
    """
    findings = []
    
    # Rewrite target_url for docker network if necessary
    parsed = urllib.parse.urlparse(target_url)
    if parsed.hostname in ["localhost", "127.0.0.1"]:
        # Map localhost to host.docker.internal so ZAP container can reach host
        target_url = target_url.replace(parsed.hostname, "host.docker.internal")

    # 1. Check if ZAP integration is configured and reachable
    zap_url = settings.ZAP_API_URL
    api_key = settings.ZAP_API_KEY if settings.ZAP_API_KEY else ""
    
    # Probe ZAP API health
    try:
        # ZAP API health check endpoint
        health_check_url = f"{zap_url}/JSON/core/view/version/"
        params = {"zapapikey": api_key}
        res = requests.get(health_check_url, params=params, timeout=3.0)
        if res.status_code != 200:
            print("ZAP API status was not 200. Skipping ZAP scan stage.")
            return DiscoveryContract(findings=[])
    except Exception as e:
        print(f"Could not connect to OWASP ZAP API at '{zap_url}': {e}. Skipping ZAP scan stage.")
        return DiscoveryContract(findings=[])

    print(f"OWASP ZAP API active at {zap_url}. Starting crawl & spider...")

    try:
        # 2. Trigger AJAX Spidering
        print("Triggering ZAP AJAX Spider for SPA compatibility...")
        spider_url = f"{zap_url}/JSON/ajaxSpider/action/scan/"
        spider_params = {
            "url": target_url,
            "zapapikey": api_key
        }
        spider_res = requests.get(spider_url, params=spider_params, timeout=5.0)
        spider_data = spider_res.json()
        
        if spider_data.get("Result") != "OK":
            print(f"Failed to trigger ZAP AJAX spider: {spider_data}")
            return DiscoveryContract(findings=[])
            
        # Poll AJAX spider status
        status_url = f"{zap_url}/JSON/ajaxSpider/view/status/"
        status_params = {"zapapikey": api_key}
        
        while True:
            status_res = requests.get(status_url, params=status_params, timeout=5.0)
            status = status_res.json().get("status", "stopped")
            print(f"ZAP AJAX Spider status: {status}")
            if status.lower() == "stopped":
                break
            time.sleep(5)

        # Seed key API endpoints via ZAP proxy to ensure POST endpoints (like login & search) are in ZAP's target tree
        zap_proxy = {"http": zap_url, "https": zap_url}
        try:
            requests.post(f"{target_url}/rest/user/login", json={"email": "test@example.com", "password": "password"}, proxies=zap_proxy, timeout=3.0)
            requests.get(f"{target_url}/rest/products/search?q=apple", proxies=zap_proxy, timeout=3.0)
        except Exception as e:
            print(f"Seeding API endpoints notice: {e}")

        # Configure ZAP Active Scanner to inject into JSON/POST data and all parameters
        try:
            requests.get(f"{zap_url}/JSON/ascan/action/setOptionTargetParamsInjectable/", params={"Integer": 31, "zapapikey": api_key}, timeout=3.0)
            requests.get(f"{zap_url}/JSON/ascan/action/setOptionScanHeadersAllRequests/", params={"Boolean": "true", "zapapikey": api_key}, timeout=3.0)
        except Exception as e:
            print(f"Configuring ZAP active scanner parameters notice: {e}")

        # 3. Trigger Active Scan
        print("ZAP Spider complete. Triggering active vulnerability scans...")
        ascan_url = f"{zap_url}/JSON/ascan/action/scan/"
        ascan_params = {
            "url": target_url,
            "recurse": "true",
            "zapapikey": api_key
        }
        ascan_res = requests.get(ascan_url, params=ascan_params, timeout=5.0)
        ascan_id = ascan_res.json().get("scan")
        
        if not ascan_id:
            print("Failed to trigger ZAP active scan.")
            return DiscoveryContract(findings=[])
            
        # Poll active scan status
        ascan_status_url = f"{zap_url}/JSON/ascan/view/status/"
        ascan_status_params = {"scanId": ascan_id, "zapapikey": api_key}
        
        while True:
            status_res = requests.get(ascan_status_url, params=ascan_status_params, timeout=5.0)
            status = status_res.json().get("status", "0")
            print(f"ZAP Active Scan progress: {status}%")
            if status == "100" or int(status) >= 100:
                break
            time.sleep(3)

        # 4. Pull Alert findings
        print("ZAP Active Scan complete. Fetching discovered alerts...")
        alerts_url = f"{zap_url}/JSON/core/view/alerts/"
        alerts_params = {
            "baseurl": target_url,
            "zapapikey": api_key
        }
        alerts_res = requests.get(alerts_url, params=alerts_params, timeout=10.0)
        alerts = alerts_res.json().get("alerts", [])
        
        # 5. Map Alerts to unified contract finding models
        severity_map = {
            "High": "HIGH",
            "Medium": "MEDIUM",
            "Low": "LOW",
            "Informational": "INFO"
        }
        
        for alert in alerts:
            z_risk = alert.get("risk", "Informational")
            z_title = alert.get("alert", "ZAP Scanner Alert")
            mapped_severity = severity_map.get(z_risk, "INFO")
            
            # Upgrade exceptionally dangerous vulnerabilities to CRITICAL
            if "Command Injection" in z_title or "SQL Injection" in z_title or "Remote Code Execution" in z_title:
                mapped_severity = "CRITICAL"
            
            findings.append(FindingModel(
                title=alert.get("alert", "ZAP Scanner Alert"),
                description=alert.get("description", ""),
                severity=mapped_severity,
                confidence=alert.get("confidence", "Medium"),
                cve_id=alert.get("cve"),
                remediation=alert.get("solution"),
                evidence={
                    "url": alert.get("url"),
                    "parameter": alert.get("parameter"),
                    "evidence": alert.get("evidence"),
                    "attack": alert.get("attack")
                },
                source_scanner="ZAP"
            ))
            
    except Exception as e:
        print(f"Error communicating with OWASP ZAP API: {e}")
        
    return DiscoveryContract(findings=findings)
