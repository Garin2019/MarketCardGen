# План разработки MVP — Приложение для подготовки карточек товаров

## Содержание
1. [Общее описание](#1-общее-описание)
2. [Технический стек](#2-технический-стек)
3. [Архитектура приложения](#3-архитектура-приложения)
4. [Структура базы данных](#4-структура-базы-данных)
5. [API эндпоинты (FastAPI)](#5-api-эндпоинты-fastapi)
6. [Компоненты Frontend (React)](#6-компоненты-frontend-react)
7. [Интеграции с ИИ провайдерами](#7-интеграции-с-ии-провайдерами)
8. [Интеграции с соцсетями](#8-интеграции-с-соцсетями)
9. [Пользовательский путь (User Flow)](#9-пользовательский-путь-user-flow)
10. [План работ по спринтам](#10-план-работ-по-спринтам)
11. [Переменные окружения](#11-переменные-окружения)
12. [Развёртывание](#12-развёртывание)

---

## 1. Общее описание

Веб-приложение для автоматизации подготовки карточек товаров для маркетплейсов Ozon и Wildberries.

**Ключевые функции MVP:**
- Генерация SEO-текстов (короткое и длинное описание) по фото товара
- Генерация до 12 изображений на основе промтов с поддержкой шаблонов
- Ручное редактирование инфографики во внешнем редакторе изображений (открывается по ссылке)
- Экспорт карточки в Excel / CSV (совместимо с шаблонами Ozon / WB)
- Генерация постов и публикация в VK, Telegram, MAX

---

## 2. Технический стек

| Слой | Технология |
|------|-----------|
| Backend | Python 3.11+, FastAPI |
| ORM | Peewee |
| База данных | SQLite |
| Frontend | React 18, React Router v6 |
| Редактор изображений | Существующее React-приложение (внешнее, интеграция по ссылке) |
| Экспорт | openpyxl (Excel), csv (стандартная библиотека) |
| Контейнеризация | Docker, docker-compose |
| Конфигурация | python-dotenv (.env файл) |

---

## 3. Архитектура приложения

```
marketplace-card-app/
│
├── backend/                        # FastAPI приложение
│   ├── main.py                     # Точка входа, регистрация роутеров
│   ├── config.py                   # Настройки из .env
│   ├── database.py                 # Инициализация Peewee + SQLite
│   ├── models/                     # Модели Peewee
│   │   ├── product.py
│   │   ├── generation.py
│   │   ├── prompt_template.py
│   │   └── settings.py
│   ├── routers/                    # FastAPI роутеры
│   │   ├── products.py
│   │   ├── text_generation.py
│   │   ├── image_generation.py
│   │   ├── social.py
│   │   ├── export.py
│   │   ├── templates.py
│   │   └── settings.py
│   ├── services/                   # Бизнес-логика
│   │   ├── ai/
│   │   │   ├── base_provider.py    # Абстрактный интерфейс AIProvider
│   │   │   ├── glm_provider.py
│   │   │   ├── qwen_provider.py
│   │   │   ├── yandexgpt_provider.py
│   │   │   └── yandexart_provider.py
│   │   ├── text_service.py
│   │   ├── image_service.py
│   │   ├── export_service.py
│   │   └── social/
│   │       ├── vk_service.py
│   │       ├── telegram_service.py
│   │       └── max_service.py
│   ├── validators/
│   │   └── marketplace_validator.py  # Валидация лимитов Ozon / WB
│   └── requirements.txt
│
├── frontend/                       # Основное React-приложение
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ProductPage.jsx         # Шаг 1: загрузка фото
│   │   │   ├── TextGenerationPage.jsx  # Шаг 2: генерация текста
│   │   │   ├── ImageGenerationPage.jsx # Шаг 3: генерация изображений
│   │   │   ├── SocialPage.jsx          # Публикация в соцсети
│   │   │   ├── TemplatesPage.jsx       # Управление шаблонами промтов
│   │   │   └── SettingsPage.jsx        # Настройки провайдеров и ключей
│   │   ├── components/
│   │   │   ├── PhotoUploader.jsx
│   │   │   ├── TextForm.jsx
│   │   │   ├── TextEditor.jsx
│   │   │   ├── CharCounter.jsx         # Счётчик символов с валидацией
│   │   │   ├── PromptTemplateSelector.jsx
│   │   │   ├── ImageGrid.jsx
│   │   │   ├── SocialForm.jsx
│   │   │   └── ExportButton.jsx
│   │   ├── api/                        # Axios клиенты
│   │   └── App.jsx
│   └── package.json
│
│   # Редактор инфографики — внешнее существующее приложение.
│   # Интеграция через ссылку. Обмена данными на этапе MVP нет.
│   # URL редактора задаётся в настройках: EDITOR_URL в .env
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 4. Структура базы данных

### Таблица `products`
| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER PK | |
| photo_path | TEXT | Путь к загруженному фото |
| reference_path | TEXT | Путь к референсу (опционально) |
| marketplace | TEXT | ozon / wildberries |
| category | TEXT | Категория товара |
| tone | TEXT | Тональность |
| target_audience | TEXT | Целевая аудитория |
| keywords | TEXT | JSON-список ключевых слов |
| short_description | TEXT | Короткое описание (редактируемое) |
| long_description | TEXT | Длинное описание (редактируемое) |
| short_description_limit | INTEGER | Лимит символов короткого |
| long_description_limit | INTEGER | Лимит символов длинного |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### Таблица `generated_images`
| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER PK | |
| product_id | INTEGER FK | |
| image_path | TEXT | Путь к файлу |
| prompt | TEXT | Промт для генерации |
| template_id | INTEGER FK | Использованный шаблон (nullable) |
| sort_order | INTEGER | Порядок (1–12) |
| created_at | DATETIME | |

### Таблица `prompt_templates`
| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER PK | |
| name | TEXT | Название шаблона |
| description | TEXT | Краткое описание |
| prompt_text | TEXT | Текст промта |
| is_default | BOOLEAN | Системный / пользовательский |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### Таблица `app_settings`
| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER PK | |
| key | TEXT UNIQUE | Ключ настройки |
| value | TEXT | Значение |
| updated_at | DATETIME | |

> Настройки API-ключей хранятся в .env, остальные параметры приложения — в `app_settings`.

### Таблица `social_posts`
| Поле | Тип | Описание |
|------|-----|---------|
| id | INTEGER PK | |
| product_id | INTEGER FK | |
| platform | TEXT | vk / telegram / max |
| post_text | TEXT | Текст поста |
| post_size | INTEGER | Размер в словах |
| tone | TEXT | Тональность |
| hashtags | TEXT | JSON-список хэштегов |
| use_emoji | BOOLEAN | |
| status | TEXT | draft / published / scheduled |
| published_at | DATETIME | |
| scheduled_at | DATETIME | |
| created_at | DATETIME | |

---

## 5. API эндпоинты (FastAPI)

### Продукты
| Метод | URL | Описание |
|-------|-----|---------|
| POST | `/api/products` | Создание нового продукта (возвращает id) |
| POST | `/api/products/upload-photo` | Загрузка фото товара |
| POST | `/api/products/upload-reference` | Загрузка референса |
| GET | `/api/products/{id}` | Получение данных продукта |
| PUT | `/api/products/{id}` | Обновление данных (текст, поля) |

### Генерация текста
| Метод | URL | Описание |
|-------|-----|---------|
| POST | `/api/text/generate` | Генерация описаний по фото и параметрам |
| POST | `/api/text/validate` | Валидация длины текста под маркетплейс |

**Тело запроса `/api/text/generate`:**
```json
{
  "product_id": 1,
  "marketplace": "ozon",
  "category": "Электроника",
  "tone": "expert",
  "target_audience": "Широкая аудитория",
  "keywords": ["ключевое слово 1", "ключевое слово 2"],
  "short_length": 100,
  "long_length": 1000,
  "extra_requirements": "Упомянуть гарантию 2 года",
  "provider": "qwen"
}
```

### Генерация изображений
| Метод | URL | Описание |
|-------|-----|---------|
| POST | `/api/images/generate` | Генерация одного изображения |
| POST | `/api/images/generate-batch` | Генерация нескольких (до 12) |
| GET | `/api/images/product/{id}` | Список изображений продукта |
| DELETE | `/api/images/{id}` | Удаление изображения |
| PUT | `/api/images/{id}/reorder` | Изменение порядка |

**Тело запроса `/api/images/generate`:**
```json
{
  "product_id": 1,
  "prompt": "Товар на белом фоне, студийное освещение",
  "template_id": 2,
  "provider": "kandinsky",
  "sort_order": 1
}
```

### Настройки
| Метод | URL | Описание |
|-------|-----|---------|
| GET | `/api/settings` | Получение настроек приложения |
| PUT | `/api/settings` | Обновление настроек приложения |
| DELETE | `/api/templates/{id}` | Удаление (только пользовательских) |

### Настройки
| Метод | URL | Описание |
|-------|-----|---------|
| GET | `/api/settings` | Получение настроек приложения |
| PUT | `/api/settings` | Обновление настроек приложения |

### Шаблоны промтов
| Метод | URL | Описание |
|-------|-----|---------|
| GET | `/api/templates` | Список всех шаблонов |
| POST | `/api/templates` | Создание шаблона |
| PUT | `/api/templates/{id}` | Редактирование шаблона |
| DELETE | `/api/templates/{id}` | Удаление (только пользовательских) |

### Публикация в соцсети
| Метод | URL | Описание |
|-------|-----|---------|
| POST | `/api/social/generate-post` | Генерация текста поста |
| POST | `/api/social/publish` | Немедленная публикация |
| POST | `/api/social/schedule` | Отложенная публикация |
| GET | `/api/social/posts/{product_id}` | Список постов продукта |

### Экспорт
| Метод | URL | Описание |
|-------|-----|---------|
| GET | `/api/export/{product_id}/excel` | Экспорт в .xlsx |
| GET | `/api/export/{product_id}/csv` | Экспорт в .csv |

---

## 6. Компоненты Frontend (React)

### Страницы и маршруты

| Маршрут | Компонент | Описание |
|---------|-----------|---------|
| `/` | `ProductPage` | Загрузка фото, старт работы |
| `/product/:id/text` | `TextGenerationPage` | Форма и генерация текста |
| `/product/:id/images` | `ImageGenerationPage` | Генерация изображений |
| `/product/:id/social` | `SocialPage` | Посты и публикация |
| `/templates` | `TemplatesPage` | Управление шаблонами |
| `/settings` | `SettingsPage` | Ключи API и настройки |

> **Редактор инфографики** — внешнее приложение. На `ImageGenerationPage` рядом с каждым изображением отображается кнопка **«Открыть в редакторе»**, которая открывает `EDITOR_URL` в новой вкладке браузера. Обмена данными между приложениями на этапе MVP нет.

### Форма генерации текста (TextGenerationPage)

| Поле | Тип | Дефолт |
|------|-----|--------|
| Маркетплейс | dropdown | Ozon |
| Категория | dropdown + free input | — |
| Тональность | dropdown | Экспертный |
| Целевая аудитория | text input | "Широкая аудитория" |
| Ключевые слова | tag input | — |
| Длина короткого описания | number input | 100 |
| Длина длинного описания | number input | 1000 |
| Доп. требования | textarea | — |
| Провайдер ИИ (текст) | dropdown | GigaChat |

**Тональности:** Формальный / Экспертный / Эмоциональный / Дружелюбный

**Маркетплейсы:** Ozon / Wildberries

### Валидация текста (CharCounter)

| Маркетплейс | Короткое | Длинное |
|-------------|----------|---------|
| Ozon | ≤ 255 симв. | ≤ 5000 симв. |
| Wildberries | ≤ 100 симв. | ≤ 5000 симв. |

Индикация: 🟢 норма / 🟡 близко к лимиту (90%) / 🔴 превышение. Кнопка сохранения заблокирована при превышении.

### Форма генерации поста (SocialPage)

| Поле | Тип | Дефолт |
|------|-----|--------|
| Платформы | multi-checkbox | VK |
| Размер (слов) | slider 300–3000 | 600 |
| Тональность | dropdown | Дружелюбный |
| Хэштеги | tag input | авто |
| Эмодзи | toggle | Вкл |
| Публикация | radio | Сейчас |
| Дата/время (если отложить) | datetime-picker | — |

---

## 7. Интеграции с ИИ провайдерами

### Абстрактный интерфейс `AIProvider`

```python
class AIProvider(ABC):
    @abstractmethod
    async def generate_text(self, prompt: str, params: dict) -> str:
        pass

    @abstractmethod
    async def generate_image(self, prompt: str, image_base64: str, params: dict) -> bytes:
        pass
```

### Провайдеры

| Провайдер | Задача | Параметры |
|-----------|--------|-----------|
| **GLM** (ZhipuAI) | Текст + Изображения | `GLM_API_KEY` |
| **Qwen / DashScope** | Текст + Изображения | `DASHSCOPE_API_KEY`, `QWEN_TEXT_MODEL`, `QWEN_IMAGE_MODEL` |
| **YandexGPT** | Текст | `YANDEX_API_KEY`, `YANDEX_FOLDER_ID` |
| **Yandex Art** | Изображения | `YANDEX_ART_API_KEY`, `YANDEX_ART_FOLDER_ID` |

Провайдер выбирается пользователем в форме (для текста и изображений — отдельно). Настройки по умолчанию хранятся в `app_settings`.

---

## 8. Интеграции с соцсетями

### VK
- Метод API: `wall.post`
- Параметры: `VK_ACCESS_TOKEN`, `VK_OWNER_ID` (в формате `-XXXXXXX`)
- Прикрепление изображений через `photos.getWallUploadServer` → `photos.saveWallPhoto`

### Telegram
- Bot API метод: `sendMessage` / `sendPhoto` / `sendMediaGroup`
- Параметры: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

### MAX
- REST API
- Параметры: `MAX_ACCESS_TOKEN`, `MAX_CHANNEL_ID`

---

## 9. Пользовательский путь (User Flow)

```
[1. ProductPage]
  Загрузка фото товара
        ↓
[2. TextGenerationPage]
  Заполнение формы → Генерация текста → Ручное редактирование
  (валидация символов в реальном времени)
  Загрузка референса (опционально) — используется при генерации изображений
        ↓
[3. ImageGenerationPage]
  Для каждого слота (1–12):
    - Выбор шаблона промта из библиотеки
    - Редактирование промта
    - Генерация изображения
        ↓
[4. Редактор инфографики] (опционально, для каждого изображения)
  Кнопка «Открыть в редакторе» → открывает внешнее приложение в новой вкладке
  Обмена данными с основным приложением нет (MVP)
  Пользователь сохраняет результат вручную в редакторе
        ↓
[5. Экспорт]
  Скачать Excel / CSV
        ↓
[6. SocialPage] (опционально)
  Форма поста → Генерация → Публикация в VK / Telegram / MAX
```

---

## 10. План работ по спринтам

### Спринт 1 — Фундамент (1 неделя)
- [ ] Инициализация проекта: структура папок, git, docker-compose
- [ ] Настройка FastAPI: роутеры, CORS, обработка ошибок
- [ ] Настройка Peewee + SQLite: создание всех таблиц, миграции
- [ ] Сидирование БД: дефолтные значения `app_settings` (провайдеры, лимиты)
- [ ] Инициализация React-приложения: React Router, axios, базовый layout
- [ ] `GET/PUT /api/settings` — эндпоинты настроек
- [ ] `SettingsPage` — форма сохранения ключей API провайдеров и `EDITOR_URL`
- [ ] `.env.example` с описанием всех переменных

### Спринт 2 — Загрузка и генерация текста (1,5 недели)
- [ ] `POST /api/products` — создание продукта (возвращает id для дальнейших запросов)
- [ ] `POST /api/products/upload-photo` — загрузка и сохранение фото
- [ ] Абстрактный `AIProvider` + реализации GigaChat, YandexGPT, GLM
- [ ] `POST /api/text/generate` — генерация короткого и длинного описания
- [ ] `POST /api/text/validate` — валидация длины текста
- [ ] `GET /api/products/{id}`, `PUT /api/products/{id}` — чтение и сохранение данных
- [ ] `ProductPage` — загрузчик фото с превью
- [ ] `TextGenerationPage` — форма со всеми полями и дефолтами
- [ ] `CharCounter` — счётчик символов с валидацией Ozon / WB в реальном времени
- [ ] `TextEditor` — inline-редактирование текста с сохранением

### Спринт 3 — Генерация изображений и шаблоны (1,5 недели)
- [ ] Реализации провайдеров: Kandinsky, GLM (изображения)
- [ ] `POST /api/images/generate` и `generate-batch`
- [ ] Сидирование БД: 6 дефолтных шаблонов промтов
- [ ] `GET/POST/PUT/DELETE /api/templates`
- [ ] `ImageGenerationPage` — сетка слотов, выбор шаблона, промт, генерация
- [ ] `TemplatesPage` — управление шаблонами (просмотр, создание, редактирование)
- [ ] `POST /api/products/upload-reference` — загрузка референса

### Спринт 4 — Интеграция редактора и экспорт (1 неделя)
- [ ] Добавить `EDITOR_URL` в `.env` и `app_settings`
- [ ] Кнопка «Открыть в редакторе» на `ImageGenerationPage` — открывает `EDITOR_URL` в новой вкладке
- [ ] `GET /api/export/{id}/excel` — генерация .xlsx через openpyxl
- [ ] `GET /api/export/{id}/csv` — генерация .csv
- [ ] Совместимость с шаблонами Ozon / WB (правильные заголовки столбцов)
- [ ] `ExportButton` компонент в UI

### Спринт 5 — Соцсети (1,5 недели)
- [ ] VK сервис: публикация поста с изображениями
- [ ] Telegram сервис: публикация в канал
- [ ] MAX сервис: публикация
- [ ] `POST /api/social/generate-post` — генерация текста поста
- [ ] `POST /api/social/publish` и `schedule`
- [ ] `SocialPage` — форма, превью поста, выбор платформ, публикация

### Спринт 6 — Полировка и развёртывание (1 неделя)
- [ ] Сквозное тестирование всего пользовательского пути
- [ ] Обработка ошибок на всех эндпоинтах (таймауты ИИ, ошибки API соцсетей)
- [ ] Индикаторы загрузки для всех операций генерации
- [ ] `docker-compose.yml` для локального запуска
- [ ] Инструкция по развёртыванию (локально и облако)
- [ ] `README.md` с описанием установки и запуска

---

## 11. Переменные окружения

```env
# ИИ — Текст
GLM_API_KEY=
DASHSCOPE_API_KEY=
QWEN_TEXT_MODEL=qwen3.5-plus
YANDEX_API_KEY=
YANDEX_FOLDER_ID=

# ИИ — Изображения
QWEN_IMAGE_MODEL=qwen-image-plus
YANDEX_ART_API_KEY=
YANDEX_ART_FOLDER_ID=

# Соцсети
VK_ACCESS_TOKEN=
VK_OWNER_ID=                  # формат: -XXXXXXX
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
MAX_ACCESS_TOKEN=
MAX_CHANNEL_ID=

# Приложение
DATABASE_PATH=./data/app.db
UPLOAD_DIR=./data/uploads
EDITOR_URL=https://your-editor-app-url.com   # URL внешнего редактора инфографики
```

---

## 12. Развёртывание

### Локально (docker-compose)

```yaml
version: "3.9"
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    env_file: .env

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

> Редактор инфографики — внешнее приложение, в docker-compose не включается. URL задаётся через `EDITOR_URL` в `.env`.

Запуск: `docker-compose up --build`

### Облако

Поддерживаемые варианты:
- **VPS (Hetzner, DigitalOcean, Yandex Cloud)** — docker-compose, nginx reverse proxy, HTTPS через Let's Encrypt
- **Railway / Render** — автодеплой из git-репозитория

---

*Документ актуален для MVP. Функции, отложенные на v1.1: история генераций, превью карточки, OAuth для соцсетей.*
