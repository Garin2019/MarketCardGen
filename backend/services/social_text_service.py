"""
Генерация текста поста для соцсетей через AI-провайдера.
"""
from services.ai.provider_factory import get_text_provider
from logger import get_logger

log = get_logger("social_text_service")

TONE_MAP = {
    "formal":    "официальный, деловой",
    "expert":    "экспертный, профессиональный",
    "emotional": "эмоциональный, вдохновляющий",
    "friendly":  "дружелюбный, разговорный",
}


async def generate_post_text(
    provider_name: str,
    platform: str,
    product_name: str,
    category: str,
    short_description: str,
    long_description: str,
    keywords: list[str],
    tone: str,
    post_size: int,
    use_emoji: bool,
    extra_requirements: str = "",
    extra_hashtags: list[str] | None = None,
) -> dict:
    """
    Генерирует текст поста и список хэштегов.
    Возвращает {"text": "...", "hashtags": [...]}
    """
    provider       = get_text_provider(provider_name)
    tone_desc      = TONE_MAP.get(tone, "дружелюбный")
    kw_str         = ", ".join(keywords) if keywords else "не указаны"
    emoji_note     = "Используй эмодзи для привлечения внимания." if use_emoji else "Без эмодзи."
    hashtags_note  = f"Включи хэштеги: {', '.join(extra_hashtags)}." if extra_hashtags else "Предложи подходящие хэштеги."
    extra_req_line = f"Дополнительные требования: {extra_requirements}\n" if extra_requirements else ""

    system_prompt = (
        f"Ты — SMM-копирайтер. Пишешь посты для социальной сети "
        f"в стиле: {tone_desc}. {emoji_note} "
        f"Допускается аккуратное использование только базовых HTML-тегов <b> и <i> внутри текста. "
        f"Не используй длинное тире — используй только обычный дефис. "
        f"Отвечай строго в формате JSON без markdown-обёртки: "
        f'{{ "text": "<текст поста>", "hashtags": ["#тег1", "#тег2"] }}'
    )

    user_prompt = (
        f"Напиши пост о товаре.\n"
        f"Категория товара: {category or 'не указана'}\n"
        f"Краткое описание: {short_description or 'не указано'}\n"
        f"Полное описание: {long_description or 'не указано'}\n"
        f"Ключевые слова: {kw_str}\n"
        f"Желаемая длина поста: около {post_size} слов.\n"
        f"{extra_req_line}"
        f"{hashtags_note}"
    )

    log.info("Генерация текста поста: provider=%s platform=%s size=%d", provider_name, platform, post_size)
    raw = await provider.generate_text(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=max(post_size * 2, 1000),
    )

    import json, re
    cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
    try:
        result = json.loads(cleaned)
        return {
            "text":     result.get("text", "").strip(),
            "hashtags": result.get("hashtags", []),
        }
    except json.JSONDecodeError:
        return {"text": cleaned, "hashtags": []}
