from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import Base, engine
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

# Ensure upload directories exist
UPLOADS_DIR = Path("uploads/avatars")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
SERVICES_DIR = Path("uploads/services")
SERVICES_DIR.mkdir(parents=True, exist_ok=True)

try:
    Base.metadata.create_all(bind=engine)
    from sqlalchemy import inspect, text
    with engine.connect() as conn:
        cols = [c["name"] for c in inspect(engine).get_columns("users")]
        if "is_active" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"))
            conn.commit()
except Exception:
    pass

# Serve uploaded files (e.g. avatars, service photos) at /uploads/...
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(",") if settings.cors_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
