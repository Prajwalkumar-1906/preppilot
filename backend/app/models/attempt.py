import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.evaluation import Evaluation
    from app.models.question import Question
    from app.models.session import Session
    from app.models.user import User


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    answer_mode: Mapped[str] = mapped_column(String(20), default="text", nullable=False)  # text or voice
    audio_file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    audio_duration_sec: Mapped[float | None] = mapped_column(Float, nullable=True)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    speech_metrics: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)  # wpm, filler_word_count, filler_words, long_pause_count
    status: Mapped[str] = mapped_column(String(50), default="completed", nullable=False)  # answering, transcribing, evaluating, completed, failed
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="attempts")
    session: Mapped[Optional["Session"]] = relationship("Session", back_populates="attempts")
    question: Mapped["Question"] = relationship("Question", back_populates="attempts")
    evaluation: Mapped[Optional["Evaluation"]] = relationship("Evaluation", back_populates="attempt", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_attempts_user_created", "user_id", "created_at"),
        Index("idx_attempts_session_id", "session_id"),
    )
