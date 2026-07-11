# Stage 1: build the React frontend
FROM node:20-slim AS build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/. .
ENV VITE_API_BASE_URL=/api
RUN npm run build

# Stage 2: serve the build output via Nginx
FROM nginx:alpine
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
