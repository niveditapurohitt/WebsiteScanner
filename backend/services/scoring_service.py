from typing import Optional
from config import settings
from models import (
    HeadersScanResult, SSLScanResult, PortsScanResult, SEOScanResult,
    PerfScanResult, DNSScanResult, ScoreSummary,
    CookiesScanResult, EmailSecurityScanResult, ExposedPathsScanResult, CORSScanResult
)

def calculate_score(
    headers: HeadersScanResult,
    ssl_data: SSLScanResult,
    ports: PortsScanResult,
    seo: SEOScanResult,
    performance: PerfScanResult,
    dns: DNSScanResult,
    cookies: Optional[CookiesScanResult] = None,
    email_security: Optional[EmailSecurityScanResult] = None,
    exposed_paths: Optional[ExposedPathsScanResult] = None,
    cors: Optional[CORSScanResult] = None,
) -> ScoreSummary:
    score = 100
    recommendations = []

    # SSL CHECKS
    if not ssl_data.success or not ssl_data.ssl_enabled:
        score -= settings.penalty_ssl_invalid
        recommendations.append("Enable SSL certificate")

    # SECURITY HEADERS
    important_headers = [
        "content-security-policy",
        "strict-transport-security",
        "x-frame-options",
        "x-content-type-options",
        "referrer-policy"
    ]
    
    missing_headers_count = len(headers.missing_headers)
    if missing_headers_count > 0:
        score -= (missing_headers_count * settings.penalty_missing_header)
        recommendations.append(f"{missing_headers_count} security headers missing")

    # PORT CHECKS
    open_ports = ports.open_ports
    risky_found = False
    
    for port_data in open_ports:
        port_num = port_data.port
        if port_num == 21:
            score -= settings.penalty_port_21
            risky_found = True
        elif port_num == 22:
            score -= settings.penalty_port_22
            recommendations.append("SSH port 22 is open. Ensure key-based auth.")
        elif port_num == 25:
            score -= settings.penalty_port_25
            risky_found = True
        elif port_num == 3306:
            score -= settings.penalty_port_3306
            risky_found = True
            
    if risky_found:
        recommendations.append("Some high-risk ports are open (e.g. 21, 25, 3306)")

    # SEO CHECKS
    if seo and seo.success:
        if not seo.title:
            score -= settings.penalty_missing_seo_title
            recommendations.append("Add SEO Title tag")
        if not seo.meta_description:
            score -= settings.penalty_missing_seo_desc
            recommendations.append("Add SEO Meta Description")

    # PERFORMANCE CHECKS
    if performance and performance.success:
        perf_score = performance.performance_score
        if perf_score < 50:
            score -= 15
            recommendations.append("Critically low performance score")
        elif perf_score < 70:
            score -= 10
            recommendations.append("Moderate performance score, needs optimization")

    # DNS CHECKS (SPF / DMARC)
    if dns and dns.success:
        if not dns.has_spf:
            score -= settings.penalty_missing_spf
            recommendations.append("Missing SPF record")
        if not dns.has_dmarc:
            score -= settings.penalty_missing_dmarc
            recommendations.append("Missing DMARC record")

    # NEW OPTIONAL CHECKS (additive; only applied if the caller supplies
    # results, and existing checks/weights above are never altered)
    if cookies and cookies.success:
        insecure_cookie_count = sum(1 for c in cookies.cookies if c.issues)
        if insecure_cookie_count > 0:
            score -= min(insecure_cookie_count * settings.penalty_insecure_cookie, 10)
            recommendations.append(f"{insecure_cookie_count} cookie(s) missing Secure/HttpOnly/SameSite flags")

    if email_security and email_security.success:
        if not email_security.dkim_selectors_found:
            recommendations.append("No DKIM record found on common selectors (best-effort check)")

    if exposed_paths and exposed_paths.success and exposed_paths.exposed_count > 0:
        score -= min(exposed_paths.exposed_count * settings.penalty_exposed_path, 30)
        recommendations.append(f"{exposed_paths.exposed_count} sensitive file path(s) appear publicly exposed")

    if cors and cors.success and cors.risk == "HIGH":
        score -= settings.penalty_cors_misconfig
        recommendations.append("CORS misconfiguration detected (overly permissive cross-origin access)")

    # FINAL SCORE
    score = max(0, min(score, 100))

    if score >= 80:
        risk = "LOW"
    elif score >= 50:
        risk = "MEDIUM"
    else:
        risk = "HIGH"

    return ScoreSummary(
        security_score=score,
        risk_level=risk,
        recommendations=recommendations,
        human_summary="" # Handled by main.py
    )