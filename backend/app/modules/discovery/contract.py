from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class FindingModel(BaseModel):
    title: str = Field(..., description="Title of the vulnerability finding")
    description: Optional[str] = Field(None, description="Detailed explanation of the issue")
    severity: str = Field("MEDIUM", description="Severity level: CRITICAL, HIGH, MEDIUM, LOW, INFO")
    confidence: str = Field("High", description="Confidence score: High, Medium, Low")
    cve_id: Optional[str] = Field(None, description="CVE or signature identification code")
    remediation: Optional[str] = Field(None, description="Remediation instructions or guidelines")
    evidence: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Technical request/response payloads or raw outputs")
    source_scanner: str = Field(..., description="Name of the discovery scanner that generated this finding")
    status: str = Field("UNVERIFIED", description="Verification status: UNVERIFIED, VERIFIED, DUPLICATE, FALSE_POSITIVE")

class DiscoveryContract(BaseModel):
    findings: List[FindingModel] = Field(default_factory=list, description="List of findings detected by a scanner")
