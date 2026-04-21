import api from "./client";

export const getSettings = () =>
  api.get("/api/settings").then((r) => r.data.settings);

export const getSettingsMeta = () =>
  api.get("/api/settings").then((r) => r.data);

export const updateSettings = (settings) =>
  api.put("/api/settings", { settings }).then((r) => r.data);

export const clearUploadsFolder = () =>
  api.delete("/api/settings/uploads").then((r) => r.data);
