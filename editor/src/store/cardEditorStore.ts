import { create } from 'zustand';
import type { Template } from '@/types';
import { useTemplatesStore } from './templatesStore';

export type ImageScale = 'none' | 'fitHeight' | 'fitWidth';

interface CardEditorStore {
  image: string | null;
  selectedTemplateId: string | null;
  containerTexts: Record<string, string>;
  imageScale: ImageScale;
  setImage: (base64: string) => void;
  selectTemplate: (id: string) => void;
  updateText: (containerId: string, text: string) => void;
  setImageScale: (scale: ImageScale) => void;
  reset: () => void;
  getTemplate: () => Template | undefined;
  isReady: () => boolean;
}

export const useCardEditorStore = create<CardEditorStore>((set, get) => ({
  image: null,
  selectedTemplateId: null,
  containerTexts: {},
  imageScale: 'none',

  setImage: (base64) => {
    set({ image: base64 });
  },

  selectTemplate: (id) => {
    const template = useTemplatesStore.getState().getTemplateById(id);
    if (!template) return;

    // Initialize containerTexts with empty strings for each container
    const containerTexts: Record<string, string> = {};
    template.containers.forEach(container => {
      containerTexts[container.id] = '';
    });

    set({ 
      selectedTemplateId: id,
      containerTexts,
    });
  },

  updateText: (containerId, text) => {
    set(state => ({
      containerTexts: {
        ...state.containerTexts,
        [containerId]: text,
      },
    }));
  },

  setImageScale: (scale) => {
    set({ imageScale: scale });
  },

  reset: () => {
    set({
      image: null,
      selectedTemplateId: null,
      containerTexts: {},
      imageScale: 'none',
    });
  },

  getTemplate: () => {
    const { selectedTemplateId } = get();
    if (!selectedTemplateId) return undefined;
    return useTemplatesStore.getState().getTemplateById(selectedTemplateId);
  },

  isReady: () => {
    const { image, selectedTemplateId } = get();
    return image !== null && selectedTemplateId !== null;
  },
}));
