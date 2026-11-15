import time
from collections.abc import Generator
from typing import TypeVar

from pydantic import BaseModel

from app.services.llm.base import BaseLLMProvider, LLMResponse, LLMUsage

T = TypeVar("T", bound=BaseModel)


class MockLLMProvider(BaseLLMProvider):
    """Deterministic mock LLM provider for fast unit tests, offline development, and fallback."""

    def __init__(self, model_name: str = "mock-evaluator"):
        self.model_name = model_name

    def generate_text(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1500,
    ) -> LLMResponse:
        start_time = time.time()
        time.sleep(0.05)  # simulate brief network call
        latency = int((time.time() - start_time) * 1000)
        content = "This is a deterministic mock LLM text response."
        usage = LLMUsage(
            prompt_tokens=len(prompt.split()),
            completion_tokens=len(content.split()),
            total_tokens=len(prompt.split()) + len(content.split()),
            latency_ms=latency,
            model_name=self.model_name,
        )
        return LLMResponse(content=content, usage=usage)

    def generate_structured(
        self,
        prompt: str,
        schema: type[T],
        system_prompt: str | None = None,
        temperature: float = 0.2,
    ) -> tuple[T, LLMUsage]:
        start_time = time.time()
        time.sleep(0.05)
        latency = int((time.time() - start_time) * 1000)

        # Detect schema type by class name or fields
        schema_name = schema.__name__

        if "Question" in schema_name:
            mock_data = {
                "question_text": "Explain how database indexing works using B-Trees, and discuss the trade-offs between read and write performance.",
                "category": "technical",
                "difficulty": "medium",
                "expected_key_points": [
                    "B-Tree structure provides O(log N) search, insert, and delete",
                    "Indexes speed up SELECT queries via balanced tree traversal",
                    "Indexes add overhead to INSERT/UPDATE/DELETE as trees must be rebalanced",
                    "Trade-off between storage footprint and query acceleration"
                ],
                "common_mistakes": [
                    "Assuming indexes speed up all operations including bulk writes",
                    "Confusing B-Tree with binary search tree without balanced multi-way branching",
                    "Over-indexing tables leading to high write latency"
                ],
                "time_suggestion_sec": 180
            }
        else:
            # Calibrate mock evaluation based on candidate answer content & key-point alignment
            answer_text = ""
            expected_key_points = []
            if "<<<USER_ANSWER_BEGIN>>>" in prompt:
                try:
                    parts = prompt.split("<<<USER_ANSWER_BEGIN>>>")
                    header_part = parts[0]
                    answer_text = parts[1].split("<<<USER_ANSWER_END>>>")[0].strip()

                    if "Expected Key Points:" in header_part:
                        import json
                        kp_str = header_part.split("Expected Key Points:")[1].strip().split("\n")[0]
                        expected_key_points = json.loads(kp_str)
                except Exception:
                    answer_text = prompt
            else:
                answer_text = prompt

            words = answer_text.split()
            word_count = len(words)
            is_adversarial = "ignore all" in answer_text.lower() or "override" in answer_text.lower()

            # Heuristic detection for offline mock evaluations
            text_lower = answer_text.lower()
            excellent_indicators = [
                "situation:", "task:", "action:", "result:", "separate chaining", "open addressing",
                "load factor", "joinedload", "selectinload", "reconciliation", "uncontrolled component",
                "decomposition", "regularization", "cross-validation", "bias^2", "deadlock"
            ]
            has_excellent_depth = (
                word_count >= 50 or
                any(ind in text_lower for ind in excellent_indicators)
            ) and word_count >= 40

            has_poor_depth = (
                is_adversarial or
                word_count < 22 or
                ("doesn't have" in text_lower and "collision" in text_lower) or
                ("for loop" in text_lower and "n+1" in text_lower and word_count < 25) or
                ("yellow warning" in text_lower) or
                ("politically biased" in text_lower) or
                ("wasn't my fault" in text_lower)
            )

            if has_poor_depth and not has_excellent_depth:
                # Poor tier (1.0 - 4.0)
                overall = 2.5
                clarity = 3.0
                relevance = 2.0
                technical = 2.5
                strengths = ["Candidate provided a response"]
                weaknesses = ["Lacks technical depth", "Did not address key framework concepts"]
                missed = ["Foundational definitions", "Trade-offs and asymptotic complexity", "Production edge cases"]
                suggestions = ["Review core data structures and provide detailed step-by-step reasoning"]
            elif has_excellent_depth:
                # Excellent tier (8.5 - 10.0)
                overall = 9.2
                clarity = 9.5
                relevance = 9.5
                technical = 9.0
                strengths = [
                    "Exemplary depth and clear conceptual structure",
                    "Addressed asymptotic complexity and production trade-offs",
                    "Demonstrated real-world engineering intuition"
                ]
                weaknesses = ["Minor detail: could mention alternative cache eviction algorithms"]
                missed = ["Additional distributed partition tolerance edge cases"]
                suggestions = ["Outstanding answer. Maintain this structured approach in live interviews."]
            else:
                # Average tier (5.5 - 7.5)
                overall = 6.8
                clarity = 7.0
                relevance = 7.5
                technical = 6.5
                strengths = ["Solid baseline conceptual grasp", "Addressed the primary question clearly"]
                weaknesses = ["Omitted production edge cases", "Could provide deeper architectural nuance"]
                missed = ["Explicit complexity analysis under peak load", "Detailed failure recovery trade-offs"]
                suggestions = ["Explicitly mention Big-O time and space bounds", "Discuss real-world production mitigation"]

            mock_data = {
                "overall_score": overall,
                "clarity_score": clarity,
                "relevance_score": relevance,
                "technical_score": technical,
                "communication_score": 8.0,
                "strengths": strengths,
                "weaknesses": weaknesses,
                "missed_key_points": missed,
                "actionable_suggestions": suggestions,
                "improved_model_answer": (
                    "A robust answer begins by defining the core architecture, analyzing asymptotic complexity, "
                    "and then addressing edge cases and production trade-offs."
                ),
                "reasoning": (
                    f"Candidate provided a response of {word_count} words. "
                    "Evaluation calibrated based on rubric key point coverage and technical precision."
                ),
                "confidence": 0.94
            }

        instance = schema.model_validate(mock_data)
        usage = LLMUsage(
            prompt_tokens=120,
            completion_tokens=250,
            total_tokens=370,
            latency_ms=latency,
            model_name=self.model_name,
        )
        return instance, usage

    def stream_text(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.7,
    ) -> Generator[str, None, None]:
        chunks = [
            "Analyzing ", "response ", "quality...\n\n",
            "Score: 8/10. ", "Solid technical explanation ",
            "with clear structure ", "and sound reasoning."
        ]
        for chunk in chunks:
            time.sleep(0.02)
            yield chunk
