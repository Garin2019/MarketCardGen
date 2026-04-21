import axios from "axios";

// Базовый клиент для большинства запросов
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
  timeout: 60000, // 60 сек — достаточно для текстовых запросов
});

// Клиент с увеличенным timeout для генерации изображений (Kandinsky до 2 минут)
export const apiLong = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
  timeout: 150000, // 150 сек
});

const attachInterceptor = (instance) => {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const message =
        error.code === "ECONNABORTED"
          ? "Превышено время ожидания ответа от сервера. Попробуйте ещё раз."
          : error.response?.data?.detail ||
            error.message ||
            "Неизвестная ошибка";
      console.error("[API Error]", message);
      return Promise.reject(new Error(message));
    }
  );
};

attachInterceptor(api);
attachInterceptor(apiLong);

export default api;
