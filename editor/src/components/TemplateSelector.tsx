import React from 'react';
import { Link } from 'react-router-dom';
import { useTemplatesStore } from '@/store/templatesStore';

interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect }) => {
  const templates = useTemplatesStore(state => state.templates);

  if (templates.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📄</div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">
          У вас нет шаблонов
        </h2>
        <p className="text-gray-500 mb-6">
          Сначала создайте хотя бы один шаблон
        </p>
        <Link
          to="/templates/new"
          className="inline-block px-6 py-3 bg-accent text-dark rounded-md hover:bg-accent/90 transition-colors font-semibold"
        >
          Создать шаблон
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-dark mb-6">Выберите шаблон</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map(template => (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-xl hover:scale-105 transition-all text-left"
          >
            {/* Preview */}
            <div className="aspect-video bg-neutral rounded-md mb-3 flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="text-3xl mb-1">📐</div>
                <div className="text-xs text-gray-500">
                  {template.width} × {template.height}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {template.containers.length} блок(ов)
                </div>
              </div>
            </div>

            {/* Info */}
            <h3 className="font-semibold text-dark mb-1 truncate">
              {template.name}
            </h3>
            <p className="text-xs text-gray-500">
              {new Date(template.createdAt).toLocaleDateString('ru-RU')}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
