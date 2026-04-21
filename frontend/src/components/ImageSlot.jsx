import { useState, useEffect } from "react";
import PromptTemplateSelector from "./PromptTemplateSelector";

/**
 * ImageSlot — один слот изображения в сетке
 * Props:
 *   slotNumber  – номер слота (1–12)
 *   image       – объект изображения из API или null
 *   templates   – список шаблонов
 *   onGenerate  – async (prompt, templateId) => void
 *   onDelete    – async () => void
 *   onMoveUp    – () => void
 *   onMoveDown  – () => void
 *   isFirst     – bool
 *   isLast      – bool
 */
export default function ImageSlot({
  slotNumber,
  image,
  templates,
  onGenerate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  moveDisabled = false,
}) {
  const [prompt,      setPrompt]      = useState(image?.prompt || "");
  const [templateId,  setTemplateId]  = useState(image?.template_id || null);
  const [generating,  setGenerating]  = useState(false);
  const [error,       setError]       = useState("");

  // Синхронизируем prompt при загрузке страницы с существующими изображениями
  useEffect(() => {
    setPrompt(image?.prompt || "");
    setTemplateId(image?.template_id || null);
  }, [image?.id]);

  const handleTemplateSelect = (tpl) => {
    setPrompt(tpl.prompt_text);
    setTemplateId(tpl.id);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError("Введите промт для генерации"); return; }
    setError(""); setGenerating(true);
    try {
      await onGenerate(prompt.trim(), templateId);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Удалить изображение?")) return;
    try {
      await onDelete();
      setPrompt("");
      setTemplateId(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDownload = () => {
    if (!image?.image_url) return;
    const link = document.createElement("a");
    link.href = image.image_url;
    link.download = `product-image-${slotNumber}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className={`image-slot ${image ? "image-slot--filled" : "image-slot--empty"}`}>
      {/* Заголовок слота */}
      <div className="image-slot__header">
        <span className="image-slot__number">#{slotNumber}</span>
        {image && (
          <div className="image-slot__order-btns">
            <button
              className="btn-icon" title="Переместить вверх"
              onClick={onMoveUp} disabled={isFirst || moveDisabled}
            >↑</button>
            <button
              className="btn-icon" title="Переместить вниз"
              onClick={onMoveDown} disabled={isLast || moveDisabled}
            >↓</button>
          </div>
        )}
      </div>

      {/* Превью изображения или placeholder */}
      <div className="image-slot__preview">
        {image ? (
          <img src={image.image_url} alt={`Изображение ${slotNumber}`} />
        ) : (
          <div className="image-slot__placeholder">
            {generating
              ? <><span className="spinner spinner--lg" /><p>Генерация…</p></>
              : <span className="image-slot__icon">🖼️</span>
            }
          </div>
        )}
      </div>

      {/* Выбор шаблона */}
      <div className="image-slot__controls">
        <PromptTemplateSelector
          templates={templates}
          onSelect={handleTemplateSelect}
          disabled={generating}
        />

        {/* Поле промта */}
        <textarea
          className="image-slot__prompt"
          rows={3}
          placeholder="Опишите желаемое изображение…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={generating}
        />

        {error && <div className="alert alert-error">{error}</div>}

        {/* Кнопки действий */}
        <div className="image-slot__actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
          >
            {generating ? <><span className="spinner" /> Генерация…</> : "✨ Сгенерировать"}
          </button>

          {image && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleDownload}
                disabled={generating}
              >
                💾 Сохранить
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
                disabled={generating}
              >
                🗑
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
