import socket
import ssl
import urllib.parse
from datetime import datetime
from typing import List
from app.modules.discovery.contract import FindingModel, DiscoveryContract

def run_ssl_scan(target_url: str) -> DiscoveryContract:
    """
    Audits the target host's TLS/SSL configuration. Checks for certificate expiration,
    self-signed certs, and support for insecure/deprecated TLS protocols (TLS 1.0/1.1).
    """
    findings = []
    
    # 1. Parse URL to get Host and Port
    parsed = urllib.parse.urlparse(target_url)
    hostname = parsed.hostname
    if not hostname:
        return DiscoveryContract(findings=[])
        
    port = parsed.port if parsed.port else 443
    
    # Skip check if scheme is not HTTPS or port is not standard HTTPS/custom SSL
    # (Since localhost dev servers usually run raw HTTP, skip to avoid spamming connection errors)
    if parsed.scheme != "https" and port != 443:
        return DiscoveryContract(findings=[])

    # 2. Inspect SSL Certificate Expiration & Validity
    try:
        context = ssl.create_default_context()
        # Set a short timeout on the socket connection
        with socket.create_connection((hostname, port), timeout=4.0) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                
                if cert:
                    # Check expiration
                    not_after_str = cert.get("notAfter")
                    if not_after_str:
                        # e.g., 'Oct 24 14:32:00 2026 GMT'
                        try:
                            expiry_date = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z")
                            days_remaining = (expiry_date - datetime.utcnow()).days
                            
                            if days_remaining < 0:
                                findings.append(FindingModel(
                                    title="Expired SSL/TLS Certificate",
                                    description=f"The SSL certificate for {hostname} expired on {not_after_str}.",
                                    severity="HIGH",
                                    confidence="High",
                                    cve_id="TLS-CERT-EXPIRED",
                                    remediation="Renew the SSL/TLS certificate immediately with a trusted certificate authority.",
                                    evidence={"expiry_date": not_after_str, "days_remaining": days_remaining},
                                    source_scanner="SSL Scanner"
                                ))
                            elif days_remaining < 30:
                                findings.append(FindingModel(
                                    title="SSL/TLS Certificate Nearing Expiration",
                                    description=f"The SSL certificate for {hostname} expires in {days_remaining} days (expires on {not_after_str}).",
                                    severity="LOW",
                                    confidence="High",
                                    cve_id="TLS-CERT-EXPIRING",
                                    remediation="Schedule a certificate renewal before expiration to avoid service interruption.",
                                    evidence={"expiry_date": not_after_str, "days_remaining": days_remaining},
                                    source_scanner="SSL Scanner"
                                ))
                        except Exception:
                            pass
                            
                    # Check issuer info (Self-signed check fallback)
                    issuer = cert.get("issuer")
                    subject = cert.get("subject")
                    if issuer and subject:
                        # Extract common names
                        issuer_cn = next((item[0][1] for item in issuer if item[0][0] == "commonName"), None)
                        subject_cn = next((item[0][1] for item in subject if item[0][0] == "commonName"), None)
                        if issuer_cn == subject_cn and issuer_cn is not None:
                            findings.append(FindingModel(
                                title="Self-Signed SSL/TLS Certificate",
                                description=f"The server at {hostname} uses a self-signed certificate. This is vulnerable to man-in-the-middle attacks.",
                                severity="MEDIUM",
                                confidence="High",
                                cve_id="TLS-CERT-SELFSIGNED",
                                remediation="Install a valid certificate issued by a trusted Public Key Infrastructure (PKI) or certificate authority (e.g. Let's Encrypt).",
                                evidence={"issuer": issuer_cn, "subject": subject_cn},
                                source_scanner="SSL Scanner"
                              ))
    except Exception as e:
        # If we can't connect on SSL/TLS, just capture the debug output and return
        # This keeps scan running if target is only HTTP (common for local development)
        pass

    # 3. Audit for deprecated protocols (TLS 1.0 and 1.1)
    deprecated_protocols = [
        ("TLSv1", ssl.PROTOCOL_TLSv1 if hasattr(ssl, "PROTOCOL_TLSv1") else None, "TLS 1.0"),
        ("TLSv1_1", ssl.PROTOCOL_TLSv1_1 if hasattr(ssl, "PROTOCOL_TLSv1_1") else None, "TLS 1.1")
    ]
    
    for proto_name, proto_const, proto_label in deprecated_protocols:
        if proto_const is None:
            continue
            
        try:
            # Create a context that strictly attempts connection using only the deprecated protocol
            ctx = ssl.SSLContext(proto_const)
            with socket.create_connection((hostname, port), timeout=3.0) as sock:
                with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                    # Handshake succeeded, meaning server accepted deprecated protocol version
                    findings.append(FindingModel(
                        title=f"Deprecated TLS Protocol Supported ({proto_label})",
                        description=f"The server at {hostname} accepts handshakes using the insecure and deprecated protocol {proto_label}.",
                        severity="MEDIUM",
                        confidence="High",
                        cve_id=f"TLS-PROTO-{proto_name.upper()}",
                        remediation=f"Disable {proto_label} support on your web server configuration (Nginx, Apache, or load balancer) and enforce TLS 1.2 or TLS 1.3.",
                        evidence={"negotiated_cipher": ssock.cipher(), "protocol_version": proto_label},
                        source_scanner="SSL Scanner"
                    ))
        except Exception:
            # Connection failed / handshake rejected, which is secure (expected behavior)
            pass

    return DiscoveryContract(findings=findings)
