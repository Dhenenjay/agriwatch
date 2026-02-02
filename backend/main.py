"""AgriWatch API - Agricultural Monitoring Platform Backend."""

import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import get_settings
from routers import farms, analysis, indices

settings = get_settings()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    print(f"🌱 Starting {settings.app_name}")
    print(f"   Environment: {settings.environment}")
    
    # Initialize GEE on startup if credentials are available
    if settings.gee_project_id and settings.google_application_credentials:
        try:
            from services.gee_agri import init_gee
            init_gee()
            print("   ✓ Google Earth Engine initialized")
        except Exception as e:
            print(f"   ⚠ GEE initialization failed: {e}")
    
    yield
    
    print(f"👋 Shutting down {settings.app_name}")


app = FastAPI(
    title=settings.app_name,
    description="Agricultural Monitoring Platform - Track vegetation indices and crop health using Sentinel-2 satellite imagery",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests with timing."""
    start_time = time.time()
    
    response = await call_next(request)
    
    duration_ms = (time.time() - start_time) * 1000
    
    # Log in development
    if settings.debug:
        print(f"{request.method} {request.url.path} - {response.status_code} ({duration_ms:.2f}ms)")
    
    return response


# Include routers
app.include_router(farms.router, prefix="/api/farms", tags=["Farms"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(indices.router, prefix="/api/indices", tags=["Indices"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.environment,
    }


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "description": "Agricultural Monitoring Platform API",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=settings.debug)
