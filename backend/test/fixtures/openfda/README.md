# openFDA Test Fixtures

## Recording Details
- **Recorded Date:** 2026-10-15
- **Endpoint:** `https://api.fda.gov/drug/enforcement.json`
- **Source:** Real public regulatory data from the US Food and Drug Administration (openFDA) Enforcement API.
- **Query Filter:** `report_date:[20241015 TO 20261015]`
- **Sanitization:** All API keys have been strictly omitted/redacted.

## Fixture Files
- `enforcement-sample-1.json`: Single real recall record (ProRx LLC, Semaglutide Injection recall `D-0115-2026`, Class II).
- `enforcement-page-1.json`: 20 real drug enforcement records across the 24-month window with varying firms, dates, and classifications.
- `enforcement-oversize-meta.json`: Synthetic metadata response simulating `meta.results.total > 25000` for testing chunk splitting logic.
