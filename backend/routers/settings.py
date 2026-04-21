import datetime
import os
import shutil
from pathlib import Path
from datetime import timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict
from sqlmodel import Session, select
from models import AppSetting
from database import get_session
from config import (
    EDITOR_URL,
    OPENAI_API_KEY,
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL,
    DASHSCOPE_API_KEY,
    MINIMAX_API_KEY,
    VK_ACCESS_TOKEN,
    VK_OWNER_ID,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID,
    MAX_ACCESS_TOKEN,
    MAX_CHANNEL_ID,
    UPLOAD_DIR,
)
from logger import get_logger

log = get_logger("settings")

router = APIRouter(prefix="/api/settings", tags=["settings"])

ALLOWED_TEXT_PROVIDERS = {"qwen", "minimax", "openai", "openrouter"}
ALLOWED_IMAGE_PROVIDERS = {"qwen", "minimax", "openai"}
ALLOWED_TONES = {"formal", "expert", "emotional", "friendly"}


class SettingsUpdateRequest(BaseModel):
    settings: Dict[str, str]


def _get_uploads_stats() -> dict:
    uploads_path = Path(UPLOAD_DIR).resolve()
    uploads_path.mkdir(parents=True, exist_ok=True)

    files_count = 0
    total_size_bytes = 0

    for root, _, files in os.walk(uploads_path):
        for filename in files:
            file_path = Path(root) / filename
            try:
                stat = file_path.stat()
            except OSError:
                continue
            files_count += 1
            total_size_bytes += stat.st_size

    return {
        "path": UPLOAD_DIR,
        "absolute_path": str(uploads_path),
        "files_count": files_count,
        "total_size_bytes": total_size_bytes,
    }


@router.get("")
def get_settings(session: Session = Depends(get_session)):
    rows = session.exec(select(AppSetting)).all()
    settings = {row.key: row.value for row in rows}

    if not settings.get("editor_url") and EDITOR_URL:
        settings["editor_url"] = EDITOR_URL
    if not settings.get("openrouter_model") and OPENROUTER_MODEL:
        settings["openrouter_model"] = OPENROUTER_MODEL

    env_status = {
        "openai": bool(OPENAI_API_KEY),
        "openrouter": bool(OPENROUTER_API_KEY),
        "qwen": bool(DASHSCOPE_API_KEY),
        "minimax": bool(MINIMAX_API_KEY),
        "vk": bool(VK_ACCESS_TOKEN and VK_OWNER_ID),
        "telegram": bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID),
        "max": bool(MAX_ACCESS_TOKEN and MAX_CHANNEL_ID),
    }
    return {
        "settings": settings,
        "env_status": env_status,
        "uploads": _get_uploads_stats(),
        "generation_stats": {
            "text": int(settings.get("generation_count_text", "0") or 0),
            "images": int(settings.get("generation_count_images", "0") or 0),
            "posts": int(settings.get("generation_count_posts", "0") or 0),
        },
    }


@router.put("")
def update_settings(body: SettingsUpdateRequest, session: Session = Depends(get_session)):
    now = datetime.datetime.now(timezone.utc)
    updated = []
    try:
        for key, value in body.settings.items():
            _validate_setting(key, value)
    except ValueError as e:
        raise HTTPException(400, str(e))

    for key, value in body.settings.items():
        row = session.exec(select(AppSetting).where(AppSetting.key == key)).first()
        if row:
            row.value      = value
            row.updated_at = now
            session.add(row)
        else:
            session.add(AppSetting(key=key, value=value, updated_at=now))
        updated.append(key)
    session.commit()
    log.info("Настройки обновлены: %s", updated)
    return {"updated": updated}


@router.delete("/uploads")
def clear_uploads_folder():
    uploads_path = Path(UPLOAD_DIR).resolve()
    uploads_path.mkdir(parents=True, exist_ok=True)

    deleted_files = 0
    deleted_dirs = 0

    for entry in uploads_path.iterdir():
        try:
            if entry.is_file() or entry.is_symlink():
                entry.unlink()
                deleted_files += 1
            elif entry.is_dir():
                shutil.rmtree(entry)
                deleted_dirs += 1
        except OSError as exc:
            log.error("Не удалось удалить элемент из uploads: %s error=%s", entry, exc, exc_info=True)
            raise HTTPException(500, f"Не удалось очистить папку uploads: {entry.name}") from exc

    stats = _get_uploads_stats()
    log.warning(
        "Папка uploads очищена: path=%s deleted_files=%d deleted_dirs=%d",
        uploads_path,
        deleted_files,
        deleted_dirs,
    )
    return {
        "deleted_files": deleted_files,
        "deleted_dirs": deleted_dirs,
        "uploads": stats,
    }


def _validate_setting(key: str, value: str):
    if key == "default_text_provider" and value not in ALLOWED_TEXT_PROVIDERS:
        raise ValueError(f"Недопустимый текстовый провайдер: {value}")
    if key == "default_image_provider" and value not in ALLOWED_IMAGE_PROVIDERS:
        raise ValueError(f"Недопустимый провайдер изображений: {value}")
    if key in {"default_tone", "default_post_tone"} and value not in ALLOWED_TONES:
        raise ValueError(f"Недопустимая тональность: {value}")
    if key in {"default_short_length", "default_long_length", "default_post_size"}:
        try:
            parsed = int(value)
        except ValueError as exc:
            raise ValueError(f"Настройка {key} должна быть числом") from exc
        if parsed <= 0:
            raise ValueError(f"Настройка {key} должна быть больше нуля")
    if key == "default_text_temperature":
        try:
            parsed = float(value)
        except ValueError as exc:
            raise ValueError("Настройка default_text_temperature должна быть числом") from exc
        if parsed < 0 or parsed > 1:
            raise ValueError("Настройка default_text_temperature должна быть в диапазоне от 0 до 1")
    if key == "product_categories":
        categories = [item.strip() for item in value.splitlines() if item.strip()]
        if not categories:
            raise ValueError("Список категорий товара не может быть пустым")
