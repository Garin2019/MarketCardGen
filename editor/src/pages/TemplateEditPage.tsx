import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTemplateEditorStore } from '@/store/templateEditorStore';
import { useTemplatesStore } from '@/store/templatesStore';
import { TemplateNewPage } from './TemplateNewPage';

export const TemplateEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadTemplate } = useTemplateEditorStore();
  const { getTemplateById } = useTemplatesStore();

  useEffect(() => {
    if (!id) {
      navigate('/templates');
      return;
    }

    const template = getTemplateById(id);
    if (!template) {
      alert('Шаблон не найден');
      navigate('/templates');
      return;
    }

    // Load template into editor
    loadTemplate(template);
  }, [id, navigate, getTemplateById, loadTemplate]);

  // Reuse TemplateNewPage component but with loaded data
  return <TemplateNewPage isEditMode={true} templateId={id} />;
};
