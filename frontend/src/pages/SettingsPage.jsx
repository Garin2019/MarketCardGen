import { useState, useEffect } from "react";
import { clearUploadsFolder, getSettingsMeta, updateSettings } from "../api/settings";

const SECTIONS = [
  {
    title: "ИИ - Генерация текста",
    fields: [
      {
        key: "default_text_provider",
        label: "Провайдер по умолчанию",
        type: "select",
        options: [
          { value: "qwen", label: "Qwen" },
          { value: "minimax", label: "MiniMax" },
          { value: "openai", label: "OpenAI" },
          { value: "openrouter", label: "OpenRouter" },
        ],
      },
    ],
  },
  {
    title: "ИИ - Генерация изображений",
    fields: [
      {
        key: "default_image_provider",
        label: "Провайдер по умолчанию",
        type: "select",
        options: [
          { value: "qwen", label: "Qwen Image" },
          { value: "minimax", label: "MiniMax Image" },
          { value: "openai", label: "OpenAI Image" },
        ],
      },
    ],
  },
  {
    title: "Дефолты карточки",
    fields: [
      {
        key: "default_tone",
        label: "Тональность описания",
        type: "select",
        options: [
          { value: "formal", label: "Формальный" },
          { value: "expert", label: "Экспертный" },
          { value: "emotional", label: "Эмоциональный" },
          { value: "friendly", label: "Дружелюбный" },
        ],
      },
      {
        key: "default_text_temperature",
        label: "Температура ИИ для описаний",
        type: "number",
        placeholder: "0.7",
      },
      {
        key: "product_categories",
        label: "Категории товара",
        type: "textarea",
        placeholder: "Одна категория на строку",
        rows: 8,
      },
      { key: "default_short_length", label: "Короткое описание (символов)", type: "number" },
      { key: "default_long_length", label: "Длинное описание (символов)", type: "number" },
      {
        key: "default_post_tone",
        label: "Тональность постов",
        type: "select",
        options: [
          { value: "formal", label: "Формальный" },
          { value: "expert", label: "Экспертный" },
          { value: "emotional", label: "Эмоциональный" },
          { value: "friendly", label: "Дружелюбный" },
        ],
      },
      { key: "default_post_size", label: "Размер поста (слов)", type: "number" },
    ],
  },
];

const ENV_HINTS = [
  { key: "openai", label: "OpenAI" },
  { key: "qwen", label: "Qwen / DashScope" },
  { key: "minimax", label: "MiniMax" },
  { key: "openrouter", label: "OpenRouter" },
  { key: "vk", label: "VK" },
  { key: "telegram", label: "Telegram" },
  { key: "max", label: "MAX" },
];

