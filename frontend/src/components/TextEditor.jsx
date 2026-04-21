import { useState, useEffect } from "react";
import CharCounter, { getLimit, getStatus } from "./CharCounter";

/**
 * TextEditor
 * Props:
 *   label        – заголовок поля
 *   value        – текущий текст
 *   onChange     – (newText) => void
 *   field        – "short" | "long"
 *   rows         – высота textarea
 */
export default function TextEditor({
  label,
  value = "",
  onChange,
  field = "long",
  rows = 5,
}) {
  const [local, setLocal] = useState(value);

  // Синхронизируем, если пришло новое значение снаружи (после генерации)
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = (e) => {
    setLocal(e.target.value);
    onChange?.(e.target.value);
  };

  const limit  = getLimit("", field);
  const status = getStatus(local.length, limit);

  return (
    <div className={`text-editor text-editor--${status}`}>
      <div className="text-editor__header">
        <label className="text-editor__label">{label}</label>
        <CharCounter text={local} field={field} />
      </div>

      <textarea
        className="text-editor__textarea"
        rows={rows}
        value={local}
        onChange={handleChange}
      />
    </div>
  );
}
