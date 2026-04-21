import { useState } from "react";

/**
 * PromptTemplateSelector — контролируемый select с группировкой шаблонов.
 * При выборе шаблона подставляет промт и сбрасывается в placeholder.
 * Props:
 *   templates – массив шаблонов из API
 *   onSelect  – (template) => void
 *   disabled  – bool
 */
export default function PromptTemplateSelector({ templates = [], onSelect, disabled = false }) {
  // Контролируемый компонент: value="" = placeholder
  const [selected, setSelected] = useState("");

  const handleChange = (e) => {
    const id = Number(e.target.value);
    if (!id) return;
    const tpl = templates.find((t) => t.id === id);
    if (tpl) onSelect?.(tpl);
    // Сбрасываем в placeholder после выбора
    setSelected("");
  };

  return (
    <select
      className="template-selector"
      value={selected}
      onChange={handleChange}
      disabled={disabled || templates.length === 0}
    >
      <option value="" disabled>
        {templates.length === 0 ? "Шаблоны не загружены" : "Выбрать шаблон…"}
      </option>

      {templates.filter((t) => t.is_default).length > 0 && (
        <optgroup label="Системные">
          {templates
            .filter((t) => t.is_default)
            .map((t) => (
              <option key={t.id} value={t.id} title={t.description}>
                {t.name}
              </option>
            ))}
        </optgroup>
      )}

      {templates.filter((t) => !t.is_default).length > 0 && (
        <optgroup label="Мои шаблоны">
          {templates
            .filter((t) => !t.is_default)
            .map((t) => (
              <option key={t.id} value={t.id} title={t.description}>
                {t.name}
              </option>
            ))}
        </optgroup>
      )}
    </select>
  );
}
