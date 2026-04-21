TEXT_LIMITS = {
    "short": 255,
    "long": 5000,
}


def get_limits(_context: str = "") -> dict:
    """Вернуть единые лимиты для карточки товара."""
    return TEXT_LIMITS


def validate_text(text: str, field: str, context: str = "") -> dict:
    """
    Проверить длину текста.
    field: 'short' | 'long'
    Возвращает: {ok, length, limit, status}
    status: 'ok' | 'warning' | 'error'
    """
    limits = get_limits(context)
    limit = limits[field]
    length = len(text) if text else 0
    ratio = length / limit if limit else 0

    if ratio > 1.0:
        status = "error"
    elif ratio >= 0.9:
        status = "warning"
    else:
        status = "ok"

    return {
        "ok": status != "error",
        "length": length,
        "limit": limit,
        "status": status,
    }


def validate_product_texts(short: str, long: str, context: str = "") -> dict:
    """Валидировать оба поля сразу."""
    return {
        "short": validate_text(short, "short", context),
        "long": validate_text(long, "long", context),
    }
