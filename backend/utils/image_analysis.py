from __future__ import annotations

from collections import Counter
from pathlib import Path

from PIL import Image, ImageStat


def describe_product_photo(path: str) -> str:
    """
    Возвращает короткое текстовое описание визуальных свойств фото.
    Это не полноценное CV/vision-распознавание, но даёт модели
    фактический контекст из загруженного изображения.
    """
    image_path = Path(path)
    if not image_path.is_file():
        raise FileNotFoundError(f"Файл изображения не найден: {path}")

    with Image.open(image_path) as img:
        rgb = img.convert("RGB")
        width, height = rgb.size
        orientation = _orientation(width, height)
        avg_r, avg_g, avg_b = [round(v) for v in ImageStat.Stat(rgb).mean[:3]]
        brightness = round((avg_r + avg_g + avg_b) / 3)
        background = _background_hint(avg_r, avg_g, avg_b, brightness)
        palette = _dominant_colors(rgb)

    palette_text = ", ".join(palette) if palette else "цветовая палитра не определена"
    return (
        f"Фото товара: формат {orientation}, размер {width}x{height} px. "
        f"Средняя яркость кадра {brightness}/255, фон визуально {background}. "
        f"Доминирующие цвета: {palette_text}."
    )


def _orientation(width: int, height: int) -> str:
    if width == height:
        return "квадратный"
    if width > height:
        return "горизонтальный"
    return "вертикальный"


def _background_hint(r: int, g: int, b: int, brightness: int) -> str:
    spread = max(r, g, b) - min(r, g, b)
    if brightness >= 230 and spread <= 20:
        return "очень светлый, близкий к белому"
    if brightness >= 200:
        return "светлый"
    if brightness <= 70:
        return "тёмный"
    return "нейтральный"


def _dominant_colors(img: Image.Image) -> list[str]:
    reduced = img.resize((64, 64))
    colors = reduced.quantize(colors=5).convert("RGB").getdata()
    names = [_rgb_to_name(color) for color, _ in Counter(colors).most_common(3)]
    return list(dict.fromkeys(names))


def _rgb_to_name(rgb: tuple[int, int, int]) -> str:
    r, g, b = rgb
    brightness = (r + g + b) / 3

    if brightness >= 235:
        return "белый"
    if brightness <= 30:
        return "чёрный"
    if abs(r - g) < 15 and abs(g - b) < 15:
        return "серый"
    if r > 180 and g > 160 and b < 120:
        return "жёлтый"
    if r > 170 and g < 110 and b < 110:
        return "красный"
    if r > 170 and 90 <= g <= 170 and b < 100:
        return "оранжевый"
    if g > 150 and r < 140 and b < 140:
        return "зелёный"
    if b > 150 and r < 140 and g < 170:
        return "синий"
    if r > 120 and b > 120 and g < 120:
        return "фиолетовый"
    if r > 140 and g > 110 and b > 80:
        return "бежевый"
    return "сложный смешанный цвет"
