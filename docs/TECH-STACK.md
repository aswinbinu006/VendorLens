# 12 - Tech Stack

| Layer | Choice | Why | Rejected alternative |
|---|---|---|---|
| Runtime | Node.js 22 LTS | Current LTS; team knows it | Node 20 (end of life) |
| Language | TypeScript | Type safety across API and UI | Plain JS |
| API | Express | Simple, familiar | NestJS (more setup time) |
| Validation | Zod | Runtime validation + inferred types | Hand-written checks |
| ORM | Prisma | Fast iteration, migrations | Raw SQL only |
| Database | PostgreSQL 16+ | Reliable; `pg_trgm` for fuzzy names; JSONB | MongoDB (weaker fit for relational + trigram) |
| Scheduler | node-cron | Simple, in-process | BullMQ + Redis (extra moving part for this scope) |
| Auth | bcrypt + JWT (httpOnly cookie) | Small and secure for single admin | Auth0/Clerk (external dependency) |
| Email | Nodemailer + SMTP provider | Standard | Proprietary SDKs |
| RSS parsing | rss-parser | Small, maintained | Custom XML parsing |
| Logging | pino | Fast structured logs | console.log |
| Frontend | React + Vite + TypeScript | Team skill; fast dev | Next.js (SSR not needed) |
| Styling | Tailwind CSS | Fast consistent UI | Custom CSS |
| Data fetching | TanStack Query | Caching, loading/error states | Manual fetch |
| Routing | React Router | Standard | - |
| Charts | Recharts | Easy gauge/line/bar | D3 (too slow to build) |
| Testing | Vitest, Supertest | Fast, TS-native | Jest |
| Containers | Docker + Compose | One-command run | Manual install |
| CI | GitHub Actions (lint, test, audit) | Free, simple | - |
| Hosting (demo) | Render or Railway | Managed Postgres, HTTPS | Self-managed VPS |
| Fuzzy engine | Hand-written TypeScript | Explainable, ~150 lines | scikit-fuzzy (adds a Python service) |

## Data sources
| Source | Use | Note |
|---|---|---|
| openFDA drug enforcement | Official recalls | Free API key; VERIFY fields and update cadence |
| News RSS | Unverified chatter | VERIFY terms of use; behind a swappable adapter |

## Explicitly not used
Trained ML models, LLM agents, vector databases, message brokers.
Reason: no labeled data, limited time, and explainability requirements.