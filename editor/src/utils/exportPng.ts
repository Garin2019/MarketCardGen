import Konva from 'konva';
import { saveAs } from 'file-saver';

/**
 * Export Konva stage to PNG file
 */
export const exportPng = async (
  stage: Konva.Stage,
  filename: string = `card_${Date.now()}.png`
): Promise<void> => {
  try {
    // Get data URL from stage with high quality
    const dataURL = stage.toDataURL({
      pixelRatio: 2, // Higher quality (2x resolution)
      mimeType: 'image/png',
    });

    // Convert data URL to blob
    const response = await fetch(dataURL);
    const blob = await response.blob();

    // Save file
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error exporting PNG:', error);
    throw new Error('Не удалось экспортировать изображение');
  }
};

/**
 * Load fonts before export to ensure they render correctly
 */
export const loadFonts = async (fontFamilies: string[]): Promise<void> => {
  const uniqueFonts = [...new Set(fontFamilies)];
  
  const loadPromises = uniqueFonts.map(family => {
    return document.fonts.load(`12px "${family}"`);
  });

  try {
    await Promise.all(loadPromises);
  } catch (error) {
    console.warn('Some fonts failed to load:', error);
    // Continue anyway - browser will use fallback fonts
  }
};
