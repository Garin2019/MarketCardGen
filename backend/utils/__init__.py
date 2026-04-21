from models import AppSetting


def get_setting(key: str, fallback: str = "") -> str:
    """Получить значение настройки из БД. Если не найдено — вернуть fallback."""
    try:
        return AppSetting.get(AppSetting.key == key).value
    except AppSetting.DoesNotExist:
        return fallback
