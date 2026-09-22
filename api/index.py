"""
Vercel Python serverless entrypoint.

Vercel routes every request under /api/* to this function (see vercel.json).
The FastAPI app in backend/main.py defines its routes without an /api prefix
(so local dev, which proxies /api/* -> the plain routes, keeps working
unmodified) — this thin ASGI wrapper strips the leading /api segment before
handing the request off to that app, so both environments see the same
route paths.
"""

import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app as fastapi_app  # noqa: E402


async def app(scope, receive, send):
    if scope["type"] == "http" and scope["path"].startswith("/api"):
        scope = dict(scope)
        scope["path"] = scope["path"][len("/api"):] or "/"
        raw_path = scope.get("raw_path")
        if raw_path:
            scope["raw_path"] = raw_path[len(b"/api"):] or b"/"
    await fastapi_app(scope, receive, send)
