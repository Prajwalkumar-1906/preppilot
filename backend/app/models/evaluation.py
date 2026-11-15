import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.attempt import Attempt


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    attempt_id: Mapped[str] = mapped_column(String(36), ForeignKey("attempts.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)  # 0.0 - 10.0
    clarity_score: Mapped[float] = mapped_column(Float, nullable=False)  # 0.0 - 10.0
    relevance_score: Mapped[float] = mapped_column(Float, nullable=False)  # 0.0 - 10.0
    technical_score: Mapped[float] = mapped_column(Float, nullable=False)  # 0.0 - 10.0
    communication_score: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0.0 - 10.0 (voice only)
    strengths: Mapped[list] = mapped_column(JSON, default=list, nullable=False)  # list of str
    weaknesses: Mapped[list] = mapped_column(JSON, default=list, nullable=False)  # list of str
    missed_key_points: Mapped[list] = mapped_column(JSON, default=list, nullable=False)  # list of str
    actionable_suggestions: Mapped[list] = mapped_column(JSON, default=list, nullable=False)  # list of str
    improved_model_answer: Mapped[str] = mapped_column(Text, nullable=False)
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)  # chain-of-thought, shown on demand
    confidence: Mapped[float] = mapped_column(Float, default=0.9, nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(50), default="v1.0.0", nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), default="mock-evaluator", nullable=False)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    self_consistency_applied: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationship
    attempt: Mapped["Attempt"] = relationship("Attempt", back_populates="evaluation")

    __table_args__ = (
        Index("idx_evaluations_attempt_id", "attempt_id"),
        Index("idx_evaluations_created_at", "created_at"),
    )
