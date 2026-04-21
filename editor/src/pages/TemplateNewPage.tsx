import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Ellipse, Circle, Transformer } from 'react-konva';
import { useTemplateEditorStore } from '@/store/templateEditorStore';
import { useTemplatesStore } from '@/store/templatesStore';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { SaveTemplateModal } from '@/components/SaveTemplateModal';
import type { Container } from '@/types';
import Konva from 'konva';

// ContainerShape component inline
const ContainerShape: React.FC<{
  container: Container;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Container>) => void;
}> = ({ container, isSelected, onSelect, onUpdate }) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Cleanup transformer on unmount to prevent errors
  useEffect(() => {
    return () => {
      if (trRef.current) {
        trRef.current.nodes([]);
      }
    };
  }, []);

  const commonProps = {
    ref: shapeRef,
    x: container.x,
    y: container.y,
    fill: container.bgColor,
    opacity: container.bgOpacity,
    draggable: true,
    onClick: onSelect,
    onDragEnd: (e: any) => onUpdate({ x: e.target.x(), y: e.target.y() }),
    onTransformEnd: () => {
      const node = shapeRef.current;
      if (!node) return;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onUpdate({
        x: node.x(),
        y: node.y(),
        width: Math.max(50, node.width() * scaleX),
        height: Math.max(30, node.height() * scaleY)
      });
    },
    stroke: isSelected ? '#2E5F9A' : (container.strokeWidth > 0 ? container.strokeColor : undefined),
    strokeWidth: isSelected ? 2 : container.strokeWidth,
    strokeOpacity: isSelected ? 1 : container.strokeOpacity,
  };

  return (
    <>
      {container.shape === 'rect' && <Rect {...commonProps} width={container.width} height={container.height} cornerRadius={container.cornerRadius} />}
      {container.shape === 'oval' && <Ellipse {...commonProps} radiusX={container.width/2} radiusY={container.height/2} offsetX={-container.width/2} offsetY={-container.height/2} />}
      {container.shape === 'circle' && <Circle {...commonProps} radius={Math.min(container.width, container.height)/2} offsetX={-Math.min(container.width, container.height)/2} offsetY={-Math.min(container.width, container.height)/2} />}
      {isSelected && <Transformer ref={trRef} rotateEnabled={false} keepRatio={container.shape === 'circle'} />}
    </>
  );
};

export const TemplateNewPage: React.FC<{ isEditMode?: boolean; templateId?: string }> = ({ 
  isEditMode = false, 
  templateId 
}) => {
  const {
    canvasWidth, canvasHeight, containers, selectedContainerId,
    setCanvasSize, addContainer, updateContainer, deleteContainer,
    selectContainer, reset, exportTemplate
  } = useTemplateEditorStore();

  const { saveTemplate, getTemplateById } = useTemplatesStore();

  const [width, setWidth] = useState(canvasWidth);
  const [height, setHeight] = useState(canvasHeight);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get current template name if in edit mode
  const currentTemplate = isEditMode && templateId ? getTemplateById(templateId) : null;

  useEffect(() => { 
    if (!isEditMode) {
      reset(); 
    }
  }, [isEditMode, reset]);

  const handleSaveClick = () => {
    if (isEditMode && currentTemplate) {
      // Direct save in edit mode - no modal
      handleSaveTemplate(currentTemplate.name);
    } else {
      // Show modal for new template
      setIsModalOpen(true);
    }
  };

  const handleSaveTemplate = (name: string) => {
    let template;
    if (isEditMode && templateId) {
      // Update existing template
      template = { ...exportTemplate(name), id: templateId };
    } else {
      // Create new template
      template = exportTemplate(name);
    }
    
    const success = saveTemplate(template);
    if (success) {
      alert(isEditMode ? 'Шаблон успешно обновлён!' : 'Шаблон успешно сохранён!');
      if (!isEditMode) {
        reset();
      }
    }
  };

  const scale = Math.min(1, Math.min((window.innerWidth - 800) / canvasWidth, (window.innerHeight - 200) / canvasHeight));
  const sortedContainers = [...containers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left Panel */}
      <div className="w-80 bg-white border-r p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">
          {isEditMode ? 'Редактирование шаблона' : 'Новый шаблон'}
        </h2>
        
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3">Размер холста</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Ширина (px)</label>
              <input type="number" value={width} onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-md" min="100" max="2000" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Высота (px)</label>
              <input type="number" value={height} onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-md" min="100" max="2000" />
            </div>
            <button onClick={() => setCanvasSize(width, height)}
              className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
              Применить размер
            </button>
          </div>
        </div>

        <hr className="my-6" />

        <button onClick={addContainer}
          className="w-full px-4 py-3 bg-secondary text-white rounded-md hover:bg-secondary/90 font-semibold mb-4">
          + Добавить блок
        </button>

        {/* Containers List */}
        {containers.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Блоки на холсте:</h3>
            <div className="space-y-2">
              {containers
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((container, index) => (
                  <button
                    key={container.id}
                    onClick={() => selectContainer(container.id)}
                    className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors ${
                      container.id === selectedContainerId
                        ? 'bg-primary text-white'
                        : 'bg-neutral text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Блок {index + 1}</span>
                      <span className="text-xs opacity-75">
                        {container.shape === 'rect' && '⬜'}
                        {container.shape === 'oval' && '⭕'}
                        {container.shape === 'circle' && '🔵'}
                      </span>
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {container.placeholder || 'Без текста'}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {selectedContainerId && (
          <div className="p-4 bg-neutral rounded-md">
            <button onClick={() => deleteContainer(selectedContainerId)}
              className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
              🗑️ Удалить блок
            </button>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-500">Контейнеров: {containers.length}</div>
        
        <button 
          onClick={handleSaveClick}
          className="w-full mt-6 px-4 py-3 bg-accent text-dark rounded-md hover:bg-accent/90 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
          disabled={containers.length === 0}>
          💾 {isEditMode ? 'Сохранить изменения' : 'Сохранить шаблон'}
        </button>
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 p-8 overflow-auto bg-gray-100 flex items-center justify-center">
        <div style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
          <Stage width={canvasWidth * scale} height={canvasHeight * scale} scaleX={scale} scaleY={scale}
            onClick={(e: any) => e.target === e.target.getStage() && selectContainer(null)}>
            <Layer>
              <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#f5f5f5" />
              {Array.from({ length: Math.ceil(canvasWidth / 50) }).map((_, i) => (
                <Rect key={`v-${i}`} x={i * 50} y={0} width={1} height={canvasHeight} fill="#e0e0e0" />
              ))}
              {Array.from({ length: Math.ceil(canvasHeight / 50) }).map((_, i) => (
                <Rect key={`h-${i}`} x={0} y={i * 50} width={canvasWidth} height={1} fill="#e0e0e0" />
              ))}
            </Layer>
            <Layer>
              {sortedContainers.map((container) => (
                <ContainerShape
                  key={container.id}
                  container={container}
                  isSelected={container.id === selectedContainerId}
                  onSelect={() => selectContainer(container.id)}
                  onUpdate={(updates) => updateContainer(container.id, updates)}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-96 bg-white border-l p-6 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Свойства контейнера</h3>
        <PropertiesPanel />
      </div>

      {/* Save Template Modal */}
      <SaveTemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTemplate}
      />
    </div>
  );
};
