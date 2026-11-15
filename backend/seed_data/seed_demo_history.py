import os
import sys
import uuid
import random
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, Profile
from app.models.question import Question, UserQuestionHistory
from app.models.session import Session as SessionModel
from app.models.attempt import Attempt
from app.models.evaluation import Evaluation
from seed_data.seed_questions import seed_questions


def seed_demo_history(db: Session, candidate_email: str = "candidate@example.com"):
    """Populates realistic historical practice sessions, attempts, and evaluations for demo dashboard."""
    # 1. Ensure question bank is seeded
    seed_questions(db)

    # 2. Get or create candidate user
    user = db.execute(select(User).where(User.email == candidate_email)).scalar_one_or_none()
    if not user:
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=candidate_email,
            full_name="Alex Candidate",
            hashed_password=get_password_hash("Password123!"),
            is_active=True,
        )
        db.add(user)
        db.flush()

        profile = Profile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            target_role="SDE",
            experience_level="fresher",
            tech_focus_areas=["Python", "FastAPI", "React", "DSA", "PostgreSQL"],
            bio="Aspiring SDE fresher preparing for product engineering mock interviews.",
        )
        db.add(profile)
        db.commit()
        db.refresh(user)

    # Check if attempts already seeded for this candidate
    existing_attempts = db.execute(
        select(Attempt).where(Attempt.user_id == user.id)
    ).scalars().all()

    if len(existing_attempts) >= 10:
        print(f"Candidate {candidate_email} already has {len(existing_attempts)} attempts. Skipping demo seeding.")
        return

    # Fetch available questions
    questions = db.execute(select(Question).where(Question.role_tag == "SDE")).scalars().all()
    if not questions:
        questions = db.execute(select(Question)).scalars().all()

    now = datetime.now(timezone.utc)

    # Create 3 sessions over past 10 days
    session_configs = [
        {"title": "DSA & Algorithmic Foundations", "days_ago": 8, "q_count": 4},
        {"title": "Backend Architecture & Systems", "days_ago": 4, "q_count": 4},
        {"title": "Comprehensive Mock Round 1", "days_ago": 1, "q_count": 5},
    ]

    total_attempts = 0
    q_index = 0

    for s_cfg in session_configs:
        s_date = now - timedelta(days=s_cfg["days_ago"])
        session_obj = SessionModel(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title=s_cfg["title"],
            role="SDE",
            target_question_count=s_cfg["q_count"],
            difficulty_mode="adaptive",
            status="completed",
            started_at=s_date,
            completed_at=s_date + timedelta(minutes=25),
            total_duration_sec=1500,
            overall_score=7.8,
            summary_strengths=["Clear problem formulation", "Accurate time complexities", "Structured STAR framework"],
            summary_improvements=["Discuss edge conditions earlier", "Highlight memory concurrency trade-offs"],
            recommended_focus="Practice dynamic sliding window and B-Tree indexing trade-offs",
        )
        db.add(session_obj)
        db.flush()

        for i in range(s_cfg["q_count"]):
            q = questions[q_index % len(questions)]
            q_index += 1

            attempt_date = s_date + timedelta(minutes=i * 5)
            is_voice = (i % 2 == 1)

            # Realistic scores progressing over time
            base_score = 6.5 + (s_cfg["days_ago"] * -0.15) + (i * 0.25)
            overall_score = round(min(max(base_score + random.uniform(-0.4, 0.6), 5.5), 9.2), 1)
            clarity_score = round(min(max(overall_score + random.uniform(-0.3, 0.4), 5.0), 9.5), 1)
            relevance_score = round(min(max(overall_score + random.uniform(-0.2, 0.5), 5.5), 9.8), 1)
            technical_score = round(min(max(overall_score + random.uniform(-0.4, 0.3), 5.0), 9.0), 1)
            comm_score = round(random.uniform(7.0, 8.5), 1) if is_voice else None

            speech_metrics = {}
            if is_voice:
                speech_metrics = {
                    "wpm": round(random.uniform(135.0, 155.0), 1),
                    "filler_word_count": random.randint(2, 6),
                    "filler_words": random.sample(["um", "uh", "like", "actually", "basically"], k=random.randint(1, 3)),
                    "long_pause_count": random.randint(0, 2),
                    "optimal_pace": True,
                }

            attempt = Attempt(
                id=str(uuid.uuid4()),
                session_id=session_obj.id,
                question_id=q.id,
                user_id=user.id,
                attempt_number=1,
                answer_text=(
                    f"Candidate response addressing {q.question_text[:60]}... "
                    "First, I analyzed the problem constraints and edge cases. Next, I selected the optimal data structure "
                    "to achieve O(N) time complexity while minimizing auxiliary space. Finally, I evaluated trade-offs."
                ),
                answer_mode="voice" if is_voice else "text",
                audio_duration_sec=45.0 if is_voice else None,
                speech_metrics=speech_metrics,
                status="completed",
                created_at=attempt_date,
                submitted_at=attempt_date + timedelta(seconds=120),
            )
            db.add(attempt)
            db.flush()

            evaluation = Evaluation(
                id=str(uuid.uuid4()),
                attempt_id=attempt.id,
                overall_score=overall_score,
                clarity_score=clarity_score,
                relevance_score=relevance_score,
                technical_score=technical_score,
                communication_score=comm_score,
                strengths=[
                    "Clear, progressive problem-solving structure",
                    "Explicitly articulated time and space complexities",
                    "Directly addressed the primary prompt constraints",
                ],
                weaknesses=[
                    "Could explicitly address boundary conditions earlier",
                    "Pacing could be slightly more deliberate",
                ],
                missed_key_points=[
                    "Mentioning specific cache locality benefits",
                ],
                actionable_suggestions=[
                    "Lead with the high-level trade-off before writing or speaking the full implementation",
                    "Keep filler words below 3 per response",
                ],
                improved_model_answer=(
                    f"An exemplary answer begins by stating the core architecture for '{q.question_text[:50]}...', "
                    "walks through asymptotic complexity, and addresses concrete failure modes."
                ),
                reasoning="Candidate showed solid conceptual mastery with consistent structure.",
                confidence=0.94,
                prompt_version="v1.0.0",
                model_name="mock-evaluator",
                latency_ms=180,
                self_consistency_applied=False,
                created_at=attempt_date,
            )
            db.add(evaluation)

            # Record in user question history
            db.add(
                UserQuestionHistory(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    question_id=q.id,
                    last_seen_at=attempt_date,
                    times_attempted=1,
                )
            )
            total_attempts += 1

    db.commit()
    print(f"Successfully seeded demo history! Created {len(session_configs)} sessions and {total_attempts} evaluated attempts for {candidate_email}.")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_demo_history(session)
