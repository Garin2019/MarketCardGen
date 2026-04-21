import api, { apiLong } from "./client";

export const getProductImages = (productId) =>
  api.get(`/api/images/product/${productId}`).then((r) => r.data.images);

export const generateImage = (data) =>
  apiLong.post("/api/images/generate", data).then((r) => r.data);

export const generateBatch = (data) =>
  apiLong.post("/api/images/generate-batch", data).then((r) => r.data);

export const uploadProductImages = (productId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return api
    .post(`/api/images/upload?product_id=${productId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const deleteImage = (imageId) =>
  api.delete(`/api/images/${imageId}`);

export const reorderImage = (imageId, sortOrder) =>
  api.put(`/api/images/${imageId}/reorder`, { sort_order: sortOrder }).then((r) => r.data);

export const downloadImagesZip = (productId) => {
  window.open(`/api/images/product/${productId}/zip`, "_blank");
};
