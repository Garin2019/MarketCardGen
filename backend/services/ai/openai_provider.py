import base64
from io import BytesIO

import httpx
from openai import AsyncOpenAI

from config import OPENAI_API_KEY, OPENAI_IMAGE_MODEL, OPENAI_TEXT_MODEL
from services.ai.base_provider import BaseImageProvider, BaseTextProvider


class OpenAITextProvider(BaseTextProvider):
    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 2000,
        temperature: float = 0.7,
        image_data_url: str | None = None,
    ) -> str:
        if not OPENAI_API_KEY:
            raise RuntimeError("Не задан OPENAI_API_KEY")

        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
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
            model=OPENAI_TEXT_MODEL,
            instructions=system_prompt,
            input=input_payload,
            temperature=temperature,
            max_output_tokens=max_tokens,
        )

        output_text = getattr(response, "output_text", None)
        if output_text:
            return output_text.strip()

        raise RuntimeError("OpenAI вернул пустой ответ")


class OpenAIImageProvider(BaseImageProvider):
    async def generate_image(
        self,
        prompt: str,
        image_base64: str | None = None,
        reference_url: str | None = None,
        width: int = 1024,
        height: int = 1024,
    ) -> bytes:
        if not OPENAI_API_KEY:
            raise RuntimeError("Не задан OPENAI_API_KEY")

        size = _normalize_size(width, height)

        if image_base64:
            return await _edit_image(prompt, image_base64, size)
        raise RuntimeError(
            "OpenAI image generation в приложении работает только на основе референсного изображения. "
            "Сначала загрузите фото товара или отдельный референс."
        )


async def _edit_image(prompt: str, image_base64: str, size: str) -> bytes:
    normalized = image_base64.strip()
    if normalized.startswith("data:image/"):
        _, _, normalized = normalized.partition(",")
        if not normalized:
            raise RuntimeError("OpenAI image edit получил некорректный data URL референса")

    image_bytes = base64.b64decode(normalized)
    image_file = BytesIO(image_bytes)
    image_file.name = "reference.png"

    files = [
        ("image[]", ("reference.png", image_file.getvalue(), "image/png")),
    ]
    form_data = {
        "model": OPENAI_IMAGE_MODEL,
        "prompt": prompt,
        "size": size,
    }

    async with httpx.AsyncClient(timeout=180) as client:
        response = await client.post(
            "https://api.openai.com/v1/images/edits",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            data=form_data,
            files=files,
        )

    response.raise_for_status()
    data = response.json()
    image_base64 = data["data"][0]["b64_json"]
    return base64.b64decode(image_base64)


def _normalize_size(width: int, height: int) -> str:
    if width == height:
        return "1024x1024"
    if width > height:
        return "1536x1024"
    return "1024x1536"
