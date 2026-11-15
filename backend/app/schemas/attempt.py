from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.question import QuestionOut
from app.schemas.evaluation import EvaluationOut


class SpeechMetrics(BaseModel):
    wpm: float = Field(default=0.0, description="Words Per Minute")
    filler_word_count: int = Field(default=0, description="Total count of filler words detected")
    filler_words: List[str] = Field(default_factory=list, description="List of filler words found")
    long_pause_count: int = Field(default=0, description="Count of silence pauses > 1.8 seconds")
    optimal_pace: bool = Field(default=True, description="True if WPM is in 130-165 range")


class AttemptCreate(BaseModel):
    session_id: Optional[str] = None
    question_id: str
    answer_text: str = Field(min_length=1, description="Candidate submitted answer text or reviewed transcript")
    answer_mode: str = Field(default="text", description="text or voice")
    audio_duration_sec: Optional[float] = None
    speech_metrics: Optional[Dict[str, Any]] = None


class AttemptOut(BaseModel):
    id: str
    session_id: Optional[str] = None
    question_id: str
    user_id: str
    attempt_number: int
    answer_text: str
    answer_mode: str
    audio_file_path: Optional[str] = None
    audio_duration_sec: Optional[float] = None
    transcript: Optional[str] = None
    speech_metrics: Dict[str, Any] = Field(default_factory=dict)
    status: str
    created_at: datetime
    submitted_at: Optional[datetime] = None
    question: Optional[QuestionOut] = None
    evaluation: Optional[EvaluationOut] = None

    model_config = ConfigDict(from_attributes=True)


class TranscribeResponse(BaseModel):
    transcript: str
    audio_duration_sec: float
    speech_metrics: SpeechMetrics
