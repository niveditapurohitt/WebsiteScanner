import asyncio
from urllib.parse import urlparse
import dns.resolver
from models import EmailSecurityScanResult

# Best-effort common DKIM selectors. DKIM selectors are not discoverable via
# DNS alone, so this is a heuristic check only (may produce false negatives).
COMMON_DKIM_SELECTORS = ["default", "google", "selector1", "selector2", "k1", "mail"]


def _policy_strength(policy: str) -> str:
    policy = (policy or "").lower()
    if policy == "reject":
        return "Strong"
    if policy == "quarantine":
        return "Medium"
    if policy == "none":
        return "Weak"
    return "Not Configured"


def _scan_email_security_sync(url: str, ip_address: str = None) -> EmailSecurityScanResult:
    try:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        hostname = urlparse(url).hostname
        if not hostname:
            return EmailSecurityScanResult(success=False, error="Invalid URL")

        # SPF
        spf_present = False
        try:
            answers = dns.resolver.resolve(hostname, "TXT")
            for r in answers:
                txt = "".join(
                    part.decode() if isinstance(part, bytes) else part
                    for part in r.strings
                )
                if txt.lower().startswith("v=spf1"):
                    spf_present = True
                    break
        except Exception:
            pass

        # DMARC
        dmarc_present = False
        dmarc_policy = "not_set"
        try:
            dmarc_answers = dns.resolver.resolve(f"_dmarc.{hostname}", "TXT")
            for r in dmarc_answers:
                txt = "".join(
                    part.decode() if isinstance(part, bytes) else part
                    for part in r.strings
                )
                if txt.lower().startswith("v=dmarc1"):
                    dmarc_present = True
                    for tag in txt.split(";"):
                        tag = tag.strip()
                        if tag.lower().startswith("p="):
                            dmarc_policy = tag.split("=", 1)[1].strip().lower()
                    break
        except Exception:
            pass

        # DKIM (best-effort, common selectors only)
        dkim_found = []
        for selector in COMMON_DKIM_SELECTORS:
            try:
                dns.resolver.resolve(f"{selector}._domainkey.{hostname}", "TXT")
                dkim_found.append(selector)
            except Exception:
                continue

        return EmailSecurityScanResult(
            success=True,
            spf_present=spf_present,
            dmarc_present=dmarc_present,
            dmarc_policy=dmarc_policy if dmarc_present else "not_set",
            dmarc_strength=_policy_strength(dmarc_policy) if dmarc_present else "Not Configured",
            dkim_selectors_found=dkim_found
        )

    except Exception as e:
        return EmailSecurityScanResult(success=False, error=str(e))


async def scan_email_security(url: str, ip_address: str = None) -> EmailSecurityScanResult:
    return await asyncio.to_thread(_scan_email_security_sync, url, ip_address)
