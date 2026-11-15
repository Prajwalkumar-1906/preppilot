from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class QuestionGeneratedSchema(BaseModel):
    """Schema returned by LLM question generator."""
    question_text: str = Field(description="The interview question prompt")
    category: str = Field(description="Category e.g. technical, dsa_concepts, system_design_basics, behavioral, hr, project_based")
    difficulty: str = Field(description="easy, medium, or hard")
    expected_key_points: list[str] = Field(description="3-5 critical concepts expected in a strong answer")
    common_mistakes: list[str] = Field(description="2-3 common pitfalls or mistakes candidates make")
    time_suggestion_sec: int = Field(default=180, description="Recommended answer time in seconds")


class QuestionGenerateRequest(BaseModel):
    """Request payload to generate or select the next interview question."""
    role: str | None = None  # if None, uses candidate's profile role
    category: str | None = None  # technical, dsa_concepts, system_design_basics, behavioral, hr, project_based
    difficulty: str | None = None  # easy, medium, hard
    use_adaptive_difficulty: bool = True  # adaptively adjust based on recent scores


class QuestionOut(BaseModel):
    id: str
    question_text: str
    category: str
    role_tag: str
    difficulty: str
    expected_key_points: list[str]
    common_mistakes: list[str]
    time_suggestion_sec: int
    content_hash: str
    is_seed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuestionListOut(BaseModel):
    items: list[QuestionOut]
    total: int
    page: int
    limit: int
