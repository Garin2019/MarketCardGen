import React, { useState, useEffect } from 'react';
import { useTemplatesStore } from '@/store/templatesStore';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

export const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const templates = useTemplatesStore(state => state.templates);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
    }
  }, [isOpen]);

  const validateName = (value: string): boolean => {
    if (!value.trim()) {
      setError('Введите название шаблона');
      return false;
    }
    
    if (templates.some(t => t.name.toLowerCase() === value.toLowerCase())) {
      setError('Шаблон с таким названием уже существует');
      return false;
    }
    
    setError('');
    return true;
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (error) validateName(value);
  };

  const handleSave = () => {
    if (validateName(name)) {
      onSave(name.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-2xl font-bold text-dark mb-4">
          Сохранить шаблон
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Название шаблона
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Например: Карточка товара"
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              error 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-primary'
            }`}
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-sm mt-1">{error}</p>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};
