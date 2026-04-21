import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardEditorStore } from '@/store/cardEditorStore';
import { ImageUploader } from '@/components/ImageUploader';
import { TemplateSelector } from '@/components/TemplateSelector';

export const CardNewPage: React.FC = () => {
  const navigate = useNavigate();
  const { setImage, selectTemplate, reset } = useCardEditorStore();
  const [step, setStep] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Reset on mount
    reset();
  }, [reset]);

  const handleImageLoad = (base64: string) => {
    setImage(base64);
    setImageLoaded(true);
  };

  const handleTemplateSelect = (templateId: string) => {
    selectTemplate(templateId);
    navigate('/card/edit');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${step === 1 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              step === 1 ? 'bg-primary text-white' : 'bg-gray-200'
            }`}>
              1
            </div>
            <span className="ml-2 font-medium">Загрузка изображения</span>
          </div>
          <div className="w-16 h-1 bg-gray-300" />
          <div className={`flex items-center ${step === 2 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              step === 2 ? 'bg-primary text-white' : 'bg-gray-200'
            }`}>
              2
            </div>
            <span className="ml-2 font-medium">Выбор шаблона</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-dark mb-2">
                Шаг 1: Загрузите изображение
              </h1>
              <p className="text-gray-600">
                Загрузите фотографию товара, на которую будет наложен шаблон
              </p>
            </div>

            <ImageUploader onImageLoad={handleImageLoad} />

            {imageLoaded && (
              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="px-8 py-3 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors font-semibold"
                >
                  Далее →
                </button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-dark mb-2">
                Шаг 2: Выберите шаблон
              </h1>
              <p className="text-gray-600">
                Выберите шаблон оформления для вашей карточки
              </p>
            </div>

            <TemplateSelector onSelect={handleTemplateSelect} />

            <div className="flex justify-start">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                ← Назад
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
