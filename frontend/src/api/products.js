import api from "./client";

export const createProduct = (data = {}) =>
  api.post("/api/products", data).then((r) => r.data);

export const getProduct = (id) =>
  api.get(`/api/products/${id}`).then((r) => r.data);

export const updateProduct = (id, data) =>
  api.put(`/api/products/${id}`, data).then((r) => r.data);

export const uploadPhoto = (productId, file) => {
  const form = new FormData();
  form.append("file", file);
  return api
    .post(`/api/products/upload-photo?product_id=${productId}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const uploadReference = (productId, file) => {
  const form = new FormData();
  form.append("file", file);
  return api
    .post(`/api/products/upload-reference?product_id=${productId}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};
