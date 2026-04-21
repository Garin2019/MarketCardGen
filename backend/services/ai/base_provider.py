from abc import ABC, abstractmethod


class BaseTextProvider(ABC):
    """Абстрактный провайдер для генерации текста."""

    @abstractmethod
    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 2000,
        temperature: float = 0.7,
        image_data_url: str | None = None,
    ) -> str:
        """Сгенерировать текст. Возвращает строку."""
        ...


class BaseImageProvider(ABC):
    """Абстрактный провайдер для генерации изображений."""

    @abstractmethod
    async def generate_image(
        self,
        prompt: str,
        image_base64: str | None = None,
        reference_url: str | None = None,
        width: int = 1024,
        height: int = 1024,
    ) -> bytes:
        """Сгенерировать изображение. Возвращает байты PNG/JPG."""
        ...
