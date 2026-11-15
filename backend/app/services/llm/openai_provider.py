import json
import time
from collections.abc import Generator
from typing import TypeVar

from pydantic import BaseModel

from app.core.config import settings
from app.services.llm.base import BaseLLMProvider, LLMResponse, LLMUsage

T = TypeVar("T", bound=BaseModel)


class OpenAICompatibleProvider(BaseLLMProvider):
    """OpenAI-compatible LLM provider supporting OpenAI, Groq, Ollama, DeepSeek, OpenRouter."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY or "dummy-key"
        self.base_url = base_url or settings.OPENAI_BASE_URL
        self.model_name = model or settings.OPENAI_MODEL
        self._client = None

    @property
    def client(self):
        if self._client is None:
            from openai import OpenAI
            kwargs = {"api_key": self.api_key}
            if self.base_url:
                kwargs["base_url"] = self.base_url
            self._client = OpenAI(**kwargs)
        return self._client

    def generate_text(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1500,
    ) -> LLMResponse:
        start_time = time.time()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        latency = int((time.time() - start_time) * 1000)
        content = response.choices[0].message.content or ""

        usage = LLMUsage(
            prompt_tokens=response.usage.prompt_tokens if response.usage else 0,
            completion_tokens=response.usage.completion_tokens if response.usage else 0,
            total_tokens=response.usage.total_tokens if response.usage else 0,
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
        schema_json = json.dumps(schema.model_json_schema())
        system_instruction = (
            f"{system_prompt or ''}\n\n"
            f"You must return ONLY a valid JSON object matching this schema:\n{schema_json}"
        )

        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": prompt},
        ]

        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            response_format={"type": "json_object"},
        )

        latency = int((time.time() - start_time) * 1000)
        raw_text = response.choices[0].message.content or "{}"
        parsed = json.loads(raw_text)
        instance = schema.model_validate(parsed)

        usage = LLMUsage(
            prompt_tokens=response.usage.prompt_tokens if response.usage else 0,
            completion_tokens=response.usage.completion_tokens if response.usage else 0,
            total_tokens=response.usage.total_tokens if response.usage else 0,
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
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        stream = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            stream=True,
        )

        for chunk in stream:
            content = chunk.choices[0].delta.content if chunk.choices else None
            if content:
                yield content
