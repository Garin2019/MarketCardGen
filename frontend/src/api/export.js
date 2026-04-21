// Скачать Excel — открываем ссылку напрямую в браузере
export const downloadExcel = (productId) => {
  window.open(`/api/export/${productId}/excel`, "_blank");
};

// Скачать CSV — открываем ссылку напрямую в браузере
export const downloadCsv = (productId) => {
  window.open(`/api/export/${productId}/csv`, "_blank");
};
