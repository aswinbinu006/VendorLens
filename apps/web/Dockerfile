# ==========================================
# Multi-stage Dockerfile for Frontend (SPA)
# ==========================================

# Stage 1: Build & Compile React SPA
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/types ./packages/types
COPY apps/web ./apps/web

RUN npm ci

WORKDIR /app/apps/web
RUN npm run build

# Stage 2: Nginx Static Server
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
