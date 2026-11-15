from fastapi import APIRouter, Depends, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.attempt import AttemptCreate, AttemptOut, TranscribeResponse
from app.schemas.evaluation import EvaluationOut
from app.services.attempt_service import AttemptService
from app.services.evaluation_engine import EvaluationEngineService

router = APIRouter()


@router.post("/transcribe", response_model=TranscribeResponse)
def transcribe_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload recorded audio from browser MediaRecorder.
    Transcribes with faster-whisper and returns transcript + speech delivery metrics.
    """
    return AttemptService.transcribe_audio_upload(upload_file=file)


@router.post("", response_model=AttemptOut, status_code=status.HTTP_201_CREATED)
def submit_attempt(
    attempt_in: AttemptCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Submits answer text or transcript, triggers rubric evaluation, and returns scores."""
    return AttemptService.submit_attempt(db=db, user=current_user, attempt_in=attempt_in)


@router.get("/{attempt_id}", response_model=AttemptOut)
def get_attempt(
    attempt_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Fetches attempt details, question prompt, and structured evaluation."""
    return AttemptService.get_attempt(db=db, user=current_user, attempt_id=attempt_id)


@router.post("/{attempt_id}/evaluate", response_model=EvaluationOut)
def trigger_evaluation(
    attempt_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Triggers or refreshes LLM evaluation for a given attempt."""
    # Ensure attempt belongs to user
    AttemptService.get_attempt(db=db, user=current_user, attempt_id=attempt_id)
    return EvaluationEngineService.evaluate_attempt(db=db, attempt_id=attempt_id)


@router.get("/{attempt_id}/evaluate/stream")
def stream_evaluation(
    attempt_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Server-Sent Events (SSE) streaming real-time evaluation tokens and steps."""
    AttemptService.get_attempt(db=db, user=current_user, attempt_id=attempt_id)
    return StreamingResponse(
        EvaluationEngineService.stream_evaluation(db=db, attempt_id=attempt_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
