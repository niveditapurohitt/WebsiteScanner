# backend/services/ai/context_builder.py

def format_scan_context(scan_results: dict) -> str:
    """Format full scan results into structured text for AI prompt context."""
    if not scan_results:
        return "No scan results available. The user is asking a general question."

    website = scan_results.get("website", "unknown domain")
    summary = scan_results.get("summary", {})
    score = summary.get("security_score", 100)
    risk = summary.get("risk_level", "LOW")
    recs = summary.get("recommendations", [])
    human_summary = summary.get("human_summary", "")

    scans = scan_results.get("scans", {})
    ssl = scans.get("ssl", {})
    headers = scans.get("headers", {})
    ports = scans.get("ports", {})
    perf = scans.get("performance", {})
    dns = scans.get("dns", {})
    seo = scans.get("seo", {})
    tech = scans.get("technology", {})

    ssl_status = "Enabled" if ssl.get("ssl_enabled") else "Disabled"
    missing_headers = headers.get("missing_headers", [])
    open_ports = [f"Port {p.get('port')} ({p.get('service')})" for p in ports.get("open_ports", [])]
    perf_score = perf.get("performance_score", 100)

    dns_info = ""
    if dns.get("success"):
        dns_info = f"""
DNS Records:
  A Records: {', '.join(dns.get('A', [])) or 'None'}
  MX Records: {', '.join(dns.get('MX', [])) or 'None'}
  NS Records: {', '.join(dns.get('NS', [])) or 'None'}
  SPF Present: {'Yes' if dns.get('has_spf') else 'No'}
  DMARC Present: {'Yes' if dns.get('has_dmarc') else 'No'}"""

    seo_info = ""
    if seo.get("success"):
        seo_info = f"""
SEO Analysis:
  Title: {seo.get('title', 'Missing')}
  Meta Description: {'Present' if seo.get('meta_description') else 'Missing'}
  H1 Count: {seo.get('h1_count', 0)}
  Missing Alt Images: {seo.get('missing_alt_images', 0)}
  Word Count: {seo.get('word_count', 0)}"""

    tech_info = ""
    if tech.get("success") and tech.get("technologies"):
        techs = [f"  {k}: {', '.join(v) if isinstance(v, list) else v}" for k, v in tech.get("technologies", {}).items()]
        tech_info = "\nTechnologies Detected:\n" + "\n".join(techs)

    return f"""Website: {website}
Security Score: {score}/100
Risk Level: {risk}
SSL/TLS: {ssl_status} (Protocol: {ssl.get('protocol_version', 'None')}, Issuer: {ssl.get('issuer', 'N/A')}, Expires: {ssl.get('expiry_date', 'N/A')}, Self-Signed: {ssl.get('is_self_signed', False)})
Open Ports: {', '.join(open_ports) if open_ports else 'None'}
Missing Security Headers: {', '.join(missing_headers) if missing_headers else 'None'}
Performance Score: {perf_score}/100
First Contentful Paint: {perf.get('first_contentful_paint', 'N/A')}
Largest Contentful Paint: {perf.get('largest_contentful_paint', 'N/A')}
Speed Index: {perf.get('speed_index', 'N/A')}{dns_info}{seo_info}{tech_info}
Recommendations: {', '.join(recs) if recs else 'None'}
Human Summary: {human_summary}"""
