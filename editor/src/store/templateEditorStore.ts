import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Container, Template } from '@/types';

interface TemplateEditorStore {
  canvasWidth: number;
  canvasHeight: number;
  containers: Container[];
  selectedContainerId: string | null;
  setCanvasSize: (width: number, height: number) => void;
  addContainer: () => void;
  updateContainer: (id: string, updates: Partial<Container>) => void;
  deleteContainer: (id: string) => void;
  selectContainer: (id: string | null) => void;
  moveContainerForward: (id: string) => void;
  moveContainerBackward: (id: string) => void;
  canMoveForward: (id: string) => boolean;
  canMoveBackward: (id: string) => boolean;
  reset: () => void;
  exportTemplate: (name: string) => Template;
  loadTemplate: (template: Template) => void;
}

const createDefaultContainer = (zIndex: number): Container => ({
  id: uuidv4(),
  shape: 'rect',
  x: 50,
  y: 50,
  width: 200,
  height: 80,
  zIndex,
  bgColor: '#ffffff',
  bgOpacity: 0.85,
  paddingX: 12,
  paddingY: 8,
  font: { family: 'Roboto', size: 18, color: '#222222', bold: false, italic: false },
  placeholder: 'Введите текст',
  cornerRadius: 4,
  strokeColor: '#000000',
  strokeWidth: 0,
  strokeOpacity: 1,
  align: 'left',
});

export const useTemplateEditorStore = create<TemplateEditorStore>((set, get) => ({
  canvasWidth: 800,
  canvasHeight: 600,
  containers: [],
  selectedContainerId: null,

  setCanvasSize: (width, height) => set({ canvasWidth: width, canvasHeight: height }),

  addContainer: () => {
    const { containers } = get();
    const maxZIndex = containers.length > 0 ? Math.max(...containers.map(c => c.zIndex)) : 0;
    const newContainer = createDefaultContainer(maxZIndex + 1);
    set({ containers: [...containers, newContainer], selectedContainerId: newContainer.id });
  },

  updateContainer: (id, updates) => set(state => ({
    containers: state.containers.map(c => c.id === id ? { ...c, ...updates } : c)
  })),

  deleteContainer: (id) => set(state => ({
    containers: state.containers.filter(c => c.id !== id),
    selectedContainerId: state.selectedContainerId === id ? null : state.selectedContainerId
  })),

  selectContainer: (id) => set({ selectedContainerId: id }),

  moveContainerForward: (id) => {
    const { containers } = get();
    const container = containers.find(c => c.id === id);
    if (!container) return;
    const higherContainers = containers.filter(c => c.zIndex > container.zIndex);
    if (higherContainers.length === 0) return;
    const nextContainer = higherContainers.reduce((min, c) => c.zIndex < min.zIndex ? c : min);
    set(state => ({
      containers: state.containers.map(c => {
        if (c.id === id) return { ...c, zIndex: nextContainer.zIndex };
        if (c.id === nextContainer.id) return { ...c, zIndex: container.zIndex };
        return c;
      }).sort((a, b) => a.zIndex - b.zIndex)
    }));
  },

  moveContainerBackward: (id) => {
    const { containers } = get();
    const container = containers.find(c => c.id === id);
    if (!container) return;
    const lowerContainers = containers.filter(c => c.zIndex < container.zIndex);
    if (lowerContainers.length === 0) return;
    const prevContainer = lowerContainers.reduce((max, c) => c.zIndex > max.zIndex ? c : max);
    set(state => ({
      containers: state.containers.map(c => {
        if (c.id === id) return { ...c, zIndex: prevContainer.zIndex };
        if (c.id === prevContainer.id) return { ...c, zIndex: container.zIndex };
        return c;
      }).sort((a, b) => a.zIndex - b.zIndex)
    }));
  },

  canMoveForward: (id) => {
    const { containers } = get();
    const container = containers.find(c => c.id === id);
    return container ? containers.some(c => c.zIndex > container.zIndex) : false;
  },

  canMoveBackward: (id) => {
    const { containers } = get();
    const container = containers.find(c => c.id === id);
    return container ? containers.some(c => c.zIndex < container.zIndex) : false;
  },

  reset: () => set({ canvasWidth: 800, canvasHeight: 600, containers: [], selectedContainerId: null }),

  exportTemplate: (name) => {
    const { canvasWidth, canvasHeight, containers } = get();
    return {
      id: uuidv4(),
      name,
      width: canvasWidth,
      height: canvasHeight,
      createdAt: new Date().toISOString(),
      containers: containers.map(c => ({ ...c }))
    };
  },

  loadTemplate: (template) => {
    set({
      canvasWidth: template.width,
      canvasHeight: template.height,
      containers: template.containers.map(c => ({ ...c })),
      selectedContainerId: null
    });
  }
}));
