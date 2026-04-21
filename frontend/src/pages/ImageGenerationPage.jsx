import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ImageSlot from "../components/ImageSlot";
import PhotoUploader from "../components/PhotoUploader";
import { getProduct, uploadReference } from "../api/products";
import { getProductImages, generateImage, deleteImage, reorderImage } from "../api/images";
import { getTemplates } from "../api/templates";
import { getSettings } from "../api/settings";

const IMAGE_PROVIDERS = [
  { value: "qwen",      label: "Qwen Image" },
  { value: "minimax",   label: "MiniMax Image" },
  { value: "openai",    label: "OpenAI Image" },
];
const MAX_SLOTS = 12;

export default function ImageGenerationPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [product,   setProduct]   = useState(null);
  const [images,    setImages]    = useState([]);
  const [templates, setTemplates] = useState([]);
  const [provider,  setProvider]  = useState("openai");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [refUploading,  setRefUploading]  = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [visibleSlots, setVisibleSlots] = useState(3);

  useEffect(() => {
    Promise.all([
      getProduct(id),
      getProductImages(id),
      getTemplates(),
      getSettings(),
    ])
      .then(([prod, imgs, tpls, settings]) => {
        setProduct(prod);
        setImages(imgs);
        setTemplates(tpls);
        const highestSlot = imgs.length
          ? Math.max(...imgs.map((img) => img.sort_order || 0))
          : 0;
        setVisibleSlots(Math.min(MAX_SLOTS, Math.max(3, highestSlot)));
        setProvider(
          IMAGE_PROVIDERS.some((item) => item.value === settings.default_image_provider)
            ? settings.default_image_provider
            : "openai"
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Генерация одного изображения в слоте
  const handleGenerate = async (slotIndex, prompt, templateId) => {
    const sortOrder = slotIndex + 1;
    const existing = images.find((img) => img.sort_order === sortOrder);
    const newImg = await generateImage({
      product_id:  Number(id),
      prompt,
      template_id: templateId || null,
      provider,
      sort_order:  sortOrder,
    });

    if (existing) {
      await deleteImage(existing.id);
    }

    setImages((prev) => {
      const filtered = prev.filter((img) => img.sort_order !== sortOrder);
      return [...filtered, newImg].sort((a, b) => a.sort_order - b.sort_order);
    });
  };

  // Удаление изображения
  const handleDelete = async (imageId) => {
    await deleteImage(imageId);
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  // Перемещение (swap sort_order с соседом)
  const handleMove = async (imageId, direction) => {
    if (isReordering) return;       // защита от быстрых двойных кликов
    setIsReordering(true);
    const idx      = images.findIndex((img) => img.id === imageId);
    const neighbor = images[idx + direction];
    if (!neighbor) { setIsReordering(false); return; }

    const currentOrder  = images[idx].sort_order;
    const neighborOrder = neighbor.sort_order;

    await Promise.all([
      reorderImage(imageId, neighborOrder),
      reorderImage(neighbor.id, currentOrder),
    ]);

    setImages((prev) => {
      const updated = [...prev];
      updated[idx]             = { ...updated[idx],             sort_order: neighborOrder };
      updated[idx + direction] = { ...updated[idx + direction], sort_order: currentOrder  };
      return updated.sort((a, b) => a.sort_order - b.sort_order);
    });
    setIsReordering(false);
  };

  // Загрузка референса
  const handleReferenceUpload = async (file) => {
    setRefUploading(true);
    try {
      const updated = await uploadReference(Number(id), file);
      setProduct(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setRefUploading(false);
    }
  };

  if (loading) return <div className="page-loading">Загрузка…</div>;
  if (error)   return <div className="page"><div className="alert alert-error">{error}</div></div>;

  // Строим 12 слотов: заполненные + пустые
  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => ({
    slotNumber: i + 1,
    image: images.find((img) => img.sort_order === i + 1) || null,
  }));
  const displayedSlots = slots.slice(0, visibleSlots);
  const canAddSlot = visibleSlots < MAX_SLOTS;

  return (
    <div className="page image-gen-page">
      <div className="breadcrumb">
        <button className="breadcrumb__link" onClick={() => navigate(`/product/${id}/text`)}>
          ← Описание
        </button>
        <span>Генерация изображений</span>
      </div>

      <h1>Генерация изображений</h1>
      <p className="page-subtitle">
        Создайте до {MAX_SLOTS} изображений для карточки товара. По умолчанию используется фото
        товара с прошлого шага, но при необходимости вы можете заменить его отдельным референсом.
      </p>

      {/* ── Панель управления ── */}
      <div className="image-gen-toolbar card">
        <div className="image-gen-toolbar__left">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Провайдер изображений</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
              {IMAGE_PROVIDERS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="image-gen-toolbar__right">
          <span className="images-counter">
            {images.length} / {MAX_SLOTS} изображений
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/product/${id}/social`)}
          >
            Далее: публикация →
          </button>
        </div>
      </div>

      {/* ── Референс ── */}
      <div className="reference-section card">
        <h2>Референс оформления</h2>
        <p className="reference-hint">
          Если отдельный референс не загружен, ИИ использует фото товара с шага генерации описания.
          При желании вы можете заменить его своим образцом стиля.
        </p>
        <PhotoUploader
          previewUrl={product?.reference_url || product?.photo_url || null}
          onFile={handleReferenceUpload}
          label="Загрузить свой референс"
          disabled={refUploading}
        />
        {refUploading && (
          <div style={{ marginTop: 8, color: "#666" }}>
            <span className="spinner" /> Загрузка…
          </div>
        )}
      </div>

      {/* ── Сетка слотов ── */}
      <div className="image-grid">
        {displayedSlots.map(({ slotNumber, image }, idx) => (
          <ImageSlot
            key={slotNumber}
            slotNumber={slotNumber}
            image={image}
            templates={templates}
            onGenerate={(prompt, tplId) => handleGenerate(idx, prompt, tplId)}
            onDelete={image ? () => handleDelete(image.id) : undefined}
            onMoveUp={image   ? () => handleMove(image.id, -1) : undefined}
            onMoveDown={image  ? () => handleMove(image.id, +1) : undefined}
            moveDisabled={isReordering}
            isFirst={image ? image.sort_order === Math.min(...images.map(i => i.sort_order)) : true}
            isLast={image  ? image.sort_order === Math.max(...images.map(i => i.sort_order)) : true}
          />
        ))}
        {canAddSlot && (
          <button
            type="button"
            className="image-slot image-slot--adder"
            onClick={() => setVisibleSlots((prev) => Math.min(MAX_SLOTS, prev + 1))}
            aria-label="Добавить еще один слот изображения"
            title="Добавить еще один слот изображения"
          >
            <span className="image-slot__adder-plus">+</span>
            <span className="image-slot__adder-text">Добавить блок</span>
            <span className="image-slot__adder-hint">Слот #{visibleSlots + 1}</span>
          </button>
        )}
      </div>
    </div>
  );
}
