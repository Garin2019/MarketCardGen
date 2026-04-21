import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stage, Layer, Image as KonvaImage, Rect, Ellipse, Circle, Text } from 'react-konva';
import { useCardEditorStore, type ImageScale } from '@/store/cardEditorStore';
import { exportPng, loadFonts } from '@/utils/exportPng';
import useImage from 'use-image';

// Component to load and display image
const BackgroundImage: React.FC<{ 
  src: string; 
  width: number; 
  height: number; 
  scale: ImageScale;
}> = ({ src, width, height, scale }) => {
  const [image] = useImage(src);
  
  if (!image) return null;

  let x = 0, y = 0, scaleX = 1, scaleY = 1;

  switch (scale) {
    case 'none':
      // Center the image without scaling
      x = (width - image.width) / 2;
      y = (height - image.height) / 2;
      break;
    
    case 'fitHeight':
      // Scale to fit height, center horizontally
      scaleY = height / image.height;
      scaleX = scaleY;
      x = (width - image.width * scaleX) / 2;
      y = 0;
      break;
    
    case 'fitWidth':
      // Scale to fit width, center vertically
      scaleX = width / image.width;
      scaleY = scaleX;
      x = 0;
      y = (height - image.height * scaleY) / 2;
      break;
  }

  return (
    <KonvaImage
      image={image}
      x={x}
      y={y}
      width={image.width}
      height={image.height}
      scaleX={scaleX}
      scaleY={scaleY}
    />
  );
};

export const CardEditPage: React.FC = () => {
  const navigate = useNavigate();
  const stageRef = useRef<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const { 
    image, 
    containerTexts, 
    imageScale,
    updateText,
    setImageScale,
    getTemplate, 
    isReady 
  } = useCardEditorStore();

  const template = getTemplate();

  useEffect(() => {
    if (!isReady()) {
      navigate('/card/new');
    }
  }, [isReady, navigate]);

  const handleExport = async () => {
    if (!stageRef.current || !template) return;

    setIsExporting(true);

    try {
      // Load all fonts used in template
      const fontFamilies = template.containers.map(c => c.font.family);
      await loadFonts(fontFamilies);

      // Wait a bit for fonts to render
      await new Promise(resolve => setTimeout(resolve, 100));

      // Export
      await exportPng(stageRef.current, `card_${template.name}_${Date.now()}.png`);
      
      alert('✅ Карточка успешно скачана!');
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Ошибка при экспорте. Попробуйте ещё раз.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!template || !image) {
    return null;
  }

  const scale = Math.min(1, Math.min(800 / template.width, 600 / template.height));

  const renderContainer = (container: any) => {
    const text = containerTexts[container.id] || '';
    const displayText = text || container.placeholder;
    const textColor = text ? container.font.color : '#999999';

    const shapeProps = {
      x: container.x,
      y: container.y,
      fill: container.bgColor,
      opacity: container.bgOpacity,
      stroke: container.strokeWidth > 0 ? container.strokeColor : undefined,
      strokeWidth: container.strokeWidth || 0,
      strokeOpacity: container.strokeOpacity !== undefined ? container.strokeOpacity : 1,
    };

    let shape;
    if (container.shape === 'rect') {
      shape = <Rect {...shapeProps} width={container.width} height={container.height} cornerRadius={container.cornerRadius || 4} />;
    } else if (container.shape === 'oval') {
      shape = (
        <Ellipse
          {...shapeProps}
          radiusX={container.width / 2}
          radiusY={container.height / 2}
          offsetX={-container.width / 2}
          offsetY={-container.height / 2}
        />
      );
    } else {
      const radius = Math.min(container.width, container.height) / 2;
      shape = <Circle {...shapeProps} radius={radius} offsetX={-radius} offsetY={-radius} />;
    }

    const fontStyle = `${container.font.italic ? 'italic' : 'normal'} ${container.font.bold ? 'bold' : 'normal'}`;

    // Determine x position based on alignment
    let textX = container.x + container.paddingX;
    const textWidth = container.width - 2 * container.paddingX;

    return (
      <React.Fragment key={container.id}>
        {shape}
        <Text
          x={textX}
          y={container.y + container.paddingY}
          text={displayText}
          fontSize={container.font.size}
          fontFamily={container.font.family}
          fill={textColor}
          fontStyle={fontStyle}
          width={textWidth}
          wrap="word"
          align={container.align || 'left'}
        />
      </React.Fragment>
    );
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left Panel - Text Inputs */}
      <div className="w-80 bg-white border-r p-6 overflow-y-auto">
        <h2 className="text-xl font-bold text-dark mb-6">Редактирование текста</h2>
        
        {/* Image Scale Controls */}
        <div className="mb-6 pb-4 border-b">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Масштабирование фона</h3>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="imageScale"
                checked={imageScale === 'none'}
                onChange={() => setImageScale('none')}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm">Без масштабирования (центр)</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="imageScale"
                checked={imageScale === 'fitHeight'}
                onChange={() => setImageScale('fitHeight')}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm">Вписать по высоте</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="imageScale"
                checked={imageScale === 'fitWidth'}
                onChange={() => setImageScale('fitWidth')}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm">Вписать по ширине</span>
            </label>
          </div>
        </div>
        
        <div className="space-y-4">
          {template.containers
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((container, index) => (
              <div key={container.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Блок {index + 1}
                  <span className="text-xs text-gray-500 ml-2">
                    ({container.placeholder})
                  </span>
                </label>
                <textarea
                  value={containerTexts[container.id] || ''}
                  onChange={(e) => updateText(container.id, e.target.value)}
                  placeholder={container.placeholder}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  style={{
                    fontFamily: container.font.family,
                    fontSize: `${container.font.size}px`,
                    fontWeight: container.font.bold ? 'bold' : 'normal',
                    fontStyle: container.font.italic ? 'italic' : 'normal',
                  }}
                />
              </div>
            ))}
        </div>
      </div>

      {/* Center - Canvas Preview */}
      <div className="flex-1 p-8 bg-gray-100 flex items-center justify-center overflow-auto">
        <div style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
          <Stage ref={stageRef} width={template.width * scale} height={template.height * scale} scaleX={scale} scaleY={scale}>
            {/* Background Image */}
            <Layer>
              <BackgroundImage src={image} width={template.width} height={template.height} scale={imageScale} />
            </Layer>
            
            {/* Containers and Text */}
            <Layer>
              {template.containers
                .sort((a, b) => a.zIndex - b.zIndex)
                .map(renderContainer)}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Right Panel - Actions */}
      <div className="w-64 bg-white border-l p-6">
        <h3 className="text-lg font-semibold text-dark mb-4">Экспорт</h3>
        <p className="text-sm text-gray-500 mb-6">
          Скачайте готовую карточку в формате PNG
        </p>
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="w-full px-4 py-3 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors font-semibold mb-4 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isExporting ? '⏳ Экспорт...' : '💾 Скачать PNG'}
        </button>

        {isExporting && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Подготовка изображения...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
