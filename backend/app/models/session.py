import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.attempt import Attempt
    from app.models.user import User


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), default="Mock Interview Practice", nullable=False)
    role: Mapped[str] = mapped_column(String(100), default="SDE", nullable=False)
    target_question_count: Mapped[int] = mapped_column(Integer, default=5, nullable=False)  # 5 or 10
    difficulty_mode: Mapped[str] = mapped_column(String(50), default="adaptive", nullable=False)  # adaptive or fixed
    status: Mapped[str] = mapped_column(String(50), default="in_progress", nullable=False)  # in_progress, completed, abandoned
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_duration_sec: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    summary_strengths: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    summary_improvements: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    recommended_focus: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")
    attempts: Mapped[list["Attempt"]] = relationship("Attempt", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_sessions_user_status", "user_id", "status"),
    )
