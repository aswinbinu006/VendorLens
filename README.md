# AI Vendor Risk & Compliance Monitor (Pharma)

A self-hostable web application that continuously watches a pharmaceutical company's vendors
(API suppliers, contract manufacturers, packaging, labs), pulls in real public regulatory and news
signals, scores each vendor's risk with an explainable fuzzy-logic engine, and alerts the
right people before a vendor problem becomes a supply or compliance crisis.

> Soft Computing subject project. Every score is derived from real public data and shows
> exactly which rules produced it. Nothing in the running application is hard-coded or simulated.

## The problem in one paragraph
Pharma companies outsource a great deal of manufacturing and testing. If a vendor fails
(FDA recall, warning letter, falsified data), the company that sells the drug is held accountable too.
Most companies track vendors in spreadsheets, so they learn about problems late.
This system automates the watching, linking, scoring and alerting.

## What it does
1. Maintains a **vendor watchlist** (manual entry or CSV import).
2. Pulls **official signals** (FDA drug recalls via openFDA) and **news signals** on a schedule.
3. **Matches** signals to vendors (auto for exact names, human review for uncertain ones).
4. Computes a **fuzzy risk score** (0-100: Low / Medium / High / Critical) with the fired rules shown.
5. Raises **alerts** (dashboard, inbox, email) and records the reviewer's decision in an audit log.

## Trust model
| Kind | Source | Treatment |
|---|---|---|
| Official | Regulator records (openFDA) | Drives the score strongly; may trigger hard alerts |
| Unverified | News articles | Labeled "unverified"; can raise risk only up to Medium on its own |

## Quick start (Docker)
```bash
cp .env.example .env      # fill in secrets (see docs/13-SETUP.md)
docker compose up --build
# open http://localhost:5173  (API on :4000)
```

## Documentation
See `docs/` : PRD, TRD, features, architecture, database, API, fuzzy engine, flagging logic,
design, security, performance, tech stack, setup, pharma primer, plan and demo script, viva Q&A.

## Limitations (stated openly)
- Covers US FDA drug recalls and public news only. CDSCO (India), EU sources, certificate
  verification, CAPA/audit tracking and multi-user roles are roadmap items.
- Alerts are only as fresh as the source's publication plus one polling interval.
- Not validated for GxP use and not 21 CFR Part 11 compliant. It is a decision-support tool.
- News matching is keyword-based and can misfire; news is therefore always "unverified".

## License
MIT