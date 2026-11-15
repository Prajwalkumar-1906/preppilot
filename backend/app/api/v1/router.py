from fastapi import APIRouter
from app.api.v1.endpoints import auth, questions, sessions, attempts, analytics

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Profile"])
api_router.include_router(questions.router, prefix="/questions", tags=["Questions & Generation"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Mock Interview Sessions"])
api_router.include_router(attempts.router, prefix="/attempts", tags=["Attempts & Evaluation"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics & Progress"])
