# Deployment & Architecture Guide: AI Vendor Risk Monitor

This repository is organized as a modular monorepo cleanly separating the **Backend API** service (`apps/api`) and the **Frontend Web SPA** (`apps/web`), with shared contracts in `packages/types`. Both tiers can be deployed together via Docker Compose or independently to separate cloud platforms.

```
ai-vendor-risk-monitor/
├── apps/
│   ├── api/             # Backend service (Node.js, Express, Prisma, PostgreSQL, Cron)
│   └── web/             # Frontend application (React 18, Vite, Tailwind CSS, Recharts)
├── packages/
│   └── types/           # Shared TypeScript models and API contracts
├── docker/              # PostgreSQL initialization scripts
├── docs/                # Architectural, compliance, and API specifications
├── docker-compose.yml   # Full-stack local & production multi-container orchestration
└── .env.example         # Root environment variables template (secrets redacted)
```

---

## 1. Deploying Backend Separately (`apps/api`)

The backend is an Express-based Node.js service requiring a PostgreSQL database with the `pg_trgm` extension enabled.

### Target Platforms
- **PaaS**: Render, Railway, Fly.io, Heroku, AWS App Runner
- **Container / VM**: Docker, AWS ECS, Google Cloud Run, DigitalOcean App Platform

### Environment Variables Required
Set the following variables in your cloud hosting provider dashboard (never commit these to Git; see `.env.example`):

| Variable | Description | Example / Recommended |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | HTTP port | `4000` (or injected by PaaS) |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://vrm_app:<PASSWORD>@<HOST>:5432/vrm?sslmode=require` |
| `JWT_SECRET` | Session secret (minimum 32 characters) | Generated cryptographic random string |
| `JWT_EXPIRES_IN` | Token duration | `8h` |
| `CORS_ORIGIN` | Allowed Frontend URL | `https://your-frontend-app.vercel.app` |
| `TRUST_PROXY` | Reverse proxy hops (1 for Render/Railway/Nginx) | `1` |
| `OPENFDA_API_KEY` | Optional openFDA key for higher rate limits | (Obtain from https://open.fda.gov) |
| `INGEST_CRON` | Scheduled ingestion cadence | `0 */6 * * *` |
| `NEWS_ENABLED` | Media monitoring feature toggle | `false` |

### Database Setup & Migrations
1. Ensure your PostgreSQL instance has `pg_trgm` enabled:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ```
2. Run database migrations:
   ```bash
   # From root:
   npm run db:migrate
   # Or using Prisma directly:
   npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
   ```

### Standalone Build & Run Commands
- **Install command**: `npm ci`
- **Build command**: `npm run build:backend` (executes `npx prisma generate` and compiles TypeScript to `apps/api/dist`)
- **Start command**: `npm run start:backend` (runs `node apps/api/dist/index.js`)

### Standalone Docker Deployment
Build and run the dedicated backend container:
```bash
docker build -f apps/api/Dockerfile -t vrm-backend .
docker run -p 4000:4000 --env-file apps/api/.env vrm-backend
```

---

## 2. Deploying Frontend Separately (`apps/web`)

The frontend is a static Single Page Application (SPA) built with Vite, React, and Tailwind CSS.

### Target Platforms
- Vercel, Netlify, Cloudflare Pages, GitHub Pages, AWS S3 + CloudFront, Nginx

### Build Configuration
- **Framework Preset**: Vite
- **Root Directory**: `.` (monorepo root) or `apps/web`
- **Build Command**: `npm run build:frontend`
- **Output Directory**: `apps/web/dist`

### API Routing & Proxy Configuration
In production, all browser requests target the relative path `/api/v1/*`.
- **Option A (Vercel / Netlify Rewrite)**:
  Configure rewrites to proxy `/api/:path*` to your backend URL:
  ```json
  // vercel.json
  {
    "rewrites": [
      { "source": "/api/(.*)", "destination": "https://your-backend-api.onrender.com/api/$1" },
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- **Option B (Nginx Reverse Proxy)**:
  Use the pre-configured [apps/web/nginx.conf](file:///c:/Users/aswin/OneDrive/Documents/Soft%20Computing%20Project/apps/web/nginx.conf) included in the Docker build.

---

## 3. Deploying Full Stack with Docker Compose

To deploy both tiers and a hardened PostgreSQL database together on any server:

```bash
# 1. Copy and configure secrets
cp .env.example .env
nano .env

# 2. Build and launch all services
docker compose up -d --build

# 3. Check container status
docker compose ps
```
- Web Application: `http://localhost:5173` (or port 80 in production)
- Backend API: `http://localhost:4000/api/v1`
