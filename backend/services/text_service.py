from services.ai.provider_factory import get_text_provider
from logger import get_logger

log = get_logger("text_service")
from validators.marketplace_validator import get_limits

TONE_DESCRIPTIONS = {
    "formal":    "официальный, деловой, нейтральный",
    "expert":    "экспертный, профессиональный, технически грамотный",
    "emotional": "эмоциональный, яркий, вдохновляющий",
    "friendly":  "дружелюбный, разговорный, тёплый",
}

def _build_system_prompt(tone: str) -> str:
    tone_desc = TONE_DESCRIPTIONS.get(tone, TONE_DESCRIPTIONS["expert"])
    limits    = get_limits()

    return (
        f"Ты — профессиональный копирайтер для карточек товаров маркетплейсов."
        f"Пишешь в стиле: {tone_desc}. "
        f"Требования к текстам:\n"
        f"- Короткое описание: до {limits['short']} символов (включительно)\n"
        f"- Длинное описание: до {limits['long']} символов (включительно)\n"
        f"- Не используй длинное тире — используй только обычный дефис\n"
        f"- Отвечай строго в формате JSON без markdown-обёртки:\n"
        f'  {{"short": "<короткое описание>", "long": "<длинное описание>"}}'
    )


def _build_user_prompt(
    category: str,
    keywords: list[str],
    short_length: int,
    long_length: int,
    extra_requirements: str,
    image_description: str | None,
) -> str:
    kw_str = ", ".join(keywords) if keywords else "не указаны"
    img_str = f"{image_description}" if image_description else ""

    extra = f"\nУчти дополнительные требования к описанию: {extra_requirements}" if extra_requirements else ""

    return (
        f"Сгенерируй описание товара {category or 'определи самостоятельно категорию'} на фото {img_str} для карточки в маркетплейсе\n"
        f"Используй органично, без чрезмерного спама ключевые слова: {kw_str}\n"
        f"Желаемая длина короткого описания: около {short_length} символов\n"
        f"Желаемая длина длинного описания: около {long_length} символов"
        f"{extra}\n\n"
        f"Сгенерируй короткое и длинное описание товара. Не придумывай лишнее (комплектация, цена)."
    )


async def generate_descriptions(
    provider_name: str,
    tone: str,
    category: str,
    keywords: list[str],
    short_length: int,
    long_length: int,
    temperature: float = 0.7,
    extra_requirements: str = "",
    image_description: str | None = None,
    image_data_url: str | None = None,
) -> dict:
    """
    Вызывает AI-провайдер и возвращает
    {"short": "...", "long": "..."}
    """
    provider = get_text_provider(provider_name)

    system_prompt = _build_system_prompt(tone)
    user_prompt   = _build_user_prompt(
        category, keywords,
        short_length, long_length,
        extra_requirements, image_description,
    )

    log.debug("Запрос к провайдеру %s, max_tokens=%d", provider_name, max(short_length + long_length + 200, 2000))
    raw = await provider.generate_text(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=max(short_length + long_length + 200, 2000),
        temperature=temperature,
        image_data_url=image_data_url,
    )

    # Парсим JSON из ответа
    import json, re
    # Убираем возможные markdown-обёртки ```json ... ```
    cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback: возвращаем сырой текст как длинное описание
        result = {"short": "", "long": cleaned}

    short = result.get("short", "").strip()
    long  = result.get("long",  "").strip()
    log.debug("Ответ провайдера %s: short=%d симв, long=%d симв", provider_name, len(short), len(long))
    return {"short": short, "long": long}
