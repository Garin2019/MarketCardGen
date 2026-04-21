import asyncio
from typing import Any

import dashscope
import httpx
from openai import AsyncOpenAI
from dashscope import MultiModalConversation

from config import DASHSCOPE_API_KEY, QWEN_IMAGE_MODEL, QWEN_TEXT_MODEL
from services.ai.base_provider import BaseImageProvider, BaseTextProvider

dashscope.base_http_api_url = "https://dashscope-intl.aliyuncs.com/api/v1"


class QwenTextProvider(BaseTextProvider):
    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 2000,
        temperature: float = 0.7,
        image_data_url: str | None = None,
    ) -> str:
        if not DASHSCOPE_API_KEY:
            raise RuntimeError("Не задан DASHSCOPE_API_KEY")

        client = AsyncOpenAI(
            api_key=DASHSCOPE_API_KEY,
            base_url="https://dashscope-intl.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1",
        )

        if image_data_url:
            input_payload = [
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": user_prompt},
                        {
                            "type": "input_image",
                            "image_url": image_data_url,
                            "detail": "high",
                        },
                    ],
                }
            ]
        else:
            input_payload = user_prompt

        response = await client.responses.create(
            model=QWEN_TEXT_MODEL,
            instructions=system_prompt,
            input=input_payload,
            temperature=temperature,
            max_output_tokens=max_tokens,
            extra_body={"enable_thinking": True},
        )

        output_text = getattr(response, "output_text", None)
        if output_text:
            return output_text.strip()

        extracted = _extract_response_text(response)
        if extracted:
            return extracted

        raise RuntimeError("Qwen вернул пустой ответ")


class QwenImageProvider(BaseImageProvider):
    async def generate_image(
        self,
        prompt: str,
        image_base64: str | None = None,
        reference_url: str | None = None,
        width: int = 1024,
        height: int = 1024,
    ) -> bytes:
        if not DASHSCOPE_API_KEY:
            raise RuntimeError("Не задан DASHSCOPE_API_KEY")
        reference_image = reference_url
        if not reference_image and image_base64:
            if image_base64.startswith("data:image/"):
                reference_image = image_base64
            else:
                reference_image = f"data:image/png;base64,{image_base64}"
        if not reference_image:
            raise RuntimeError(
                "Qwen image-to-image требует референсное изображение в виде публичного URL "
                "или data URL с base64."
            )

        response = await asyncio.to_thread(
            MultiModalConversation.call,
            api_key=DASHSCOPE_API_KEY,
            model=QWEN_IMAGE_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"image": reference_image},
                        {"text": prompt},
                    ],
                }
            ],
            result_format="message",
            stream=False,
            watermark=True,
            negative_prompt="",
        )

        plain_response = _object_to_plain(response)
        status_code = getattr(response, "status_code", None)
        if status_code is None and isinstance(plain_response, dict):
            status_code = plain_response.get("status_code")

        if status_code != 200:
            error_code = getattr(response, "code", None)
            error_message = getattr(response, "message", None)
            if isinstance(plain_response, dict):
                error_code = error_code or plain_response.get("code") or "unknown_error"
                error_message = error_message or plain_response.get("message") or "Неизвестная ошибка DashScope"
            raise RuntimeError(f"DashScope вернул ошибку {error_code}: {error_message}")

        image_ref = _find_image_reference(plain_response)
        if not image_ref:
            raise RuntimeError("Qwen не вернул изображение")

        if image_ref.startswith("http://") or image_ref.startswith("https://"):
            async with httpx.AsyncClient(timeout=180) as client:
                image_response = await client.get(image_ref)
            image_response.raise_for_status()
            return image_response.content

        if image_ref.startswith("data:image/"):
            _, _, encoded = image_ref.partition(",")
            if not encoded:
                raise RuntimeError("Qwen вернул некорректный data URL изображения")
            try:
                return base64.b64decode(encoded)
            except Exception as exc:
                raise RuntimeError("Не удалось декодировать data URL результата Qwen image") from exc

        try:
            return base64.b64decode(image_ref)
        except Exception as exc:
            raise RuntimeError("Qwen вернул неподдерживаемый формат результата изображения") from exc


def _extract_response_text(response: Any) -> str:
    parts: list[str] = []
    for item in getattr(response, "output", []) or []:
        item_type = getattr(item, "type", None)
        if item_type is None and isinstance(item, dict):
            item_type = item.get("type")
        if item_type != "message":
            continue
        content_items = getattr(item, "content", None)
        if content_items is None and isinstance(item, dict):
            content_items = item.get("content")
        for content in content_items or []:
            text = getattr(content, "text", None)
            if text is None and isinstance(content, dict):
                text = content.get("text")
            if text:
                parts.append(text.strip())
    return "\n".join(part for part in parts if part).strip()


def _object_to_plain(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {key: _object_to_plain(val) for key, val in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_object_to_plain(item) for item in value]
    if hasattr(value, "model_dump"):
        return _object_to_plain(value.model_dump())
    if hasattr(value, "dict"):
        return _object_to_plain(value.dict())
    if hasattr(value, "__dict__"):
        return _object_to_plain(vars(value))
    return value


def _find_image_reference(value: Any) -> str | None:
    if isinstance(value, str):
        normalized = value.strip()
        if normalized.startswith(("http://", "https://")):
            return normalized
        if normalized.startswith("data:image/"):
            return normalized
        if len(normalized) > 200 and " " not in normalized:
            return normalized
        return None

    if isinstance(value, list):
        for item in value:
            found = _find_image_reference(item)
            if found:
                return found
        return None

    if isinstance(value, dict):
        for key in ("url", "image_url", "image", "result_url"):
            found = value.get(key)
            if isinstance(found, str):
                candidate = _find_image_reference(found)
                if candidate:
                    return candidate

        for item in value.values():
            found = _find_image_reference(item)
            if found:
                return found

    return None
