import os
import uuid
import shutil
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.core.logging import logger
from app.models.attempt import Attempt
from app.models.question import Question
from app.models.user import User
from app.schemas.attempt import AttemptCreate, TranscribeResponse
from app.services.evaluation_engine import EvaluationEngineService
from app.services.stt.whisper_engine import WhisperSpeechService


class AttemptService:
    @staticmethod
    def submit_attempt(db: Session, user: User, attempt_in: AttemptCreate) -> Attempt:
        """Records an answer submission and triggers structured evaluation."""
        # Check question exists
        question = db.execute(
            select(Question).where(Question.id == attempt_in.question_id)
        ).scalar_one_or_none()
        if not question:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

        # Determine attempt number for this user and question
        count_query = select(func.count(Attempt.id)).where(
            Attempt.user_id == user.id, Attempt.question_id == attempt_in.question_id
        )
        prev_count = db.execute(count_query).scalar() or 0
        attempt_number = prev_count + 1

        new_attempt = Attempt(
            id=str(uuid.uuid4()),
            session_id=attempt_in.session_id,
            question_id=attempt_in.question_id,
            user_id=user.id,
            attempt_number=attempt_number,
            answer_text=attempt_in.answer_text.strip(),
            answer_mode=attempt_in.answer_mode,
            audio_duration_sec=attempt_in.audio_duration_sec,
            speech_metrics=attempt_in.speech_metrics or {},
            status="evaluating",
            created_at=datetime.now(timezone.utc),
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(new_attempt)
        db.commit()
        db.refresh(new_attempt)

        # Trigger Evaluation Engine
        EvaluationEngineService.evaluate_attempt(db, new_attempt.id)

        # Reload with relationships
        query = (
            select(Attempt)
            .where(Attempt.id == new_attempt.id)
            .options(joinedload(Attempt.question), joinedload(Attempt.evaluation))
        )
        return db.execute(query).scalar_one()

    @staticmethod
    def get_attempt(db: Session, user: User, attempt_id: str) -> Attempt:
        """Retrieves a single attempt and its evaluation."""
        query = (
            select(Attempt)
            .where(Attempt.id == attempt_id, Attempt.user_id == user.id)
            .options(joinedload(Attempt.question), joinedload(Attempt.evaluation))
        )
        attempt = db.execute(query).scalar_one_or_none()
        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
        return attempt

    @staticmethod
    def transcribe_audio_upload(upload_file: UploadFile) -> TranscribeResponse:
        """Validates uploaded audio, transcribes with faster-whisper, and computes delivery metrics."""
        # Validate mime type / extension
        filename = upload_file.filename or "recording.webm"
        valid_extensions = (".webm", ".wav", ".mp3", ".ogg", ".m4a")
        if not any(filename.lower().endswith(ext) for ext in valid_extensions):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported audio format. Supported: {', '.join(valid_extensions)}",
            )

        # Save to ephemeral audio directory
        temp_filename = f"upload_{uuid.uuid4().hex}_{filename}"
        temp_path = os.path.join(settings.AUDIO_UPLOAD_DIR, temp_filename)

        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)

        file_size_mb = os.path.getsize(temp_path) / (1024 * 1024)
        if file_size_mb > settings.MAX_AUDIO_FILE_SIZE_MB:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Audio file exceeds maximum size of {settings.MAX_AUDIO_FILE_SIZE_MB}MB",
            )

        # Process transcription
        return WhisperSpeechService.transcribe_audio_file(temp_path)
