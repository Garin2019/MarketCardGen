# Editor build (Vite)
FROM node:20-alpine AS editor-build
WORKDIR /app/editor
COPY editor/package*.json ./
RUN npm ci --no-audit --no-fund
COPY editor/ .
RUN npm run build

# Main frontend build (CRA)
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
ARG REACT_APP_EDITOR_URL=/editor/
ENV REACT_APP_EDITOR_URL=$REACT_APP_EDITOR_URL
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=frontend-build /app/frontend/build /usr/share/nginx/html
COPY --from=editor-build /app/editor/dist /usr/share/nginx/html/editor
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
