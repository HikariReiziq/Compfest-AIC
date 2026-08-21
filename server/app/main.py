"""FastAPI Application Main Entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .schemas import HealthResponse
from .api.v1 import api_v1_router

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Synchronous AI & AR Fashion Style Recommendation Engine for COMPFEST 18 AIC.",
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_v1_router)


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to COBA API - Smart Fashion Style Recommendation & Try-On Engine",
        "docs_url": "/docs",
        "health_check": "/health",
        "version": settings.VERSION,
        "mock_mode": settings.MOCK_MODE,
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
@app.get("/api/v1/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    return HealthResponse(
        status="healthy",
        service="COBA Fashion AI Backend",
        version=settings.VERSION,
        mock_mode=settings.MOCK_MODE,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.app.main:app", host="0.0.0.0", port=8000, reload=True)
