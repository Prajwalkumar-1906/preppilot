import uuid

from fastapi.testclient import TestClient

from app.models.attempt import Attempt
from app.models.evaluation import Evaluation
from app.models.question import Question
from app.models.user import User
from app.schemas.question import QuestionGeneratedSchema
from app.services.llm.factory import get_llm_provider
from app.services.llm.mock_provider import MockLLMProvider
from app.services.question_generator import (
    QuestionGeneratorService,
    compute_content_hash,
)


def test_seed_curated_questions(client: TestClient):
    """Verify that the seed question bank loads at least 50 questions across roles."""
    res = client.post("/api/v1/questions/seed")
    assert res.status_code == 200

    list_res = client.get("/api/v1/questions?limit=100")
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 50, f"Expected at least 50 seed questions, got {data['total']}"

    # Verify distribution across roles
    roles = {q["role_tag"] for q in data["items"]}
    assert "SDE" in roles
    assert "Frontend Developer" in roles
    assert "Backend Developer" in roles
    assert "ML Engineer" in roles
    assert "Data Analyst" in roles
    assert "HR/Behavioral" in roles


def test_list_questions_filtering(client: TestClient):
    """Verify filtering by role, category, and difficulty."""
    client.post("/api/v1/questions/seed")

    # Filter by SDE + dsa_concepts
    res = client.get("/api/v1/questions?role=SDE&category=dsa_concepts")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for q in data["items"]:
        assert q["role_tag"] == "SDE"
        assert q["category"] == "dsa_concepts"

    # Filter by difficulty
    res_easy = client.get("/api/v1/questions?difficulty=easy")
    assert res_easy.status_code == 200
    for q in res_easy.json()["items"]:
        assert q["difficulty"] == "easy"


def test_content_hash_deduplication():
    """Verify content hash is deterministic and invariant to casing/whitespace."""
    text1 = "How does a Hash Map handle collisions under the hood?"
    text2 = "  HOW DOES A   HASH MAP HANDLE COLLISIONS UNDER THE HOOD?  \n"
    text3 = "What is Dijkstra's algorithm?"

    hash1 = compute_content_hash(text1)
    hash2 = compute_content_hash(text2)
    hash3 = compute_content_hash(text3)

    assert hash1 == hash2
    assert hash1 != hash3
    assert len(hash1) == 64  # SHA-256 hex length


def test_adaptive_difficulty_logic(client: TestClient):
    """Verify explainable score-based difficulty adaptation."""
    from app.core.database import SessionLocal

    with SessionLocal() as db:
        # Create a test candidate
        u = User(
            id=str(uuid.uuid4()),
            email=f"adaptive_{uuid.uuid4().hex[:6]}@example.com",
            hashed_password="hash",
            full_name="Adaptive Tester",
        )
        db.add(u)
        db.flush()

        # Case 1: No previous history -> stays baseline
        diff, avg = QuestionGeneratorService.calculate_adaptive_difficulty(
            db, user_id=u.id, role="SDE", requested_difficulty="medium"
        )
        assert diff == "medium"
        assert avg is None

        # Seed a dummy question
        q = Question(
            id=str(uuid.uuid4()),
            question_text="Dummy Question For Adaptive Test",
            category="technical",
            role_tag="SDE",
            difficulty="medium",
            expected_key_points=["Point 1"],
            common_mistakes=["Mistake 1"],
            content_hash=compute_content_hash(f"dummy_{uuid.uuid4().hex}"),
            is_seed=False,
        )
        db.add(q)
        db.flush()

        # Case 2: Candidate achieves high scores (average >= 7.5) -> Steps up
        for score in [8.0, 8.5, 9.0]:
            attempt = Attempt(
                id=str(uuid.uuid4()),
                question_id=q.id,
                user_id=u.id,
                answer_text="Sample high quality answer",
                speech_metrics={},
            )
            db.add(attempt)
            db.flush()
            evaluation = Evaluation(
                id=str(uuid.uuid4()),
                attempt_id=attempt.id,
                overall_score=score,
                clarity_score=score,
                relevance_score=score,
                technical_score=score,
                strengths=[],
                weaknesses=[],
                missed_key_points=[],
                actionable_suggestions=[],
                improved_model_answer="Model answer",
                prompt_version="v1.0.0",
                model_name="mock",
            )
            db.add(evaluation)
        db.commit()

        # Baseline was medium -> should step up to hard
        stepped_up, avg_high = QuestionGeneratorService.calculate_adaptive_difficulty(
            db, user_id=u.id, role="SDE", requested_difficulty="medium"
        )
        assert stepped_up == "hard"
        assert avg_high >= 7.5

        # Case 3: Candidate achieves low scores (average <= 4.5) -> Steps down
        # Add low scoring attempts
        for score in [3.0, 2.5, 4.0, 3.5, 3.0]:
            attempt = Attempt(
                id=str(uuid.uuid4()),
                question_id=q.id,
                user_id=u.id,
                answer_text="Poor answer",
                speech_metrics={},
            )
            db.add(attempt)
            db.flush()
            evaluation = Evaluation(
                id=str(uuid.uuid4()),
                attempt_id=attempt.id,
                overall_score=score,
                clarity_score=score,
                relevance_score=score,
                technical_score=score,
                strengths=[],
                weaknesses=[],
                missed_key_points=[],
                actionable_suggestions=[],
                improved_model_answer="Model answer",
                prompt_version="v1.0.0",
                model_name="mock",
            )
            db.add(evaluation)
        db.commit()

        stepped_down, avg_low = QuestionGeneratorService.calculate_adaptive_difficulty(
            db, user_id=u.id, role="SDE", requested_difficulty="medium"
        )
        assert stepped_down == "easy"
        assert avg_low <= 4.5


def test_question_generation_endpoint(client: TestClient):
    """Verify question generation endpoint with auth and history recording."""
    # Register candidate
    reg = client.post("/api/v1/auth/register", json={
        "email": f"candidate_{uuid.uuid4().hex[:6]}@example.com",
        "full_name": "Test Candidate",
        "password": "Password123!",
        "target_role": "Backend Developer",
        "experience_level": "fresher",
        "tech_focus_areas": ["Python", "PostgreSQL"],
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Seed the bank
    client.post("/api/v1/questions/seed")

    # Generate next question for Backend Developer
    gen_res = client.post(
        "/api/v1/questions/generate",
        json={
            "role": "Backend Developer",
            "category": "technical",
            "difficulty": "easy",
            "use_adaptive_difficulty": False,
        },
        headers=headers,
    )
    assert gen_res.status_code == 200
    q = gen_res.json()
    assert q["role_tag"] == "Backend Developer"
    assert q["category"] == "technical"
    assert q["difficulty"] == "easy"
    assert len(q["expected_key_points"]) > 0
    assert len(q["common_mistakes"]) > 0
    assert q["time_suggestion_sec"] > 0


def test_llm_mock_and_factory():
    """Verify LLM abstraction and deterministic mock output."""
    provider = get_llm_provider()
    assert provider is not None

    mock = MockLLMProvider()
    resp, usage = mock.generate_structured(
        prompt="Generate SDE question",
        schema=QuestionGeneratedSchema,
    )
    assert isinstance(resp, QuestionGeneratedSchema)
    assert len(resp.question_text) > 10
    assert len(resp.expected_key_points) >= 3
    assert usage.model_name == "mock-evaluator"
