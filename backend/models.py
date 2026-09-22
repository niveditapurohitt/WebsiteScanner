from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any

class ScanRequest(BaseModel):
    url: str


# ---------------------------------------------------------------------------
# Auth models
# ---------------------------------------------------------------------------

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserPublic(BaseModel):
    id: str
    email: str
    full_name: str
    scans_remaining: int
    created_at: str

class AuthResponse(BaseModel):
    user: UserPublic
    token: str

class ChatRequest(BaseModel):
    message: str
    scan_results: Optional[Dict[str, Any]] = None
    api_key: Optional[str] = None
    module: Optional[str] = None

class ScoreSummary(BaseModel):
    security_score: int
    risk_level: str
    recommendations: List[str]
    human_summary: str

class SSLScanResult(BaseModel):
    success: bool
    ssl_enabled: bool = False
    protocol_version: str = "Unknown"
    issuer: str = "Unknown"
    subject: str = "Unknown"
    expiry_date: str = "Unknown"
    is_self_signed: bool = False
    error: Optional[str] = None

class HeadersScanResult(BaseModel):
    success: bool
    headers_found: Dict[str, str] = {}
    missing_headers: List[str] = []
    error: Optional[str] = None

class PortResult(BaseModel):
    port: int
    service: str
    state: str

class PortsScanResult(BaseModel):
    success: bool
    open_ports: List[PortResult] = []
    error: Optional[str] = None

class SEOScanResult(BaseModel):
    success: bool
    title: str = ""
    meta_description: str = ""
    h1_count: int = 0
    missing_alt_images: int = 0
    canonical_link: str = ""
    robots_meta: str = ""
    viewport_meta: str = ""
    word_count: int = 0
    link_count: int = 0
    error: Optional[str] = None

class DNSScanResult(BaseModel):
    success: bool
    A: List[str] = []
    MX: List[str] = []
    NS: List[str] = []
    TXT: List[str] = []
    has_spf: bool = False
    has_dmarc: bool = False
    error: Optional[str] = None

class TechScanResult(BaseModel):
    success: bool
    technologies: Dict[str, Any] = {}
    error: Optional[str] = None

class PerfScanResult(BaseModel):
    success: bool
    performance_score: int = 100
    first_contentful_paint: str = "N/A"
    largest_contentful_paint: str = "N/A"
    speed_index: str = "N/A"
    total_blocking_time: str = "N/A"
    cumulative_layout_shift: str = "N/A"
    error: Optional[str] = None

class InfoScanResult(BaseModel):
    success: bool
    ip_address: str = "Unknown"
    country: str = "Unknown"
    region: str = "Unknown"
    city: str = "Unknown"
    isp: str = "Unknown"
    registrar: str = "Unknown"
    created: str = "Unknown"
    expires: str = "Unknown"
    registered_domain: str = "Unknown"
    error: Optional[str] = None

class ScansData(BaseModel):
    ssl: SSLScanResult
    headers: HeadersScanResult
    ports: PortsScanResult
    seo: SEOScanResult
    dns: DNSScanResult
    performance: PerfScanResult
    technology: TechScanResult

class ScanResponse(BaseModel):
    success: bool
    website: str
    summary: ScoreSummary
    website_info: InfoScanResult
    scans: ScansData


# ---------------------------------------------------------------------------
# New models (additive only) for the 5 no-API-key scanners added on top of
# the existing scan pipeline. None of the models above are modified.
# ---------------------------------------------------------------------------

class CookieFinding(BaseModel):
    name: str
    secure: bool = False
    http_only: bool = False
    same_site: Optional[str] = None
    issues: List[str] = []

class CookiesScanResult(BaseModel):
    success: bool
    cookies_found: int = 0
    cookies: List[CookieFinding] = []
    error: Optional[str] = None

class EmailSecurityScanResult(BaseModel):
    success: bool
    spf_present: bool = False
    dmarc_present: bool = False
    dmarc_policy: str = "none"          # none | quarantine | reject | not_set
    dmarc_strength: str = "Unknown"     # Weak / Medium / Strong / Not Configured
    dkim_selectors_found: List[str] = []
    error: Optional[str] = None

class ExposedPathFinding(BaseModel):
    path: str
    status_code: int
    risk: str  # "exposed" | "protected" | "not_found"

class ExposedPathsScanResult(BaseModel):
    success: bool
    findings: List[ExposedPathFinding] = []
    exposed_count: int = 0
    error: Optional[str] = None

class CORSScanResult(BaseModel):
    success: bool
    allow_origin: Optional[str] = None
    allow_credentials: Optional[str] = None
    reflects_spoofed_origin: bool = False
    wildcard_with_credentials: bool = False
    risk: str = "LOW"  # LOW | HIGH
    error: Optional[str] = None

class SubdomainsScanResult(BaseModel):
    success: bool
    subdomains: List[str] = []
    count: int = 0
    source: Optional[str] = None  # "certspotter" | "crt.sh"
    error: Optional[str] = None
