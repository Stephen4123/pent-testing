import json
import shutil
import subprocess
import urllib.parse
from typing import List
from app.modules.discovery.contract import FindingModel, DiscoveryContract
from app.core.config import settings

def run_nuclei_scan(target_url: str) -> DiscoveryContract:
    """
    Spawns a local Nuclei subprocess to run fast template-based vulnerability checks.
    If the 'nuclei' binary is not found, falls back gracefully.
    """
    findings = []
    
    # 1. Check if docker exists in path
    if not shutil.which("docker"):
        print(f"Docker not found in host path. Skipping Nuclei scan stage.")
        return DiscoveryContract(findings=[])

    # Rewrite target_url for docker network if necessary
    parsed = urllib.parse.urlparse(target_url)
    if parsed.hostname in ["localhost", "127.0.0.1"]:
        # Map localhost to host.docker.internal so container can reach host
        target_url = target_url.replace(parsed.hostname, "host.docker.internal")

    # 2. Build the command
    # -jsonl prints output in json-lines format
    # -silent disables banner printing
    # -tags cves,exposure,misconfig targets standard vulnerabilities
    cmd = [
        "docker", "run", "--rm",
        "-v", "nuclei_templates:/root/nuclei-templates",
        "projectdiscovery/nuclei:latest",
        "-target", target_url,
        "-jsonl",
        "-silent",
        "-tags", "cves,exposure,misconfig,tech,dast"
    ]
    
    try:
        # Run the command with a timeout of 600 seconds for deep scanning
        process = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=600.0
        )
        
        stdout_lines = process.stdout.splitlines()
        
        # 3. Parse JSON lines
        for line in stdout_lines:
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                info = data.get("info", {})
                
                # Map Nuclei severity to database severity
                n_severity = info.get("severity", "info").upper()
                if n_severity not in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
                    n_severity = "INFO"
                    
                # Extract CVE identifier if available
                classification = info.get("classification", {})
                cve_list = classification.get("cve-id")
                cve_id = cve_list[0] if (cve_list and isinstance(cve_list, list)) else None
                
                findings.append(FindingModel(
                    title=info.get("name", "Nuclei Vulnerability Finding"),
                    description=info.get("description", f"Matched template: {data.get('template-id')}"),
                    severity=n_severity,
                    confidence="High",
                    cve_id=cve_id or data.get("template-id"),
                    remediation=info.get("remediation"),
                    evidence={
                        "template_id": data.get("template-id"),
                        "matched_at": data.get("matched-at"),
                        "type": data.get("type"),
                        "matcher_name": data.get("matcher-name")
                    },
                    source_scanner="Nuclei"
                ))
            except Exception as pe:
                print(f"Failed to parse Nuclei output line: {pe}")
                
    except subprocess.TimeoutExpired:
        print("Nuclei scan timed out after 600 seconds.")
    except Exception as e:
        print(f"Error running Nuclei subprocess: {e}")
        
    return DiscoveryContract(findings=findings)
