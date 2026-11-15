from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsOverview,
    ScoreTrendPoint,
    CategoryPerformance,
    SkillRadarAxis,
    SpeechAnalytics,
    WeakSpot,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/overview", response_model=AnalyticsOverview)
def get_analytics_overview(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Calculates practice streak, total sessions, questions, minutes, and average score."""
    return AnalyticsService.get_overview(db=db, user=current_user)


@router.get("/trends", response_model=List[ScoreTrendPoint])
def get_score_trends(
    days: int = Query(30, ge=7, le=90),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Returns score trajectory time-series across overall and rubric dimensions."""
    return AnalyticsService.get_trends(db=db, user=current_user, days=days)


@router.get("/categories", response_model=List[CategoryPerformance])
def get_category_performance(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Aggregates score by question category with difficulty breakdown."""
    return AnalyticsService.get_category_performance(db=db, user=current_user)


@router.get("/radar", response_model=List[SkillRadarAxis])
def get_skill_radar(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Returns 6-axis skill profile comparing all-time mastery vs last 30 days."""
    return AnalyticsService.get_skill_radar(db=db, user=current_user)


@router.get("/speech", response_model=SpeechAnalytics)
def get_speech_analytics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Returns speaking pace (WPM), pace stability, and filler word frequency breakdown."""
    return AnalyticsService.get_speech_analytics(db=db, user=current_user)


@router.get("/weak-spots", response_model=List[WeakSpot])
def get_weak_spots(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Identifies lowest-scoring categories to generate targeted practice recommendations."""
    return AnalyticsService.get_weak_spots(db=db, user=current_user)
