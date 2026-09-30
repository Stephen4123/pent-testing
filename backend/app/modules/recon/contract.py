from pydantic import BaseModel
from typing import List, Dict, Any

class ReconContract(BaseModel):
    target_url: str
    ip_addresses: List[str]
    dns_records: Dict[str, List[str]]
    subdomains: List[str]
    discovered_urls: List[str]
    technologies: List[str]
    insecure_headers: List[Dict[str, str]]
