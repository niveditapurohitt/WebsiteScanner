import socket
import ssl
from urllib.parse import urlparse
from datetime import datetime
import asyncio
from models import SSLScanResult
from config import settings

def _scan_ssl_sync(url: str, ip_address: str = None) -> SSLScanResult:
    try:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
            
        hostname = urlparse(url).hostname
        target_ip = ip_address or hostname
        
        context = ssl.create_default_context()

        with socket.create_connection((target_ip, 443), timeout=settings.ssl_scan_timeout) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                cipher_name, tls_version, _ = ssock.cipher()
                
                # Example expiry format: 'Nov 17 00:00:00 2026 GMT'
                expiry_date_str = cert['notAfter']
                
                issuer = dict(x[0] for x in cert.get('issuer', []))
                subject = dict(x[0] for x in cert.get('subject', []))
                is_self_signed = issuer.get('commonName') == subject.get('commonName')
                
                issuer_name = issuer.get('organizationName', issuer.get('commonName', '-'))
                subject_name = subject.get('commonName', hostname)

                return SSLScanResult(
                    success=True,
                    ssl_enabled=True,
                    protocol_version=ssock.version(),
                    issuer=issuer_name,
                    subject=subject_name,
                    expiry_date=expiry_date_str,
                    is_self_signed=is_self_signed,
                    error=None
                )

    except Exception as e:
        return SSLScanResult(
            success=False,
            ssl_enabled=False,
            error=str(e)
        )

async def scan_ssl(url: str, ip_address: str = None) -> SSLScanResult:
    return await asyncio.to_thread(_scan_ssl_sync, url, ip_address)