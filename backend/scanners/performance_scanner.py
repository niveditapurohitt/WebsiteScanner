import os
import aiohttp
from dotenv import load_dotenv
from models import PerfScanResult
from config import settings

load_dotenv()

API_KEY = os.getenv("PAGESPEED_API_KEY")

async def scan_performance(url: str, ip_address: str = None) -> PerfScanResult:
    try:
        api_url = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
        params = {
            "url": url,
            "key": API_KEY,
            "strategy": "mobile"
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(api_url, params=params, timeout=20) as response:
                if response.status != 200:
                    return PerfScanResult(success=False, error=f"API returned {response.status}")
                data = await response.json()

        lighthouse = data.get("lighthouseResult", {})
        categories = lighthouse.get("categories", {})
        audits = lighthouse.get("audits", {})

        perf_category = categories.get("performance", {})
        performance_score = int(perf_category.get("score", 1) * 100)

        fcp = audits.get("first-contentful-paint", {}).get("displayValue", "N/A")
        lcp = audits.get("largest-contentful-paint", {}).get("displayValue", "N/A")
        si = audits.get("speed-index", {}).get("displayValue", "N/A")
        tbt = audits.get("total-blocking-time", {}).get("displayValue", "0 ms")
        cls = audits.get("cumulative-layout-shift", {}).get("displayValue", "0")

        return PerfScanResult(
            success=True,
            performance_score=performance_score,
            first_contentful_paint=fcp,
            largest_contentful_paint=lcp,
            speed_index=si,
            total_blocking_time=tbt,
            cumulative_layout_shift=cls,
            error=None
        )

    except Exception as e:
        return PerfScanResult(
            success=False,
            error=str(e)
        )