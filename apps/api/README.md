# @vrm/api - Backend Regulatory Surveillance & Fuzzy Risk Service

The backend service for **AI Vendor Risk & Compliance Monitor (Pharma)**. Built with Node.js, Express, TypeScript, Prisma ORM, and PostgreSQL.

## Features
- **Regulatory Ingestion**: Automated ingestion of US FDA drug enforcement recalls via openFDA with PostgreSQL advisory lock concurrency control.
- **Fuzzy Inference Engine**: Two-stage Mamdani inference engine with 11 Stage 1 rules (Regulatory Risk) and 12 Stage 2 rules (Overall Risk), calculating explainable 0–100 scores across 4 discrete risk tiers (**Low**, **Medium**, **High**, **Critical**).
- **Trigram Similarity Matching**: Fuzzy matching of recalling firms to monitored pharma vendors (`pg_trgm`).
- **Electronic Audit Trail**: 21 CFR Part 11 compliant audit trail recording clinical risk notes, user logins, match reviews, and vendor modifications.
- **Security Hardened**: Non-superuser `vrm_app` database role, `X-Requested-With: fetch` CSRF protection, rate limiting, helmet HTTP headers, and strict parameterized queries.

## Standalone Deployment Quickstart

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ with `pg_trgm` extension installed

### 1. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials and strong random JWT_SECRET
```

### 2. Install & Generate Database Client
```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

### 3. Build & Run
```bash
npm run build
npm run start
# Server listens on port 4000 (or PORT env variable)
```

## Available Scripts
- `npm run dev`: Start development server with live watch (`tsx`)
- `npm run build`: Compile TypeScript to `dist/`
- `npm run start`: Start production server (`node dist/index.js`)
- `npm run test`: Run Vitest unit & integration test suite
- `npm run prisma:generate`: Generate Prisma Client
- `npm run prisma:migrate`: Deploy pending Prisma migrations
