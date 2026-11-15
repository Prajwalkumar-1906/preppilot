import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from starlette.types import ASGIApp, Receive, Scope, Send

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.logging import logger
from app.models.question import Question
from seed_data.seed_questions import seed_questions


class RequestLoggingMiddleware:
    """Pure ASGI middleware for Request ID and timing headers with zero stream buffering."""
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = str(uuid.uuid4())
        start_time = time.time()

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                process_time = time.time() - start_time
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode("latin1")))
                headers.append((b"x-process-time", f"{process_time:.4f}s".encode("latin1")))
                message["headers"] = headers
                logger.info(f"{scope.get('method')} {scope.get('path')} -> {message.get('status')} ({process_time:.4f}s) [ID: {request_id[:8]}]")
            await send(message)

        await self.app(scope, receive, send_wrapper)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified.")
    except Exception as e:
        logger.warning(f"Table creation note: {e}")

    # 2. Check and seed questions if empty
    try:
        with SessionLocal() as session:
            count = session.execute(select(func.count(Question.id))).scalar()
            if count == 0:
                logger.info("Question bank empty. Bootstrapping curated seed questions...")
                seed_questions(session)
            else:
                logger.info(f"Question bank ready with {count} questions.")
    except Exception as e:
        logger.warning(f"Auto-seeding check note: {e}")

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Portfolio-grade AI Interview Coach with real-time feedback, speech metrics, and analytical tracking.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pure ASGI Middleware
app.add_middleware(RequestLoggingMiddleware)

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for Docker / orchestration."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": settings.DATABASE_URL.split("://")[0]
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API. Visit {settings.API_V1_STR}/docs for OpenAPI documentation."
    }
