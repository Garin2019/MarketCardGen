import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PhotoUploader from "../components/PhotoUploader";
import { createProduct, uploadPhoto } from "../api/products";

export default function ProductPage() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");

  const handleFile = async (file) => {
    setError("");
    setUploading(true);
    try {
      const product = await createProduct();
      await uploadPhoto(product.id, file);
      navigate(`/product/${product.id}/text`);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page product-page">
      <h1>Новая карточка товара</h1>
      <p className="page-subtitle">
        Загрузите фото товара - ИИ автоматически создаст описание и материалы для карточки.
      </p>

      <div className="upload-card">
        <PhotoUploader
          onFile={handleFile}
          label="Загрузить фото товара"
          disabled={uploading}
        />
        {uploading && (
          <div className="upload-card__loading">
            <span className="spinner" /> Загрузка…
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
      </div>

      <div className="tips-card">
        <h2>Советы для лучшего результата</h2>
        <ul>
          <li><strong>Лучше всего подойдут фото на белом или нейтральном фоне</strong></li>
          <li>Используйте фото с чётким изображением товара</li>
          <li>Разрешение от 800×800 пикселей</li>
          <li>Форматы: JPEG, PNG, WEBP до 10 МБ</li>
        </ul>
      </div>
    </div>
  );
}
