import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExportButton from "../components/ExportButton";
import { getProduct } from "../api/products";
import { downloadImagesZip, getProductImages } from "../api/images";

const RESULT_FIELDS = [
  { key: "article", label: "Артикул" },
  { key: "short_description", label: "Краткое описание" },
  { key: "long_description", label: "Описание" },
  { key: "category", label: "Категория" },
  { key: "keywords", label: "Ключевые слова" },
];

function downloadImage(imageUrl, sortOrder) {
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = `product-image-${String(sortOrder).padStart(2, "0")}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getProduct(id), getProductImages(id)])
      .then(([prod, imgs]) => {
        setProduct(prod);
        setImages(imgs);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-loading">Загрузка…</div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;

  return (
    <div className="page result-page">
      <div className="breadcrumb">
        <button className="breadcrumb__link" onClick={() => navigate(`/product/${id}/social`)}>
          ← Публикация
        </button>
        <span>Итог карточки товара</span>
      </div>

      <div className="page-header">
        <h1>Итог карточки товара</h1>
        <div className="result-actions-head">
          <ExportButton productId={Number(id)} />
          <button
            className="btn btn-secondary"
            onClick={() => downloadImagesZip(Number(id))}
            disabled={!images.length}
            title={images.length ? "Скачать все изображения ZIP" : "Нет изображений для скачивания"}
          >
            🗂 ZIP изображений
          </button>
        </div>
      </div>

      <section className="card">
        <h2>Таблица товара</h2>
        <div className="result-table">
          {RESULT_FIELDS.map(({ key, label }) => (
            <div key={key} className="result-table__row">
              <div className="result-table__label">{label}</div>
              <div className="result-table__value">
                {key === "keywords"
                  ? ((product?.keywords || []).length ? product.keywords.join(", ") : "—")
                  : (product?.[key] || "—")}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="results-header">
          <h2>Сгенерированные изображения</h2>
          <span className="badge-success">{images.length} шт.</span>
        </div>

        {!images.length ? (
          <div className="results-empty">Изображения ещё не сгенерированы</div>
        ) : (
          <div className="result-gallery">
            {images.map((image) => (
              <div key={image.id} className="result-gallery__item">
                <a
                  className="result-gallery__preview-link"
                  href={image.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={image.image_url} alt={`Изображение ${image.sort_order}`} />
                </a>
                <div className="result-gallery__footer">
                  <div className="result-gallery__caption">Изображение #{image.sort_order}</div>
                  <button
                    className="result-gallery__download-btn"
                    type="button"
                    title="Скачать изображение"
                    aria-label={`Скачать изображение ${image.sort_order}`}
                    onClick={() => downloadImage(image.image_url, image.sort_order)}
                  >
                    ⬇
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
