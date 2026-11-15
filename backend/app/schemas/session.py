from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.question import QuestionOut
from app.schemas.evaluation import EvaluationOut


class SessionCreate(BaseModel):
    title: Optional[str] = "Mock Interview Practice"
    role: Optional[str] = "SDE"
    target_question_count: int = Field(default=5, ge=1, le=10, description="5 or 10 questions")
    difficulty_mode: str = Field(default="adaptive", description="adaptive or fixed")


class SessionAttemptSummary(BaseModel):
    id: str
    question_id: str
    answer_mode: str
    status: str
    created_at: datetime
    question: Optional[QuestionOut] = None
    evaluation: Optional[EvaluationOut] = None

    model_config = ConfigDict(from_attributes=True)


class SessionOut(BaseModel):
    id: str
    user_id: str
    title: str
    role: str
    target_question_count: int
    difficulty_mode: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_duration_sec: int
    overall_score: Optional[float] = None
    summary_strengths: List[str] = Field(default_factory=list)
    summary_improvements: List[str] = Field(default_factory=list)
    recommended_focus: Optional[str] = None
    attempts: List[SessionAttemptSummary] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class SessionCompleteResponse(BaseModel):
    session_id: str
    status: str
    overall_score: float
    total_questions_answered: int
    summary_strengths: List[str]
    summary_improvements: List[str]
    recommended_focus: str
