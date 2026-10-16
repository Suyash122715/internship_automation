from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.db.init_db import init_db
from backend.app.api.v1.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema on startup
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Locally running personal internship automation platform backend",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware setup
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include v1 API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Also expose root health endpoint for standard container/health monitors
@app.get("/health", tags=["Health"])
def root_health():
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
    }
