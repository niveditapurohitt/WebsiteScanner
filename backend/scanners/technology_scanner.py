import builtwith
import aiohttp
from bs4 import BeautifulSoup
import asyncio
from models import TechScanResult
from config import settings

def _get_tech_sync(url: str):
    return builtwith.parse(url)

async def scan_technology(url: str, ip_address: str = None) -> TechScanResult:
    try:
        # builtwith is synchronous and blocking
        technologies = await asyncio.to_thread(_get_tech_sync, url)
        
        # Additional detection via aiohttp
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=settings.http_timeout, headers={"User-Agent": "Mozilla/5.0"}) as resp:
                    html = await resp.text()
                    soup = BeautifulSoup(html, "html.parser")
                    generator_tag = soup.find("meta", attrs={"name": "generator"})
                    
                    server = resp.headers.get("Server")
                    if server and "web-servers" not in technologies:
                        technologies["web-servers"] = [server]
                    
                    powered_by = resp.headers.get("X-Powered-By")
                    if powered_by and "programming-languages" not in technologies:
                        technologies["programming-languages"] = [powered_by]
                        
                    if generator_tag:
                        gen = generator_tag.get("content")
                        if gen and "cms" not in technologies:
                            technologies["cms"] = [gen]
        except Exception:
            pass

        return TechScanResult(
            success=True,
            technologies=technologies,
            error=None
        )

    except Exception as e:
        return TechScanResult(
            success=False,
            error=str(e)
        )