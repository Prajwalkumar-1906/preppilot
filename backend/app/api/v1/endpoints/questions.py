
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.question import Question
from app.models.user import User
from app.schemas.question import (
    QuestionGenerateRequest,
    QuestionListOut,
    QuestionOut,
)
from app.services.question_generator import QuestionGeneratorService
from seed_data.seed_questions import seed_questions

router = APIRouter()


@router.post("/generate", response_model=QuestionOut)
def generate_or_fetch_question(
    request: QuestionGenerateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Selects an unseen question from the curated bank or generates a new one via LLM.
    Applies adaptive difficulty based on user's recent score trajectory.
    """
    return QuestionGeneratorService.get_or_generate_question(
        db=db, user=current_user, request=request
    )


@router.get("", response_model=QuestionListOut)
def list_questions(
    role: str | None = Query(None, description="Filter by role e.g. SDE, Frontend Developer"),
    category: str | None = Query(None, description="Filter by category e.g. technical, dsa_concepts"),
    difficulty: str | None = Query(None, description="easy, medium, hard"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Retrieves paginated questions from the curated bank with optional filters."""
    query = select(Question)

    if role:
        query = query.where(Question.role_tag == role)
    if category:
        query = query.where(Question.category == category)
    if difficulty:
        query = query.where(Question.difficulty == difficulty.lower())

    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar_one()

    # Pagination
    offset = (page - 1) * limit
    paginated_query = query.order_by(Question.created_at.desc()).offset(offset).limit(limit)
    items = db.execute(paginated_query).scalars().all()

    return QuestionListOut(
        items=items,
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{question_id}", response_model=QuestionOut)
def get_question_by_id(
    question_id: str,
    db: Session = Depends(get_db),
):
    """Fetches details for a single interview question."""
    question = db.execute(
        select(Question).where(Question.id == question_id)
    ).scalar_one_or_none()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    return question


@router.post("/seed", status_code=status.HTTP_200_OK)
def trigger_seed_questions(
    db: Session = Depends(get_db),
):
    """Seeds the question bank with curated questions if not already populated."""
    count = seed_questions(db)
    return {"status": "success", "inserted_count": count}
