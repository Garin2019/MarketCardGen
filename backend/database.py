import os
import datetime
from datetime import timezone
from sqlmodel import SQLModel, Session, create_engine, select
from sqlalchemy import text
from models import AppSetting, PromptTemplate
from config import DATABASE_PATH, EDITOR_URL, OPENROUTER_MODEL
from logger import get_logger

log = get_logger("database")

DEFAULT_PRODUCT_CATEGORIES = "\n".join([
    "Автотовары",
    "Аксессуары",
    "Бижутерия",
    "Детские товары",
    "Книги",
    "Красота и здоровье",
    "Мебель",
    "Одежда и обувь",
    "Продукты питания",
    "Спорт и отдых",
    "Товары для дома",
    "Электроника",
    "Ювелирные украшения",
    "Другое",
])

# SQLite URL для SQLModel / SQLAlchemy
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# check_same_thread=False нужен для SQLite при работе с FastAPI
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)


def get_session():
    """Dependency для FastAPI — yields сессию и закрывает её после запроса."""
    with Session(engine) as session:
        yield session


DEFAULT_SETTINGS = [
    {"key": "default_text_provider",  "value": "qwen"},
    {"key": "default_image_provider", "value": "openai"},
    {"key": "default_tone",            "value": "expert"},
    {"key": "default_text_temperature", "value": "0.7"},
    {"key": "product_categories",      "value": DEFAULT_PRODUCT_CATEGORIES},
    {"key": "default_short_length",    "value": "100"},
    {"key": "default_long_length",     "value": "1000"},
    {"key": "default_post_tone",       "value": "friendly"},
    {"key": "default_post_size",       "value": "600"},
    {"key": "editor_url",              "value": EDITOR_URL},
    {"key": "openrouter_model",        "value": OPENROUTER_MODEL},
    {"key": "generation_count_text",   "value": "0"},
    {"key": "generation_count_images", "value": "0"},
    {"key": "generation_count_posts",  "value": "0"},
]

DEFAULT_PROMPT_TEMPLATES = [
    {
        "name": "Белый фон",
        "description": "Чистая предметная съёмка для карточки товара",
        "prompt_text": "Создай чистое изображение товара для карточки на белом фоне. Сохрани реальную форму, пропорции, материалы и цвета товара. Используй мягкий студийный свет, чёткий фокус, аккуратные тени и премиальный каталожный стиль. Без лишних предметов, рук, интерьера, декоративных объектов, текста и надписей в кадре.",
        "is_default": True,
    },
    {
        "name": "Лайфстайл",
        "description": "Товар в естественной жизненной сцене",
        "prompt_text": "Создай lifestyle-изображение товара в правдоподобной жизненной сцене использования. Точно сохрани внешний вид товара и сделай его главным объектом кадра. Используй естественную композицию, мягкий дневной или тёплый интерьерный свет, реалистичные детали окружения и аккуратную коммерческую подачу. Сцена должна поддерживать образ товара, без визуального шума, перегруженного декора и посторонних объектов.",
        "is_default": True,
    },
    {
        "name": "Инфографика - преимущества",
        "description": "Карточка с акцентом на ключевые преимущества товара",
        "prompt_text": "Создай инфографику для карточки товара в онлайн-каталоге. Сохрани товар визуально точным и сделай его главным объектом изображения. Добавь чистую структурную композицию с 3-5 акцентами на преимущества или зонами под иконки и короткие подписи на русском языке вокруг товара. Используй светлый коммерческий фон, аккуратную композицию, хорошую читаемость и современный e-commerce стиль. Не перегружай кадр и не искажай товар.",
        "is_default": True,
    },
    {
        "name": "Детали крупным планом",
        "description": "Крупный план фактуры, фурнитуры и важных деталей",
        "prompt_text": "Создай крупный план детали товара с акцентом на фактуру, материалы, швы, покрытие или фурнитуру. Сохрани реальные цвета и дизайн товара. Используй макро-кадрирование, резкий фокус на ключевой детали, контролируемую глубину резкости и качественный коммерческий свет. Фон должен оставаться нейтральным и ненавязчивым, без лишних объектов и вводящих в заблуждение элементов.",
        "is_default": True,
    },
]


