import React from 'react';
import { Link } from 'react-router-dom';
import { useTemplatesStore } from '@/store/templatesStore';

export const TemplatesPage: React.FC = () => {
  const { templates, deleteTemplate } = useTemplatesStore();

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Удалить шаблон "${name}"?`)) {
      const success = deleteTemplate(id);
      if (success) {
        alert('Шаблон удалён');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-dark">Мои шаблоны</h1>
        <Link
          to="/templates/new"
          className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors font-semibold"
        >
          + Создать новый
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            У вас пока нет шаблонов
          </h2>
          <p className="text-gray-500 mb-6">
            Создайте первый шаблон, чтобы начать работу
          </p>
          <Link
            to="/templates/new"
            className="inline-block px-6 py-3 bg-accent text-dark rounded-md hover:bg-accent/90 transition-colors font-semibold"
          >
            Создать первый шаблон
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div 
              key={template.id} 
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              {/* Preview */}
              <div className="aspect-video bg-neutral rounded-md mb-4 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <div className="text-2xl mb-1">📐</div>
                  <div className="text-sm">
                    {template.width} × {template.height} px
                  </div>
                  <div className="text-xs mt-1">
                    {template.containers.length} контейнер(ов)
                  </div>
                </div>
              </div>

              {/* Info */}
              <h3 className="text-lg font-semibold text-dark mb-1 truncate">
                {template.name}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {new Date(template.createdAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  to={`/templates/${template.id}/edit`}
                  className="flex-1 px-4 py-2 bg-primary text-white text-center rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  ✏️ Редактировать
                </Link>
                <button
                  onClick={() => handleDelete(template.id, template.name)}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
