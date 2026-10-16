# 01 - Product Requirements Document (PRD)

## 1. Overview
**Product:** AI Vendor Risk & Compliance Monitor (Pharma)
**Type:** Web application, open source, self-hostable (hosted demo also available)
**Owner:** Project team of two (backend/core logic and frontend)

## 2. Problem
Pharmaceutical companies depend on external vendors. When a vendor has a regulatory or quality
failure, the company selling the finished drug carries responsibility. Detection today is manual:
spreadsheets, email, periodic audits. Warning signs are noticed late or missed, and sensitive
vendor data is poorly protected when moved to third-party tools.

## 3. Goals
| ID | Goal |
|---|---|
| G1 | Detect new public regulatory signals about watched vendors within one polling interval of publication |
| G2 | Give every vendor an explainable risk score, never a black box |
| G3 | Separate verified (official) facts from unverified chatter |
| G4 | Make a human the decision-maker, with a full audit trail |
| G5 | Be runnable inside a company's own network so vendor lists never leave it |

## 4. Non-goals (this version)
- Proving a certificate is forged (we only cross-check against public registries, later)
- Predicting future failures with machine learning
- Replacing audits, quality agreements or QA judgement
- Multi-tenant SaaS, role hierarchies, SSO
- GxP validation / 21 CFR Part 11 compliance

## 5. Personas
| Persona | Needs |
|---|---|
| **Supplier Quality Manager** (primary) | Know fast when a vendor has a problem; justify why a vendor is high risk |
| **Procurement Lead** | See which vendors are risky before renewing or ordering |
| **Administrator** | Manage watchlist, rules, data refresh, and access |

## 6. User stories and acceptance criteria
| ID | Story | Acceptance criteria |
|---|---|---|
| US-01 | As an admin I log in securely | Wrong credentials rejected; session expires; passwords hashed |
| US-02 | As a user I add a vendor to the watchlist | Name required; duplicate normalized names rejected; criticality 1-5 |
| US-03 | As a user I import vendors from CSV | Invalid rows reported with line numbers; valid rows imported; size/row limits |
| US-04 | As a user I see new regulatory signals linked to vendors | Each signal shows source, date, reason, link, and "official" badge |
| US-05 | As a user I review uncertain matches | Pending queue lists candidate vendor, similarity, signal text; confirm/reject recorded |
| US-06 | As a user I see a vendor's risk score and why | Score, level, fired rules with strengths, inputs shown |
| US-07 | As a user I see the score history | Chart of scores over time with config version |
| US-08 | As a user I am alerted to important events | Alert on new official signal, Class I recall, level increase, news cluster; no duplicate alerts |
| US-09 | As a user I close an alert with a note | Status and note saved; reviewer and time recorded in audit log |
| US-10 | As a user I know the data is fresh | Ingestion page shows last run, counts, errors; stale warning if overdue |
| US-11 | As an admin I view the fuzzy rules and membership functions | Config page shows variables, curves, rules, active version |

## 7. Scope (MoSCoW)
- **Must:** US-01 to US-10, dashboard, vendor detail, audit log view
- **Should:** email alerts for High/Critical, PDF vendor report, editable fuzzy config (US-11 edit)
- **Could:** score backtest evidence slide
- **Won't (now):** see Roadmap

## 8. Success metrics (measurable in the demo)
- Every displayed signal links to its original source
- Re-running ingestion creates no duplicate signals or alerts
- A Class I recall always produces an alert, regardless of fuzzy score
- Each score's fired rules reproduce the number when calculated by hand
- Ingestion page truthfully shows last-run time and failures

## 9. Assumptions and constraints
- Public data is limited to what openFDA and news feeds expose; refresh rate depends on the source
- Two-person team, delivery by 17 Oct 2026
- Free-tier infrastructure for the hosted demo (cold starts possible)
- openFDA API key obtained (VERIFY availability and limits on day 1)

## 10. Risks
| Risk | Mitigation |
|---|---|
| Company-name mismatches cause wrong matches | Review queue; exact-match-only auto-link; aliases |
| News keyword misfires | Always labeled unverified; capped influence; human review |
| External API outage during demo | Cached data in DB; ingestion status page; local Docker fallback |
| Free-tier cold start | Warm up before the demo |
| Time overrun | Feature freeze end of 15 Oct |

## 11. Roadmap
CDSCO (India) alerts, EU/EudraGMDP, WHO alerts, certificate cross-check against registries,
CAPA/audit tracking, role-based access, bulk local data matching (so vendor names never leave
the machine), LLM-assisted summaries, backtesting dashboard.