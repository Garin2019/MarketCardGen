import React, { useState, useEffect } from 'react';
import { useTemplateEditorStore } from '@/store/templateEditorStore';
import { loadFontsRegistry, registerFont } from '@/utils/customFonts';
import { LOCAL_FONTS } from '@/utils/localFonts';
import type { Container, ShapeType } from '@/types';

export const PropertiesPanel: React.FC = () => {
  const { 
    containers, 
    selectedContainerId, 
    updateContainer,
    moveContainerForward,
    moveContainerBackward,
    canMoveForward,
    canMoveBackward
  } = useTemplateEditorStore();

  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const [localFonts, setLocalFonts] = useState<string[]>([]);

  useEffect(() => {
    // Load registered fonts list from localStorage
    const fonts = loadFontsRegistry();
    setCustomFonts(fonts.map(f => f.family));
    
    // Load local fonts list from public/fonts/ (hardcoded in localFonts.ts)
    setLocalFonts(LOCAL_FONTS.map(f => f.family));
  }, []);

  const selectedContainer = containers.find(c => c.id === selectedContainerId);

  if (!selectedContainer) {
    return (
      <div className="text-gray-400 text-center py-8">
        Выберите контейнер для настройки
      </div>
    );
  }

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await registerFont(file);
    if (result.success && result.font) {
      // Update custom fonts list
      setCustomFonts(prev => [...prev, result.font!.family]);
      // Automatically select the new font
      handleFontChange('family', result.font.family);
      alert(`✅ Шрифт "${result.font.family}" сохранён!\n\nШрифт сохранён в IndexedDB браузера и будет доступен при каждом запуске приложения.`);
    } else {
      alert(`❌ Ошибка: ${result.error}`);
    }

    // Reset input
    e.target.value = '';
  };

  const handleShapeChange = (shape: ShapeType) => {
    updateContainer(selectedContainer.id, { shape });
  };

  const handleColorChange = (bgColor: string) => {
    updateContainer(selectedContainer.id, { bgColor });
  };

  const handleOpacityChange = (bgOpacity: number) => {
    updateContainer(selectedContainer.id, { bgOpacity });
  };

  const handlePaddingChange = (paddingX?: number, paddingY?: number) => {
    const updates: Partial<Container> = {};
    if (paddingX !== undefined) updates.paddingX = paddingX;
    if (paddingY !== undefined) updates.paddingY = paddingY;
    updateContainer(selectedContainer.id, updates);
  };

  const handleFontChange = (key: string, value: any) => {
    updateContainer(selectedContainer.id, {
      font: { ...selectedContainer.font, [key]: value }
    });
  };

  const handlePlaceholderChange = (placeholder: string) => {
    updateContainer(selectedContainer.id, { placeholder });
  };

  return (
    <div className="space-y-6">
      {/* Shape Section */}
      <div className="border-b pb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Форма фона</h4>
        <div className="space-y-2">
          {(['rect', 'oval', 'circle'] as ShapeType[]).map((shape) => (
            <label key={shape} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="shape"
                checked={selectedContainer.shape === shape}
                onChange={() => handleShapeChange(shape)}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm">
                {shape === 'rect' && '⬜ Прямоугольник'}
                {shape === 'oval' && '⭕ Овал'}
                {shape === 'circle' && '🔵 Круг'}
              </span>
            </label>
          ))}
        </div>
        
        {/* Corner Radius - only for rectangles */}
        {selectedContainer.shape === 'rect' && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <label className="block text-xs text-gray-600 mb-1">Скругление углов (px)</label>
            <input
              type="range"
              min="0"
              max="50"
              value={selectedContainer.cornerRadius}
              onChange={(e) => updateContainer(selectedContainer.id, { cornerRadius: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">0 px (острые)</span>
              <span className="text-xs font-semibold text-primary">{selectedContainer.cornerRadius} px</span>
              <span className="text-xs text-gray-500">50 px (круглые)</span>
            </div>
          </div>
        )}
      </div>

      {/* Color & Opacity Section */}
      <div className="border-b pb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Цвет и прозрачность</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Цвет фона</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={selectedContainer.bgColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={selectedContainer.bgColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md"
                placeholder="#ffffff"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-600">Прозрачность</label>
              <span className="text-xs font-semibold text-primary">
                {Math.round(selectedContainer.bgOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedContainer.bgOpacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      </div>

      {/* Stroke Section */}
      <div className="border-b pb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Граница (обводка)</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Цвет границы</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={selectedContainer.strokeColor}
                onChange={(e) => updateContainer(selectedContainer.id, { strokeColor: e.target.value })}
                className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={selectedContainer.strokeColor}
                onChange={(e) => updateContainer(selectedContainer.id, { strokeColor: e.target.value })}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md"
                placeholder="#000000"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-600">Толщина границы (px)</label>
              <span className="text-xs font-semibold text-primary">
                {selectedContainer.strokeWidth} px
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={selectedContainer.strokeWidth}
              onChange={(e) => updateContainer(selectedContainer.id, { strokeWidth: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-600">Прозрачность границы</label>
              <span className="text-xs font-semibold text-primary">
                {Math.round(selectedContainer.strokeOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedContainer.strokeOpacity}
              onChange={(e) => updateContainer(selectedContainer.id, { strokeOpacity: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      </div>

      {/* Padding Section */}
      <div className="border-b pb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Отступы</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">По X (px)</label>
            <input
              type="number"
              value={selectedContainer.paddingX}
              onChange={(e) => handlePaddingChange(parseInt(e.target.value) || 0, undefined)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">По Y (px)</label>
            <input
              type="number"
              value={selectedContainer.paddingY}
              onChange={(e) => handlePaddingChange(undefined, parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              min="0"
              max="100"
            />
          </div>
        </div>
      </div>

      {/* Font Section */}
      <div className="border-b pb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Шрифт</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Семейство шрифта</label>
            <select
              value={selectedContainer.font.family}
              onChange={(e) => handleFontChange('family', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            >
              <optgroup label="Встроенные шрифты">
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Arial">Arial</option>
                <option value="Inter">Inter</option>
              </optgroup>
              {localFonts.length > 0 && (
                <optgroup label="📁 Локальные шрифты (из папки)">
                  {localFonts.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </optgroup>
              )}
              {customFonts.length > 0 && (
                <optgroup label="💾 Загруженные шрифты">
                  {customFonts.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Font Upload */}
          <div className="relative">
            <label className="block text-xs text-gray-600 mb-1">Добавить свой шрифт</label>
            <input
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              onChange={handleFontUpload}
              className="hidden"
              id="font-upload"
            />
            <label
              htmlFor="font-upload"
              className="w-full px-3 py-2 text-sm border border-dashed border-gray-300 rounded-md cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center"
            >
              <span className="text-gray-600">📁 Выбрать файл (TTF, OTF, WOFF)</span>
            </label>
            <p className="text-xs text-gray-400 mt-1">
              Макс. 10 МБ • Сохраняется в браузере (IndexedDB)
            </p>
          </div>

          {/* Font Preview */}
          <div className="bg-neutral p-3 rounded-md">
            <p className="text-xs text-gray-500 mb-2">Предпросмотр:</p>
            <p
              style={{
                fontFamily: selectedContainer.font.family,
                fontSize: `${selectedContainer.font.size}px`,
                fontWeight: selectedContainer.font.bold ? 'bold' : 'normal',
                fontStyle: selectedContainer.font.italic ? 'italic' : 'normal',
                color: selectedContainer.font.color,
              }}
            >
              АБВГабвг 123
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Размер (px)</label>
            <input
              type="number"
              value={selectedContainer.font.size}
              onChange={(e) => handleFontChange('size', parseInt(e.target.value) || 12)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              min="8"
              max="72"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Цвет текста</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={selectedContainer.font.color}
                onChange={(e) => handleFontChange('color', e.target.value)}
                className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={selectedContainer.font.color}
                onChange={(e) => handleFontChange('color', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md"
                placeholder="#222222"
              />
            </div>
          </div>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedContainer.font.bold}
                onChange={(e) => handleFontChange('bold', e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <span className="text-sm font-bold">Жирный</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedContainer.font.italic}
                onChange={(e) => handleFontChange('italic', e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <span className="text-sm italic">Курсив</span>
            </label>
          </div>

          {/* Text Align */}
          <div>
            <label className="block text-xs text-gray-600 mb-2">Выравнивание текста</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateContainer(selectedContainer.id, { align: 'left' })}
                className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                  selectedContainer.align === 'left'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                }`}
              >
                <span className="flex items-center justify-center">
                  ⬅️ Слева
                </span>
              </button>
              <button
                onClick={() => updateContainer(selectedContainer.id, { align: 'center' })}
                className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                  selectedContainer.align === 'center'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                }`}
              >
                <span className="flex items-center justify-center">
                  ↔️ Центр
                </span>
              </button>
              <button
                onClick={() => updateContainer(selectedContainer.id, { align: 'right' })}
                className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                  selectedContainer.align === 'right'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                }`}
              >
                <span className="flex items-center justify-center">
                  ➡️ Справа
                </span>
              </button>
              <button
                onClick={() => updateContainer(selectedContainer.id, { align: 'justify' })}
                className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                  selectedContainer.align === 'justify'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                }`}
              >
                <span className="flex items-center justify-center">
                  ⬌ Ширина
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder Section */}
      <div className="border-b pb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Текст-заполнитель</h4>
        <input
          type="text"
          value={selectedContainer.placeholder}
          onChange={(e) => handlePlaceholderChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
          placeholder="Введите текст"
        />
        <p className="text-xs text-gray-500 mt-1">
          Текст, который показывается в пустом контейнере
        </p>
      </div>

      {/* Layer Control Section */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Порядок слоёв</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => moveContainerForward(selectedContainer.id)}
            disabled={!canMoveForward(selectedContainer.id)}
            className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            ⬆️ Вперёд
          </button>
          <button
            onClick={() => moveContainerBackward(selectedContainer.id)}
            disabled={!canMoveBackward(selectedContainer.id)}
            className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            ⬇️ Назад
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Z-index: {selectedContainer.zIndex}
        </p>
      </div>
    </div>
  );
};
