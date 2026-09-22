import ipaddress
import socket
from urllib.parse import urlparse
from datetime import datetime, timezone
import asyncio
from dotenv import load_dotenv

# Load env variables from .env file
load_dotenv()

import os

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from cachetools import TTLCache

from scanners.technology_scanner import scan_technology
from scanners.headers_scanner import scan_headers
from scanners.ssl_scanner import scan_ssl
from scanners.port_scanner import scan_ports
from scanners.dns_scanner import scan_dns
from scanners.info_scanner import scan_info
from scanners.seo_scanner import scan_seo
from scanners.performance_scanner import scan_performance

# New no-API-key scanners (additive; do not affect existing scanners above)
from scanners.cookie_scanner import scan_cookies
from scanners.email_security_scanner import scan_email_security
from scanners.exposed_paths_scanner import scan_exposed_paths
from scanners.cors_scanner import scan_cors
from scanners.subdomain_scanner import scan_subdomains

from services.scoring_service import calculate_score
from models import InfoScanResult, HeadersScanResult, SSLScanResult, PortsScanResult, SEOScanResult, PerfScanResult, DNSScanResult, ScoreSummary

from routers.auth import router as auth_router, get_current_user
from routers.scans import router as scans_router
from database import get_users_collection, get_scans_collection

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.include_router(auth_router)
app.include_router(scans_router)


@app.on_event("startup")
async def ensure_indexes():
    await get_users_collection().create_index("email", unique=True)
    await get_scans_collection().create_index([("userId", 1), ("createdAt", -1)])

cache = TTLCache(maxsize=100, ttl=3600) # 1 hour cache

# CORS
# In production, the frontend and API are served from the same Vercel
# deployment/domain (see /api rewrite), so most requests are same-origin
# and don't need CORS at all. These origins cover local dev and any case
# where the API is hit cross-origin (custom domain, preview deployments).
_extra_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", *_extra_origins],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import StreamingResponse
from services.ai.chat_service import generate_chat_response_stream

# Request models
class ScanRequest(BaseModel):
    url: str

class ChatRequest(BaseModel):
    message: str = ""
    messages: list = []
    scan_results: dict = None
    api_key: str = None
    module: str = None

# Home route
@app.get("/")
def home():
    return {
        "message": "Website Security Scanner API Running"
    }

# Chat route
@app.post("/chat")
@limiter.limit("10/minute")
async def chat_with_advisor(request: Request, data: ChatRequest):
    # Ensure messages format is preserved
    messages = data.messages
    if not messages and data.message:
        messages = [{"role": "user", "content": data.message}]
        
    return StreamingResponse(
        generate_chat_response_stream(messages, data.scan_results, data.api_key),
        media_type="text/event-stream"
    )


def generate_human_summary(website_info: InfoScanResult, score_result: ScoreSummary, ssl_result: SSLScanResult, headers_result: HeadersScanResult, ports_result: PortsScanResult, performance_result: PerfScanResult):
    if not website_info or not website_info.success:
        domain = "the website"
        ip = "Unknown"
        country = "Unknown"
        isp = "Unknown"
        registrar = "Unknown"
        created = "Unknown"
    else:
        domain = website_info.registered_domain or "the website"
        ip = website_info.ip_address or "Unknown"
        country = website_info.country or "Unknown"
        isp = website_info.isp or "Unknown"
        registrar = website_info.registrar or "Unknown"
        created = website_info.created or "Unknown"

    # Introduction
    if country != "Unknown" and isp != "Unknown":
        intro = f"This website ({domain}) is hosted on server IP {ip} in {country} and is managed by {isp}."
    else:
        intro = f"This website ({domain}) is hosted on server IP {ip}."

    if registrar != "Unknown" and created != "Unknown":
        intro += f" The domain is registered with {registrar} and was established on {created}."
    elif registrar != "Unknown":
        intro += f" The domain is registered with {registrar}."
    elif created != "Unknown":
        intro += f" The domain was established on {created}."

    # Security Score
    score = score_result.security_score if score_result else 100
    risk = (score_result.risk_level if score_result else "LOW").upper()
    sec_intro = f" Our security scan rated this website's risk level as {risk} with a security score of {score}/100."

    # SSL TLS Summary
    ssl_ok = False
    if ssl_result and ssl_result.success:
        ssl_ok = ssl_result.ssl_enabled
        
    if ssl_ok:
        proto = ssl_result.protocol_version or "HTTPS"
        issuer = ssl_result.issuer or "a verified authority"
        ssl_text = f" The website is secure for standard visitors, establishing an encrypted connection using {proto} issued by {issuer}."
    else:
        ssl_text = " ⚠️ WARNING: The website does not use a secure connection (SSL is disabled or invalid). Visitors' personal information, like passwords, is exposed to potential interceptors."

    # Headers & Ports Summary
    concerns = []
    if headers_result and headers_result.success:
        missing_headers = len(headers_result.missing_headers)
        if missing_headers > 0:
            concerns.append(f"it is missing {missing_headers} essential security headers (which protect against cross-site attacks)")
            
    if ports_result and ports_result.success:
        open_ports = ports_result.open_ports
        if open_ports:
            port_list = [str(p.port) for p in open_ports]
            concerns.append(f"it has exposed services on open ports: {', '.join(port_list)}")

    if concerns:
        threat_text = " However, we detected potential safety concerns: " + " and ".join(concerns) + "."
    else:
        threat_text = " The server configuration is secure with no high-risk open ports detected."

    # Performance
    perf_score = 100
    load_time = "-"
    if performance_result and performance_result.success:
        perf_score = performance_result.performance_score
        load_time = performance_result.first_contentful_paint or "-"
        
    if perf_score >= 80:
        perf_text = f" In terms of speed, the website is fast (Performance Score: {perf_score}/100), loading in about {load_time}."
    elif perf_score >= 50:
        perf_text = f" Performance is moderate (Performance Score: {perf_score}/100), with a load time of {load_time}."
    else:
        perf_text = f" ⚠️ Performance is slow (Performance Score: {perf_score}/100). The page takes {load_time} to render, which could frustrate visitors."

    # Final verdict
    if score >= 80:
        verdict = " Overall, this website appears highly secure and well-configured for everyday use."
    elif score >= 50:
        verdict = " Overall, the website is moderately secure, but we advise implementing the recommendations below to guard against common threats."
    else:
        verdict = " 🔴 CRITICAL: The website has significant security concerns. Administrators should address these vulnerabilities immediately to protect their users."

    return intro + sec_intro + ssl_text + threat_text + perf_text + verdict

