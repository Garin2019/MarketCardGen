import os
import uuid
from io import BytesIO
from PIL import Image, ImageOps
from services.ai.provider_factory import get_image_provider
from config import UPLOAD_DIR
from logger import get_logger

log = get_logger("image_service")


def save_uploaded_image(
    product_id: int,
    image_bytes: bytes,
    width: int = 900,
    height: int = 1200,
) -> str:
    """
    Сохраняет пользовательское изображение в формате карточки 3:4.
    Возвращает путь к файлу.
    """
    fitted_bytes = _fit_image_to_card_format(image_bytes, width=width, height=height)

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"img_{product_id}_{uuid.uuid4().hex}.png"
    path = os.path.join(UPLOAD_DIR, filename)

    with open(path, "wb") as f:
        f.write(fitted_bytes)
    log.info("Загруженное изображение сохранено: %s (%d байт)", path, len(fitted_bytes))
    return path


async def generate_and_save_image(
    provider_name: str,
    product_id: int,
    prompt: str,
    width: int = 900,
    height: int = 1200,
    reference_base64: str | None = None,
    reference_url: str | None = None,
) -> str:
    """
    Вызывает провайдер, сохраняет результат в UPLOAD_DIR.
    Возвращает путь к файлу.
    """
    provider = get_image_provider(provider_name)

    log.info("Запрос генерации изображения: provider=%s product_id=%d", provider_name, product_id)
    image_bytes = await provider.generate_image(
        prompt=prompt,
        image_base64=reference_base64,
        reference_url=reference_url,
        width=width,
        height=height,
    )
    return save_uploaded_image(
        product_id=product_id,
        image_bytes=image_bytes,
        width=width,
        height=height,
    )


def _fit_image_to_card_format(image_bytes: bytes, width: int = 900, height: int = 1200) -> bytes:
    with Image.open(BytesIO(image_bytes)) as source:
        working = source.convert("RGB")
        fitted = ImageOps.fit(
            working,
            (width, height),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        output = BytesIO()
        fitted.save(output, format="PNG", optimize=True)
        return output.getvalue()


def image_to_dict(img) -> dict:
    """Преобразует объект GeneratedImage в словарь для API-ответа."""
    return {
        "id":         img.id,
        "product_id": img.product_id,
        "image_path": img.image_path,
        "image_url":  f"/uploads/{os.path.basename(img.image_path)}",
        "prompt":     img.prompt,
        "template_id": img.template_id,
        "sort_order": img.sort_order,
        "created_at": img.created_at.isoformat(),
    }
