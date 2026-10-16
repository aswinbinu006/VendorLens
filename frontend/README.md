# @vrm/web - Executive Risk & Compliance Frontend (SPA)

The web user interface for **AI Vendor Risk & Compliance Monitor (Pharma)**. Built with React 18, Vite, Tailwind CSS, Lucide Icons, and Recharts.

## Features
- **Executive Dashboard**: High-level KPIs, 4-tier risk distribution (Low, Medium, High, Critical), stale data warning banner (>36h), news surveillance status notice, top risky vendors, and recent alerts.
- **Vendors Watchlist**: Server-side pagination, search, risk filters, alias tag management, and CSV importer with row-level error validation.
- **Vendor Detail & Explainable Fuzzy Score**: Half-circle SVG risk gauge, exact input parameter breakdown, fired Mamdani rules table with firing strength %, score audit history with configuration version markers, and official FDA signals timeline.
- **Match Review Queue**: Trigram similarity score, classification, and confirm/reject human-in-the-loop review actions.
- **Alerts Inbox & Clinical Notes**: Severity and status filters, mark reviewed/dismiss actions, and inline compliance note editor.
- **Part 11 Audit Trail & Fuzzy Rules Viewer**: Filterable electronic audit log and read-only Mamdani linguistic variables and rules inspector.

## Standalone Deployment Quickstart

### 1. Install & Build
```bash
npm install
npm run build
# Emits optimized static assets to dist/
```

### 2. Deploy Static Output
Deploy the generated `dist/` directory to any static hosting provider (Vercel, Netlify, Cloudflare Pages, AWS S3/CloudFront, or Nginx).

### 3. API Proxy / Rewrites
Configure your hosting provider to route `/api/*` requests to your deployed backend API URL. See `DEPLOYMENT.md` for example Vercel and Nginx configurations.
