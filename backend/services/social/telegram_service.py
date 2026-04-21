"""
Telegram Bot API — публикация в канал.
Бот должен быть администратором канала.
"""
import asyncio
import json
import os
import re
import httpx
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID
from logger import get_logger

log = get_logger("telegram_service")

TG_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
TG_TARGET_CHAT = TELEGRAM_CHANNEL_ID
TG_MAX_TEXT = 3900
TG_MAX_CAPTION = 950

# Параметры retry для 429 Too Many Requests
_RETRY_ATTEMPTS = 3
_RETRY_DEFAULT_WAIT = 5  # секунд, если Telegram не вернул retry_after


def _masked_token(token: str) -> str:
    """Маскирует токен бота для безопасного логирования."""
    value = str(token or "").strip()
    if len(value) <= 8:
        return "<masked>"
    return f"{value[:4]}...{value[-4:]}"


def _masked_chat_id(chat_id: str) -> str:
    value = str(chat_id or "").strip()
    if len(value) <= 6:
        return value or "<empty>"
    return f"{value[:4]}...{value[-2:]}"


def _validate_config() -> None:
    token_present = bool(TELEGRAM_BOT_TOKEN)
    channel_present = bool(TG_TARGET_CHAT)
    log.info(
        "Telegram config check: token_present=%s channel_present=%s channel=%s",
        token_present,
        channel_present,
        _masked_chat_id(TG_TARGET_CHAT),
    )
    if not token_present:
        raise RuntimeError("Не задан TELEGRAM_BOT_TOKEN")
    if not channel_present:
        raise RuntimeError("Не задан TELEGRAM_CHANNEL_ID")


def _get_api_chat_id() -> str:
    """
    Возвращает chat_id в формате, который понимает Telegram Bot API.
    Поддерживаем:
    - @channel_username
    - -1001234567890
    - 1234567890  -> автоматически преобразуем в -1001234567890
    """
    value = str(TG_TARGET_CHAT or "").strip()
    if not value:
        return value
    if value.startswith("@") or value.startswith("-100"):
        return value
    if value.isdigit():
        return f"-100{value}"
    return value


async def _call(method: str, **kwargs) -> dict:
    payload_summary = {
        "chat_id": _masked_chat_id(kwargs.get("chat_id", "")),
        "keys": sorted(kwargs.keys()),
        "text_length": len(kwargs.get("text", "") or ""),
        "caption_length": len(kwargs.get("caption", "") or ""),
    }
    log.info("Telegram API request: method=%s payload=%s", method, payload_summary)

    for attempt in range(1, _RETRY_ATTEMPTS + 1):
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                resp = await client.post(f"{TG_API}/{method}", json=kwargs)
                log.info(
                    "Telegram API response: method=%s status=%s attempt=%d",
                    method, resp.status_code, attempt,
                )

                # Обрабатываем 429 до raise_for_status
                if resp.status_code == 429:
                    try:
                        retry_after = resp.json().get("parameters", {}).get("retry_after", _RETRY_DEFAULT_WAIT)
                    except Exception:
                        retry_after = _RETRY_DEFAULT_WAIT
                    log.warning(
                        "Telegram rate limit: method=%s attempt=%d retry_after=%s",
                        method, attempt, retry_after,
                    )
                    if attempt < _RETRY_ATTEMPTS:
                        await asyncio.sleep(retry_after)
                        continue
                    raise RuntimeError(f"Telegram rate limit exceeded after {_RETRY_ATTEMPTS} attempts")

                resp.raise_for_status()
                data = resp.json()

            except httpx.HTTPStatusError as exc:
                body = exc.response.text[:1000]
                log.error(
                    "Telegram HTTP status error: method=%s status=%s body=%s",
                    method,
                    exc.response.status_code,
                    body,
                )
                raise RuntimeError(f"Telegram HTTP error {exc.response.status_code}: {body}") from exc
            except httpx.HTTPError as exc:
                log.error("Telegram HTTP transport error: method=%s error=%s", method, exc)
                raise RuntimeError(f"Telegram transport error: {exc}") from exc

        if not data.get("ok"):
            log.error("Telegram API error: method=%s response=%s", method, data)
            raise RuntimeError(f"Telegram API error: {data.get('description', 'unknown')}")

        result = data["result"]
        result_type = type(result).__name__
        log.info("Telegram API success: method=%s result_type=%s", method, result_type)
        return result

    # Сюда попасть не должны, но на всякий случай
    raise RuntimeError(f"Telegram API: все {_RETRY_ATTEMPTS} попытки исчерпаны для метода {method}")


