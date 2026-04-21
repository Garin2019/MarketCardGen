from sqlmodel import Session, select
from models import AppSetting
from database import engine


def get_setting(key: str, fallback: str = "") -> str:
    """Получить значение настройки из БД. Если не найдено — вернуть fallback."""
    with Session(engine) as session:
        row = session.exec(select(AppSetting).where(AppSetting.key == key)).first()
        return row.value if row else fallback


def increment_setting_counter(key: str, amount: int = 1, session: Session | None = None) -> int:
    """Увеличить числовой счётчик в app_settings и вернуть новое значение."""
    owns_session = session is None
    active_session = session or Session(engine)
    try:
        row = active_session.exec(select(AppSetting).where(AppSetting.key == key)).first()
        current = 0
        if row and row.value:
            try:
                current = int(row.value)
            except ValueError:
                current = 0

        new_value = current + amount
        if row:
            row.value = str(new_value)
            active_session.add(row)
        else:
            active_session.add(AppSetting(key=key, value=str(new_value)))

        if owns_session:
            active_session.commit()
        return new_value
    finally:
        if owns_session:
            active_session.close()
