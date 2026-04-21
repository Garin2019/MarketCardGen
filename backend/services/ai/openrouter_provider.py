"""
OpenRouter — агрегатор AI-моделей с OpenAI-совместимым API.
Бесплатные модели: https://openrouter.ai/models?order=pricing-asc&max_price=0

Бесплатные модели по умолчанию (можно переопределить через OPENROUTER_MODEL):
  - google/gemma-3-27b-it:free      — мощная модель от Google
  - meta-llama/llama-4-scout:free   — Llama 4 Scout от Meta
  - mistralai/mistral-7b-instruct:free — компактная и быстрая

Получить ключ: https://openrouter.ai/ → Sign In → Keys
"""
import httpx
from services.ai.base_provider import BaseTextProvider
from config import OPENROUTER_API_KEY, OPENROUTER_MODEL
from logger import get_logger

log = get_logger("openrouter")

API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Бесплатная модель по умолчанию
DEFAULT_MODEL = "google/gemma-3-27b-it:free"


class OpenRouterProvider(BaseTextProvider):
    """
    Провайдер OpenRouter — бесплатный доступ к множеству LLM.
    Модель задаётся через OPENROUTER_MODEL в .env.
    """

    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 2000,
        temperature: float = 0.7,
        image_data_url: str | None = None,
    ) -> str:
        model = OPENROUTER_MODEL or DEFAULT_MODEL
        log.debug("OpenRouter: модель=%s, max_tokens=%d", model, max_tokens)

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        headers = {
            "Authorization":  f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type":   "application/json",
            # OpenRouter рекомендует передавать имя приложения
            "X-Title":        "CardGen Marketplace App",
        }

        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(API_URL, json=payload, headers=headers)

        if resp.status_code == 429:
            raise RuntimeError(
                "OpenRouter: превышен лимит запросов. "
                "Бесплатные модели имеют ограничения — подождите немного."
            )
        if resp.status_code == 402:
            raise RuntimeError(
                "OpenRouter: недостаточно кредитов. "
                f"Убедитесь что модель '{model}' действительно бесплатна (:free суффикс)."
            )

        resp.raise_for_status()
        data = resp.json()

        # Проверяем на ошибку в теле ответа (OpenRouter иногда возвращает 200 с error)
        if "error" in data:
            raise RuntimeError(f"OpenRouter error: {data['error'].get('message', data['error'])}")

        content = data["choices"][0]["message"]["content"]
        log.debug(
            "OpenRouter: получено %d символов, модель=%s",
            len(content),
            data.get("model", model),
        )
        return content.strip()
