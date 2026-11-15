import hashlib
import os
import uuid
from datetime import UTC, datetime

import yaml
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.logging import logger
from app.models.attempt import Attempt
from app.models.evaluation import Evaluation
from app.models.question import Question, UserQuestionHistory
from app.models.user import User
from app.schemas.question import (
    QuestionGeneratedSchema,
    QuestionGenerateRequest,
)
from app.services.llm.factory import get_llm_provider


def compute_content_hash(text: str) -> str:
    """Computes SHA-256 hash of normalized question text for deduplication."""
    normalized = " ".join(text.lower().strip().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class QuestionGeneratorService:
    @staticmethod
    def calculate_adaptive_difficulty(
        db: Session, user_id: str, role: str, requested_difficulty: str | None = None
    ) -> tuple[str, float | None]:
        """
        Computes explainable adaptive difficulty based on the candidate's last 5 evaluation scores.
        - Average >= 7.5: Steps up (easy -> medium -> hard)
        - Average <= 4.5: Steps down (hard -> medium -> easy)
        - Otherwise: Retains baseline (requested or medium)
        """
        # Default baseline
        base_diff = (requested_difficulty or "medium").lower()
        if base_diff not in ("easy", "medium", "hard"):
            base_diff = "medium"

        # Query last 5 attempts with evaluations for this user & role
        query = (
            select(Evaluation.overall_score)
            .join(Attempt, Evaluation.attempt_id == Attempt.id)
            .join(Question, Attempt.question_id == Question.id)
            .where(Attempt.user_id == user_id, Question.role_tag == role)
            .order_by(desc(Attempt.created_at))
            .limit(5)
        )
        scores = db.execute(query).scalars().all()

        if not scores:
            return base_diff, None

        avg_score = sum(scores) / len(scores)

        difficulty_ladder = ["easy", "medium", "hard"]
        current_idx = difficulty_ladder.index(base_diff)

        if avg_score >= 7.5:
            # Step up if not already at maximum
            new_idx = min(current_idx + 1, len(difficulty_ladder) - 1)
        elif avg_score <= 4.5:
            # Step down if not already at minimum
            new_idx = max(current_idx - 1, 0)
        else:
            new_idx = current_idx

        adapted_diff = difficulty_ladder[new_idx]
        logger.info(
            f"Adaptive difficulty for user {user_id[:8]} ({role}): "
            f"recent avg={avg_score:.2f} -> {base_diff} adapted to {adapted_diff}"
        )
        return adapted_diff, avg_score

    @staticmethod
    def get_or_generate_question(
        db: Session,
        user: User,
        request: QuestionGenerateRequest,
    ) -> Question:
        """
        Finds an unseen question from the curated bank or generates a fresh one using the LLM.
        Avoids repetitions and caches newly generated questions into the bank.
        """
        role = request.role or (user.profile.target_role if user.profile else "SDE")
        category = request.category or "technical"

        # 1. Determine Difficulty
        if request.use_adaptive_difficulty:
            difficulty, _ = QuestionGeneratorService.calculate_adaptive_difficulty(
                db=db, user_id=user.id, role=role, requested_difficulty=request.difficulty
            )
        else:
            difficulty = (request.difficulty or "medium").lower()

        # 2. Get list of questions user has already seen
        seen_query = select(UserQuestionHistory.question_id).where(
            UserQuestionHistory.user_id == user.id
        )
        seen_ids = set(db.execute(seen_query).scalars().all())

        # 3. Try to select an unseen question from the stored question bank
        bank_query = select(Question).where(
            Question.role_tag == role,
            Question.category == category,
            Question.difficulty == difficulty,
        )
        candidates = db.execute(bank_query).scalars().all()
        unseen_bank = [q for q in candidates if q.id not in seen_ids]

        if unseen_bank:
            # Pick the first unseen question from the bank
            selected_question = unseen_bank[0]
            logger.info(f"Serving question from bank cache: {selected_question.id[:8]}")
        else:
            # 4. Generate a fresh question using LLM
            logger.info(f"No unseen questions in bank for ({role}, {category}, {difficulty}). Generating via LLM...")
            selected_question = QuestionGeneratorService._generate_via_llm(
                db=db,
                role=role,
                category=category,
                difficulty=difficulty,
                tech_focus=user.profile.tech_focus_areas if user.profile else [],
                recent_question_texts=[q.question_text for q in candidates[-5:]],
            )

        # 5. Record/Update question in UserQuestionHistory
        history_record = db.execute(
            select(UserQuestionHistory).where(
                UserQuestionHistory.user_id == user.id,
                UserQuestionHistory.question_id == selected_question.id,
            )
        ).scalar_one_or_none()

        if history_record:
            history_record.last_seen_at = datetime.now(UTC)
            history_record.times_attempted += 1
        else:
            new_history = UserQuestionHistory(
                id=str(uuid.uuid4()),
                user_id=user.id,
                question_id=selected_question.id,
                last_seen_at=datetime.now(UTC),
                times_attempted=1,
            )
            db.add(new_history)

        db.commit()
        db.refresh(selected_question)
        return selected_question

    @staticmethod
    def _generate_via_llm(
        db: Session,
        role: str,
        category: str,
        difficulty: str,
        tech_focus: list[str],
        recent_question_texts: list[str],
    ) -> Question:
        """Invokes the configured LLM provider to create a new structured question and caches it."""
        # Load prompt template
        prompt_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "prompts", "generation", "question_gen_v1.yaml"
        )
        system_prompt = "You are an expert technical interviewer crafting calibrated mock interview questions."
        user_template = "Generate an interview question for {role}, category: {category}, difficulty: {difficulty}."

        if os.path.exists(prompt_path):
            try:
                with open(prompt_path, encoding="utf-8") as f:
                    prompt_data = yaml.safe_load(f)
                    system_prompt = prompt_data.get("system_prompt", system_prompt)
                    user_template = prompt_data.get("user_prompt_template", user_template)
            except Exception as e:
                logger.warning(f"Could not read prompt template from {prompt_path}: {e}")

        recent_summary = (
            "\n".join(f"- {text[:100]}..." for text in recent_question_texts)
            if recent_question_texts
            else "None"
        )

        formatted_user_prompt = user_template.format(
            role=role,
            category=category,
            difficulty=difficulty,
            tech_focus=", ".join(tech_focus) if tech_focus else "General CS fundamentals",
            recent_questions=recent_summary,
        )

        provider = get_llm_provider()
        generated_data, usage = provider.generate_structured(
            prompt=formatted_user_prompt,
            schema=QuestionGeneratedSchema,
            system_prompt=system_prompt,
            temperature=0.3,
        )

        content_hash = compute_content_hash(generated_data.question_text)

        # Ensure content_hash is unique in DB
        existing = db.execute(
            select(Question).where(Question.content_hash == content_hash)
        ).scalar_one_or_none()

        if existing:
            return existing

        new_question = Question(
            id=str(uuid.uuid4()),
            question_text=generated_data.question_text,
            category=category,
            role_tag=role,
            difficulty=difficulty,
            expected_key_points=generated_data.expected_key_points,
            common_mistakes=generated_data.common_mistakes,
            time_suggestion_sec=generated_data.time_suggestion_sec,
            content_hash=content_hash,
            is_seed=False,
        )
        db.add(new_question)
        db.flush()
        return new_question
