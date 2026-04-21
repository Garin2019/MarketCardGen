import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PhotoUploader from "../components/PhotoUploader";
import TextEditor from "../components/TextEditor";
import TagInput from "../components/TagInput";
import { getProduct, updateProduct, uploadPhoto } from "../api/products";
import { generateText } from "../api/text";
import { getSettings } from "../api/settings";

const TONES          = [{value:"formal",label:"Формальный"},{value:"expert",label:"Экспертный"},{value:"emotional",label:"Эмоциональный"},{value:"friendly",label:"Дружелюбный"}];
const TEXT_PROVIDERS = [{value:"qwen",label:"Qwen"},{value:"minimax",label:"MiniMax"},{value:"openai",label:"OpenAI"},
  {value:"openrouter",label:"OpenRouter (бесплатно)"}];
const DEFAULT_CATEGORIES = ["Электроника","Одежда и обувь","Товары для дома","Красота и здоровье","Спорт и отдых","Детские товары","Продукты питания","Автотовары","Книги","Ювелирные украшения","Бижутерия","Мебель","Другое"];

export default function TextGenerationPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [product,         setProduct]         = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [article,         setArticle]         = useState("");
  const [category,        setCategory]        = useState("");
  const [customCategory,  setCustomCategory]  = useState("");
  const [tone,            setTone]            = useState("expert");
  const [categories,      setCategories]      = useState(DEFAULT_CATEGORIES);
  const [keywords,        setKeywords]        = useState([]);
  const [shortLength,     setShortLength]     = useState(100);
  const [longLength,      setLongLength]      = useState(1000);
  const [temperature,     setTemperature]     = useState(0.7);
  const [extraReqs,       setExtraReqs]       = useState("");
  const [provider,        setProvider]        = useState("qwen");
  const [shortDesc,       setShortDesc]       = useState("");
  const [longDesc,        setLongDesc]        = useState("");
  const [generating,      setGenerating]      = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [genError,        setGenError]        = useState("");

  // Загрузка продукта и дефолтов из настроек
  useEffect(() => {
    Promise.all([getProduct(id), getSettings()])
      .then(([prod, settings]) => {
        const configuredCategories = (settings.product_categories || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);
        const finalCategories = configuredCategories.length ? configuredCategories : DEFAULT_CATEGORIES;
        setCategories(finalCategories.includes("Другое") ? finalCategories : [...finalCategories, "Другое"]);
        setProduct(prod);
        setArticle(prod.article || "");
        setTone(prod.tone              || settings.default_tone         || "expert");
        setKeywords(prod.keywords || []);
        setCategory(prod.category || "");
        setExtraReqs(prod.extra_requirements || "");
        setShortLength(Number(settings.default_short_length) || 100);
        setLongLength(Number(settings.default_long_length)   || 1000);
        setTemperature(
          settings.default_text_temperature !== undefined
            ? Number(settings.default_text_temperature)
            : 0.7
        );
        setProvider(settings.default_text_provider           || "qwen");
        if (prod.short_description) setShortDesc(prod.short_description);
        if (prod.long_description)  setLongDesc(prod.long_description);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const effectiveCategory = category === "Другое" ? customCategory : category;

  // Fix: после загрузки нового фото — обновляем product state, чтобы PhotoUploader получил новый URL
  const handlePhotoUpload = async (file) => {
    try {
      const updated = await uploadPhoto(Number(id), file);
      setProduct(updated);
    } catch (e) {
      setGenError(e.message);
    }
  };

  const handleGenerate = async () => {
    setGenError(""); setGenerating(true);
    try {
      const result = await generateText({
        product_id:         Number(id),
        category:           effectiveCategory,
        tone,
        keywords,
        short_length:       shortLength,
        long_length:        longLength,
        temperature,
        extra_requirements: extraReqs,
        provider,
      });
      setShortDesc(result.short);
      setLongDesc(result.long);
    } catch (e) {
      setGenError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  // Блокируем сохранение если тексты превышают лимит
  const shortLimit = product?.short_description_limit || shortLength || 255;
  const longLimit  = product?.long_description_limit  || longLength  || 5000;
  const shortOver = shortDesc.length > shortLimit;
  const longOver  = longDesc.length  > longLimit;
  const canSave   = !shortOver && !longOver && (shortDesc || longDesc);

  const handleNextToImages = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    setGenError("");
    try {
      await updateProduct(id, {
        article,
        category: effectiveCategory,
        tone,
        keywords,
        extra_requirements: extraReqs,
        short_description: shortDesc,
        long_description: longDesc,
      });
      navigate(`/product/${id}/images`);
    } catch (e) {
      setGenError(e.message);
    } finally {
      setSaving(false);
    }
  }, [id, article, effectiveCategory, tone, keywords, extraReqs, shortDesc, longDesc, canSave, navigate]);

  if (loading) return <div className="page-loading">Загрузка…</div>;
  if (error)   return <div className="page"><div className="alert alert-error">{error}</div></div>;

  return (
    <div className="page text-gen-page">
      <div className="breadcrumb">
        <button className="breadcrumb__link" onClick={() => navigate("/")}>← Назад</button>
        <span>Описание товара</span>
      </div>

      <h1>Описание товара</h1>

      <div className="text-gen-layout">
        {/* ── Левая колонка: фото + форма ── */}
        <div className="text-gen-left">
          <section className="card">
            <h2>Фото товара</h2>
            {/* Fix: передаём актуальный photo_url из state product */}
            <PhotoUploader
              previewUrl={product?.photo_url || null}
              onFile={handlePhotoUpload}
              label="Загрузить фото товара"
            />
          </section>

          <section className="card">
            <h2>Параметры описания</h2>

            <div className="form-row">
              <div className="form-group">
                <label>Артикул</label>
                <input
                  type="text"
                  value={article}
                  onChange={(e) => setArticle(e.target.value)}
                  placeholder="Например: SKU-001"
                />
              </div>
              <div className="form-group">
                <label>Тональность</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)}>
                  {TONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Категория товара</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">- Выберите категорию -</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {category === "Другое" && (
                <input
                  type="text"
                  placeholder="Укажите категорию"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  style={{ marginTop: 6 }}
                />
              )}
            </div>

            <div className="form-group">
              <label>Ключевые слова</label>
              <TagInput tags={keywords} onChange={setKeywords} placeholder="Слово + Enter" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Длина короткого (симв.)</label>
                <input type="number" min={10} max={500} value={shortLength}
                  onChange={(e) => setShortLength(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Длина длинного (симв.)</label>
                <input type="number" min={100} max={5000} value={longLength}
                  onChange={(e) => setLongLength(Number(e.target.value))} />
              </div>
            </div>

            <div className="form-group">
              <label>Температура ИИ</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
              />
              <span className="range-value">{temperature.toFixed(1)}</span>
              <span className="form-hint">
                Ниже - более предсказуемый и строгий текст, выше - более вариативные и креативные формулировки.
              </span>
            </div>

            <div className="form-group">
              <label>Дополнительные требования</label>
              <textarea
                rows={3}
                placeholder="Например: упомянуть гарантию 2 года, акцент на экологичности"
                value={extraReqs}
                onChange={(e) => setExtraReqs(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Провайдер ИИ</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                {TEXT_PROVIDERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <button
              className="btn btn-primary btn-generate"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating
                ? <><span className="spinner" /> Генерация…</>
                : "✨ Сгенерировать описание"}
            </button>

            {genError && (
              <div className="alert alert-error" style={{ marginTop: 12 }}>{genError}</div>
            )}
          </section>
        </div>

        {/* ── Правая колонка: результаты ── */}
        <div className="text-gen-right">
          <section className="card">
            <div className="results-header">
              <h2>Результат</h2>
            </div>

            {!shortDesc && !longDesc && !generating && (
              <div className="results-empty">
                Заполните параметры и нажмите «Сгенерировать описание»
              </div>
            )}

            {generating && (
              <div className="results-generating">
                <span className="spinner spinner--lg" />
                <p>ИИ создаёт описание…</p>
              </div>
            )}

            {(shortDesc || longDesc) && !generating && (
              <>
                <TextEditor
                  label="Короткое описание"
                  value={shortDesc}
                  onChange={setShortDesc}
                  field="short"
                  rows={3}
                />
                <TextEditor
                  label="Длинное описание"
                  value={longDesc}
                  onChange={setLongDesc}
                  field="long"
                  rows={12}
                />

                <div className="results-actions">
                  <button
                    className="btn btn-primary"
                    onClick={handleNextToImages}
                    disabled={saving || !canSave}
                    title={!canSave ? "Исправьте ошибки валидации перед переходом" : ""}
                  >
                    {saving ? "Сохранение…" : "Далее: изображения →"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
