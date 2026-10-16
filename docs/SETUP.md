# 13 - Setup Instructions

## 1. Prerequisites
- Node.js 22 LTS, npm
- Docker Desktop (for the one-command run)
- Git
- A free openFDA API key (https://open.fda.gov, VERIFY signup page)
- An SMTP account if you want email alerts (optional)

## 2. Environment file
Copy `.env.example` to `.env`:
```
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://vrm_app:CHANGE_ME@db:5432/vrm
JWT_SECRET=GENERATE_A_LONG_RANDOM_STRING
JWT_EXPIRES_IN=8h
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SET_A_STRONG_PASSWORD
CORS_ORIGIN=http://localhost:5173
OPENFDA_API_KEY=YOUR_KEY
INGEST_CRON=0 */6 * * *
NEWS_ENABLED=true
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
ALERT_EMAIL_TO=
```
Never commit `.env`.

## 3. Run with Docker
```yaml
# docker-compose.yml (E10 override: superuser 'postgres' used only for init script)
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_SUPERUSER_PASSWORD:-<REDACTED>}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    env_file: .env
    environment:
      DATABASE_URL: postgresql://vrm_app:${DB_APP_PASSWORD:-<REDACTED>}@db:5432/vrm
    depends_on: [db]
    ports: ["4000:4000"]
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports: ["5173:80"]
    depends_on: [api]
volumes:
  pgdata:
```
> **Security Note on Database Roles (E10)**:
> In docker-compose, `POSTGRES_USER=postgres` is a superuser used exclusively by the container's
> entrypoint init script (`docker/postgres/init.sql`) to create the `vrm` database and enable the
> `pg_trgm` extension. The application and all database connections strictly use the non-superuser role
> `vrm_app`. Migrations and runtime share this `vrm_app` role (not a separated migration role); this is an
> accepted limitation for this project.
```bash
docker compose up --build
```
On first start the API runs migrations and creates the admin user from env.

## 4. Run for development (without Docker for api/web)
```bash
docker compose up db -d
npm install
npm run db:migrate -w apps/api
npm run dev -w apps/api     # :4000
npm run dev -w apps/web     # :5173
```

## 5. First data load
1. Log in with the admin credentials
2. Add vendors, or import CSV (columns: `name,country,category,criticality`)
3. Go to Ingestion, press **Run now**
4. Review pending matches, then check the dashboard

## 6. Tests
```bash
npm test -w apps/api
npm run lint
npm audit
```

## 7. Deploy the hosted demo (Render example)
1. Create a managed Postgres instance, copy its URL into `DATABASE_URL`
2. Deploy `apps/api` as a web service (build: `npm ci && npm run build`, start: `npm run start`)
3. Deploy `apps/web` as a static site with `VITE_API_URL` pointing to the API
4. Set every variable from section 2 in the platform's secret settings
5. Set `CORS_ORIGIN` to the web URL, and confirm cookies work over HTTPS
6. Warm up the instance before presenting

## 8. Backup and restore
```bash
pg_dump "$DATABASE_URL" > backup.sql
psql "$DATABASE_URL" < backup.sql
```

## 9. Troubleshooting
| Symptom | Check |
|---|---|
| Login works but requests 401 | Cookie flags / CORS origin / HTTPS |
| No signals appear | Ingestion page error text, API key, vendor names |
| Many pending matches | Normalization and threshold, aliases |
| Slow first load on hosted | Cold start; warm up |
| Email not sent | SMTP vars; check logs (non-fatal) |