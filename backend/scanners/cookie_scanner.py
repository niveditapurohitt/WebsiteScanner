import aiohttp
from models import CookiesScanResult, CookieFinding
from config import settings


async def scan_cookies(url: str, ip_address: str = None) -> CookiesScanResult:
    """
    Fetches the target URL and inspects any Set-Cookie headers for the
    Secure, HttpOnly and SameSite attributes. No external API is used.
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=settings.http_timeout) as response:
                raw_cookies = response.headers.getall("Set-Cookie", [])

                cookies = []
                for raw in raw_cookies:
                    parts = [p.strip() for p in raw.split(";")]
                    if not parts:
                        continue

                    name = parts[0].split("=")[0].strip()
                    lowered = [p.lower() for p in parts[1:]]

                    secure = any(p == "secure" for p in lowered)
                    http_only = any(p == "httponly" for p in lowered)

                    same_site = None
                    for p in parts[1:]:
                        if p.lower().startswith("samesite="):
                            same_site = p.split("=", 1)[1].strip()
                            break

                    issues = []
                    if not secure:
                        issues.append("Missing 'Secure' attribute")
                    if not http_only:
                        issues.append("Missing 'HttpOnly' attribute")
                    if not same_site:
                        issues.append("Missing 'SameSite' attribute")

                    cookies.append(CookieFinding(
                        name=name,
                        secure=secure,
                        http_only=http_only,
                        same_site=same_site,
                        issues=issues
                    ))

                return CookiesScanResult(
                    success=True,
                    cookies_found=len(cookies),
                    cookies=cookies
                )

    except Exception as e:
        return CookiesScanResult(success=False, error=str(e))
