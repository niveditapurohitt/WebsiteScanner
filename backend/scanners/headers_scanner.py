import aiohttp
from models import HeadersScanResult
from config import settings

async def scan_headers(url: str, ip_address: str = None) -> HeadersScanResult:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=settings.http_timeout) as response:
                headers = response.headers

                security_headers = {
                    "content-security-policy": headers.get("Content-Security-Policy", ""),
                    "strict-transport-security": headers.get("Strict-Transport-Security", ""),
                    "x-frame-options": headers.get("X-Frame-Options", ""),
                    "x-content-type-options": headers.get("X-Content-Type-Options", ""),
                    "referrer-policy": headers.get("Referrer-Policy", "")
                }

                missing_headers = [name for name, value in security_headers.items() if not value]

                return HeadersScanResult(
                    success=True,
                    headers_found=security_headers,
                    missing_headers=missing_headers,
                    error=None
                )

    except Exception as e:
        return HeadersScanResult(
            success=False,
            error=str(e)
        )