export default function SettingsPage() {
  const [values, setValues] = useState({});
  const [envStatus, setEnvStatus] = useState({});
  const [uploadsInfo, setUploadsInfo] = useState(null);
  const [generationStats, setGenerationStats] = useState({ text: 0, images: 0, posts: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearingUploads, setClearingUploads] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getSettingsMeta()
      .then((data) => {
        setValues(data.settings || {});
        setEnvStatus(data.env_status || {});
        setUploadsInfo(data.uploads || null);
        setGenerationStats(data.generation_stats || { text: 0, images: 0, posts: 0 });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      await updateSettings(values);
      setSavedMsg("Настройки сохранены");
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearUploads = async () => {
    const confirmed = window.confirm(
      "Очистить папку data/uploads? Это удалит все загруженные и сгенерированные изображения без возможности восстановления."
    );
    if (!confirmed) return;

    setClearingUploads(true);
    setError("");
    setSavedMsg("");
    try {
      const result = await clearUploadsFolder();
      setUploadsInfo(result.uploads || null);
      setSavedMsg("Папка data/uploads очищена");
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setClearingUploads(false);
    }
  };

  const formatSize = (bytes) => {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} Б`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
  };

  if (loading) return <div className="page-loading">Загрузка настроек…</div>;

  return (
    <div className="page settings-page">
      <h1>Настройки</h1>
      <p className="page-subtitle">
        Настройки интерфейса и дефолтов сохраняются в базе. Секретные API-ключи остаются в{" "}
        <code>.env</code> и здесь отображаются только как статус готовности интеграций.
      </p>

      <section className="settings-section">
        <h2>Статус ключей и каналов</h2>
        <div className="settings-status-grid">
          {ENV_HINTS.map((item) => (
            <div key={item.key} className="settings-status-item">
              <span className="settings-status-item__label">{item.label}</span>
              <strong
                className={`settings-status-item__value ${
                  envStatus[item.key] ? "settings-status-item__value--ok" : "settings-status-item__value--error"
                }`}
              >
                {envStatus[item.key] ? "Настроено" : "Не настроено"}
              </strong>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2>Папка изображений</h2>
        <div className="settings-storage-grid">
          <div className="settings-storage-row">
            <span className="settings-storage-row__label">Путь в проекте</span>
            <span className="settings-storage-row__value">{uploadsInfo?.path || "data/uploads"}</span>
          </div>
          <div className="settings-storage-row">
            <span className="settings-storage-row__label">Абсолютный путь</span>
            <span className="settings-storage-row__value">{uploadsInfo?.absolute_path || "-"}</span>
          </div>
          <div className="settings-storage-row">
            <span className="settings-storage-row__label">Количество файлов</span>
            <span className="settings-storage-row__value">{uploadsInfo?.files_count ?? 0}</span>
          </div>
          <div className="settings-storage-row">
            <span className="settings-storage-row__label">Общий размер</span>
            <span className="settings-storage-row__value">
              {formatSize(uploadsInfo?.total_size_bytes)}
            </span>
          </div>
        </div>
        <p className="form-hint" style={{ marginBottom: 16 }}>
          Очистка удаляет все файлы из папки <code>data/uploads</code>, включая загруженные
          пользователем фото и сгенерированные изображения.
        </p>
        <button
          className="btn btn-danger"
          onClick={handleClearUploads}
          disabled={clearingUploads}
        >
          {clearingUploads ? "Очистка…" : "Очистить папку"}
        </button>
      </section>

      {SECTIONS.map((section, index) => (
        <div key={section.title}>
          <section className="settings-section">
            <h2>{section.title}</h2>
            {section.fields.map((field) => (
              <div key={field.key} className="form-group">
                <label htmlFor={field.key}>{field.label}</label>
                {field.type === "select" ? (
                  <select
                    id={field.key}
                    value={values[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  >
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    id={field.key}
                    rows={field.rows ?? 6}
                    value={values[field.key] ?? ""}
                    placeholder={field.placeholder ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                ) : (
                  <input
                    id={field.key}
                    type={field.type}
                    value={values[field.key] ?? ""}
                    placeholder={field.placeholder ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </section>

          {index === 1 && (
            <section className="settings-section">
              <h2>Статистика генераций</h2>
              <div className="settings-storage-grid">
                <div className="settings-storage-row">
                  <span className="settings-storage-row__label">Генерация описаний</span>
                  <span className="settings-storage-row__value">{generationStats.text ?? 0}</span>
                </div>
                <div className="settings-storage-row">
                  <span className="settings-storage-row__label">Генерация изображений</span>
                  <span className="settings-storage-row__value">{generationStats.images ?? 0}</span>
                </div>
                <div className="settings-storage-row">
                  <span className="settings-storage-row__label">Генерация статей</span>
                  <span className="settings-storage-row__value">{generationStats.posts ?? 0}</span>
                </div>
              </div>
              <p className="form-hint">
                Счетчики накапливаются между сессиями и увеличиваются после успешной генерации.
              </p>
            </section>
          )}
        </div>
      ))}

      {error && <div className="alert alert-error">{error}</div>}
      {savedMsg && <div className="alert alert-success">{savedMsg}</div>}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? "Сохранение…" : "Сохранить настройки"}
      </button>
    </div>
  );
}
