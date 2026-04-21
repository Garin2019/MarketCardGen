import { useState, useEffect } from "react";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  improveTemplatePrompt,
} from "../api/templates";

const EMPTY_FORM = { name: "", description: "", prompt_text: "" };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  // Форма создания / редактирования
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [editingId,  setEditingId]  = useState(null); // null = создание
  const [formError,  setFormError]  = useState("");
  const [saving,     setSaving]     = useState(false);
  const [improving,  setImproving]  = useState(false);
  const [showForm,   setShowForm]   = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    setLoading(true);
    getTemplates()
      .then(setTemplates)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (tpl) => {
    setForm({ name: tpl.name, description: tpl.description, prompt_text: tpl.prompt_text });
    setEditingId(tpl.id);
    setFormError("");
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const handleSave = async () => {
    if (!form.name.trim())        { setFormError("Укажите название"); return; }
    if (!form.prompt_text.trim()) { setFormError("Заполните текст промта"); return; }
    setSaving(true); setFormError("");
    try {
      if (editingId) {
        const updated = await updateTemplate(editingId, form);
        setTemplates((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
      } else {
        const created = await createTemplate(form);
        setTemplates((prev) => [...prev, created]);
      }
      handleCancel();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImprovePrompt = async () => {
    if (!form.prompt_text.trim()) {
      setFormError("Сначала заполните текст промта");
      return;
    }
    setImproving(true);
    setFormError("");
    try {
      const result = await improveTemplatePrompt(form);
      setForm((prev) => ({ ...prev, prompt_text: result.prompt_text }));
    } catch (e) {
      setFormError(e.message);
    } finally {
      setImproving(false);
    }
  };

  const handleDelete = async (tpl) => {
    if (tpl.is_default) return;
    if (!window.confirm(`Удалить шаблон «${tpl.name}»?`)) return;
    try {
      await deleteTemplate(tpl.id);
      setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div className="page-loading">Загрузка…</div>;

  const systemTpls = templates.filter((t) => t.is_default);
  const userTpls   = templates.filter((t) => !t.is_default);

  return (
    <div className="page templates-page">
      <div className="page-header">
        <h1>Шаблоны промтов</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Новый шаблон</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Форма создания / редактирования ── */}
      {showForm && (
        <div className="template-form card">
          <h2>{editingId ? "Редактировать шаблон" : "Новый шаблон"}</h2>
          <div className="form-group">
            <label>Название *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Например: Тёмный фон"
            />
          </div>
          <div className="form-group">
            <label>Описание</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Краткое описание назначения шаблона"
            />
          </div>
          <div className="form-group">
            <label>Текст промта *</label>
            <textarea
              rows={5}
              value={form.prompt_text}
              onChange={(e) => setForm((f) => ({ ...f, prompt_text: e.target.value }))}
              placeholder="Опишите желаемое изображение на русском или английском языке"
            />
          </div>
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-actions">
            <button
              className="btn btn-secondary"
              onClick={handleImprovePrompt}
              disabled={saving || improving}
            >
              {improving ? "Улучшение…" : "✨ Улучшить промт"}
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Сохранение…" : "💾 Сохранить"}
            </button>
            <button className="btn btn-secondary" onClick={handleCancel} disabled={saving || improving}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* ── Системные шаблоны ── */}
      <section className="templates-section">
        <h2>Системные шаблоны</h2>
        <p className="templates-hint">Системные шаблоны можно редактировать, но нельзя удалять.</p>
        <div className="template-list">
          {systemTpls.map((tpl) => (
            <div key={tpl.id} className="template-card template-card--system">
              <div className="template-card__body">
                <div className="template-card__name">{tpl.name}</div>
                {tpl.description && (
                  <div className="template-card__desc">{tpl.description}</div>
                )}
                <div className="template-card__prompt">{tpl.prompt_text}</div>
              </div>
              <div className="template-card__actions">
                <span className="template-badge">Системный</span>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(tpl)}>
                  ✏️ Изменить
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Пользовательские шаблоны ── */}
      <section className="templates-section">
        <h2>Мои шаблоны</h2>
        {userTpls.length === 0 ? (
          <div className="templates-empty">
            Вы ещё не создали ни одного шаблона.{" "}
            <button className="link-btn" onClick={openCreate}>Создать первый →</button>
          </div>
        ) : (
          <div className="template-list">
            {userTpls.map((tpl) => (
              <div key={tpl.id} className="template-card">
                <div className="template-card__body">
                  <div className="template-card__name">{tpl.name}</div>
                  {tpl.description && (
                    <div className="template-card__desc">{tpl.description}</div>
                  )}
                  <div className="template-card__prompt">{tpl.prompt_text}</div>
                </div>
                <div className="template-card__actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(tpl)}>
                    ✏️ Изменить
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tpl)}>
                    🗑 Удалить
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
