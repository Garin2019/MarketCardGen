import json
import datetime
import base64
import mimetypes
from datetime import timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlmodel import Session
from models import Product
from database import get_session
from services.text_service import generate_descriptions
from utils.image_analysis import describe_product_photo
from validators.marketplace_validator import validate_product_texts
from utils.db_helpers import get_setting, increment_setting_counter
from logger import get_logger

log = get_logger("text_generation")

router = APIRouter(prefix="/api/text", tags=["text"])


VISION_TEXT_PROVIDERS = {"openai", "qwen"}


def _build_image_data_url(path: str) -> str:
    mime_type, _ = mimetypes.guess_type(path)
    if not mime_type:
        mime_type = "image/jpeg"
    with open(path, "rb") as image_file:
        encoded = base64.b64encode(image_file.read()).decode()
    return f"data:{mime_type};base64,{encoded}"


class GenerateTextRequest(BaseModel):
    product_id:         int
    category:           Optional[str]       = None
    tone:               Optional[str]       = None
    keywords:           Optional[List[str]] = None
    short_length:       Optional[int]       = None
    long_length:        Optional[int]       = None
    temperature:        Optional[float]     = 0.7
    extra_requirements: Optional[str]       = ""
    provider:           Optional[str]       = None


@router.post("/generate")
async def generate_text(
    body: GenerateTextRequest,
    session: Session = Depends(get_session),
):
    product = session.get(Product, body.product_id)
    if not product:
        raise HTTPException(404, f"Продукт {body.product_id} не найден")
    if not product.photo_path:
        raise HTTPException(400, "Сначала загрузите фото товара")

    tone            = body.tone            or product.tone            or get_setting("default_tone", "expert")
    category        = body.category        or product.category        or ""
    keywords        = body.keywords        or json.loads(product.keywords or "[]")
    short_length    = body.short_length    or int(get_setting("default_short_length", "100"))
    long_length     = body.long_length     or int(get_setting("default_long_length", "1000"))
    temperature     = body.temperature if body.temperature is not None else float(get_setting("default_text_temperature", "0.7"))
    provider        = body.provider        or get_setting("default_text_provider", "qwen")
    temperature     = max(0.0, min(temperature, 1.0))
    try:
        image_description = describe_product_photo(product.photo_path)
    except Exception as e:
        image_description = None
        log.warning("Не удалось извлечь локальное описание фото product_id=%d: %s", body.product_id, e)

    try:
        image_data_url = _build_image_data_url(product.photo_path) if provider in VISION_TEXT_PROVIDERS else None
    except Exception as e:
        log.error("Ошибка чтения фото для мультимодальной генерации product_id=%d: %s", body.product_id, e, exc_info=True)
        raise HTTPException(400, "Не удалось подготовить фото товара для генерации текста")

    log.info(
        "Генерация текста product_id=%d provider=%s temperature=%.2f multimodal=%s",
        body.product_id,
        provider,
        temperature,
        bool(image_data_url),
    )
    try:
        result = await generate_descriptions(
            provider_name=provider,
            tone=tone,
            category=category,
            keywords=keywords,
            short_length=short_length,
            long_length=long_length,
            temperature=temperature,
            extra_requirements=body.extra_requirements or "",
            image_description=image_description,
            image_data_url=image_data_url,
        )
    except Exception as e:
        log.error("Ошибка генерации текста product_id=%d provider=%s: %s", body.product_id, provider, e, exc_info=True)
        raise HTTPException(502, f"Ошибка провайдера ИИ ({provider}): {str(e)}")

    # Автосохранение в продукт
    product.short_description = result["short"]
    product.long_description  = result["long"]
    product.tone               = tone
    product.category           = category
    product.keywords           = json.dumps(keywords, ensure_ascii=False)
    product.extra_requirements = body.extra_requirements or ""
    product.updated_at         = datetime.datetime.now(timezone.utc)
    session.add(product)
    increment_setting_counter("generation_count_text", session=session)
    session.commit()

    log.info("Текст сгенерирован product_id=%d short=%d симв long=%d симв", body.product_id, len(result["short"]), len(result["long"]))
    validation = validate_product_texts(result["short"], result["long"], "")

    return {
        "short":      result["short"],
        "long":       result["long"],
        "validation": validation,
        "provider":   provider,
        "temperature": temperature,
        "image_context": image_description,
    }


class ValidateTextRequest(BaseModel):
    short: Optional[str] = ""
    long:  Optional[str] = ""


@router.post("/validate")
def validate_text(body: ValidateTextRequest):
    return validate_product_texts(
        short=body.short or "",
        long=body.long  or "",
        context="",
    )