def _safe_truncate_html(text: str, limit: int) -> str:
    """
    Обрезает строку до `limit`, стараясь не рвать HTML-сущности и незавершённый хвост.
    """
    if len(text) <= limit:
        return text
    truncated = text[:limit]
    amp_pos = truncated.rfind("&")
    if amp_pos != -1 and ";" not in truncated[amp_pos:]:
        truncated = truncated[:amp_pos]
    return truncated


def _split_oversized_block(text: str, limit: int) -> list[str]:
    normalized = (text or "").strip()
    if not normalized:
        return []
    if len(normalized) <= limit:
        return [normalized]

    sentence_parts = re.split(r"(?<=[.!?])\s+", normalized)
    if len(sentence_parts) > 1:
        chunks: list[str] = []
        current = ""
        for sentence in sentence_parts:
            sentence = sentence.strip()
            if not sentence:
                continue
            candidate = sentence if not current else f"{current} {sentence}"
            if len(candidate) <= limit:
                current = candidate
                continue
            if current:
                chunks.append(current)
            if len(sentence) <= limit:
                current = sentence
            else:
                chunks.extend(_split_by_words(sentence, limit))
                current = ""
        if current:
            chunks.append(current)
        return chunks

    return _split_by_words(normalized, limit)


def _split_by_words(text: str, limit: int) -> list[str]:
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= limit:
            current = candidate
            continue

        if current:
            chunks.append(current)
            current = ""

        if len(word) <= limit:
            current = word
            continue

        start = 0
        while start < len(word):
            chunks.append(word[start:start + limit])
            start += limit

    if current:
        chunks.append(current)
    return chunks


def _split_text(text: str, limit: int) -> list[str]:
    normalized = (text or "").strip()
    if not normalized:
        return []

    blocks = [block.strip() for block in re.split(r"\n\s*\n", normalized) if block.strip()]
    if not blocks:
        blocks = [normalized]

    parts: list[str] = []
    current = ""
    for block in blocks:
        block_chunks = [block] if len(block) <= limit else _split_oversized_block(block, limit)
        for block_chunk in block_chunks:
            if not current:
                current = block_chunk
                continue

            separator = "\n\n"
            candidate = f"{current}{separator}{block_chunk}"
            if len(candidate) <= limit:
                current = candidate
            else:
                parts.append(current)
                current = block_chunk

    if current:
        parts.append(current)
    log.info("Telegram text split: limit=%d chunks=%d", limit, len(parts))
    return parts


def _validate_image_paths(paths: list[str]) -> None:
    """Проверяет существование всех файлов до начала загрузки."""
    missing = [p for p in paths if not os.path.exists(p)]
    if missing:
        raise RuntimeError(f"Файлы изображений не найдены: {missing}")


def _build_message_link(chat_id_str: str, msg_id: int) -> str:
    """
    Возвращает ссылку на сообщение.
    - Публичный канал (@username): https://t.me/username/msg_id
    - Приватный канал (-100XXXXXXXXXX): https://t.me/c/XXXXXXXXXX/msg_id
    """
    if chat_id_str.startswith("@"):
        username = chat_id_str.lstrip("@")
        return f"https://t.me/{username}/{msg_id}"
    # Числовой ID приватного канала: убираем префикс -100
    numeric = chat_id_str.lstrip("-")
    if numeric.startswith("100"):
        numeric = numeric[3:]
    return f"https://t.me/c/{numeric}/{msg_id}"


