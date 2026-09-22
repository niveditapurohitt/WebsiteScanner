import asyncio
from urllib.parse import urlparse
from models import PortsScanResult, PortResult
from config import settings

COMMON_PORTS = {
    21: "FTP",
    22: "SSH",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    143: "IMAP",
    443: "HTTPS",
    3306: "MySQL",
    8080: "HTTP-ALT"
}

async def check_port(ip: str, port: int, service: str) -> PortResult | None:
    try:
        coro = asyncio.open_connection(ip, port)
        reader, writer = await asyncio.wait_for(coro, timeout=settings.port_scan_timeout)
        writer.close()
        await writer.wait_closed()
        return PortResult(port=port, service=service, state="OPEN")
    except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
        return None

async def scan_ports(url: str, ip_address: str = None) -> PortsScanResult:
    try:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
            
        hostname = urlparse(url).hostname
        if not hostname:
            return PortsScanResult(success=False, error="Invalid hostname")

        target_ip = ip_address or hostname

        tasks = [
            check_port(target_ip, port, service) 
            for port, service in COMMON_PORTS.items()
        ]
        results = await asyncio.gather(*tasks)
        
        open_ports = [r for r in results if r is not None]

        return PortsScanResult(
            success=True,
            open_ports=open_ports,
            error=None
        )

    except Exception as e:
        return PortsScanResult(
            success=False,
            error=str(e)
        )