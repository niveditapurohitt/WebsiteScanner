import socket
import dns.resolver
from urllib.parse import urlparse
import asyncio
from models import DNSScanResult
from config import settings

def _scan_dns_sync(url: str, ip_address: str = None) -> DNSScanResult:
    try:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        hostname = urlparse(url).hostname
        
        result = DNSScanResult(success=True)

        # A Records
        try:
            answers = dns.resolver.resolve(hostname, "A")
            result.A = [str(r) for r in answers]
        except:
            result.A = []

        # MX Records
        try:
            answers = dns.resolver.resolve(hostname, "MX")
            result.MX = [str(r.exchange) for r in answers]
        except:
            result.MX = []

        # NS Records
        try:
            answers = dns.resolver.resolve(hostname, "NS")
            result.NS = [str(r.target) for r in answers]
        except:
            result.NS = []

        # TXT Records
        try:
            answers = dns.resolver.resolve(hostname, "TXT")
            result.TXT = [
                "".join(
                    txt.decode() if isinstance(txt, bytes) else txt
                    for txt in r.strings
                )
                for r in answers
            ]
        except:
            result.TXT = []

        # SPF
        spf_record = next((t for t in result.TXT if t.lower().startswith("v=spf1")), None)
        result.has_spf = spf_record is not None

        # DMARC
        try:
            dmarc_answers = dns.resolver.resolve(f"_dmarc.{hostname}", "TXT")
            dmarc_txt = "".join(
                r.strings[0].decode() if isinstance(r.strings[0], bytes) else r.strings[0]
                for r in dmarc_answers
            )
            result.has_dmarc = True
        except Exception:
            result.has_dmarc = False

        return result

    except Exception as e:
        return DNSScanResult(success=False, error=str(e))

async def scan_dns(url: str, ip_address: str = None) -> DNSScanResult:
    return await asyncio.to_thread(_scan_dns_sync, url, ip_address)