import aiohttp
from bs4 import BeautifulSoup
from urllib.parse import urlparse as up
from models import SEOScanResult
from config import settings

async def scan_seo(url: str, ip_address: str = None) -> SEOScanResult:
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=settings.http_timeout) as response:
                response.raise_for_status()
                html = await response.text()
                
        soup = BeautifulSoup(html, "html.parser")

        title = soup.title.string.strip() if soup.title and soup.title.string else ""

        meta_tag = soup.find("meta", attrs={"name": "description"})
        meta_description = meta_tag.get("content").strip() if meta_tag and meta_tag.get("content") else ""

        h1_tags = soup.find_all("h1")
        h1_count = len(h1_tags)

        images = soup.find_all("img")
        missing_alt = sum(1 for img in images if not img.get("alt") or img.get("alt").strip() == "")

        canonical_tag = soup.find("link", rel="canonical")
        canonical_url = canonical_tag.get("href") if canonical_tag else ""

        robots_tag = soup.find("meta", attrs={"name": "robots"})
        robots_content = robots_tag.get("content") if robots_tag else ""

        has_viewport = soup.find("meta", attrs={"name": "viewport"}) is not None
        viewport_meta = "Present" if has_viewport else "Missing"

        word_count = len(soup.get_text().split())

        base_domain = up(url).netloc
        internal_links, external_links = 0, 0
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("http"):
                if up(href).netloc == base_domain:
                    internal_links += 1
                else:
                    external_links += 1
            elif href.startswith("/") or href.startswith("./") or href.startswith("../"):
                internal_links += 1

        total_links = internal_links + external_links

        return SEOScanResult(
            success=True,
            title=title,
            meta_description=meta_description,
            h1_count=h1_count,
            missing_alt_images=missing_alt,
            canonical_link=canonical_url,
            robots_meta=robots_content,
            viewport_meta=viewport_meta,
            word_count=word_count,
            link_count=total_links,
            error=None
        )

    except Exception as e:
        return SEOScanResult(
            success=False,
            error=str(e)
        )