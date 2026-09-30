import socket
from typing import List

def enumerate_subdomains(hostname: str) -> List[str]:
    """
    Enumerates subdomains by performing active DNS brute-forcing 
    using a list of common subdomain sub-keys against the target host.
    """
    subdomains = []
    
    # 1. Skip localhosts and IP addresses
    if hostname in ["localhost", "127.0.0.1", "::1"] or hostname.replace('.', '').isdigit():
        return []
        
    # List of common subdomains to check
    common_prefixes = [
        "www", "api", "admin", "dev", "staging", 
        "prod", "portal", "secure", "vault", "test", 
        "git", "mail", "db", "auth"
    ]
    
    # Check each prefix to see if it resolves
    for prefix in common_prefixes:
        subdomain = f"{prefix}.{hostname}"
        try:
            # Try resolving the subdomain IP
            socket.gethostbyname(subdomain)
            subdomains.append(subdomain)
        except socket.gaierror:
            # Domain does not resolve
            pass
            
    return subdomains
