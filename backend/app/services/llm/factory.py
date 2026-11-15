from app.core.config import settings
from app.core.logging import logger
from app.services.llm.base import BaseLLMProvider
from app.services.llm.gemini_provider import GeminiProvider
from app.services.llm.mock_provider import MockLLMProvider
from app.services.llm.openai_provider import OpenAICompatibleProvider


def get_llm_provider() -> BaseLLMProvider:
    """Returns the configured LLM provider instance, with graceful fallback to Mock."""
    provider_name = (settings.LLM_PROVIDER or "mock").lower().strip()

    if provider_name == "gemini":
        if settings.GEMINI_API_KEY:
            return GeminiProvider()
        else:
            logger.warning("GEMINI_API_KEY not configured. Falling back to MockLLMProvider.")
            return MockLLMProvider()

    elif provider_name in ("openai", "groq", "ollama", "deepseek"):
        if settings.OPENAI_API_KEY or settings.OPENAI_BASE_URL:
            return OpenAICompatibleProvider()
        else:
            logger.warning("OPENAI_API_KEY not configured. Falling back to MockLLMProvider.")
            return MockLLMProvider()

    return MockLLMProvider()
