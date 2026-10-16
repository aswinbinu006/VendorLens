# ==========================================
# Multi-stage Dockerfile for Backend API
# ==========================================

# Stage 1: Build & Compile
FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl for Prisma engine
RUN apk add --no-cache openssl

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY packages/types ./packages/types
COPY apps/api ./apps/api

# Install all workspace dependencies
RUN npm ci

# Generate Prisma Client and compile TypeScript
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install runtime dependencies for Prisma
RUN apk add --no-cache openssl

# Copy manifests for production install
COPY package.json package-lock.json ./
COPY packages/types ./packages/types
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/prisma ./apps/api/prisma

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled artifacts & generated prisma client from builder
COPY --from=builder /app/apps/api/node_modules/.prisma /app/apps/api/node_modules/.prisma
COPY --from=builder /app/apps/api/node_modules/@prisma /app/apps/api/node_modules/@prisma
COPY --from=builder /app/apps/api/dist /app/apps/api/dist

WORKDIR /app/apps/api

EXPOSE 4000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/auth/me || exit 0

CMD ["node", "dist/index.js"]
