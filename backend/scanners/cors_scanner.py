import aiohttp
from models import CORSScanResult
from config import settings

SPOOFED_ORIGIN = "https://evil-test-origin.com"


async def scan_cors(url: str, ip_address: str = None) -> CORSScanResult:
    """
    Sends a request with a spoofed Origin header and inspects the CORS
    response headers for risky configurations. No external API is used.
    """
    try:
        headers = {"Origin": SPOOFED_ORIGIN}
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=settings.http_timeout) as response:
                allow_origin = response.headers.get("Access-Control-Allow-Origin")
                allow_credentials = response.headers.get("Access-Control-Allow-Credentials")

                reflects_spoofed_origin = allow_origin == SPOOFED_ORIGIN
                wildcard_with_credentials = (
                    allow_origin == "*" and (allow_credentials or "").lower() == "true"
                )

                risk = "HIGH" if (reflects_spoofed_origin or wildcard_with_credentials) else "LOW"

                return CORSScanResult(
                    success=True,
                    allow_origin=allow_origin,
                    allow_credentials=allow_credentials,
                    reflects_spoofed_origin=reflects_spoofed_origin,
                    wildcard_with_credentials=wildcard_with_credentials,
                    risk=risk
                )

    except Exception as e:
        return CORSScanResult(success=False, error=str(e))
