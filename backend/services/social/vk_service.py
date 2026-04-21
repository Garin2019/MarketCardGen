"""
VK Wall API — публикация поста от имени сообщества.
Токен: Управление сообществом → Работа с API.
"""
import httpx
from config import VK_ACCESS_TOKEN, VK_OWNER_ID
from logger import get_logger

log = get_logger("vk_service")

VK_API = "https://api.vk.com/method"
VK_VER = "5.199"


def _group_id() -> str:
    return VK_OWNER_ID.lstrip("-")


async def _api(method: str, params: dict) -> dict:
    log.info("VK API request: method=%s params=%s", method, sorted(params.keys()))
    params.update({"access_token": VK_ACCESS_TOKEN, "v": VK_VER})
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{VK_API}/{method}", data=params)
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            log.error("VK API error: method=%s error=%s", method, data["error"])
            raise RuntimeError(f"VK API error {data['error']['error_code']}: {data['error']['error_msg']}")
        log.info("VK API success: method=%s", method)
        return data.get("response", {})


async def _upload_photo(image_path: str) -> str:
    """Загружает одно изображение на стену VK и возвращает attachment-строку."""
    log.info("VK photo upload start: path=%s", image_path)

    # 1. Получаем URL для загрузки
    log.info("VK photo upload step 1/3: request upload server")
    upload_info = await _api("photos.getWallUploadServer", {"group_id": _group_id()})
    upload_url  = upload_info["upload_url"]
    log.info("VK photo upload server received: path=%s", image_path)

    # 2. Загружаем файл
    log.info("VK photo upload step 2/3: upload file")
    async with httpx.AsyncClient(timeout=60) as client:
        with open(image_path, "rb") as f:
            resp = await client.post(upload_url, files={"photo": f})
        resp.raise_for_status()
        up = resp.json()
    log.info("VK photo uploaded to temp server: path=%s server=%s", image_path, up.get("server"))

    # 3. Сохраняем фото
    log.info("VK photo upload step 3/3: saveWallPhoto")
    saved = await _api("photos.saveWallPhoto", {
        "group_id": _group_id(),
        "photo":    up["photo"],
        "server":   up["server"],
        "hash":     up["hash"],
    })
    photo = saved[0]
    log.info("VK photo saved: path=%s owner_id=%s photo_id=%s", image_path, photo["owner_id"], photo["id"])
    return f"photo{photo['owner_id']}_{photo['id']}"


def _is_group_auth_upload_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "group authorization failed" in message and "unavailable with group auth" in message


async def publish(
    text: str,
    image_paths: list[str] | None = None,
    include_images: bool = True,
) -> str:
    """
    Публикует пост на стене сообщества.
    Возвращает URL опубликованного поста.
    """
    effective_images = image_paths if include_images else []
    log.info(
        "VK publish start: owner_id=%s group_id=%s text_length=%d images=%d include_images=%s",
        VK_OWNER_ID,
        _group_id(),
        len(text or ""),
        len(effective_images or []),
        include_images,
    )
    attachments = []
    attachment_errors = []
    attachment_exceptions: list[Exception] = []
    for path in (effective_images or [])[:10]:   # VK позволяет до 10 фото
        try:
            att = await _upload_photo(path)
            attachments.append(att)
        except Exception as exc:
            attachment_errors.append(f"{path}: {exc}")
            attachment_exceptions.append(exc)
            log.warning("Не удалось загрузить изображение в VK: path=%s error=%s", path, exc)

    if effective_images and not attachments:
        if attachment_exceptions and all(_is_group_auth_upload_error(exc) for exc in attachment_exceptions):
            log.warning(
                "VK image upload is unavailable for the current community token. "
                "Post will be published without attachments. errors=%s",
                attachment_errors,
            )
        else:
            raise RuntimeError(
                "Не удалось загрузить изображения в VK. "
                + "; ".join(attachment_errors[:3])
            )

    params: dict = {
        "owner_id": VK_OWNER_ID,
        "message":  text,
        "from_group": 1,
    }
    if attachments:
        params["attachments"] = ",".join(attachments)

    log.info("VK wall.post start: attachments=%d", len(attachments))
    result  = await _api("wall.post", params)
    post_id = result["post_id"]
    if attachment_errors:
        log.warning("VK post published with skipped images: post_id=%s errors=%s", post_id, attachment_errors)
    log.info("VK publish success: post_id=%s attachments=%d", post_id, len(attachments))
    group_id = _group_id()
    return f"https://vk.com/wall-{group_id}_{post_id}"
