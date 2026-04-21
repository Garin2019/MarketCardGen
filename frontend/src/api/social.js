import api, { apiLong } from "./client";

export const generatePost = (data) =>
  apiLong.post("/api/social/generate-post", data).then((r) => r.data);

export const publishPost = (postId, options = {}) => {
  const {
    useImages = true,
    vkUseImages = true,
    selectedImageIds = [],
    primaryImageId = null,
  } = options;

  return api
    .post("/api/social/publish", {
      post_id: postId,
      use_images: useImages,
      vk_use_images: vkUseImages,
      selected_image_ids: selectedImageIds,
      primary_image_id: primaryImageId,
    })
    .then((r) => r.data);
};

export const updatePost = (postId, data) =>
  api.put(`/api/social/posts/${postId}`, data).then((r) => r.data);

export const getProductPosts = (productId) =>
  api.get(`/api/social/posts/${productId}`).then((r) => r.data.posts);
