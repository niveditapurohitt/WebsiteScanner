import aiohttp
from urllib.parse import urlparse
from models import SubdomainsScanResult

CERTSPOTTER_URL = "https://api.certspotter.com/v1/issuances"
CRTSH_URL = "https://crt.sh/"

CRTSH_HEADERS = {"User-Agent": "Mozilla/5.0"}


def _registered_domain(hostname: str) -> str:
    parts = hostname.split(".")
    if len(parts) > 2:
        return ".".join(parts[-2:])
    return hostname


async def _try_certspotter(session: aiohttp.ClientSession, domain: str):
    params = {
        "domain": domain,
        "include_subdomains": "true",
        "expand": "dns_names"
    }
    async with session.get(
        CERTSPOTTER_URL, params=params, timeout=aiohttp.ClientTimeout(total=10)
    ) as response:
        if response.status != 200:
            return None
        data = await response.json()
        found = set()
        for entry in data:
            for name in entry.get("dns_names", []):
                found.add(name.lstrip("*.").lower())
        return found


async def _try_crtsh(session: aiohttp.ClientSession, domain: str):
    params = {"q": f"%.{domain}", "output": "json"}
    async with session.get(
        CRTSH_URL, params=params, headers=CRTSH_HEADERS,
        timeout=aiohttp.ClientTimeout(total=15)
    ) as response:
        if response.status != 200:
            return None
        # crt.sh sometimes returns text/plain content-type for JSON, so
        # parse manually instead of relying on aiohttp's content-type check.
        text = await response.text()
        import json
        data = json.loads(text)
        found = set()
        for entry in data:
            name_value = entry.get("name_value", "")
            for name in name_value.split("\n"):
                found.add(name.lstrip("*.").lower())
        return found


async def scan_subdomains(url: str, ip_address: str = None) -> SubdomainsScanResult:
    try:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        hostname = urlparse(url).hostname
        if not hostname:
            return SubdomainsScanResult(success=False, error="Invalid URL")

        domain = _registered_domain(hostname)

        async with aiohttp.ClientSession() as session:
            # Primary: Certspotter (no key required, more reliable uptime)
            try:
                found = await _try_certspotter(session, domain)
                if found:
                    return SubdomainsScanResult(
                        success=True,
                        subdomains=sorted(found),
                        count=len(found),
                        source="certspotter"
                    )
            except Exception:
                pass

            # Fallback: crt.sh (free, keyless, but known to be flaky)
            try:
                found = await _try_crtsh(session, domain)
                if found:
                    return SubdomainsScanResult(
                        success=True,
                        subdomains=sorted(found),
                        count=len(found),
                        source="crt.sh"
                    )
            except Exception:
                pass

        return SubdomainsScanResult(
            success=False,
            error="Both Certspotter and crt.sh were unreachable or returned no data"
        )

    except Exception as e:
        return SubdomainsScanResult(success=False, error=str(e))
