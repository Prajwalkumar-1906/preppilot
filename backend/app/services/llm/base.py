from abc import ABC, abstractmethod
from collections.abc import Generator
from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency_ms: int = 0
    model_name: str = ""


class LLMResponse(BaseModel):
    content: str
    usage: LLMUsage


class BaseLLMProvider(ABC):
    """Abstract base class for all LLM providers (Gemini, OpenAI, Mock)."""

    @abstractmethod
    def generate_text(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1500,
    ) -> LLMResponse:
        """Generates raw text response."""
        pass

    @abstractmethod
    def generate_structured(
        self,
        prompt: str,
        schema: type[T],
        system_prompt: str | None = None,
        temperature: float = 0.2,
    ) -> tuple[T, LLMUsage]:
        """Generates structured output parsed into a validated Pydantic model."""
        pass

    @abstractmethod
    def stream_text(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.7,
    ) -> Generator[str, None, None]:
        """Streams text chunks in real time."""
        pass
