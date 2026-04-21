import os
import uuid
import datetime
from datetime import timezone
import json
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlmodel import Session
from models import Product
from database import get_session
from config import UPLOAD_DIR
from validators.marketplace_validator import get_limits
from utils.db_helpers import get_setting
from logger import get_logger

log = get_logger("products")

router = APIRouter(prefix="/api/products", tags=["products"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _product_to_dict(p: Product) -> dict:
    return {
        "id":                      p.id,
        "photo_path":              p.photo_path,
        "photo_url":               f"/uploads/{os.path.basename(p.photo_path)}" if p.photo_path else None,
        "reference_path":          p.reference_path,
        "reference_url":           f"/uploads/{os.path.basename(p.reference_path)}" if p.reference_path else None,
        "article":                 p.article,
        "category":                p.category,
        "tone":                    p.tone,
        "keywords":                json.loads(p.keywords or "[]"),
        "extra_requirements":      p.extra_requirements,
        "short_description":       p.short_description,
        "long_description":        p.long_description,
        "short_description_limit": p.short_description_limit,
        "long_description_limit":  p.long_description_limit,
        "created_at":              p.created_at.isoformat(),
        "updated_at":              p.updated_at.isoformat(),
    }


async def _save_upload(file: UploadFile, prefix: str) -> str:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext      = os.path.splitext(file.filename or "")[-1] or ".jpg"
    filename = f"{prefix}_{uuid.uuid4().hex}{ext}"
    path     = os.path.join(UPLOAD_DIR, filename)
    content  = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    return path


def _delete_file_if_exists(path: Optional[str]):
    if path and os.path.isfile(path):
        try:
            os.remove(path)
        except OSError:
            pass


# ── POST /api/products ────────────────────────────────────────────────────────

class CreateProductRequest(BaseModel):
    category: Optional[str] = None


@router.post("", status_code=201)
def create_product(
    body: CreateProductRequest = CreateProductRequest(),
    session: Session = Depends(get_session),
):
    limits      = get_limits()
    now         = datetime.datetime.now(timezone.utc)
    product = Product(
        category=body.category,
        tone=get_setting("default_tone", "expert"),
        short_description_limit=limits["short"],
        long_description_limit=limits["long"],
        created_at=now,
        updated_at=now,
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    log.info("Создан продукт id=%d", product.id)
    return _product_to_dict(product)


# ── POST /api/products/upload-photo ──────────────────────────────────────────

@router.post("/upload-photo")
async def upload_photo(
    product_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Неподдерживаемый тип: {file.content_type}. Разрешены JPEG/PNG/WEBP")
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(404, f"Продукт {product_id} не найден")

    _delete_file_if_exists(product.photo_path)

    path = await _save_upload(file, f"photo_{product_id}")
    product.photo_path = path
    product.updated_at = datetime.datetime.now(timezone.utc)
    session.add(product)
    session.commit()
    session.refresh(product)
    log.info("Фото загружено product_id=%d path=%s", product_id, path)
    return _product_to_dict(product)


# ── POST /api/products/upload-reference ──────────────────────────────────────

@router.post("/upload-reference")
async def upload_reference(
    product_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Неподдерживаемый тип: {file.content_type}")
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(404, f"Продукт {product_id} не найден")

    _delete_file_if_exists(product.reference_path)

    path = await _save_upload(file, f"ref_{product_id}")
    product.reference_path = path
    product.updated_at     = datetime.datetime.now(timezone.utc)
    session.add(product)
    session.commit()
    session.refresh(product)
    log.info("Референс загружен product_id=%d path=%s", product_id, path)
    return _product_to_dict(product)


# ── GET /api/products/{id} ────────────────────────────────────────────────────

@router.get("/{product_id}")
def get_product(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(404, f"Продукт {product_id} не найден")
    return _product_to_dict(product)


# ── PUT /api/products/{id} ────────────────────────────────────────────────────

class UpdateProductRequest(BaseModel):
    article:           Optional[str]       = None
    category:          Optional[str]       = None
    tone:              Optional[str]       = None
    keywords:          Optional[List[str]] = None
    extra_requirements: Optional[str]      = None
    short_description: Optional[str]       = None
    long_description:  Optional[str]       = None


@router.put("/{product_id}")
def update_product(
    product_id: int,
    body: UpdateProductRequest,
    session: Session = Depends(get_session),
):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(404, f"Продукт {product_id} не найден")

    for field in ("article", "category", "tone", "extra_requirements", "short_description", "long_description"):
        val = getattr(body, field)
        if val is not None:
            setattr(product, field, val)

    if body.keywords is not None:
        product.keywords = json.dumps(body.keywords, ensure_ascii=False)

    product.updated_at = datetime.datetime.now(timezone.utc)
    session.add(product)
    session.commit()
    session.refresh(product)
    return _product_to_dict(product)
