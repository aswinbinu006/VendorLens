# ==========================================
# Standalone Dockerfile for Backend API
# ==========================================

# Stage 1: Build & Compile
FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl for Prisma engine
RUN apk add --no-cache openssl

# Copy package manifests
COPY package.json ./

# Install all dependencies for compilation
RUN npm install

# Copy source code, configurations, and Prisma schema
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma Client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install runtime dependencies for Prisma
RUN apk add --no-cache openssl

COPY package.json ./
COPY prisma ./prisma

# Install production dependencies only
RUN npm install --omit=dev

# Copy compiled artifacts & generated prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/auth/me || exit 0

CMD ["node", "dist/index.js"]
