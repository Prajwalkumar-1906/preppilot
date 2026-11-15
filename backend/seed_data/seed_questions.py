import hashlib
import json
import os
import sys
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base, SessionLocal, engine
from app.core.logging import logger
from app.models.question import Question


def compute_content_hash(text: str) -> str:
    """Computes SHA-256 hash of normalized text for question deduplication."""
    normalized = " ".join(text.lower().strip().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def seed_questions(db: Session, json_path: str = None) -> int:
    """Seeds the question bank with curated seed questions."""
    if json_path is None:
        json_path = os.path.join(os.path.dirname(__file__), "seed_questions.json")

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    inserted_count = 0
    for item in data:
        content_hash = compute_content_hash(item["question_text"])

        # Check if already exists
        existing = db.execute(
            select(Question).where(Question.content_hash == content_hash)
        ).scalar_one_or_none()

        if not existing:
            q = Question(
                id=str(uuid.uuid4()),
                question_text=item["question_text"],
                category=item["category"],
                role_tag=item["role_tag"],
                difficulty=item["difficulty"],
                expected_key_points=item.get("expected_key_points", []),
                common_mistakes=item.get("common_mistakes", []),
                time_suggestion_sec=item.get("time_suggestion_sec", 180),
                content_hash=content_hash,
                is_seed=True,
            )
            db.add(q)
            inserted_count += 1

    db.commit()
    logger.info(f"Seeded {inserted_count} new questions into the database (Total curated in JSON: {len(data)}).")
    return inserted_count


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        count = seed_questions(session)
        print(f"Successfully processed seed questions! Inserted: {count}")
