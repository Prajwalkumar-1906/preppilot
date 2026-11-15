from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class AnalyticsOverview(BaseModel):
    streak_days: int
    total_sessions: int
    total_questions: int
    total_minutes: int
    average_score: float
    target_role: str


class ScoreTrendPoint(BaseModel):
    date: str
    overall_score: float
    clarity_score: float
    relevance_score: float
    technical_score: float
    attempt_count: int


class CategoryPerformance(BaseModel):
    category: str
    average_score: float
    attempt_count: int
    easy_avg: Optional[float] = None
    medium_avg: Optional[float] = None
    hard_avg: Optional[float] = None


class SkillRadarAxis(BaseModel):
    skill: str
    all_time: float
    recent_30d: float


class SpeechAnalytics(BaseModel):
    average_wpm: float
    total_voice_attempts: int
    optimal_pace_percentage: float
    top_filler_words: List[Dict[str, Any]]
    wpm_trend: List[Dict[str, Any]]


class WeakSpot(BaseModel):
    category: str
    role_tag: str
    average_score: float
    attempt_count: int
    recommendation: str
