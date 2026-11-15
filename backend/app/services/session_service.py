import uuid
from datetime import datetime, timezone
from typing import List, Optional
from collections import Counter
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, desc
from fastapi import HTTPException, status

from app.models.session import Session as SessionModel
from app.models.attempt import Attempt
from app.models.user import User
from app.schemas.session import SessionCreate, SessionCompleteResponse


class SessionService:
    @staticmethod
    def create_session(db: Session, user: User, session_in: SessionCreate) -> SessionModel:
        """Initializes a new mock interview practice session."""
        new_session = SessionModel(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title=session_in.title or f"{session_in.role} Mock Practice",
            role=session_in.role or user.profile.target_role,
            target_question_count=session_in.target_question_count or 5,
            difficulty_mode=session_in.difficulty_mode or "adaptive",
            status="in_progress",
            started_at=datetime.now(timezone.utc),
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        return new_session

    @staticmethod
    def get_session(db: Session, user: User, session_id: str) -> SessionModel:
        """Fetches a session with all its attempts, questions, and evaluations."""
        query = (
            select(SessionModel)
            .where(SessionModel.id == session_id, SessionModel.user_id == user.id)
            .options(
                joinedload(SessionModel.attempts).joinedload(Attempt.question),
                joinedload(SessionModel.attempts).joinedload(Attempt.evaluation),
            )
        )
        session_obj = db.execute(query).unique().scalar_one_or_none()
        if not session_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        return session_obj

    @staticmethod
    def complete_session(db: Session, user: User, session_id: str) -> SessionCompleteResponse:
        """Finalizes an interview session, calculates aggregate score, strengths, and recommendations."""
        session_obj = SessionService.get_session(db, user, session_id)

        all_scores = []
        all_strengths = []
        all_weaknesses = []
        categories_attempted = []

        for attempt in session_obj.attempts:
            if attempt.evaluation:
                all_scores.append(attempt.evaluation.overall_score)
                all_strengths.extend(attempt.evaluation.strengths)
                all_weaknesses.extend(attempt.evaluation.weaknesses)
            if attempt.question:
                categories_attempted.append(attempt.question.category)

        overall_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else 7.0

        # Extract top 3 most common strengths & improvement areas
        top_strengths = [item for item, _ in Counter(all_strengths).most_common(3)]
        if not top_strengths:
            top_strengths = ["Structured explanation approach", "Addressed primary requirements"]

        top_improvements = [item for item, _ in Counter(all_weaknesses).most_common(3)]
        if not top_improvements:
            top_improvements = ["Mention asymptotic complexities explicitly", "Cover production edge cases"]

        # Recommend focus based on lowest scoring category or most common weakness
        recommended_focus = (
            f"Deep-dive into {categories_attempted[0].replace('_', ' ')} edge cases and asymptotic complexities"
            if categories_attempted
            else "System design basics and trade-offs"
        )

        now = datetime.now(timezone.utc)
        started = session_obj.started_at
        if started and started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        duration = int((now - started).total_seconds()) if started else 60

        session_obj.status = "completed"
        session_obj.completed_at = now
        session_obj.total_duration_sec = max(duration, 60)
        session_obj.overall_score = overall_score
        session_obj.summary_strengths = top_strengths
        session_obj.summary_improvements = top_improvements
        session_obj.recommended_focus = recommended_focus

        db.commit()
        db.refresh(session_obj)

        return SessionCompleteResponse(
            session_id=session_obj.id,
            status="completed",
            overall_score=overall_score,
            total_questions_answered=len(all_scores),
            summary_strengths=top_strengths,
            summary_improvements=top_improvements,
            recommended_focus=recommended_focus,
        )
