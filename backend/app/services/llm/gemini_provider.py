import json
import time
from collections.abc import Generator
from typing import TypeVar

from pydantic import BaseModel

from app.core.config import settings
from app.services.llm.base import BaseLLMProvider, LLMResponse, LLMUsage

T = TypeVar("T", bound=BaseModel)


class GeminiProvider(BaseLLMProvider):
    """Google Gemini LLM provider using the modern google-genai SDK."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model or settings.GEMINI_MODEL
        self._client = None

    @property
    def client(self):
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def generate_text(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1500,
    ) -> LLMResponse:
        start_time = time.time()
        from google.genai import types

        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
            system_instruction=system_prompt if system_prompt else None,
        )

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=config,
        )

        latency = int((time.time() - start_time) * 1000)
        content = response.text or ""

        usage = LLMUsage(
            prompt_tokens=response.usage_metadata.prompt_token_count if response.usage_metadata else 0,
            completion_tokens=response.usage_metadata.candidates_token_count if response.usage_metadata else 0,
            total_tokens=response.usage_metadata.total_token_count if response.usage_metadata else 0,
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
        from google.genai import types

        config = types.GenerateContentConfig(
            temperature=temperature,
            response_mime_type="application/json",
            response_schema=schema,
            system_instruction=system_prompt if system_prompt else None,
        )

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=config,
        )

        latency = int((time.time() - start_time) * 1000)
        raw_text = response.text or "{}"
        parsed_data = json.loads(raw_text)
        instance = schema.model_validate(parsed_data)

        usage = LLMUsage(
            prompt_tokens=response.usage_metadata.prompt_token_count if response.usage_metadata else 0,
            completion_tokens=response.usage_metadata.candidates_token_count if response.usage_metadata else 0,
            total_tokens=response.usage_metadata.total_token_count if response.usage_metadata else 0,
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
        from google.genai import types

        config = types.GenerateContentConfig(
            temperature=temperature,
            system_instruction=system_prompt if system_prompt else None,
        )

        response_stream = self.client.models.generate_content_stream(
            model=self.model_name,
            contents=prompt,
            config=config,
        )

        for chunk in response_stream:
            if chunk.text:
                yield chunk.text
