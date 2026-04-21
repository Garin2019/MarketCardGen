import api from "./client";

export const getTemplates = () =>
  api.get("/api/templates").then((r) => r.data.templates);

export const createTemplate = (data) =>
  api.post("/api/templates", data).then((r) => r.data);

export const updateTemplate = (id, data) =>
  api.put(`/api/templates/${id}`, data).then((r) => r.data);

export const improveTemplatePrompt = (data) =>
  api.post("/api/templates/improve-prompt", data).then((r) => r.data);

export const deleteTemplate = (id) =>
  api.delete(`/api/templates/${id}`);
