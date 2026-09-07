# syntax=docker/dockerfile:1

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vacío a propósito: el frontend hace llamadas relativas al mismo origen y nginx
# (ver nginx.conf) hace de reverse-proxy al backend. `ENV` para que Vite lo lea
# desde process.env al hacer el build (ARG por sí solo no llega a process.env).
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- runtime ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist /usr/share/nginx/html
EXPOSE 80
