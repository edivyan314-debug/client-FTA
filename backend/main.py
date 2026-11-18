from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent))
from config import settings
from database import create_tables
from routers import ingest, clusters, tickets, citizen, demo, public

app = FastAPI(title="Citizen FTA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(settings.upload_dir)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(ingest.router, prefix="", tags=["ingest"])
app.include_router(clusters.router, prefix="", tags=["clusters"])
app.include_router(tickets.router, prefix="", tags=["tickets"])
app.include_router(citizen.router, prefix="", tags=["citizen"])
app.include_router(demo.router, prefix="", tags=["demo"])
app.include_router(public.router, prefix="", tags=["public"])


@app.on_event("startup")
async def startup():
    create_tables()
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/health")
def health():
    return {"status": "ok", "demo_mode": settings.demo_mode}


@app.get("/")
def root():
    return {"message": "Citizen FTA API", "docs": "/docs", "demo_mode": settings.demo_mode}
