from services.ai.base_provider import BaseTextProvider, BaseImageProvider
from services.ai.qwen_provider import QwenTextProvider, QwenImageProvider
from services.ai.minimax_provider import MiniMaxTextProvider, MiniMaxImageProvider
from services.ai.openai_provider import OpenAITextProvider, OpenAIImageProvider
from services.ai.openrouter_provider import OpenRouterProvider

TEXT_PROVIDERS: dict[str, type[BaseTextProvider]] = {
    "qwen":        QwenTextProvider,
    "minimax":     MiniMaxTextProvider,
    "openai":      OpenAITextProvider,
    "openrouter":  OpenRouterProvider,
}

IMAGE_PROVIDERS: dict[str, type[BaseImageProvider]] = {
    "qwen":      QwenImageProvider,
    "minimax":    MiniMaxImageProvider,
    "openai":     OpenAIImageProvider,
}


def get_text_provider(name: str) -> BaseTextProvider:
    cls = TEXT_PROVIDERS.get(name.lower())
    if cls is None:
        raise ValueError(f"Неизвестный текстовый провайдер: '{name}'. "
                         f"Доступны: {list(TEXT_PROVIDERS)}")
    return cls()


def get_image_provider(name: str) -> BaseImageProvider:
    cls = IMAGE_PROVIDERS.get(name.lower())
    if cls is None:
        raise ValueError(f"Неизвестный провайдер изображений: '{name}'. "
                         f"Доступны: {list(IMAGE_PROVIDERS)}")
    return cls()
