"""
Централизованная настройка логирования.
- Ротация по 50 МБ, хранение последних 5 файлов
- Одновременный вывод в файл и консоль
- Отдельный logger для каждого модуля через get_logger()
"""
import logging
import os
from logging.handlers import RotatingFileHandler
from config import LOG_DIR, LOG_LEVEL

# ── Константы ─────────────────────────────────────────────────────────────────
MAX_BYTES     = 50 * 1024 * 1024   # 50 МБ
BACKUP_COUNT  = 5                  # хранить до 5 архивных файлов
LOG_FILE      = os.path.join(LOG_DIR, "app.log")
DATE_FMT      = "%Y-%m-%d %H:%M:%S"
LOG_FMT       = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

_configured = False


def _setup():
    """Инициализирует root logger один раз при первом вызове."""
    global _configured
    if _configured:
        return
    _configured = True

    os.makedirs(LOG_DIR, exist_ok=True)

    level = getattr(logging, LOG_LEVEL.upper(), logging.INFO)

    formatter = logging.Formatter(LOG_FMT, datefmt=DATE_FMT)

    # Файловый обработчик с ротацией
    file_handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(level)

    # Консольный обработчик
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(level)

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(file_handler)
    root.addHandler(console_handler)

    # Приглушаем слишком шумные сторонние библиотеки
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Возвращает именованный logger, инициализируя систему при необходимости."""
    _setup()
    return logging.getLogger(name)