def init_db():
    """Создать папку БД, таблицы и засеять дефолтные данные."""
    db_dir = os.path.dirname(DATABASE_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    SQLModel.metadata.create_all(engine)
    log.info("Таблицы созданы/проверены")

    with Session(engine) as session:
        _migrate_products_schema()
        _seed_settings(session)
        _migrate_legacy_settings(session)
        _migrate_product_categories_setting(session)
        _normalize_default_prompt_templates(session)
        _seed_prompt_templates(session)
        session.commit()

    log.info("База данных инициализирована: %s", DATABASE_PATH)


def _seed_settings(session: Session):
    now = datetime.datetime.now(timezone.utc)
    for item in DEFAULT_SETTINGS:
        existing = session.exec(
            select(AppSetting).where(AppSetting.key == item["key"])
        ).first()
        if not existing:
            session.add(AppSetting(key=item["key"], value=item["value"], updated_at=now))


def _migrate_legacy_settings(session: Session):
    now = datetime.datetime.now(timezone.utc)
    default_text_provider = session.exec(
        select(AppSetting).where(AppSetting.key == "default_text_provider")
    ).first()
    if default_text_provider and default_text_provider.value == "gigachat":
        default_text_provider.value = "qwen"
        default_text_provider.updated_at = now
        session.add(default_text_provider)

    default_image_provider = session.exec(
        select(AppSetting).where(AppSetting.key == "default_image_provider")
    ).first()
    if default_image_provider and default_image_provider.value in {"kandinsky", "glm"}:
        default_image_provider.value = "openai"
        default_image_provider.updated_at = now
        session.add(default_image_provider)

    default_text_temperature = session.exec(
        select(AppSetting).where(AppSetting.key == "default_text_temperature")
    ).first()
    if not default_text_temperature:
        session.add(AppSetting(key="default_text_temperature", value="0.7", updated_at=now))


def _migrate_product_categories_setting(session: Session):
    now = datetime.datetime.now(timezone.utc)
    product_categories = session.exec(
        select(AppSetting).where(AppSetting.key == "product_categories")
    ).first()
    if not product_categories:
        return

    old_default_categories = "\n".join([
        "Электроника",
        "Одежда и обувь",
        "Товары для дома",
        "Красота и здоровье",
        "Спорт и отдых",
        "Детские товары",
        "Продукты питания",
        "Автотовары",
        "Книги",
        "Ювелирные украшения",
        "Бижутерия",
        "Мебель",
        "Другое",
    ])

    current_normalized = "\n".join(
        line.strip() for line in (product_categories.value or "").splitlines() if line.strip()
    )
    if current_normalized in {"", old_default_categories}:
        product_categories.value = DEFAULT_PRODUCT_CATEGORIES
        product_categories.updated_at = now
        session.add(product_categories)


def _migrate_products_schema():
    with engine.begin() as connection:
        columns = connection.execute(text("PRAGMA table_info(products)")).fetchall()
        column_names = {row[1] for row in columns}
        if "article" not in column_names:
            connection.execute(text("ALTER TABLE products ADD COLUMN article TEXT"))
        if "extra_requirements" not in column_names:
            connection.execute(text("ALTER TABLE products ADD COLUMN extra_requirements TEXT"))


def _seed_prompt_templates(session: Session):
    now = datetime.datetime.now(timezone.utc)
    for item in DEFAULT_PROMPT_TEMPLATES:
        existing = session.exec(
            select(PromptTemplate).where(PromptTemplate.name == item["name"])
        ).first()
        if not existing:
            session.add(PromptTemplate(
                name=item["name"],
                description=item["description"],
                prompt_text=item["prompt_text"],
                is_default=item["is_default"],
                created_at=now,
                updated_at=now,
            ))


def _normalize_default_prompt_templates(session: Session):
    now = datetime.datetime.now(timezone.utc)

    legacy_lifestyle = session.exec(
        select(PromptTemplate).where(
            PromptTemplate.name == "Lifestyle",
            PromptTemplate.is_default == True,
        )
    ).first()
    if legacy_lifestyle:
        legacy_lifestyle.name = "Лайфстайл"
        legacy_lifestyle.updated_at = now
        session.add(legacy_lifestyle)

    templates = session.exec(
        select(PromptTemplate).where(PromptTemplate.is_default == True)
    ).all()

    for template in templates:
        updated = False
        for field in ("name", "description", "prompt_text"):
            value = getattr(template, field)
            normalized = (value or "").replace("—", "-")
            if normalized != value:
                setattr(template, field, normalized)
                updated = True

        if updated:
            template.updated_at = now
            session.add(template)

    allowed_defaults = {item["name"] for item in DEFAULT_PROMPT_TEMPLATES}
    existing_defaults = session.exec(
        select(PromptTemplate).where(PromptTemplate.is_default == True)
    ).all()

    for template in existing_defaults:
        if template.name not in allowed_defaults:
            session.delete(template)

    for item in DEFAULT_PROMPT_TEMPLATES:
        template = session.exec(
            select(PromptTemplate).where(
                PromptTemplate.name == item["name"],
                PromptTemplate.is_default == True,
            )
        ).first()
        if template:
            changed = (
                template.description != item["description"]
                or template.prompt_text != item["prompt_text"]
            )
            template.description = item["description"]
            template.prompt_text = item["prompt_text"]
            if changed:
                template.updated_at = now
                session.add(template)
                log.info("Синхронизирован системный шаблон: %s", template.name)
