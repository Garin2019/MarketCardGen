# План разработки: Конструктор карточек товаров

> **Стек:** React + TypeScript · Vite · react-konva · Zustand · Tailwind CSS  
> **Деплой:** SPA (только браузер, без бэкенда)  
> **Приоритет:** 🔥 Редактор шаблонов → Создание карточек → Хранение → Экспорт

---

## 📋 Содержание

- [Быстрый старт](#быстрый-старт)
- [Архитектура](#архитектура)
- [Приоритизация](#приоритизация)
- [Спринт 1: Инфраструктура](#спринт-1-инфраструктура)
- [Спринт 2: Редактор шаблонов (основа)](#спринт-2-редактор-шаблонов-основа)
- [Спринт 3: Редактор шаблонов (настройки)](#спринт-3-редактор-шаблонов-настройки)
- [Спринт 4: Хранение шаблонов](#спринт-4-хранение-шаблонов)
- [Спринт 5: Создание карточек](#спринт-5-создание-карточек)
- [Спринт 6: Экспорт и финализация](#спринт-6-экспорт-и-финализация)
- [TypeScript интерфейсы](#typescript-интерфейсы)
- [Примеры промптов](#примеры-промптов)
- [Риски и решения](#риски-и-решения)

---

## 🚀 Быстрый старт

### Инициализация проекта

```bash
npm create vite@latest card-maker -- --template react-ts
cd card-maker
npm install

# Основные зависимости
npm install zustand react-konva konva react-router-dom file-saver uuid
npm install -D tailwindcss postcss autoprefixer
npm install -D @types/uuid @types/file-saver

# Настройка Tailwind
npx tailwindcss init -p
```

### Структура проекта

```
src/
├── App.tsx                    # Router + Layout
├── main.tsx
├── types/
│   └── index.ts               # Template, Container, FontSettings
├── store/
│   ├── templatesStore.ts      # CRUD шаблонов + localStorage
│   ├── templateEditorStore.ts # 🔥 Редактор шаблона (Приоритет 1)
│   └── cardEditorStore.ts     # Редактор карточки (Приоритет 2)
├── pages/
│   ├── StartPage.tsx
│   ├── TemplatesPage.tsx
│   ├── TemplateNewPage.tsx    # 🔥 Приоритет 1
│   ├── TemplateEditPage.tsx   # 🔥 Приоритет 1
│   ├── CardNewPage.tsx
│   └── CardEditPage.tsx
├── components/
│   ├── Layout.tsx
│   ├── TemplateCanvas.tsx     # 🔥 Основной редактор
│   ├── ContainerShape.tsx
│   ├── PropertiesPanel.tsx    # 🔥 Панель настроек
│   ├── ImageUploader.tsx
│   ├── TemplateSelector.tsx
│   ├── CardCanvas.tsx
│   └── SaveTemplateModal.tsx
└── utils/
    ├── exportPng.ts
    ├── templateStorage.ts
    └── validation.ts
```

---

## 🏗️ Архитектура

### Роутинг

| Путь | Компонент | Приоритет | Описание |
|------|-----------|-----------|----------|
| `/` | StartPage | Низкий | Главная страница |
| `/templates` | TemplatesPage | 3 | Список шаблонов |
| `/templates/new` | TemplateNewPage | 🔥 1 | Создание шаблона |
| `/templates/:id/edit` | TemplateEditPage | 🔥 1 | Редактирование шаблона |
| `/card/new` | CardNewPage | 2 | Загрузка фото + выбор шаблона |
| `/card/edit` | CardEditPage | 2/4 | Редактор карточки + экспорт |

### Схема данных (JSON)

```json
{
  "id": "uuid-v4",
  "name": "Название шаблона",
  "width": 800,
  "height": 600,
  "createdAt": "2025-03-02T10:00:00Z",
  "containers": [
    {
      "id": "uuid",
      "shape": "rect",
      "x": 20,
      "y": 20,
      "width": 300,
      "height": 80,
      "zIndex": 1,
      "bgColor": "#ffffff",
      "bgOpacity": 0.85,
      "paddingX": 12,
      "paddingY": 8,
      "font": {
        "family": "Roboto",
        "size": 18,
        "color": "#222222",
        "bold": false,
        "italic": false
      },
      "placeholder": "Введите текст"
    }
  ]
}
```

---

## ⚡ Приоритизация

| Приоритет | Функционал | Спринты |
|-----------|-----------|---------|
| 🔥 **1** | Редактор шаблонов (холст, контейнеры, свойства, слои) | 2-3 |
| **2** | Создание карточки с загрузкой фото + редактор | 5 |
| **3** | Хранение шаблонов в JSON + localStorage | 4 |
| **4** | Экспорт готовой карточки в PNG | 6 |

---

## 📦 Спринт 1: Инфраструктура

**Длительность:** 4 дня  
**Цель:** Готовый проект с роутингом и заглушками страниц

### Чек-лист

- [ ] Инициализация Vite + React + TypeScript
- [ ] Установка зависимостей
- [ ] Настройка Tailwind CSS
- [ ] Создание структуры папок
- [ ] Определение TypeScript интерфейсов
- [ ] Настройка React Router
- [ ] Компонент Layout с навигацией
- [ ] Заглушки для всех страниц

### Задача 1.1: Настройка проекта

**Prompt для AI:**
```
Создай новый проект на Vite с React и TypeScript.
Установи и настрой:
- Tailwind CSS с конфигом для кастомных цветов
- React Router v6
- Zustand для state management
- react-konva для canvas

Создай базовую структуру папок:
- src/pages
- src/components
- src/store
- src/types
- src/utils

В tailwind.config.js добавь кастомную палитру:
- primary: синий (#2E5F9A)
- secondary: оранжевый (#FF6B35)
- neutral: серый (#F5F5F5)
```

### Задача 1.2: TypeScript интерфейсы

Создай файл `src/types/index.ts` со всеми интерфейсами (см. раздел [TypeScript интерфейсы](#typescript-интерфейсы))

### Задача 1.3: Роутинг

**Prompt для AI:**
```
Создай React Router настройку в App.tsx:
- BrowserRouter
- Routes для 6 страниц: /, /templates, /templates/new, /templates/:id/edit, /card/new, /card/edit
- Компонент Layout с хедером и навигацией
- Используй Tailwind для стилизации навигации

Навигация должна содержать ссылки:
- "Шаблоны" → /templates
- "Создать карточку" → /card/new

Создай заглушки для всех страниц с названием страницы и коротким описанием.
```

---

## 🔥 Спринт 2: Редактор шаблонов (основа)

**Длительность:** 5 дней  
**Приоритет:** 🔥 1  
**Цель:** Рабочий холст с drag-and-drop контейнерами

### Чек-лист

- [ ] Компонент TemplateCanvas с react-konva Stage
- [ ] Форма задания размера холста
- [ ] Zustand store для редактора шаблона
- [ ] Кнопка "Добавить блок"
- [ ] Контейнеры с drag-and-drop
- [ ] Konva Transformer для resize
- [ ] Выделение контейнера кликом
- [ ] Рендер трёх типов форм: rect, oval, circle

### Задача 2.1: Zustand store для редактора

**Prompt для AI:**
```
Создай Zustand store в src/store/templateEditorStore.ts для редактора шаблонов.

Store должен содержать:
- canvasWidth, canvasHeight (число)
- containers (массив Container[])
- selectedContainerId (string | null)

Actions:
- setCanvasSize(width, height)
- addContainer() - добавляет контейнер с дефолтными параметрами
- updateContainer(id, updates) - обновляет свойства контейнера
- deleteContainer(id)
- selectContainer(id)
- moveContainerForward(id) - увеличивает zIndex
- moveContainerBackward(id) - уменьшает zIndex

Используй TypeScript интерфейсы из src/types/index.ts
```

### Задача 2.2: Холст редактора

**Prompt для AI:**
```
Создай компонент TemplateNewPage в src/pages/TemplateNewPage.tsx.

Компонент должен содержать:
1. Форму задания размера холста (2 input[type="number"] для ширины и высоты)
2. Кнопку "Добавить блок"
3. Компонент TemplateCanvas (создай отдельно)

TemplateCanvas использует react-konva:
- Stage с размером из templateEditorStore
- Layer с фоном (rect с fill="#f5f5f5")
- Для каждого контейнера из store - рендер ContainerShape (создай отдельно)

Используй Tailwind для layout: левая боковая панель с кнопками, основная область с canvas.
```

### Задача 2.3: Контейнер с drag-and-drop

**Prompt для AI:**
```
Создай компонент ContainerShape в src/components/ContainerShape.tsx.

Props: container (Container), isSelected (boolean), onSelect, onUpdate

Компонент рендерит:
- Konva.Rect если shape === 'rect'
- Konva.Ellipse если shape === 'oval'
- Konva.Circle если shape === 'circle'

Все фигуры должны:
- Иметь fill = bgColor, opacity = bgOpacity
- Быть draggable
- При onDragEnd обновлять x, y в store через onUpdate
- При onClick вызывать onSelect

Если isSelected === true, добавь Konva.Transformer для resize.
При onTransformEnd обновляй width, height в store.
```

---

## 🔥 Спринт 3: Редактор шаблонов (настройки)

**Длительность:** 6 дней  
**Приоритет:** 🔥 1  
**Цель:** Полная настройка контейнеров через UI

### Чек-лист

- [ ] Компонент PropertiesPanel
- [ ] Секция выбора формы (rect/oval/circle)
- [ ] Color picker для bgColor
- [ ] Range slider для opacity
- [ ] Inputs для paddingX, paddingY
- [ ] Select для font family
- [ ] Input для font size
- [ ] Color picker для font color
- [ ] Checkboxes для bold, italic
- [ ] Input для placeholder
- [ ] Кнопки управления z-index

### Задача 3.1: Панель свойств

**Prompt для AI:**
```
Создай компонент PropertiesPanel в src/components/PropertiesPanel.tsx.

Props: containerId (string | null)

Если containerId === null, показать "Выберите контейнер для настройки".

Иначе получить container из templateEditorStore и показать форму со всеми свойствами:

**Секция "Форма":**
- 3 radio button: Прямоугольник, Овал, Круг
- При изменении → updateContainer(id, { shape: ... })

**Секция "Фон":**
- <input type="color"> для bgColor
- <input type="range" min="0" max="1" step="0.01"> для bgOpacity
- Label показывает текущее значение прозрачности в %

**Секция "Отступы":**
- 2 number input для paddingX, paddingY

**Секция "Шрифт":**
- <select> с вариантами: Roboto, Open Sans, Lato, Montserrat, Arial
- <input type="number"> для size
- <input type="color"> для color
- 2 checkbox: "Жирный", "Курсив"

**Секция "Текст":**
- <input type="text"> для placeholder

Используй Tailwind для красивых форм с labels и отступами.
```

### Задача 3.2: Управление слоями

**Prompt для AI:**
```
Добавь в PropertiesPanel секцию "Слои" с двумя кнопками:
- "На передний план" → вызывает moveContainerForward(id)
- "На задний план" → вызывает moveContainerBackward(id)

В templateEditorStore реализуй логику:
- moveContainerForward увеличивает zIndex на 1
- moveContainerBackward уменьшает zIndex на 1
- После изменения пересортируй массив контейнеров по zIndex

Кнопки должны быть disabled если контейнер уже максимальный/минимальный по zIndex.
```

---

## 📂 Спринт 4: Хранение шаблонов

**Длительность:** 5 дней  
**Приоритет:** 3  
**Цель:** Сохранение, список, CRUD, экспорт/импорт JSON

### Чек-лист

- [ ] Zustand store для шаблонов
- [ ] localStorage синхронизация
- [ ] Модальное окно сохранения
- [ ] Валидация уникальности имени
- [ ] Страница списка шаблонов
- [ ] Превью шаблонов
- [ ] Удаление шаблона
- [ ] Экспорт в JSON
- [ ] Импорт из JSON

### Задача 4.1: Store шаблонов

**Prompt для AI:**
```
Создай Zustand store в src/store/templatesStore.ts.

State:
- templates (Template[])

Actions:
- loadTemplates() - загружает из localStorage
- saveTemplate(template) - добавляет/обновляет + сохраняет в localStorage
- deleteTemplate(id) - удаляет + обновляет localStorage
- getTemplateById(id) - возвращает Template | undefined

При инициализации автоматически вызывай loadTemplates().

Создай utils/templateStorage.ts с функциями:
- saveToLocalStorage(templates)
- loadFromLocalStorage() → Template[]
- exportToJSON(template) → скачивает файл
- importFromJSON(file) → Promise<Template>
```

### Задача 4.2: Сохранение шаблона

**Prompt для AI:**
```
Создай компонент SaveTemplateModal в src/components/SaveTemplateModal.tsx.

Props: isOpen, onClose, onSave

Модальное окно с:
- Input для имени шаблона
- Валидация: имя не должно совпадать с существующими шаблонами
- Кнопка "Сохранить" (disabled если имя невалидно)
- Кнопка "Отмена"

При клике "Сохранить":
1. Создать объект Template из templateEditorStore
2. Сгенерировать uuid для id
3. Добавить createdAt
4. Вызвать onSave(template)
5. Закрыть модалку

Используй Tailwind для стилизации модального окна.
```

### Задача 4.3: Список шаблонов

**Prompt для AI:**
```
Создай компонент TemplatesPage в src/pages/TemplatesPage.tsx.

Страница содержит:
1. Заголовок "Мои шаблоны"
2. Кнопка "Создать новый" → Link на /templates/new
3. Кнопка "Импортировать JSON" → input[type=file]
4. Grid карточек шаблонов (используй grid-cols-3 gap-4)

Каждая карточка шаблона:
- Превью (статичный canvas 200×150 с контейнерами)
- Название
- Дата создания (format: dd.MM.yyyy)
- Кнопка "Редактировать" → Link на /templates/:id/edit
- Кнопка "Удалить" (с confirm диалогом)
- Кнопка "Экспорт JSON"

Если шаблонов нет, показать empty state с иллюстрацией и текстом "Создайте первый шаблон".
```

---

## 🖼️ Спринт 5: Создание карточек

**Длительность:** 6 дней  
**Приоритет:** 2  
**Цель:** Загрузка фото, выбор шаблона, редактор с вводом текста

### Чек-лист

- [ ] Zustand store для карточки
- [ ] Компонент загрузки изображения
- [ ] Валидация файлов
- [ ] Компонент выбора шаблона
- [ ] Canvas редактора карточки
- [ ] Ввод текста в контейнеры
- [ ] Рендер текста на canvas

### Задача 5.1: Store карточки

**Prompt для AI:**
```
Создай Zustand store в src/store/cardEditorStore.ts.

State:
- image (string | null) - base64
- selectedTemplateId (string | null)
- containerTexts (Record<string, string>) - containerId → text

Actions:
- setImage(base64)
- selectTemplate(id)
- updateText(containerId, text)
- reset()

Создай также getter:
- getTemplate() - получает Template из templatesStore по selectedTemplateId
```

### Задача 5.2: Загрузка изображения

**Prompt для AI:**
```
Создай компонент ImageUploader в src/components/ImageUploader.tsx.

Компонент должен:
1. Drag-and-drop зону (используй onDrop, onDragOver)
2. Input[type=file] accept="image/png,image/jpeg"
3. Валидацию:
   - Тип файла (только PNG, JPEG)
   - Размер ≤ 10 МБ
4. Превью загруженного изображения
5. При успехе → FileReader → base64 → cardEditorStore.setImage()

Показывать ошибки валидации красным текстом под загрузчиком.

Создай utils/validation.ts с функциями:
- validateImageFile(file) → { valid: boolean, error?: string }
```

### Задача 5.3: Редактор карточки

**Prompt для AI:**
```
Создай компонент CardEditPage в src/pages/CardEditPage.tsx.

Layout:
- Левая панель (300px): список контейнеров с textarea для каждого
- Центр: CardCanvas
- Правая панель (200px): кнопка "Скачать PNG"

CardCanvas (создай отдельно в components/CardCanvas.tsx):
- Stage с размером из template
- Layer 1: Image (загруженное фото, масштабированное под canvas)
- Layer 2: Контейнеры (Rect/Ellipse/Circle с bgColor, bgOpacity)
- Layer 3: Text для каждого контейнера

Для каждого контейнера в левой панели:
- Label с placeholder контейнера
- Textarea для ввода текста
- При onChange → cardEditorStore.updateText(id, value)

Text на canvas:
- Позиция: x + paddingX, y + paddingY
- Размер: width - 2*paddingX
- Стиль из container.font
- Текст: containerTexts[id] || placeholder (серым цветом если placeholder)
```

---

## 💾 Спринт 6: Экспорт и финализация

**Длительность:** 6 дней  
**Приоритет:** 4 + полировка  
**Цель:** Экспорт PNG, главная страница, тесты, UX

### Чек-лист

- [ ] Функция экспорта PNG
- [ ] Предзагрузка шрифтов
- [ ] Главная страница
- [ ] Проверка наличия шаблонов
- [ ] Адаптивность
- [ ] Error boundaries
- [ ] Loading states
- [ ] Keyboard shortcuts
- [ ] Документация

### Задача 6.1: Экспорт PNG

**Prompt для AI:**
```
Создай функцию exportPng в src/utils/exportPng.ts.

Функция принимает:
- stage (Konva.Stage)
- filename (string)

Логика:
1. stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' })
2. Конвертация dataURL в Blob:
   - fetch(dataURL) → response.blob()
3. saveAs(blob, filename) через библиотеку file-saver

Перед экспортом убедись что все шрифты загружены:
- Используй FontFaceObserver
- Ждём загрузку всех шрифтов из template.containers
- Показываем loading во время ожидания

Добавь кнопку "Скачать PNG" в CardEditPage, которая:
- Показывает loader
- Вызывает exportPng
- Скрывает loader
- Показывает toast "Карточка скачана"
```

### Задача 6.2: Главная страница

**Prompt для AI:**
```
Создай компонент StartPage в src/pages/StartPage.tsx.

Дизайн:
- Hero секция с заголовком "Создавайте карточки товаров легко"
- Две большие кнопки:
  1. "Создать карточку" → /card/new
  2. "Настройка шаблонов" → /templates

Логика:
- Получить количество шаблонов из templatesStore
- Если шаблонов === 0:
  - Кнопка "Создать карточку" disabled
  - Показать подсказку: "Сначала создайте хотя бы один шаблон"
  - Предложить кнопку "Создать первый шаблон" → /templates/new

Добавь иконки из lucide-react для кнопок.
Используй Tailwind для красивого hero с градиентом.
```

### Задача 6.3: UX доработка

**Промпты для разных улучшений:**

**Error Boundary:**
```
Создай компонент ErrorBoundary с react error boundary pattern.
Оберни весь App в ErrorBoundary.
При ошибке показывай красивую страницу с кнопкой "Перезагрузить".
```

**Loading States:**
```
Добавь Suspense + React.lazy для всех страниц.
Создай компонент LoadingSpinner.
Показывай spinner при загрузке страниц и больших операциях.
```

**Keyboard Shortcuts:**
```
В TemplateEditorPage добавь обработчики клавиш:
- Delete → удалить выделенный контейнер
- Escape → снять выделение
- Ctrl+S → сохранить шаблон
- Ctrl+D → дублировать контейнер

Используй useEffect с addEventListener('keydown').
```

---

## 📘 TypeScript интерфейсы

```typescript
// src/types/index.ts

export type ShapeType = 'rect' | 'oval' | 'circle';

export interface FontSettings {
  family: string;
  size: number;
  color: string;
  bold: boolean;
  italic: boolean;
}

export interface Container {
  id: string;
  shape: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  bgColor: string;
  bgOpacity: number;
  paddingX: number;
  paddingY: number;
  font: FontSettings;
  placeholder: string;
}

export interface Template {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: string;
  containers: Container[];
}

export interface CardState {
  image: string | null;
  selectedTemplateId: string | null;
  containerTexts: Record<string, string>;
}

export interface TemplateEditorState {
  canvasWidth: number;
  canvasHeight: number;
  containers: Container[];
  selectedContainerId: string | null;
}
```

---

## 🤖 Примеры промптов для AI

### Создание компонента с нуля

```
Создай React компонент [ИМЯ] в [ПУТЬ].

Функционал:
- [описание основной задачи]
- [дополнительные фичи]

Props:
- prop1 (тип): описание
- prop2 (тип): описание

State:
- [если нужен локальный стейт]

Используй:
- TypeScript для типизации
- Tailwind CSS для стилей
- [библиотеки если нужны]

Дополнительные требования:
- [accessibility]
- [responsive]
- [error handling]
```

### Рефакторинг существующего кода

```
Отрефактори компонент [ИМЯ] в [ПУТЬ].

Проблемы:
- [что не так сейчас]

Требования:
- Улучши [что конкретно]
- Добавь [новый функционал]
- Оптимизируй [производительность]

Сохрани:
- Существующий API (props)
- Типизацию
- Стили
```

### Отладка

```
В компоненте [ИМЯ] есть баг: [описание проблемы].

Ожидаемое поведение: [что должно быть]
Фактическое поведение: [что происходит]

Код компонента:
[вставь код]

Найди и исправь ошибку. Объясни что было не так.
```

---

## ⚠️ Риски и решения

### Шрифты на Canvas

**Проблема:** Шрифты могут не загрузиться до рендера.

**Решение:**
```typescript
// utils/fontLoader.ts
import FontFaceObserver from 'fontfaceobserver';

export async function loadFonts(fontFamilies: string[]): Promise<void> {
  const promises = fontFamilies.map(family => {
    const font = new FontFaceObserver(family);
    return font.load(null, 5000); // timeout 5s
  });
  
  await Promise.all(promises);
}
```

### Большие изображения

**Проблема:** Изображения >10 МБ вызывают зависание.

**Решение:**
```typescript
// utils/imageProcessor.ts
export async function compressImage(file: File, maxSizeMB: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Уменьшаем если больше 1920px
        if (width > 1920) {
          height = (height * 1920) / width;
          width = 1920;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
```

### localStorage лимит

**Проблема:** Переполнение при большом числе шаблонов.

**Решение:**
- Не храните base64 превью в JSON
- Генерируйте превью динамически при отображении
- Добавьте проверку доступного места:

```typescript
function getLocalStorageSize(): number {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

function canSaveTemplate(template: Template): boolean {
  const size = JSON.stringify(template).length;
  const available = 5 * 1024 * 1024 - getLocalStorageSize(); // 5MB limit
  return size < available;
}
```

---

## 📝 Дополнительные материалы

### Полезные ссылки

- [React Konva Docs](https://konvajs.org/docs/react/)
- [Zustand Guide](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Router v6](https://reactrouter.com/en/main)

### Команды для разработки

```bash
# Запуск dev сервера
npm run dev

# Сборка
npm run build

# Превью production билда
npm run preview

# Линтинг
npm run lint

# Форматирование
npm run format
```

### Готовые сниппеты

**Zustand store шаблон:**
```typescript
import { create } from 'zustand';

interface State {
  // state
}

interface Actions {
  // actions
}

export const useStore = create<State & Actions>((set, get) => ({
  // initial state
  // actions
}));
```

**React component шаблон:**
```typescript
import React from 'react';

interface Props {
  // props
}

export const Component: React.FC<Props> = ({ }) => {
  // hooks
  // handlers
  
  return (
    <div className="">
      {/* content */}
    </div>
  );
};
```

---

## ✅ Критерии готовности (Definition of Done)

Для каждой задачи:
- [ ] Код написан согласно TypeScript интерфейсам
- [ ] Нет ошибок TypeScript
- [ ] Компонент покрыт PropTypes/интерфейсами
- [ ] Используется Tailwind для стилей
- [ ] Нет console.log в финальном коде
- [ ] Компонент адаптивный (минимум 1280px)
- [ ] Добавлены aria-labels для доступности
- [ ] Обработаны edge cases
- [ ] Код прокомментирован где необходимо

---

## 🎯 Итоговая оценка

**Общая длительность:** ~30 рабочих дней (6 спринтов × 5 дней)

**Распределение по приоритетам:**
- 🔥 Приоритет 1 (Редактор шаблонов): 11 дней
- Приоритет 2 (Создание карточек): 6 дней
- Приоритет 3 (Хранение): 5 дней
- Приоритет 4 (Экспорт + полировка): 6 дней
- Инфраструктура: 4 дня

**Минимальный MVP:** Спринты 1-4 (20 дней)
**Полная версия:** Все спринты (30 дней)
