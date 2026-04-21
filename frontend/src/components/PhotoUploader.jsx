import { useState, useRef, useEffect } from "react";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_MB  = 10;

/**
 * PhotoUploader
 * Props:
 *   onFile(file)  – вызывается когда пользователь выбрал файл
 *   previewUrl    – URL уже загруженного фото (синхронизируется через useEffect)
 *   label         – текст зоны загрузки
 *   disabled      – bool
 */
export default function PhotoUploader({
  onFile,
  previewUrl = null,
  label = "Загрузить фото",
  disabled = false,
}) {
  const [preview, setPreview]   = useState(previewUrl);
  const [dragging, setDragging] = useState(false);
  const [error, setError]       = useState("");
  // Ref для хранения object URL, чтобы освобождать память
  const objectUrlRef = useRef(null);
  const inputRef     = useRef();

  // Синхронизируем preview с prop previewUrl при его изменении
  useEffect(() => {
    if (previewUrl) setPreview(previewUrl);
  }, [previewUrl]);

  // Fix: освобождаем object URL при размонтировании или при смене preview
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const validate = (file) => {
    if (!file) return "Файл не выбран";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return "Разрешены только JPEG, PNG, WEBP";
    if (file.size > MAX_MB * 1024 * 1024)
      return `Файл слишком большой (максимум ${MAX_MB} МБ)`;
    return null;
  };

  const handleFile = (file) => {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError("");

    // Освобождаем предыдущий object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const localUrl = URL.createObjectURL(file);
    objectUrlRef.current = localUrl;
    setPreview(localUrl);
    onFile?.(file);
  };

  const onInputChange = (e) => handleFile(e.target.files[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="photo-uploader">
      <div
        className={[
          "photo-uploader__zone",
          dragging  ? "photo-uploader__zone--drag"     : "",
          disabled  ? "photo-uploader__zone--disabled" : "",
        ].join(" ")}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {preview ? (
          <img src={preview} alt="Превью товара" className="photo-uploader__preview" />
        ) : (
          <div className="photo-uploader__placeholder">
            <span className="photo-uploader__icon">📷</span>
            <span className="photo-uploader__text">{label}</span>
            <span className="photo-uploader__hint">
              Перетащите или нажмите • JPEG / PNG / WEBP • до {MAX_MB} МБ
            </span>
          </div>
        )}
      </div>

      {preview && !disabled && (
        <button
          className="btn btn-secondary btn-sm"
          style={{ marginTop: 8 }}
          onClick={() => inputRef.current?.click()}
        >
          Заменить фото
        </button>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginTop: 8 }}>{error}</div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: "none" }}
        onChange={onInputChange}
      />
    </div>
  );
}
