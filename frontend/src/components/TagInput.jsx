import { useState } from "react";

/**
 * TagInput — поле ввода ключевых слов тегами
 * Props:
 *   tags      – string[]
 *   onChange  – (tags: string[]) => void
 *   placeholder
 *   disabled
 */
export default function TagInput({
  tags = [],
  onChange,
  placeholder = "Введите слово и нажмите Enter",
  disabled = false,
}) {
  const [input, setInput] = useState("");

  const add = (raw) => {
    const word = raw.trim();
    if (!word || tags.includes(word)) return;
    onChange?.([...tags, word]);
  };

  const remove = (tag) => onChange?.(tags.filter((t) => t !== tag));

  const onKeyDown = (e) => {
    if (["Enter", ","].includes(e.key)) {
      e.preventDefault();
      add(input);
      setInput("");
    } else if (e.key === "Backspace" && input === "" && tags.length) {
      remove(tags[tags.length - 1]);
    }
  };

  const onBlur = () => {
    if (input.trim()) { add(input); setInput(""); }
  };

  return (
    <div className={`tag-input ${disabled ? "tag-input--disabled" : ""}`}>
      {tags.map((tag) => (
        <span key={tag} className="tag-chip">
          {tag}
          {!disabled && (
            <button className="tag-chip__remove" onClick={() => remove(tag)}>×</button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          className="tag-input__field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={tags.length === 0 ? placeholder : ""}
        />
      )}
    </div>
  );
}
