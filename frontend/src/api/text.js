import api, { apiLong } from "./client";

export const generateText = (params) =>
  apiLong.post("/api/text/generate", params).then((r) => r.data);

export const validateText = (short, long) =>
  api
    .post("/api/text/validate", { short, long })
    .then((r) => r.data);