# Scan route
@app.post("/scan")
@limiter.limit("5/minute")
async def scan_website(request: Request, data: ScanRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("scans_remaining", 0) <= 0:
        raise HTTPException(status_code=402, detail="No scans remaining. Please upgrade your plan.")

    # Check cache
    cache_key = data.url
    if cache_key in cache:
        final_response = cache[cache_key]
    else:
        url = data.url
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        hostname = urlparse(url).hostname
        if not hostname:
            raise HTTPException(status_code=400, detail="Invalid URL")

        # SSRF Protection
        try:
            ip_address = socket.gethostbyname(hostname)
            ip_obj = ipaddress.ip_address(ip_address)
            if ip_obj.is_private or ip_obj.is_loopback:
                raise HTTPException(status_code=403, detail="SSRF prevented: Cannot scan local/private IPs")
        except socket.gaierror:
            raise HTTPException(status_code=400, detail="Could not resolve hostname")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid IP resolved")

        # Run scans concurrently
        results = await asyncio.gather(
            scan_headers(url, ip_address),
            scan_ssl(url, ip_address),
            scan_ports(url, ip_address),
            scan_seo(url, ip_address),
            scan_dns(url, ip_address),
            scan_technology(url, ip_address),
            scan_performance(url, ip_address),
            scan_info(url, ip_address),
        )

        headers_result, ssl_result, ports_result, seo_result, dns_result, tech_result, perf_result, info_result = results

        # New no-API-key scanners run in their own concurrent batch so the
        # existing gather() call above is left completely untouched.
        new_results = await asyncio.gather(
            scan_cookies(url, ip_address),
            scan_email_security(url, ip_address),
            scan_exposed_paths(url, ip_address),
            scan_cors(url, ip_address),
            scan_subdomains(url, ip_address),
        )
        cookies_result, email_security_result, exposed_paths_result, cors_result, subdomains_result = new_results

        score_summary = calculate_score(
            headers_result,
            ssl_result,
            ports_result,
            seo_result,
            perf_result,
            dns_result,
            cookies_result,
            email_security_result,
            exposed_paths_result,
            cors_result,
        )

        human_summary = generate_human_summary(
            info_result,
            score_summary,
            ssl_result,
            headers_result,
            ports_result,
            perf_result
        )

        final_response = {
            "success": True,
            "website": url,
            "summary": {
                "security_score": score_summary.security_score,
                "risk_level": score_summary.risk_level,
                "recommendations": score_summary.recommendations,
                "human_summary": human_summary
            },
            "website_info": info_result.model_dump(),
            "scans": {
                "ssl": ssl_result.model_dump(),
                "headers": headers_result.model_dump(),
                "ports": ports_result.model_dump(),
                "seo": seo_result.model_dump(),
                "dns": dns_result.model_dump(),
                "performance": perf_result.model_dump(),
                "technology": tech_result.model_dump()
            },
            # New additive top-level keys (existing keys above are unchanged)
            "cookies": cookies_result.model_dump(),
            "email_security": email_security_result.model_dump(),
            "exposed_paths": exposed_paths_result.model_dump(),
            "cors": cors_result.model_dump(),
            "subdomains": subdomains_result.model_dump(),
        }

        cache[cache_key] = final_response

    # Persist this scan to the current user's history and debit their quota
    scan_doc = {
        "userId": current_user["_id"],
        "email": current_user["email"],
        "url": final_response["website"],
        "score": final_response["summary"]["security_score"],
        "risk_level": final_response["summary"]["risk_level"],
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "result": final_response,
    }
    insert_result = await get_scans_collection().insert_one(scan_doc)

    remaining = current_user["scans_remaining"] - 1
    await get_users_collection().update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"scans_remaining": -1}}
    )

    response = dict(final_response)
    response["id"] = str(insert_result.inserted_id)
    response["scans_remaining"] = remaining
    return response