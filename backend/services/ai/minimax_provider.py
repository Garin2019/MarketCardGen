import base64

import httpx
from anthropic import AsyncAnthropic

from config import MINIMAX_API_KEY, MINIMAX_IMAGE_MODEL, MINIMAX_TEXT_MODEL
from services.ai.base_provider import BaseImageProvider, BaseTextProvider

TEXT_BASE_URL = "https://api.minimax.io/anthropic"
IMAGE_URL = "https://api.minimax.io/v1/image_generation"


class MiniMaxTextProvider(BaseTextProvider):
    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 2000,
        temperature: float = 0.7,
        image_data_url: str | None = None,
    ) -> str:
        if not MINIMAX_API_KEY:
            raise RuntimeError("Не задан MINIMAX_API_KEY")

        client = AsyncAnthropic(
            api_key=MINIMAX_API_KEY,
            base_url=TEXT_BASE_URL,
        )

        message = await client.messages.create(
            model=MINIMAX_TEXT_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": user_prompt,
                        }
                    ],
                }
            ],
        )

        parts: list[str] = []
        for block in message.content:
            if getattr(block, "type", None) == "text" and getattr(block, "text", None):
                parts.append(block.text.strip())

        result = "\n".join(part for part in parts if part).strip()
        if not result:
            raise RuntimeError("MiniMax вернул пустой ответ")
        return result


class MiniMaxImageProvider(BaseImageProvider):
    async def generate_image(
        self,
        prompt: str,
        image_base64: str | None = None,
        reference_url: str | None = None,
        width: int = 1024,
        height: int = 1024,
    ) -> bytes:
        if not MINIMAX_API_KEY:
            raise RuntimeError("Не задан MINIMAX_API_KEY")

        payload = {
            "model": MINIMAX_IMAGE_MODEL,
            "prompt": prompt,
            "aspect_ratio": _aspect_ratio(width, height),
            "n": 1,
        }

        reference_image = reference_url
        if not reference_image and image_base64:
            reference_image = image_base64

        if reference_image:
            payload["subject_reference"] = [
                {
                    "type": "character",
                    "image_file": reference_image,
                }
            ]

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {MINIMAX_API_KEY}",
        }

        async with httpx.AsyncClient(timeout=180) as client:
            response = await client.post(IMAGE_URL, json=payload, headers=headers)

        response.raise_for_status()
        data = response.json()
        image_ref = _extract_image_reference(data)
        if not image_ref:
            raise RuntimeError("MiniMax не вернул изображение")

        if image_ref.startswith("http://") or image_ref.startswith("https://"):
            async with httpx.AsyncClient(timeout=180) as client:
                image_response = await client.get(image_ref)
            image_response.raise_for_status()
            return image_response.content

        try:
            return base64.b64decode(image_ref)
        except Exception as exc:
            raise RuntimeError("Не удалось декодировать результат MiniMax image") from exc


def _aspect_ratio(width: int, height: int) -> str:
    if width <= 0 or height <= 0:
        return "1:1"

    ratio = width / height
    known_ratios = {
        "1:1": 1.0,
        "16:9": 16 / 9,
        "9:16": 9 / 16,
        "4:3": 4 / 3,
        "3:4": 3 / 4,
        "3:2": 3 / 2,
        "2:3": 2 / 3,
    }
    return min(known_ratios, key=lambda key: abs(known_ratios[key] - ratio))


def _extract_image_reference(data: dict) -> str | None:
    candidates = []

    data_block = data.get("data")
    if isinstance(data_block, dict):
        for key in ("image_base64", "base64", "image_url", "url"):
            value = data_block.get(key)
            if isinstance(value, list):
                candidates.extend(item for item in value if isinstance(item, str))
            elif isinstance(value, str):
                candidates.append(value)

    if isinstance(data_block, list):
        for item in data_block:
            if not isinstance(item, dict):
                continue
            for key in ("image_base64", "base64", "image_url", "url"):
                value = item.get(key)
                if isinstance(value, str):
                    candidates.append(value)

    for candidate in candidates:
        normalized = candidate.strip()
        if normalized:
            return normalized
    return None
