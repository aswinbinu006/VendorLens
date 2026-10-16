# 09 - UI/UX Design

## 1. Principles
- Clarity over decoration: a QA manager must understand a screen in seconds
- Every number is explainable and links to its source
- Official facts and unverified chatter are visually distinct
- Never rely on color alone for risk level (label + icon too)

## 2. Sitemap
```
/login
/                    Dashboard
/vendors             Vendor list (+ add, CSV import)
/vendors/:id         Vendor detail
/matches             Pending match review
/alerts              Alerts inbox
/ingestion           Data refresh status
/audit               Audit log
/settings/fuzzy      Fuzzy rules viewer
```

## 3. Screens
**Dashboard**
```
[Vendors] [New alerts] [High/Critical] [Last data refresh]
[Risk distribution chart]        [Top risky vendors table]
[Latest alerts list]
```
**Vendor detail**
```
Header: name, country, category, criticality, level badge
[Risk gauge 0-100]   [Why this score: inputs + top fired rules]
[Score history chart]
[Official signals timeline]   |   [Unverified news timeline]
(each item: date, title, severity, source domain, "Open source" link)
```
**Match review:** table of signal text vs candidate vendor, similarity, Confirm / Reject.
**Alerts:** filters (status, level); row expands to show cause, source link, note field, Mark reviewed / Dismiss.
**Ingestion:** run history table, last success per source, error text, "Run now".

## 4. Design system
| Token | Choice |
|---|---|
| Font | Inter (system fallback) |
| Risk colors | Low green, Medium amber, High orange, Critical red; each with text label and icon |
| Badges | "OFFICIAL" solid; "UNVERIFIED" outlined with caution icon |
| Layout | Left sidebar nav, content max-width 1280px |
| Components | Cards, data tables (sortable), badges, gauge, line/bar charts (Recharts), toasts, modals |

## 5. States (required on every data view)
Loading skeleton, empty state with next-step hint, error state with retry, stale-data banner when ingestion is overdue.

## 6. Accessibility
Keyboard navigable, visible focus, AA contrast, semantic HTML, chart data also available as a table.

## 7. Content rules
Alert text states what happened, to which vendor, from which source, and why it matters.
Dates shown in the user's local time with the source date clearly labeled.
Never present unverified items with the same visual weight as official ones.

## 8. Responsiveness
Desktop-first; tablet usable; phone shows stacked cards (not a priority for this version).