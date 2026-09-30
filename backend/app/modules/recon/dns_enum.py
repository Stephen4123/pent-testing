import dns.resolver
from typing import Dict, List

def enumerate_dns(hostname: str) -> Dict[str, List[str]]:
    """
    Queries common DNS record types (A, AAAA, MX, TXT, NS, CNAME) 
    using the dnspython resolver library.
    """
    records = {
        "A": [],
        "AAAA": [],
        "MX": [],
        "TXT": [],
        "NS": [],
        "CNAME": []
    }
    
    # Check if host is loopback/localhost - skip querying external dns resolvers
    if hostname in ["localhost", "127.0.0.1", "::1"]:
        records["A"] = ["127.0.0.1"]
        return records

    resolver = dns.resolver.Resolver()
    resolver.timeout = 2.0
    resolver.lifetime = 2.0

    for r_type in records.keys():
        try:
            answers = resolver.resolve(hostname, r_type)
            for rdata in answers:
                if r_type == "MX":
                    records[r_type].append(str(rdata.exchange).rstrip('.'))
                elif r_type == "CNAME" or r_type == "NS":
                    records[r_type].append(str(rdata.target).rstrip('.'))
                else:
                    records[r_type].append(str(rdata))
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout, Exception):
            # Fallback for individual queries failing (common for local / staging domains)
            pass

    return records
