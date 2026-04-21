/**
 * Local Fonts Loader
 * Автоматически загружает все шрифты из папки public/fonts/
 */

export interface LocalFont {
  family: string;
  path: string;
  format: string;
}

/**
 * Список локальных шрифтов в папке public/fonts/
 * ВАЖНО: Добавьте сюда ваши шрифты вручную!
 */
export const LOCAL_FONTS: LocalFont[] = [
  // Пример:
  // {
  //   family: 'MyCustomFont',
  //   path: '/fonts/MyCustomFont.ttf',
  //   format: 'truetype'
  // },
  // {
  //   family: 'AnotherFont',
  //   path: '/fonts/AnotherFont.woff2',
  //   format: 'woff2'
  // },
];

/**
 * Определить формат шрифта по расширению файла
 */
const getFormatFromPath = (path: string): string => {
  const ext = path.toLowerCase().split('.').pop();
  const formatMap: Record<string, string> = {
    'ttf': 'truetype',
    'otf': 'opentype',
    'woff': 'woff',
    'woff2': 'woff2',
  };
  return formatMap[ext || ''] || 'truetype';
};

/**
 * Загрузить локальный шрифт в CSS
 */
export const loadLocalFont = async (font: LocalFont): Promise<void> => {
  try {
    const fontFace = new FontFace(
      font.family,
      `url(${font.path})`,
      {
        style: 'normal',
        weight: '400',
      }
    );

    await fontFace.load();
    document.fonts.add(fontFace);
    console.log(`✓ Локальный шрифт загружен: ${font.family}`);
  } catch (error) {
    console.warn(`✗ Не удалось загрузить шрифт: ${font.family}`, error);
  }
};

/**
 * Загрузить все локальные шрифты при старте приложения
 */
export const initializeLocalFonts = async (): Promise<void> => {
  if (LOCAL_FONTS.length === 0) {
    console.log('Нет локальных шрифтов в public/fonts/');
    return;
  }

  console.log(`Загружаю ${LOCAL_FONTS.length} локальных шрифтов...`);
  
  for (const font of LOCAL_FONTS) {
    await loadLocalFont(font);
  }
  
  console.log('✓ Все локальные шрифты загружены!');
};

/**
 * Получить список всех доступных шрифтов
 * (встроенные + локальные + из localStorage)
 */
export const getAllAvailableFonts = (): string[] => {
  const builtInFonts = ['Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Arial', 'Inter'];
  const localFonts = LOCAL_FONTS.map(f => f.family);
  
  // Пользовательские шрифты из localStorage (если есть)
  let customFonts: string[] = [];
  try {
    const stored = localStorage.getItem('card_maker_custom_fonts');
    if (stored) {
      customFonts = JSON.parse(stored).map((f: any) => f.family);
    }
  } catch (error) {
    // Ignore
  }
  
  // Объединить и убрать дубликаты
  return [...new Set([...builtInFonts, ...localFonts, ...customFonts])];
};

/**
 * ИНСТРУКЦИЯ ПО ДОБАВЛЕНИЮ ЛОКАЛЬНЫХ ШРИФТОВ:
 * 
 * 1. Скопируйте файлы шрифтов в папку: public/fonts/
 * 
 * 2. Добавьте их в массив LOCAL_FONTS выше:
 * 
 *    export const LOCAL_FONTS: LocalFont[] = [
 *      {
 *        family: 'Название шрифта',  // Как будет отображаться в списке
 *        path: '/fonts/файл.ttf',     // Путь к файлу (относительно public/)
 *        format: 'truetype'           // Формат: truetype, opentype, woff, woff2
 *      },
 *    ];
 * 
 * 3. Перезапустите приложение
 * 
 * 4. Шрифты автоматически загрузятся и появятся в списке!
 * 
 * ПРИМЕРЫ:
 * 
 * // TTF шрифт
 * {
 *   family: 'Roboto Condensed',
 *   path: '/fonts/RobotoCondensed-Regular.ttf',
 *   format: 'truetype'
 * },
 * 
 * // WOFF2 шрифт (рекомендуется)
 * {
 *   family: 'Inter',
 *   path: '/fonts/Inter-Regular.woff2',
 *   format: 'woff2'
 * },
 * 
 * // OTF шрифт
 * {
 *   family: 'Montserrat',
 *   path: '/fonts/Montserrat-Bold.otf',
 *   format: 'opentype'
 * },
 */
