# 10 - Security

## 1. What is sensitive
The vendor list, internal notes, risk decisions, credentials, and API keys.
External signal data is public. Self-hosting keeps the sensitive parts inside the company network.

## 2. Threats and controls
| Threat | Control |
|---|---|
| Credential guessing | bcrypt (cost 12), login rate limit, generic error messages, lockout/backoff |
| Session theft | JWT in httpOnly, Secure, SameSite cookie; short expiry; logout clears cookie |
| CSRF | SameSite cookie + required custom header on mutating requests; strict CORS allowlist |
| SQL injection | Prisma parameterized queries; raw SQL only with bound parameters |
| XSS | React escaping; external text (recall reasons, news titles) rendered as text only, never as HTML; CSP via helmet |
| Malicious links in news | Only http/https URLs; `rel="noopener noreferrer"`; shown with source domain |
| SSRF | Server only calls a fixed allowlist of source hosts; never fetches user-supplied URLs |
| Malicious CSV | Size and row limits, strict parsing, column whitelist; spreadsheet formula characters (= + - @) neutralized on any CSV export |
| Brute-force API abuse | Global rate limit; stricter on login and /ingest/run |
| Secrets leakage | Secrets only in env vars; `.env` git-ignored; `.env.example` has placeholders; never logged |
| Vulnerable dependencies | `npm audit` in CI, lockfile committed, minimal dependencies |
| Tampering with history | Append-only audit_log; no update/delete endpoints for it |
| Data loss | Daily Postgres backups on hosted; documented `pg_dump` for self-host |
| Information disclosure | Generic 500 messages; no stack traces to clients; security headers via helmet |
| Over-privileged DB user | App uses a least-privilege DB role `vrm_app` (no superuser). The database initialization script runs as superuser (`postgres`) solely to create database `vrm`, enable `pg_trgm`, and assign ownership to `vrm_app`. Migrations and runtime share this `vrm_app` role (rather than maintaining a separate migration-only role), which is an accepted limitation for this project scope. |

## 3. Transport
HTTPS everywhere on hosted deployments (platform-provided). For self-hosting, a reverse proxy with TLS is recommended in the setup guide.

## 4. Privacy
- Vendor names are sent to external sources (openFDA, news search) when querying. In the self-hosted privacy mode on the roadmap, bulk datasets are downloaded and matched locally instead.
- No personal data beyond the admin email is stored.

## 5. Logging
Structured logs with request IDs; no passwords, tokens or full request bodies logged.

## 6. Pre-demo security checklist
- [ ] No secrets in git history
- [ ] Admin password is strong and not the default
- [ ] HTTPS on hosted URL
- [ ] `npm audit` reviewed
- [ ] Rate limits verified on login
- [ ] Cookie flags verified in browser dev tools
- [ ] CSP header present

## 7. Honest limitations
Not penetration-tested, not formally audited, not GxP-validated or 21 CFR Part 11 compliant (no electronic signatures).
Self-hosted does not mean unhackable: it moves responsibility for host security to the company's IT team.