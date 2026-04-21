/**
 * Custom Fonts Manager
 * Хранит файлы шрифтов в IndexedDB (больше места чем localStorage)
 */

const FONTS_REGISTRY_KEY = 'card_maker_fonts_registry';
const DB_NAME = 'card_maker_fonts_db';
const STORE_NAME = 'fonts';
const DB_VERSION = 1;

export interface CustomFont {
  family: string;
  filename: string;
  format: string;
  addedAt: number;
}

interface FontFile {
  filename: string;
  data: ArrayBuffer;
  format: string;
  family: string;
}

/**
 * Open IndexedDB
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'filename' });
      }
    };
  });
};

/**
 * Save font file to IndexedDB
 */
const saveFontFile = async (fontFile: FontFile): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(fontFile);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get font file from IndexedDB
 */
const getFontFile = async (filename: string): Promise<FontFile | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(filename);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete font file from IndexedDB
 */
const deleteFontFile = async (filename: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(filename);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Load fonts registry from localStorage
 */
export const loadFontsRegistry = (): CustomFont[] => {
  try {
    const data = localStorage.getItem(FONTS_REGISTRY_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading fonts registry:', error);
    return [];
  }
};

/**
 * Save fonts registry to localStorage
 */
export const saveFontsRegistry = (fonts: CustomFont[]): boolean => {
  try {
    localStorage.setItem(FONTS_REGISTRY_KEY, JSON.stringify(fonts));
    return true;
  } catch (error) {
    console.error('Error saving fonts registry:', error);
    return false;
  }
};

/**
 * Register and save a font file
 */
export const registerFont = async (file: File): Promise<{ 
  success: boolean; 
  error?: string; 
  font?: CustomFont;
}> => {
  // Validate file type
  const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
  const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  
  if (!validExtensions.includes(fileExt)) {
    return { success: false, error: 'Поддерживаются только TTF, OTF, WOFF, WOFF2 шрифты' };
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { success: false, error: 'Размер файла не должен превышать 10 МБ' };
  }

  try {
    // Extract font family name from filename
    const familyName = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '').replace(/[-_]/g, ' ');

    // Determine format
    const formatMap: Record<string, string> = {
      '.ttf': 'truetype',
      '.otf': 'opentype',
      '.woff': 'woff',
      '.woff2': 'woff2',
    };
    const format = formatMap[fileExt];

    // Check for duplicates
    const existingFonts = loadFontsRegistry();
    if (existingFonts.some(f => f.filename === file.name)) {
      return { success: false, error: 'Шрифт с таким именем уже добавлен' };
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Save to IndexedDB
    const fontFile: FontFile = {
      filename: file.name,
      data: arrayBuffer,
      format,
      family: familyName,
    };
    await saveFontFile(fontFile);

    // Create metadata entry
    const customFont: CustomFont = {
      family: familyName,
      filename: file.name,
      format,
      addedAt: Date.now(),
    };

    // Add to registry
    const fonts = loadFontsRegistry();
    fonts.push(customFont);
    saveFontsRegistry(fonts);

    // Load font into CSS
    await loadFontFromIndexedDB(file.name);

    console.log(`✅ Шрифт сохранён в IndexedDB: ${familyName}`);
    return { success: true, font: customFont };
  } catch (error) {
    console.error('Error registering font:', error);
    return { success: false, error: 'Ошибка сохранения шрифта' };
  }
};

/**
 * Load font from IndexedDB into CSS
 */
const loadFontFromIndexedDB = async (filename: string): Promise<boolean> => {
  try {
    const fontFile = await getFontFile(filename);
    if (!fontFile) {
      console.warn(`Шрифт не найден в IndexedDB: ${filename}`);
      return false;
    }

    // Create Blob from ArrayBuffer
    const blob = new Blob([fontFile.data], { 
      type: `font/${fontFile.format}` 
    });
    const url = URL.createObjectURL(blob);

    // Load font into CSS
    const fontFace = new FontFace(fontFile.family, `url(${url})`, {
      style: 'normal',
      weight: '400',
    });

    await fontFace.load();
    document.fonts.add(fontFace);
    
    console.log(`✅ Шрифт загружен из IndexedDB: ${fontFile.family}`);
    
    // Clean up URL
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    return true;
  } catch (error) {
    console.error(`Ошибка загрузки шрифта ${filename}:`, error);
    return false;
  }
};

/**
 * Load all registered fonts on app startup
 */
export const initializeCustomFonts = async (): Promise<void> => {
  const fonts = loadFontsRegistry();
  
  if (fonts.length === 0) {
    console.log('📁 Нет пользовательских шрифтов');
    return;
  }

  console.log(`📁 Загружаю ${fonts.length} пользовательских шрифтов...`);
  
  let loaded = 0;
  for (const font of fonts) {
    const success = await loadFontFromIndexedDB(font.filename);
    if (success) loaded++;
  }
  
  console.log(`✅ Загружено ${loaded} из ${fonts.length} шрифтов`);
};

/**
 * Delete a font
 */
export const deleteFont = async (filename: string): Promise<boolean> => {
  try {
    // Delete from IndexedDB
    await deleteFontFile(filename);
    
    // Remove from registry
    const fonts = loadFontsRegistry();
    const filtered = fonts.filter(f => f.filename !== filename);
    saveFontsRegistry(filtered);
    
    console.log(`🗑️ Шрифт удалён: ${filename}`);
    return true;
  } catch (error) {
    console.error('Error deleting font:', error);
    return false;
  }
};

/**
 * Get all available fonts
 */
export const getAllFonts = (): string[] => {
  const builtInFonts = ['Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Arial', 'Inter'];
  const customFonts = loadFontsRegistry().map(f => f.family);
  return [...builtInFonts, ...customFonts];
};

/**
 * Export font to file for backup
 */
export const exportFontToFile = async (filename: string): Promise<void> => {
  try {
    const fontFile = await getFontFile(filename);
    if (!fontFile) {
      throw new Error('Шрифт не найден');
    }

    const blob = new Blob([fontFile.data], { 
      type: `font/${fontFile.format}` 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log(`💾 Шрифт экспортирован: ${filename}`);
  } catch (error) {
    console.error('Error exporting font:', error);
    throw error;
  }
};

/**
 * Get storage usage info
 */
export const getStorageInfo = async (): Promise<{
  fontsCount: number;
  totalSize: number;
  fonts: Array<{ filename: string; size: number; family: string }>;
}> => {
  const fonts = loadFontsRegistry();
  const fontDetails = [];
  let totalSize = 0;

  for (const font of fonts) {
    try {
      const fontFile = await getFontFile(font.filename);
      if (fontFile) {
        const size = fontFile.data.byteLength;
        totalSize += size;
        fontDetails.push({
          filename: font.filename,
          size,
          family: font.family,
        });
      }
    } catch (error) {
      // Skip
    }
  }

  return {
    fontsCount: fonts.length,
    totalSize,
    fonts: fontDetails,
  };
};
