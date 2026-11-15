import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.attempt import Attempt
    from app.models.user import User


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # technical, dsa_concepts, system_design_basics, behavioral, hr, project_based
    role_tag: Mapped[str] = mapped_column(String(100), nullable=False)  # SDE, Frontend, Backend, ML Engineer, Data Analyst, HR/Behavioral
    difficulty: Mapped[str] = mapped_column(String(50), nullable=False)  # easy, medium, hard
    expected_key_points: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    common_mistakes: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    time_suggestion_sec: Mapped[int] = mapped_column(Integer, default=180, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    is_seed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    attempts: Mapped[list["Attempt"]] = relationship("Attempt", back_populates="question", cascade="all, delete-orphan")
    history_records: Mapped[list["UserQuestionHistory"]] = relationship("UserQuestionHistory", back_populates="question", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_questions_role_cat_diff", "role_tag", "category", "difficulty"),
    )


class UserQuestionHistory(Base):
    __tablename__ = "user_question_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    times_attempted: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="question_history")
    question: Mapped["Question"] = relationship("Question", back_populates="history_records")

    __table_args__ = (
        Index("idx_user_question_history_user_qid", "user_id", "question_id"),
    )
