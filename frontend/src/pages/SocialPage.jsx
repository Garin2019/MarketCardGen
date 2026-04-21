import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TagInput from "../components/TagInput";
import { getProductImages, uploadProductImages } from "../api/images";
import { getSettings } from "../api/settings";
import { generatePost, getProductPosts, publishPost, updatePost } from "../api/social";

const PLATFORMS = [
  { value: "vk",       label: "ВКонтакте",  icon: "🔵" },
  { value: "telegram", label: "Telegram",    icon: "✈️"  },
  { value: "max",      label: "MAX",         icon: "🟠" },
];

const TONES = [
  { value: "formal",    label: "Формальный"   },
  { value: "expert",    label: "Экспертный"   },
  { value: "emotional", label: "Эмоциональный"},
  { value: "friendly",  label: "Дружелюбный"  },
];

const TEXT_PROVIDERS = [
  { value: "qwen",      label: "Qwen"      },
  { value: "minimax",   label: "MiniMax"   },
  { value: "openai",    label: "OpenAI"    },
  { value: "openrouter", label: "OpenRouter (бесплатно)" },
];

export default function SocialPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const extraImagesInputRef = useRef(null);

  const [images,    setImages]    = useState([]);
  const [posts,     setPosts]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  // Форма генерации
  const [platforms,   setPlatforms]   = useState(["vk"]);
  const [postSize,    setPostSize]    = useState(600);
  const [tone,        setTone]        = useState("friendly");
  const [useEmoji,    setUseEmoji]    = useState(true);
  const [hashtags,    setHashtags]    = useState([]);
  const [useImages,   setUseImages]   = useState(true);
  const [vkUseImages, setVkUseImages] = useState(false);
  const [provider,    setProvider]    = useState("qwen");
  const [selectedImageIds, setSelectedImageIds] = useState([]);
  const [primaryImageId, setPrimaryImageId] = useState(null);

  // Активный пост (черновик)
  const [activePost,     setActivePost]     = useState(null);
  const [editedText,     setEditedText]     = useState("");
  const [editedHashtags, setEditedHashtags] = useState([]);

  // Состояния UI
  const [generating,  setGenerating]  = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [actionError, setActionError] = useState("");
  const [platformStatuses, setPlatformStatuses] = useState({});

  useEffect(() => {
    Promise.all([getProductImages(id), getSettings(), getProductPosts(id)])
      .then(([imgs, settings, existingPosts]) => {
        setImages(imgs);
        setTone(settings.default_post_tone   || "friendly");
        setPostSize(Number(settings.default_post_size) || 600);
        setProvider(settings.default_text_provider || "qwen");

        const normalizedPosts = [...(existingPosts || [])].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setPosts(normalizedPosts);

        const activeExistingPost =
          normalizedPosts.find((post) => post.status !== "published") || normalizedPosts[0] || null;
        setActivePost(activeExistingPost);
        setEditedText(activeExistingPost?.post_text || "");
        setEditedHashtags(activeExistingPost?.hashtags || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!posts.length) return;

    const latestByPlatform = {};
    for (const post of posts) {
      if (!latestByPlatform[post.platform]) {
        latestByPlatform[post.platform] = post;
      }
    }

    setPlatformStatuses((prev) => {
      const next = { ...prev };
      for (const [platform, post] of Object.entries(latestByPlatform)) {
        if (post.status === "published") {
          next[platform] = {
            tone: "success",
            text: "Пост опубликован",
            updatedAt: post.published_at || post.created_at,
          };
        } else {
          next[platform] = {
            tone: "draft",
            text: "Черновик создан",
            updatedAt: post.created_at,
          };
        }
      }
      return next;
    });
  }, [posts]);

  useEffect(() => {
    if (!images.length) {
      setSelectedImageIds([]);
      setPrimaryImageId(null);
      return;
    }

    const imageIds = images.map((image) => image.id).filter(Boolean);
    setSelectedImageIds((prev) => {
      const preserved = prev.filter((id) => imageIds.includes(id));
      const missing = imageIds.filter((id) => !preserved.includes(id));
      return [...preserved, ...missing];
    });
    setPrimaryImageId((prev) => {
      if (prev && imageIds.includes(prev)) {
        return prev;
      }
      return imageIds[0] || null;
    });
  }, [images]);

  const setPlatformStatus = (platform, tone, text) => {
    setPlatformStatuses((prev) => ({
      ...prev,
      [platform]: { tone, text, updatedAt: new Date().toISOString() },
    }));
  };

  const setStatusesForPlatforms = (targetPlatforms, tone, text) => {
    setPlatformStatuses((prev) => {
      const next = { ...prev };
      for (const platform of targetPlatforms) {
        next[platform] = { tone, text, updatedAt: new Date().toISOString() };
      }
      return next;
    });
  };

  const showError = (msg) => {
    setActionError(msg);
  };

  const togglePlatform = (value) => {
    setPlatforms((prev) => (
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    ));
  };

  // Генерация поста
  const handleGenerate = async () => {
    setGenerating(true);
    setActionError("");
    try {
      if (!platforms.length) {
        throw new Error("Выберите хотя бы одну платформу");
      }

      setStatusesForPlatforms(platforms, "progress", "Генерируем черновик поста");

      const primaryPlatform = platforms[0];
      const primaryPost = await generatePost({
        product_id: Number(id),
        platform: primaryPlatform,
        post_size: postSize,
        tone,
        use_emoji: useEmoji,
        hashtags: hashtags.length ? hashtags : null,
        provider,
      });

      const createdPosts = [primaryPost];
      setPlatformStatus(primaryPlatform, "draft", "Черновик создан");

      for (const platform of platforms.slice(1)) {
        const post = await generatePost({
          product_id: Number(id),
          platform,
          post_size: postSize,
          tone,
          use_emoji: useEmoji,
          hashtags: hashtags.length ? hashtags : null,
          provider,
          post_text_override: primaryPost.post_text,
          hashtags_override: primaryPost.hashtags || [],
        });
        createdPosts.push(post);
        setPlatformStatus(platform, "draft", "Черновик создан");
      }

      if (createdPosts.length) {
        const nextPosts = [...createdPosts, ...posts].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setActivePost(primaryPost);
        setEditedText(primaryPost.post_text);
        setEditedHashtags(primaryPost.hashtags || []);
        setPosts(nextPosts);
      }
    } catch (e) {
      setStatusesForPlatforms(platforms, "error", e.message);
      showError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleAdditionalImagesUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    setUploadingImages(true);
    setActionError("");
    try {
      const result = await uploadProductImages(Number(id), selectedFiles);
      if (result.uploaded?.length) {
        setImages((prev) =>
          [...prev, ...result.uploaded].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        );
      }

      if (result.errors?.length) {
        const errorsText = result.errors.map((item) => `${item.filename}: ${item.error}`).join("; ");
        showError(
          result.uploaded?.length
            ? `Часть изображений загружена, часть с ошибками: ${errorsText}`
            : errorsText
        );
      } else {
        setActionError("");
      }
    } catch (e) {
      showError(e.message);
    } finally {
      event.target.value = "";
      setUploadingImages(false);
    }
  };

  const toggleImageSelection = (imageId, checked) => {
    setSelectedImageIds((prev) => {
      const next = checked
        ? (prev.includes(imageId) ? prev : [...prev, imageId])
        : prev.filter((id) => id !== imageId);

      setPrimaryImageId((currentPrimary) => {
        if (checked) {
          return currentPrimary || imageId;
        }
        if (currentPrimary !== imageId) {
          return currentPrimary;
        }
        return next[0] || null;
      });

      return next;
    });
  };

  const setPrimaryImage = (imageId, checked) => {
    if (!checked) return;
    setPrimaryImageId(imageId);
    setSelectedImageIds((prev) => (prev.includes(imageId) ? prev : [...prev, imageId]));
  };

  // Публикация
  const handlePublish = async () => {
    if (!platforms.length) {
      showError("Выберите хотя бы одну платформу");
      return;
    }
    setPublishing(true);

    try {
      let refreshedPosts = [...posts];

      // Сначала сохраняем правки активного черновика если он есть и ещё редактируемый
      if (activePost && activePost.status !== "published") {
        try {
          setPlatformStatus(activePost.platform, "progress", "Сохраняем черновик перед публикацией");
          const updatedActive = await updatePost(activePost.id, {
            post_text: editedText,
            hashtags: editedHashtags,
          });
          refreshedPosts = refreshedPosts.map((p) => (p.id === updatedActive.id ? updatedActive : p));
          setPosts(refreshedPosts);
          setActivePost(updatedActive);
          setPlatformStatus(activePost.platform, "draft", "Черновик сохранён");
        } catch (_) {}
      }

      const targetPosts = [];
      const seenPlatforms = new Set();
      for (const post of refreshedPosts) {
        if (!platforms.includes(post.platform)) continue;
        if (post.status === "published") continue;
        if (seenPlatforms.has(post.platform)) continue;
        seenPlatforms.add(post.platform);
        targetPosts.push(post);
      }

      if (!targetPosts.length) {
        const message = "Нет доступных черновиков для публикации по выбранным платформам";
        setStatusesForPlatforms(platforms, "error", message);
        throw new Error(message);
      }

      const publishedResults = [];
      const publishErrors = [];
      for (const post of targetPosts) {
        try {
          setPlatformStatus(post.platform, "progress", "Публикуем пост");
          const result = await publishPost(post.id, {
            useImages,
            vkUseImages,
            selectedImageIds,
            primaryImageId,
          });
          publishedResults.push(result);
          setPlatformStatus(post.platform, "success", "Пост опубликован");
        } catch (e) {
          setPlatformStatus(post.platform, "error", e.message);
          publishErrors.push(`${PLATFORMS.find((p) => p.value === post.platform)?.label || post.platform}: ${e.message}`);
        }
      }

      setPosts((prev) =>
        prev.map((post) => publishedResults.find((item) => item.id === post.id) || post)
      );
      if (activePost) {
        const activeResult = publishedResults.find((item) => item.id === activePost.id);
        if (activeResult) setActivePost(activeResult);
      }
      if (publishErrors.length) {
        showError(publishErrors.join(" | "));
      } else {
        setActionError("");
      }
    } catch (e) {
      showError(e.message);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <div className="page-loading">Загрузка…</div>;
  if (error)   return <div className="page"><div className="alert alert-error">{error}</div></div>;

  const platformLabel = platforms.length
    ? platforms
        .map((value) => PLATFORMS.find((item) => item.value === value)?.label || value)
        .join(", ")
    : "платформ";

  const displayedStatuses = platforms.map((platform) => {
    const status = platformStatuses[platform];
    return {
      platform,
      label: PLATFORMS.find((item) => item.value === platform)?.label || platform,
      tone: status?.tone || "idle",
      text: status?.text || "Ожидает действия",
    };
  });

  return (
    <div className="page social-page">
      <div className="breadcrumb">
        <button className="breadcrumb__link" onClick={() => navigate(`/product/${id}/images`)}>
          ← Изображения
        </button>
        <span>Публикация в медиа</span>
      </div>

      <div className="page-header">
        <h1>Публикация в медиа</h1>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(`/product/${id}/result`)}
        >
          Пропустить
        </button>
      </div>

      <div className="social-layout">
        {/* ── Левая колонка: форма ── */}
        <div className="social-left">
          <section className="card">
            <h2>Параметры поста</h2>

            {/* Платформа */}
            <div className="form-group">
              <label>Платформы</label>
              <div className="platform-selector">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={`platform-btn ${platforms.includes(p.value) ? "platform-btn--active" : ""}`}
                    onClick={() => togglePlatform(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Тональность</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)}>
                  {TONES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Размер (слов)</label>
                <input
                  type="range" min={300} max={3000} step={50}
                  value={postSize}
                  onChange={(e) => setPostSize(Number(e.target.value))}
                />
                <span className="range-value">{postSize} слов</span>
              </div>
            </div>

            <div className="form-group">
              <label>Хэштеги (опционально)</label>
              <TagInput
                tags={hashtags}
                onChange={setHashtags}
                placeholder="#хэштег + Enter (или авто)"
              />
            </div>

            <div className="social-options-group">
              <div className="form-group form-group--inline social-option-row">
                <label>
                  <input type="checkbox" checked={useEmoji} onChange={(e) => setUseEmoji(e.target.checked)} />
                  <span>Эмодзи</span>
                </label>
              </div>
              <div className="form-group form-group--inline social-option-row">
                <label>
                  <input type="checkbox" checked={useImages} onChange={(e) => setUseImages(e.target.checked)} />
                  <span>Прикрепить изображения ({images.length})</span>
                </label>
              </div>

              {platforms.includes("vk") && useImages && (
                <div className="form-group form-group--inline social-option-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={vkUseImages}
                      onChange={(e) => setVkUseImages(e.target.checked)}
                    />
                    <span>Для ВКонтакте публиковать с изображениями</span>
                  </label>
                </div>
              )}
            </div>

            {useImages && (
              <div className="form-group">
                <label>Дополнительные изображения</label>
                <div className="social-extra-images">
                  <div className="social-extra-images__actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => extraImagesInputRef.current?.click()}
                      disabled={uploadingImages}
                    >
                      {uploadingImages ? "Загрузка…" : "Загрузить с компьютера"}
                    </button>
                    <span className="social-extra-images__hint">
                      Будут добавлены к изображениям товара и смогут участвовать в публикации
                    </span>
                  </div>

                  <input
                    ref={extraImagesInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleAdditionalImagesUpload}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Провайдер ИИ</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                {TEXT_PROVIDERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <button
              className="btn btn-primary btn-generate"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating
                ? <><span className="spinner" /> Генерация…</>
                : "✨ Сгенерировать пост"}
            </button>
          </section>
        </div>

        {/* ── Правая колонка: черновик и публикация ── */}
        <div className="social-right">
          {!activePost && !generating && (
            <div className="card">
              <div className="results-empty">
                Заполните параметры и нажмите «Сгенерировать пост»
              </div>
            </div>
          )}

          {generating && (
            <div className="card results-generating">
              <span className="spinner spinner--lg" />
              <p>ИИ пишет пост…</p>
            </div>
          )}

          {activePost && !generating && (
            <section className="card">
              <div className="results-header">
                <h2>Черновик</h2>
              </div>

              {/* Текст поста */}
              <div className="form-group">
                <label>Текст поста</label>
                <textarea
                  className="social-textarea"
                  rows={10}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  disabled={activePost.status === "published"}
                />
                <span className="char-hint">{editedText.length} символов</span>
              </div>

              {/* Хэштеги */}
              <div className="form-group">
                <label>Хэштеги</label>
                <TagInput
                  tags={editedHashtags}
                  onChange={setEditedHashtags}
                  disabled={activePost.status === "published"}
                />
              </div>

              {actionError && <div className="alert alert-error">{actionError}</div>}

              {displayedStatuses.length > 0 && (
                <div className="social-statuses">
                  <div className="social-statuses__title">Статусы публикации</div>
                  <div className="social-statuses__list">
                    {displayedStatuses.map((item) => (
                      <div
                        key={item.platform}
                        className={`social-statuses__item social-statuses__item--${item.tone}`}
                      >
                        <span className="social-statuses__platform">{item.label}</span>
                        <span className="social-statuses__text">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePost.status !== "published" && (
                <>
                  <div className="results-actions">
                    <button className="btn btn-primary" onClick={handlePublish} disabled={publishing}>
                      {publishing
                        ? <><span className="spinner" /> Публикация…</>
                        : "🚀 Опубликовать"}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => navigate(`/product/${id}/result`)}
                      disabled={publishing}
                    >
                      Далее: результат →
                    </button>
                  </div>
                </>
              )}

              {activePost.status === "published" && (
                <div className="results-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/product/${id}/result`)}
                  >
                    Открыть результат →
                  </button>
                </div>
              )}

            </section>
          )}

        </div>
      </div>

      {useImages && images.length > 0 && (
        <section className="card social-publish-gallery-section">
          <div className="results-header">
            <h2>Превью изображений</h2>
          </div>
          <div className="social-extra-images__hint social-extra-images__hint--accent">
            Для VK будет опубликовано только основное изображение.
          </div>
          <div className="social-publish-preview">
            {images.map((image, index) => {
              const isSelected = selectedImageIds.includes(image.id);
              const isPrimary = primaryImageId === image.id;
              return (
                <div key={image.id || `${image.image_url}-${index}`} className="social-publish-preview__item">
                  <div className="social-publish-preview__media">
                    <img
                      src={image.image_url}
                      alt={`Изображение ${index + 1}`}
                      className="social-publish-preview__image"
                    />
                    <span className="social-extra-images__index">#{index + 1}</span>
                  </div>
                  <div className="social-publish-preview__controls">
                    <label className="social-publish-preview__check">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleImageSelection(image.id, e.target.checked)}
                      />
                      <span>Опубликовать</span>
                    </label>
                    <label className="social-publish-preview__check">
                      <input
                        type="checkbox"
                        checked={isPrimary}
                        disabled={!isSelected}
                        onChange={(e) => setPrimaryImage(image.id, e.target.checked)}
                      />
                      <span>Основное изображение</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
