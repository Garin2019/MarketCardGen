import os
import datetime
from datetime import timezone
import base64
import json
import io
import zipfile
import mimetypes
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List
from sqlmodel import Session, select, func
from models import Product, GeneratedImage
from database import get_session
from services.image_service import generate_and_save_image, image_to_dict, save_uploaded_image
from utils.db_helpers import get_setting, increment_setting_counter
from config import PUBLIC_BASE_URL
from logger import get_logger

log = get_logger("image_generation")

router = APIRouter(prefix="/api/images", tags=["images"])

MAX_IMAGES_PER_PRODUCT = 12
ALLOWED_UPLOAD_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _get_effective_reference_path(product: Product) -> str | None:
    for path in (product.reference_path, product.photo_path):
        if path and os.path.isfile(path):
            return path
    return None


def _load_reference_b64(product: Product) -> str | None:
    reference_path = _get_effective_reference_path(product)
    if not reference_path:
        return None
    with open(reference_path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def _load_reference_data_url(product: Product) -> str | None:
    reference_path = _get_effective_reference_path(product)
    if not reference_path:
        return None
    mime_type, _ = mimetypes.guess_type(reference_path)
    if not mime_type:
        mime_type = "image/png"
    with open(reference_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode()
    return f"data:{mime_type};base64,{encoded}"


def _build_reference_url(product: Product) -> str | None:
    reference_path = _get_effective_reference_path(product)
    if not reference_path:
        return None
    if not PUBLIC_BASE_URL:
        return None
    return f"{PUBLIC_BASE_URL.rstrip('/')}/uploads/{os.path.basename(reference_path)}"


def _build_effective_prompt(product: Product, prompt: str) -> str:
    keywords = []
    if product.keywords:
        try:
            keywords = json.loads(product.keywords)
        except Exception:
            keywords = []

    context_lines = []
    if product.short_description:
        context_lines.append(f"Краткое описание товара: {product.short_description.strip()}")
    if keywords:
        context_lines.append(f"Ключевые слова: {', '.join(keywords)}")
    if product.extra_requirements:
        context_lines.append(f"Дополнительные требования: {product.extra_requirements.strip()}")

    if not context_lines:
        return prompt

    return (
        f"{prompt.strip()}\n\n"
        f"Контекст товара для точной генерации:\n"
        + "\n".join(f"- {line}" for line in context_lines)
        + "\n- Не добавляй детали, которых нет в описании товара."
    )


def _next_sort_order(session: Session, product_id: int) -> int:
    last_image = session.exec(
        select(GeneratedImage)
        .where(GeneratedImage.product_id == product_id)
        .order_by(GeneratedImage.sort_order.desc())
    ).first()
    return (last_image.sort_order + 1) if last_image else 1


# ── POST /api/images/generate ─────────────────────────────────────────────────

class GenerateImageRequest(BaseModel):
    product_id:  int
    prompt:      str
    template_id: Optional[int] = None
    provider:    Optional[str] = None
    sort_order:  Optional[int] = None


@router.post("/generate", status_code=201)
async def generate_image(
    body: GenerateImageRequest,
    session: Session = Depends(get_session),
):
    product = session.get(Product, body.product_id)
    if not product:
        raise HTTPException(404, f"Продукт {body.product_id} не найден")
    if not _get_effective_reference_path(product):
        raise HTTPException(400, "Сначала загрузите фото товара или отдельный референс для генерации изображения")

    existing_count = session.exec(
        select(func.count(GeneratedImage.id)).where(GeneratedImage.product_id == body.product_id)
    ).one()

    if existing_count >= MAX_IMAGES_PER_PRODUCT:
        raise HTTPException(400, f"Достигнут лимит изображений ({MAX_IMAGES_PER_PRODUCT})")

    provider = body.provider or get_setting("default_image_provider", "openai")

    if body.sort_order is not None:
        sort_order = body.sort_order
    else:
        imgs = session.exec(
            select(GeneratedImage)
            .where(GeneratedImage.product_id == body.product_id)
            .order_by(GeneratedImage.sort_order.desc())
        ).first()
        sort_order = (imgs.sort_order + 1) if imgs else 1

    reference_b64 = _load_reference_data_url(product)
    reference_url = _build_reference_url(product)
    if provider == "qwen" and not reference_url:
        reference_url = _load_reference_data_url(product)

    log.info("Генерация изображения product_id=%d provider=%s sort_order=%d", body.product_id, provider, sort_order)
    try:
        effective_prompt = _build_effective_prompt(product, body.prompt)
        path = await generate_and_save_image(
            provider_name=provider,
            product_id=body.product_id,
            prompt=effective_prompt,
            reference_base64=reference_b64,
            reference_url=reference_url,
        )
    except Exception as e:
        log.error("Ошибка генерации изображения product_id=%d provider=%s: %s", body.product_id, provider, e, exc_info=True)
        raise HTTPException(502, f"Ошибка провайдера ИИ ({provider}): {str(e)}")

    img = GeneratedImage(
        product_id=body.product_id,
        image_path=path,
        prompt=body.prompt,
        template_id=body.template_id,
        sort_order=sort_order,
        created_at=datetime.datetime.now(timezone.utc),
    )
    session.add(img)
    increment_setting_counter("generation_count_images", session=session)
    session.commit()
    session.refresh(img)
    log.info("Изображение сохранено id=%d product_id=%d path=%s", img.id, img.product_id, path)
    return image_to_dict(img)


# ── POST /api/images/upload ──────────────────────────────────────────────────

@router.post("/upload", status_code=201)
async def upload_images(
    product_id: int,
    files: List[UploadFile] = File(...),
    session: Session = Depends(get_session),
):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(404, f"Продукт {product_id} не найден")
    if not files:
        raise HTTPException(400, "Не выбраны файлы для загрузки")

    existing_count = session.exec(
        select(func.count(GeneratedImage.id)).where(GeneratedImage.product_id == product_id)
    ).one()
    available = MAX_IMAGES_PER_PRODUCT - existing_count
    if available <= 0:
        raise HTTPException(400, f"Достигнут лимит изображений ({MAX_IMAGES_PER_PRODUCT})")

    uploaded: list[dict] = []
    errors: list[dict] = []
    sort_order = _next_sort_order(session, product_id)

    for file in files[:available]:
        if file.content_type not in ALLOWED_UPLOAD_TYPES:
            errors.append({
                "filename": file.filename or "unknown",
                "error": "Разрешены только JPEG, PNG и WEBP",
            })
            continue

        try:
            content = await file.read()
            if not content:
                raise ValueError("Файл пустой")

            path = save_uploaded_image(product_id=product_id, image_bytes=content)
            img = GeneratedImage(
                product_id=product_id,
                image_path=path,
                prompt="Загружено пользователем на этапе публикации",
                template_id=None,
                sort_order=sort_order,
                created_at=datetime.datetime.now(timezone.utc),
            )
            sort_order += 1
            session.add(img)
            session.commit()
            session.refresh(img)
            uploaded.append(image_to_dict(img))
            log.info(
                "Пользовательское изображение загружено product_id=%d image_id=%d filename=%s",
                product_id,
                img.id,
                file.filename,
            )
        except Exception as exc:
            log.error(
                "Ошибка загрузки пользовательского изображения product_id=%d filename=%s: %s",
                product_id,
                file.filename,
                exc,
                exc_info=True,
            )
            errors.append({"filename": file.filename or "unknown", "error": str(exc)})
        finally:
            await file.close()

    if len(files) > available:
        errors.append({
            "filename": "limit",
            "error": f"Превышен лимит изображений. Загружено только {available} файлов",
        })

    return {"uploaded": uploaded, "errors": errors}


# ── POST /api/images/generate-batch ──────────────────────────────────────────

class BatchItem(BaseModel):
    prompt:      str
    template_id: Optional[int] = None
    sort_order:  Optional[int] = None


class GenerateBatchRequest(BaseModel):
    product_id: int
    items:      List[BatchItem]
    provider:   Optional[str] = None


@router.post("/generate-batch", status_code=201)
async def generate_batch(
    body: GenerateBatchRequest,
    session: Session = Depends(get_session),
):
    product = session.get(Product, body.product_id)
    if not product:
        raise HTTPException(404, f"Продукт {body.product_id} не найден")
    if not _get_effective_reference_path(product):
        raise HTTPException(400, "Сначала загрузите фото товара или отдельный референс для генерации изображения")

    existing_count = session.exec(
        select(func.count(GeneratedImage.id)).where(GeneratedImage.product_id == body.product_id)
    ).one()
    available = MAX_IMAGES_PER_PRODUCT - existing_count

    if available <= 0:
        raise HTTPException(400, f"Достигнут лимит изображений ({MAX_IMAGES_PER_PRODUCT})")

    items         = body.items[:available]
    provider      = body.provider or get_setting("default_image_provider", "openai")
    reference_b64 = _load_reference_data_url(product)
    reference_url = _build_reference_url(product)
    if provider == "qwen" and not reference_url:
        reference_url = _load_reference_data_url(product)

    results, errors = [], []
    base_order    = existing_count + 1

    for i, item in enumerate(items):
        sort_order = item.sort_order if item.sort_order is not None else base_order + i
        try:
            effective_prompt = _build_effective_prompt(product, item.prompt)
            path = await generate_and_save_image(
                provider_name=provider,
                product_id=body.product_id,
                prompt=effective_prompt,
                reference_base64=reference_b64,
                reference_url=reference_url,
            )
            img = GeneratedImage(
                product_id=body.product_id,
                image_path=path,
                prompt=item.prompt,
                template_id=item.template_id,
                sort_order=sort_order,
                created_at=datetime.datetime.now(timezone.utc),
            )
            session.add(img)
            increment_setting_counter("generation_count_images", session=session)
            session.commit()
            session.refresh(img)
            results.append(image_to_dict(img))
        except Exception as e:
            errors.append({"prompt": item.prompt, "error": str(e)})

    return {"generated": results, "errors": errors}


# ── GET /api/images/product/{id} ─────────────────────────────────────────────

@router.get("/product/{product_id}")
def get_product_images(
    product_id: int,
    session: Session = Depends(get_session),
):
    if not session.get(Product, product_id):
        raise HTTPException(404, f"Продукт {product_id} не найден")

    images = session.exec(
        select(GeneratedImage)
        .where(GeneratedImage.product_id == product_id)
        .order_by(GeneratedImage.sort_order)
    ).all()
    return {"images": [image_to_dict(img) for img in images]}


@router.get("/product/{product_id}/zip")
def download_product_images_zip(
    product_id: int,
    session: Session = Depends(get_session),
):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(404, f"Продукт {product_id} не найден")

    images = session.exec(
        select(GeneratedImage)
        .where(GeneratedImage.product_id == product_id)
        .order_by(GeneratedImage.sort_order)
    ).all()

    valid_images = [img for img in images if img.image_path and os.path.isfile(img.image_path)]
    if not valid_images:
        raise HTTPException(404, "Для товара пока нет сохранённых изображений")

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for index, img in enumerate(valid_images, start=1):
            ext = os.path.splitext(img.image_path)[1] or ".png"
            archive_name = f"product_{product_id}_image_{index:02d}{ext}"
            archive.write(img.image_path, arcname=archive_name)

    data = buffer.getvalue()
    filename = f"product_{product_id}_images.zip"
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── DELETE /api/images/{id} ───────────────────────────────────────────────────

@router.delete("/{image_id}", status_code=204)
def delete_image(
    image_id: int,
    session: Session = Depends(get_session),
):
    img = session.get(GeneratedImage, image_id)
    if not img:
        raise HTTPException(404, f"Изображение {image_id} не найдено")

    if img.image_path and os.path.isfile(img.image_path):
        try:
            os.remove(img.image_path)
        except OSError:
            pass

    session.delete(img)
    session.commit()
    log.info("Изображение удалено id=%d", image_id)


# ── PUT /api/images/{id}/reorder ─────────────────────────────────────────────

class ReorderRequest(BaseModel):
    sort_order: int


@router.put("/{image_id}/reorder")
def reorder_image(
    image_id: int,
    body: ReorderRequest,
    session: Session = Depends(get_session),
):
    img = session.get(GeneratedImage, image_id)
    if not img:
        raise HTTPException(404, f"Изображение {image_id} не найдено")

    img.sort_order = body.sort_order
    session.add(img)
    session.commit()
    session.refresh(img)
    return image_to_dict(img)
