from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class EvaluationResultSchema(BaseModel):
    """Structured evaluation output returned by the LLM evaluation engine."""
    overall_score: float = Field(ge=0.0, le=10.0, description="Overall weighted score from 0.0 to 10.0")
    clarity_score: float = Field(ge=0.0, le=10.0, description="Organization, conciseness, framework usage")
    relevance_score: float = Field(ge=0.0, le=10.0, description="Alignment with the question asked")
    technical_score: float = Field(ge=0.0, le=10.0, description="Accuracy, depth, edge cases")
    communication_score: Optional[float] = Field(default=None, ge=0.0, le=10.0, description="Voice delivery, pace, filler words")
    strengths: List[str] = Field(default_factory=list, description="Demonstrated strengths")
    weaknesses: List[str] = Field(default_factory=list, description="Areas needing refinement")
    missed_key_points: List[str] = Field(default_factory=list, description="Key concepts omitted from answer")
    actionable_suggestions: List[str] = Field(default_factory=list, description="Actionable advice for next attempt")
    improved_model_answer: str = Field(description="Exemplary model answer showing ideal structure and depth")
    reasoning: Optional[str] = Field(default=None, description="Short chain-of-thought analysis explaining score rationale")
    confidence: float = Field(default=0.9, ge=0.0, le=1.0, description="Evaluator confidence score")


class EvaluationOut(EvaluationResultSchema):
    """Database representation of an Evaluation record."""
    id: str
    attempt_id: str
    prompt_version: str
    model_name: str
    prompt_tokens: int
    completion_tokens: int
    latency_ms: int
    self_consistency_applied: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
