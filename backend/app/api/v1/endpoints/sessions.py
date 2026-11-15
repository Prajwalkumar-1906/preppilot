from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.models.session import Session as SessionModel
from app.schemas.session import SessionCreate, SessionOut, SessionCompleteResponse
from app.services.session_service import SessionService

router = APIRouter()


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    session_in: SessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Start a new mock interview session with a target question count."""
    return SessionService.create_session(db=db, user=current_user, session_in=session_in)


@router.get("/{session_id}", response_model=SessionOut)
def get_session_details(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieve full session state, questions, and attempt evaluations."""
    return SessionService.get_session(db=db, user=current_user, session_id=session_id)


@router.post("/{session_id}/complete", response_model=SessionCompleteResponse)
def complete_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Finalize session and calculate aggregate rubric scorecard and feedback."""
    return SessionService.complete_session(db=db, user=current_user, session_id=session_id)


@router.get("", response_model=List[SessionOut])
def list_user_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieve recent practice sessions for the authenticated user."""
    query = (
        select(SessionModel)
        .where(SessionModel.user_id == current_user.id)
        .order_by(desc(SessionModel.started_at))
        .limit(20)
    )
    return db.execute(query).scalars().all()
