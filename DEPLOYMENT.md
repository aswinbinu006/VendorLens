# Deployment & Architecture Guide: AI Vendor Risk Monitor

This repository is organized into distinct, self-contained directories for the **Backend API** service (`backend/`) and the **Frontend Web SPA** (`frontend/`). Both tiers can be deployed together via Docker Compose or independently to separate cloud platforms.

```
ai-vendor-risk-monitor/
├── backend/             # Standalone Backend (Node.js, Express, Prisma, PostgreSQL, Cron, Mamdani)
│   ├── src/             # Source code & local types
│   ├── prisma/          # Database schema & migrations
│   ├── Dockerfile       # Self-contained backend container
│   ├── package.json     # Backend dependencies & scripts
│   ├── .env.example     # Backend environment template
│   └── README.md        # Dedicated backend documentation
├── frontend/            # Standalone Frontend (React 18, Vite, Tailwind CSS, Recharts)
│   ├── src/             # SPA source code & components
│   ├── Dockerfile       # Self-contained frontend container (Nginx + static build)
│   ├── nginx.conf       # Reverse-proxy configuration for /api/v1
│   ├── package.json     # Frontend dependencies & scripts
│   ├── .env.example     # Frontend environment template
│   └── README.md        # Dedicated frontend documentation
├── docker/              # PostgreSQL initialization scripts
├── docs/                # Architectural, compliance, and API specifications
├── docker-compose.yml   # Full-stack local & production multi-container orchestration
├── .gitignore           # Git ignore rules (protecting .env and all credentials)
└── .env.example         # Root environment variables template (secrets redacted)
```

---

## 1. Deploying Backend Separately (`backend/`)

The backend is completely self-contained. Anyone deploying the backend can set the root directory to `backend/` without needing any external monorepo dependencies.

### Target Platforms
- **PaaS**: Render, Railway, Fly.io, Heroku, AWS App Runner
- **Container / VM**: Docker, AWS ECS, Google Cloud Run, DigitalOcean App Platform

### Environment Variables Required
Set the following variables in your cloud hosting provider dashboard (never commit these to Git; see `backend/.env.example`):

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
   # From backend folder:
   cd backend
   npx prisma migrate deploy
   ```

### Standalone Build & Run Commands
- **Install command**: `npm install`
- **Build command**: `npm run build`
- **Start command**: `npm run start`

### Standalone Docker Deployment
```bash
cd backend
docker build -t vrm-backend .
docker run -p 4000:4000 --env-file .env vrm-backend
```

---

## 2. Deploying Frontend Separately (`frontend/`)

The frontend is a static Single Page Application (SPA) built with Vite, React, and Tailwind CSS. It is completely self-contained.

### Target Platforms
- Vercel, Netlify, Cloudflare Pages, GitHub Pages, AWS S3 + CloudFront, Nginx

### Build Configuration
- **Root Directory**: `frontend`
- **Install Command**: `npm install`
- **Build Command**: `npm run build`
- **Output Directory**: `dist` (inside `frontend/dist`)

### API Routing & Proxy Configuration
In production, all browser requests target relative path `/api/v1/*`.
- **Option A (Vercel / Netlify Rewrite)**:
  Configure rewrites to proxy `/api/:path*` to your backend URL:
  ```json
  // vercel.json inside frontend/
  {
    "rewrites": [
      { "source": "/api/(.*)", "destination": "https://your-backend-api.onrender.com/api/$1" },
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- **Option B (Nginx Reverse Proxy)**:
  Use the pre-configured [frontend/nginx.conf](file:///c:/Users/aswin/OneDrive/Documents/Soft%20Computing%20Project/frontend/nginx.conf) included in the Docker build.

---

## 3. Deploying Full Stack with Docker Compose

To deploy both tiers and a hardened PostgreSQL database together:

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
