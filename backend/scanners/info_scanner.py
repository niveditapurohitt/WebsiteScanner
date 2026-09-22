import asyncio
import aiohttp
from urllib.parse import urlparse
from datetime import datetime
from models import InfoScanResult
from config import settings

async def get_rdap_info(domain: str) -> dict:
    headers = {"User-Agent": "Mozilla/5.0"}
    url = f"https://rdap.org/domain/{domain}"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=5) as response:
                if response.status == 200:
                    data = await response.json()
                    registrar = None
                    created_date = None
                    
                    for entity in data.get("entities", []):
                        if "registrar" in entity.get("roles", []):
                            vcard = entity.get("vcardArray", [])
                            if len(vcard) > 1:
                                for prop in vcard[1]:
                                    if prop[0] == "fn":
                                        registrar = prop[3]
                                        break
                        if registrar:
                            break
                            
                    for event in data.get("events", []):
                        action = event.get("eventAction", "").lower()
                        if action in ("registration", "creation"):
                            created_date = event.get("eventDate")
                            break
                    
                    age_str = created_date
                    if created_date:
                        try:
                            date_part = created_date.split("T")[0]
                            dt = datetime.strptime(date_part, "%Y-%m-%d")
                            formatted_created = dt.strftime("%B %d, %Y")
                            age_years = datetime.now().year - dt.year
                            age_str = f"{formatted_created} ({age_years} years old)"
                        except Exception:
                            pass
                            
                    return {
                        "success": True,
                        "registrar": registrar or "Unknown",
                        "created": age_str or "Unknown",
                    }
    except Exception:
        pass
    return {"success": False}

async def query_whois_async(domain: str, server: str, timeout: int = 2) -> str:
    try:
        coro = asyncio.open_connection(server, 43)
        reader, writer = await asyncio.wait_for(coro, timeout=timeout)
        writer.write((domain + "\r\n").encode("utf-8"))
        await writer.drain()
        
        resp = b""
        while True:
            chunk = await asyncio.wait_for(reader.read(4096), timeout=timeout)
            if not chunk:
                break
            resp += chunk
            
        writer.close()
        await writer.wait_closed()
        return resp.decode("utf-8", errors="ignore")
    except Exception:
        return ""

async def get_socket_whois_info(domain: str) -> dict:
    try:
        iana_res = await query_whois_async(domain, "whois.iana.org")
        refer_server = None
        for line in iana_res.splitlines():
            if line.strip().lower().startswith("refer:"):
                refer_server = line.split(":", 1)[1].strip()
                break
        
        if not refer_server:
            tld = domain.split(".")[-1]
            refer_server = f"whois.nic.{tld}" if tld != "com" else "whois.verisign-grs.com"
            
        whois_res = await query_whois_async(domain, refer_server)
        if not whois_res and refer_server != "whois.verisign-grs.com":
            whois_res = await query_whois_async(domain, "whois.verisign-grs.com")

        registrar = None
        created_date = None
        
        for line in whois_res.splitlines():
            line_strip = line.strip()
            line_lower = line_strip.lower()
            
            if not registrar and (line_lower.startswith("registrar:") or line_lower.startswith("sponsoring registrar:")):
                parts = line_strip.split(":", 1)
                if len(parts) > 1:
                    registrar = parts[1].strip()
            
            if not created_date and any(k in line_lower for k in ["creation date:", "created:", "created on:", "registration date:", "registered:"]):
                parts = line_strip.split(":", 1)
                if len(parts) > 1:
                    created_date = parts[1].strip()
                    
        age_str = created_date
        if created_date:
            date_word = created_date.split()[0] if created_date.split() else created_date
            date_word = date_word.replace("T", " ").replace("Z", "").strip()
            for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%b-%Y", "%Y.%m.%d"):
                try:
                    dt = datetime.strptime(date_word.split()[0], fmt)
                    formatted_created = dt.strftime("%B %d, %Y")
                    age_years = datetime.now().year - dt.year
                    age_str = f"{formatted_created} ({age_years} years old)"
                    break
                except Exception:
                    pass
                    
        return {
            "success": True,
            "registrar": registrar or "Unknown",
            "created": age_str or "Unknown"
        }
    except Exception:
        return {"success": False}

async def scan_info(url: str, ip_address: str = None) -> InfoScanResult:
    try:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
            
        hostname = urlparse(url).hostname
        if not hostname:
            return InfoScanResult(success=False, error="Invalid URL")
            
        ip = ip_address or "Unknown"
            
        country = "Unknown"
        isp = "Unknown"
        
        if ip != "Unknown":
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"http://ip-api.com/json/{ip}", timeout=5) as geo_res:
                        if geo_res.status == 200:
                            geo_data = await geo_res.json()
                            if geo_data.get("status") == "success":
                                country = geo_data.get("country", "Unknown")
                                isp = geo_data.get("isp", "Unknown")
            except Exception:
                pass
                
        domain_parts = hostname.split('.')
        if len(domain_parts) > 2:
            registered_domain = ".".join(domain_parts[-2:])
        else:
            registered_domain = hostname
            
        whois_data = await get_rdap_info(registered_domain)
        if not whois_data.get("success") or whois_data.get("registrar") == "Unknown":
            alt_whois = await get_socket_whois_info(registered_domain)
            if alt_whois.get("success"):
                if whois_data.get("registrar") == "Unknown" and alt_whois.get("registrar") != "Unknown":
                    whois_data["registrar"] = alt_whois.get("registrar")
                if whois_data.get("created") == "Unknown" and alt_whois.get("created") != "Unknown":
                    whois_data["created"] = alt_whois.get("created")
            
        return InfoScanResult(
            success=True,
            ip_address=ip,
            country=country,
            isp=isp,
            registrar=whois_data.get("registrar", "Unknown") if whois_data else "Unknown",
            created=whois_data.get("created", "Unknown") if whois_data else "Unknown",
            registered_domain=registered_domain,
            error=None
        )
    except Exception as e:
        return InfoScanResult(
            success=False,
            error=str(e)
        )
