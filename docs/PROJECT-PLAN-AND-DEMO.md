# 15 - Project Plan and Demo

## 1. Roles
| Person | Owns |
|---|---|
| Backend lead | Database, ingestion, matching, fuzzy engine, scoring, alerts, API, tests, Docker, deploy |
| Frontend lead | All React screens, charts, states, accessibility; later CSV import UI and extras |

Frontend builds against sample JSON in a dev-only fixtures folder. **Fixtures must never ship in the production build.**
Frozen API contract: 06-API.md.

## 2. Schedule
| Day | Backend | Frontend |
|---|---|---|
| 13 Oct (night) | Repo, Docker, schema, migrations | App setup, read API doc |
| 14 Oct | openFDA adapter, matcher, vendor + match APIs | Login, dashboard, add vendor, match review |
| 15 Oct | Fuzzy engine, scoring, news adapter, alerts. **Feature freeze at night** | Vendor detail, charts, alerts, wire to real API |
| 16 Oct | Tests, bugs, hosted deploy, clean-machine Docker run, docs | Polish, empty/error states, rehearsal |
| 17 Oct | Buffer / present | Buffer / present |

If the 16 Oct evening is fully green, presenting on the 16th is optional.

## 3. Day-1 verification list
- [ ] openFDA key works; fields and `recall_number` uniqueness confirmed
- [ ] Update cadence of enforcement data noted
- [ ] News RSS returns usable results for sample vendor names
- [ ] Pick ~10 real vendors that actually appear in the real recall data
- [ ] Tune similarity threshold on real names

## 4. Definition of done (production-level)
- [ ] All Must features work end to end on real data
- [ ] No hard-coded or fake data anywhere in the running app
- [ ] Re-running ingestion creates no duplicates
- [ ] Errors handled with proper UI states; no unhandled crashes
- [ ] Unit tests for fuzzy, matcher, news scorer, alert rules pass
- [ ] Integration tests pass
- [ ] Security checklist (10-SECURITY.md) done
- [ ] Performance table filled with real measurements
- [ ] Hosted URL works over HTTPS; Docker run works on a clean machine
- [ ] README and docs accurate

## 5. Demo script (about 10 minutes, real data only)
1. State the problem and the accountability point (use the primer)
2. Log in; show the **Ingestion** page: last real refresh time, counts, any errors
3. Show the dashboard ranked by risk
4. Open a vendor with real recalls: gauge, why-this-score, rules, inputs
5. Click through to the original FDA source record
6. Show the unverified news section and explain why it is separate
7. Show a pending match: confirm one, reject one, and show the score update
8. Show the alert, mark it reviewed with a note
9. Show the audit log entry
10. Show the fuzzy rules page and one hand-calculated score
11. Show the Docker self-host path and state the privacy argument
12. Close with limitations and roadmap

## 6. Pre-demo checklist
- [ ] Run ingestion the same morning
- [ ] Warm up the hosted instance
- [ ] Docker fallback running locally with the same data
- [ ] Pick the vendors you will open and know their real signals
- [ ] Rehearse the hand-calculation
- [ ] Both team members can explain every module