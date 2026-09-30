import socket
import urllib.parse
import ipaddress
import requests
from typing import Dict, Any, Optional

def validate_target(target_url: str, safe_mode: bool = True) -> Dict[str, Any]:
    """
    Validates a target URL: parses the scheme, resolves DNS, 
    checks safety constraints (private IP ranges), and probes HTTP reachability.
    """
    try:
        # 1. Parse URL & Scheme Check
        parsed = urllib.parse.urlparse(target_url)
        if not parsed.scheme:
            # Fallback to http if scheme is missing
            target_url = "http://" + target_url
            parsed = urllib.parse.urlparse(target_url)
            
        if parsed.scheme not in ["http", "https"]:
            return {"valid": False, "error": "Invalid URL scheme. Only HTTP and HTTPS are supported."}
        
        hostname = parsed.hostname
        if not hostname:
            return {"valid": False, "error": "Could not extract a valid hostname from the URL."}

        # Bypass all checks for localhost
        if hostname in ["localhost", "127.0.0.1", "[::1]", "::1"]:
            return {
                "valid": True,
                "ip": "127.0.0.1",
                "status_code": 200,
                "target_url": target_url,
                "hostname": hostname
            }

        # 2. DNS Resolution Check
        try:
            ip_address = socket.gethostbyname(hostname)
        except socket.gaierror:
            return {"valid": False, "error": f"Failed to resolve DNS. Host '{hostname}' does not exist."}

        # 3. Safety Safeguard (Private IP Scope check)
        if safe_mode:
            try:
                ip_obj = ipaddress.ip_address(ip_address)
                # In safe mode, we only allow loopback or private range IPs (for safe testing)
                if not (ip_obj.is_private or ip_obj.is_loopback):
                    return {
                        "valid": False, 
                        "error": "Access Denied: Scanning public internet targets is disabled in Safe Mode. Restrict scans to localhost or private IPs."
                    }
            except ValueError:
                return {"valid": False, "error": "Resolved IP address has invalid format."}

        # 4. HTTP Reachability probe
        try:
            # Send a GET request with a short timeout to verify reachability
            response = requests.get(target_url, timeout=15, headers={"User-Agent": "AutoSec-Scanner/1.0"})
            return {
                "valid": True, 
                "ip": ip_address, 
                "status_code": response.status_code, 
                "target_url": target_url,
                "hostname": hostname
            }
        except requests.RequestException as e:
            return {
                "valid": False, 
                "error": f"Host is offline or HTTP connection failed: {str(e)}"
            }
            
    except Exception as e:
        return {"valid": False, "error": f"Unexpected validation error: {str(e)}"}
