from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
from app.database import Base, engine, sync_db_schema
from app.config import settings
from .routers import (
    user,
    services,
    studies,
    workshops,
    community,
    reports,
    announcements,
    audit_logs,
    posts,
)

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Ensure upload directories exist
UPLOADS_DIR = Path("uploads/avatars")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
SERVICES_DIR = Path("uploads/services")
SERVICES_DIR.mkdir(parents=True, exist_ok=True)

sync_db_schema(engine)

# Serve uploaded files (e.g. avatars, service photos) at /uploads/...
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

import hashlib
from starlette.types import ASGIApp, Scope, Receive, Send
from fastapi.middleware.gzip import GZipMiddleware

class ETagMiddleware:
    """Calculates an ETag hash for GET responses and returns 304 Not Modified
    with 0 body bytes when the client's If-None-Match header matches.
    Saves massive amounts of mobile data on revalidation."""
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http" or scope["method"] != "GET":
            await self.app(scope, receive, send)
            return

        if_none_match = None
        for name, value in scope.get("headers", []):
            if name.lower() == b"if-none-match":
                if_none_match = value.decode("utf-8", "ignore").strip()
                break

        status_code = 200
        headers = []
        body_chunks = []

        async def custom_send(message):
            nonlocal status_code, headers, body_chunks
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = list(message.get("headers", []))
            elif message["type"] == "http.response.body":
                body_chunks.append(message.get("body", b""))
                if not message.get("more_body", False):
                    full_body = b"".join(body_chunks)
                    if status_code == 200 and full_body:
                        etag = f'"{hashlib.md5(full_body).hexdigest()}"'
                        headers = [h for h in headers if h[0].lower() != b"etag"]
                        headers.append((b"etag", etag.encode("latin-1")))

                        # Handle conditional If-None-Match
                        if if_none_match and (if_none_match == etag or if_none_match == f"W/{etag}" or if_none_match == "*"):
                            headers = [(h[0], h[1]) for h in headers if h[0].lower() not in (b"content-length", b"content-type")]
                            headers.append((b"content-length", b"0"))
                            await send({
                                "type": "http.response.start",
                                "status": 304,
                                "headers": headers,
                            })
                            await send({
                                "type": "http.response.body",
                                "body": b"",
                                "more_body": False,
                            })
                            return

                    await send({
                        "type": "http.response.start",
                        "status": status_code,
                        "headers": headers,
                    })
                    await send({
                        "type": "http.response.body",
                        "body": full_body,
                        "more_body": False,
                    })

        await self.app(scope, receive, custom_send)

app.add_middleware(ETagMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(",") if settings.cors_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["ETag"],
)

# Register modular router units
app.include_router(user.router)
app.include_router(services.router)
app.include_router(studies.router)
app.include_router(workshops.router)
app.include_router(community.router)
app.include_router(reports.router)
app.include_router(announcements.router)
app.include_router(audit_logs.router)
app.include_router(posts.router)


@app.get("/")
async def check():
    return {"message": "API is running successfully!"}
