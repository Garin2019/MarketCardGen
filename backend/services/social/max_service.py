"""
MAX (социальная сеть от VK/МТС) — публикация в канал через REST API.
Документация: https://dev.max.ru/
"""
import httpx
from config import MAX_ACCESS_TOKEN, MAX_CHANNEL_ID
from logger import get_logger

log = get_logger("max_service")

MAX_API = "https://api.max.ru/v1"


async def _api(method: str, payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{MAX_API}/{method}",
            json=payload,
            headers={
                "Authorization": f"Bearer {MAX_ACCESS_TOKEN}",
                "Content-Type":  "application/json",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def _upload_photo(image_path: str) -> str | None:
    """Загружает фото через MAX Media API и возвращает media_id."""
    async with httpx.AsyncClient(timeout=60) as client:
        with open(image_path, "rb") as f:
            resp = await client.post(
                f"{MAX_API}/media/upload",
                files={"file": ("photo.jpg", f, "image/jpeg")},
                headers={"Authorization": f"Bearer {MAX_ACCESS_TOKEN}"},
            )
        if resp.status_code != 200:
            return None
        data = resp.json()
        return data.get("media_id")


async def publish(text: str, image_paths: list[str] | None = None) -> str:
    """
    Публикует пост в канал MAX.
    Возвращает URL опубликованного поста.
    """
    attachments = []
    for path in (image_paths or [])[:10]:
        media_id = await _upload_photo(path)
        if media_id:
            attachments.append({"type": "image", "media_id": media_id})

    payload: dict = {
        "channel_id": MAX_CHANNEL_ID,
        "text":        text,
    }
    if attachments:
        payload["attachments"] = attachments

    result  = await _api("posts/create", payload)
    post_id = result.get("post_id", "")
    log.info("MAX пост опубликован: post_id=%s channel=%s", post_id, MAX_CHANNEL_ID)
    return f"https://max.ru/channel/{MAX_CHANNEL_ID}/post/{post_id}"