async def _send_text_chunks(text: str) -> int:
    api_chat_id = _get_api_chat_id()
    chunks = _split_text(text, TG_MAX_TEXT)
    log.info("Telegram send text chunks: chat=%s api_chat=%s chunks=%d", _masked_chat_id(TG_TARGET_CHAT), _masked_chat_id(api_chat_id), len(chunks))
    if not chunks:
        log.info("Telegram text empty after normalization, sending placeholder message")
        result = await _call("sendMessage", chat_id=api_chat_id, text=" ", parse_mode="HTML")
        return result["message_id"]

    last_message_id = 0
    for index, chunk in enumerate(chunks, start=1):
        log.info("Telegram sendMessage chunk %d/%d length=%d", index, len(chunks), len(chunk))
        result = await _call("sendMessage", chat_id=api_chat_id, text=chunk, parse_mode="HTML")
        last_message_id = result["message_id"]
    return last_message_id


async def publish(text: str, image_paths: list[str] | None = None) -> str:
    """
    Публикует пост в Telegram канал.
    Возвращает ссылку на сообщение.
    """
    _validate_config()
    api_chat_id = _get_api_chat_id()
    images = (image_paths or [])[:10]
    text_chunks = _split_text(text, TG_MAX_TEXT)
    log.info(
        "Telegram publish start: chat=%s api_chat=%s text_length=%d images=%d chunks=%d cwd=%s",
        _masked_chat_id(TG_TARGET_CHAT),
        _masked_chat_id(api_chat_id),
        len(text or ""),
        len(images),
        len(text_chunks),
        os.getcwd(),
    )
    if image_paths and len(image_paths) > len(images):
        log.info("Telegram image list truncated: original=%d used=%d", len(image_paths), len(images))

    if images:
        # Проверяем все файлы заранее, до любых сетевых вызовов
        _validate_image_paths(images)

        # FIX: используем _safe_truncate_html вместо простого среза [:TG_MAX_CAPTION],
        # чтобы не разрывать HTML-сущности (&lt; &amp; и т.д.)
        caption = _safe_truncate_html(text_chunks[0], TG_MAX_CAPTION) if text_chunks else ""
        log.info("Telegram publish mode: media caption_length=%d images=%d", len(caption), len(images))

        if len(images) == 1:
            log.info("Telegram sendPhoto start: path=%s", images[0])
            with open(images[0], "rb") as f:
                photo_bytes = f.read()
            log.info("Telegram sendPhoto file loaded: path=%s bytes=%d", images[0], len(photo_bytes))

            async with httpx.AsyncClient(timeout=60) as client:
                for attempt in range(1, _RETRY_ATTEMPTS + 1):
                    try:
                        resp = await client.post(
                            f"{TG_API}/sendPhoto",
                            data={"chat_id": api_chat_id, "caption": caption, "parse_mode": "HTML"},
                            files={"photo": ("photo.jpg", photo_bytes, "image/jpeg")},
                        )
                        log.info(
                            "Telegram sendPhoto response: status=%s path=%s attempt=%d",
                            resp.status_code, images[0], attempt,
                        )

                        if resp.status_code == 429:
                            try:
                                retry_after = resp.json().get("parameters", {}).get("retry_after", _RETRY_DEFAULT_WAIT)
                            except Exception:
                                retry_after = _RETRY_DEFAULT_WAIT
                            log.warning("Telegram sendPhoto rate limit: attempt=%d retry_after=%s", attempt, retry_after)
                            if attempt < _RETRY_ATTEMPTS:
                                await asyncio.sleep(retry_after)
                                continue
                            raise RuntimeError(f"Telegram sendPhoto rate limit exceeded after {_RETRY_ATTEMPTS} attempts")

                        resp.raise_for_status()
                        data = resp.json()
                        break

                    except httpx.HTTPStatusError as exc:
                        body = exc.response.text[:1000]
                        log.error(
                            "Telegram sendPhoto HTTP status error: status=%s path=%s body=%s",
                            exc.response.status_code, images[0], body,
                        )
                        raise RuntimeError(f"Telegram sendPhoto HTTP error {exc.response.status_code}: {body}") from exc
                    except httpx.HTTPError as exc:
                        log.error("Telegram sendPhoto transport error: path=%s error=%s", images[0], exc)
                        raise RuntimeError(f"Telegram sendPhoto transport error: {exc}") from exc

            if not data.get("ok"):
                log.error("Telegram sendPhoto API error: path=%s response=%s", images[0], data)
                raise RuntimeError(f"Telegram error: {data.get('description')}")
            log.info("Telegram sendPhoto success: path=%s", images[0])
            msg_id = data["result"]["message_id"]

        else:
            # Медиагруппа (до 10 фото)
            log.info("Telegram sendMediaGroup start: images=%d", len(images))
            media = []
            files = {}
            for i, path in enumerate(images):
                key = f"photo_{i}"
                log.info("Telegram media item prepare: index=%d path=%s", i, path)
                with open(path, "rb") as f:
                    file_bytes = f.read()
                files[key] = (f"photo_{i}.jpg", file_bytes, "image/jpeg")
                log.info("Telegram media item loaded: index=%d path=%s bytes=%d", i, path, len(file_bytes))
                item: dict = {"type": "photo", "media": f"attach://{key}"}
                if i == 0:
                    item["caption"] = caption
                    item["parse_mode"] = "HTML"
                media.append(item)

            async with httpx.AsyncClient(timeout=60) as client:
                for attempt in range(1, _RETRY_ATTEMPTS + 1):
                    try:
                        resp = await client.post(
                            f"{TG_API}/sendMediaGroup",
                            data={"chat_id": api_chat_id, "media": json.dumps(media)},
                            files=files,
                        )
                        log.info(
                            "Telegram sendMediaGroup response: status=%s images=%d attempt=%d",
                            resp.status_code, len(images), attempt,
                        )

                        if resp.status_code == 429:
                            try:
                                retry_after = resp.json().get("parameters", {}).get("retry_after", _RETRY_DEFAULT_WAIT)
                            except Exception:
                                retry_after = _RETRY_DEFAULT_WAIT
                            log.warning("Telegram sendMediaGroup rate limit: attempt=%d retry_after=%s", attempt, retry_after)
                            if attempt < _RETRY_ATTEMPTS:
                                await asyncio.sleep(retry_after)
                                continue
                            raise RuntimeError(f"Telegram sendMediaGroup rate limit exceeded after {_RETRY_ATTEMPTS} attempts")

                        resp.raise_for_status()
                        data = resp.json()
                        break

                    except httpx.HTTPStatusError as exc:
                        body = exc.response.text[:1000]
                        log.error(
                            "Telegram sendMediaGroup HTTP status error: status=%s body=%s",
                            exc.response.status_code, body,
                        )
                        raise RuntimeError(
                            f"Telegram sendMediaGroup HTTP error {exc.response.status_code}: {body}"
                        ) from exc
                    except httpx.HTTPError as exc:
                        log.error("Telegram sendMediaGroup transport error: error=%s", exc)
                        raise RuntimeError(f"Telegram sendMediaGroup transport error: {exc}") from exc

            if not data.get("ok"):
                log.error("Telegram sendMediaGroup API error: response=%s", data)
                raise RuntimeError(f"Telegram error: {data.get('description')}")
            log.info("Telegram sendMediaGroup success: images=%d", len(images))
            msg_id = data["result"][0]["message_id"]

        remaining_parts: list[str] = []
        if text_chunks:
            first_chunk_rest = text_chunks[0][len(caption):].strip()
            if first_chunk_rest:
                remaining_parts.append(first_chunk_rest)
            remaining_parts.extend(text_chunks[1:])
        log.info("Telegram remaining text after media: chunks=%d", len(remaining_parts))
        for index, chunk in enumerate(remaining_parts, start=1):
            log.info("Telegram send remaining chunk %d/%d length=%d", index, len(remaining_parts), len(chunk))
            result = await _call("sendMessage", chat_id=api_chat_id, text=chunk, parse_mode="HTML")
            msg_id = result["message_id"]
    else:
        log.info("Telegram publish mode: text-only")
        msg_id = await _send_text_chunks(text)

    chat_id_str = str(TG_TARGET_CHAT)
    link = _build_message_link(chat_id_str, msg_id)
    log.info("Telegram publish complete: msg_id=%s chat=%s link=%s", msg_id, _masked_chat_id(TG_TARGET_CHAT), link)
    return link
