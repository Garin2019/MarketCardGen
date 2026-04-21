import { create } from 'zustand';
import type { Template } from '@/types';

const STORAGE_KEY = 'card_maker_templates';

interface TemplatesStore {
  templates: Template[];
  loadTemplates: () => void;
  saveTemplate: (template: Template) => boolean;
  deleteTemplate: (id: string) => boolean;
  getTemplateById: (id: string) => Template | undefined;
}

const loadFromLocalStorage = (): Template[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => 
      item.id && item.name && typeof item.width === 'number' && 
      typeof item.height === 'number' && Array.isArray(item.containers)
    );
  } catch (error) {
    console.error('Error loading templates:', error);
    return [];
  }
};

const saveToLocalStorage = (templates: Template[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      alert('Недостаточно места в localStorage. Удалите некоторые шаблоны.');
    } else {
      console.error('Error saving templates:', error);
    }
    return false;
  }
};

export const useTemplatesStore = create<TemplatesStore>((set, get) => ({
  templates: [],

  loadTemplates: () => {
    const templates = loadFromLocalStorage();
    set({ templates });
  },

  saveTemplate: (template) => {
    const { templates } = get();
    const existingIndex = templates.findIndex(t => t.id === template.id);
    
    let newTemplates: Template[];
    if (existingIndex >= 0) {
      newTemplates = templates.map((t, i) => i === existingIndex ? template : t);
    } else {
      newTemplates = [...templates, template];
    }
    
    const success = saveToLocalStorage(newTemplates);
    if (success) {
      set({ templates: newTemplates });
    }
    return success;
  },

  deleteTemplate: (id) => {
    const { templates } = get();
    const newTemplates = templates.filter(t => t.id !== id);
    const success = saveToLocalStorage(newTemplates);
    if (success) {
      set({ templates: newTemplates });
    }
    return success;
  },

  getTemplateById: (id) => {
    return get().templates.find(t => t.id === id);
  },
}));

// Auto-load on initialization
useTemplatesStore.getState().loadTemplates();
