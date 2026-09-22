import asyncio
import aiohttp
from models import ExposedPathsScanResult, ExposedPathFinding

SENSITIVE_PATHS = [
    "/.env",
    "/.git/config",
    "/.well-known/security.txt",
    "/wp-config.php.bak",
    "/.DS_Store",
    "/config.php.bak",
    "/backup.zip",
    "/.htaccess",
]

PER_PATH_TIMEOUT = 3


def _classify(status_code: int) -> str:
    if status_code == 200:
        return "exposed"
    if status_code in (401, 403):
        return "protected"
    return "not_found"


async def _check_path(session: aiohttp.ClientSession, base_url: str, path: str) -> ExposedPathFinding:
    target = base_url.rstrip("/") + path
    try:
        async with session.get(
            target,
            timeout=aiohttp.ClientTimeout(total=PER_PATH_TIMEOUT),
            allow_redirects=False
        ) as response:
            return ExposedPathFinding(
                path=path,
                status_code=response.status,
                risk=_classify(response.status)
            )
    except Exception:
        # Treat unreachable/timeout as "not_found" rather than failing the
        # whole scan for one path.
        return ExposedPathFinding(path=path, status_code=0, risk="not_found")


async def scan_exposed_paths(url: str, ip_address: str = None) -> ExposedPathsScanResult:
    try:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        async with aiohttp.ClientSession() as session:
            findings = await asyncio.gather(
                *(_check_path(session, url, path) for path in SENSITIVE_PATHS)
            )

        findings = list(findings)
        exposed_count = sum(1 for f in findings if f.risk == "exposed")

        return ExposedPathsScanResult(
            success=True,
            findings=findings,
            exposed_count=exposed_count
        )

    except Exception as e:
        return ExposedPathsScanResult(success=False, error=str(e))
