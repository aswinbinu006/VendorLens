# 08 - Flagging Logic (how things get flagged without ML)

The regulator already classifies severity of its own actions. The system's job is to
find new records, link them to the right vendor, and prioritize them.

## 1. Pipeline (E12 Window-Based Ingestion)
1. **Bulk Window Fetch** (scheduled or manual): OpenFDA is queried strictly for time windows (`BACKFILL_MONTHS` on initial/full, `SYNC_WINDOW_DAYS` trailing window on incremental). Vendor names are never sent to external surveillance APIs.
2. **Upsert & Content Hash**: Signals are upserted by `(source, source_id)`. Content changes are detected via SHA-256 `content_hash` comparison. Only inserted (`new_records`) and updated (`updated_records`) records trigger the `onSignalsChanged` hook. Note: corrections to records older than the trailing window are caught only by a manual full resync.
3. **Match** (Phase 4): `onSignalsChanged` triggers local name normalization and trigram matching against the vendor watchlist.
4. **Score** (Phase 5): Every vendor that gained an `auto` or `confirmed` match is rescored by the fuzzy engine.
5. **Evaluate alerts** (Phase 6): Hard rules (H1-H3) and soft rules (S1-S2) evaluated with deduplication.
6. **Notify**: Dashboard badge, inbox, and optional SMTP email for High/Critical alerts.
7. **Human review**: Review/dismiss in audit log with mandatory note.

## 2. Matching
Normalize: lowercase, remove punctuation, drop legal suffixes (inc, ltd, llc, pvt, limited, corp, co, gmbh, plc, sa), collapse spaces.
| Condition | Result |
|---|---|
| Normalized name or alias equals vendor's | `auto` (score 1.0) |
| Trigram similarity >= 0.60 (initial; tune on real data) | `pending` (human decides) |
| Below threshold | discarded |

Only `auto` and `confirmed` matches feed scoring. `pending` and `rejected` never do.

## 3. Hard flags (always fire, independent of fuzzy score)
| ID | Condition | Alert level |
|---|---|---|
| H1 | New matched Class I recall | Critical |
| H2 | New matched official signal (any class) | by class: I Critical, II High, III Medium |
| H3 | Ingestion source failing (N consecutive failed runs; default 3) | High (system alert to admin) |

## 4. Soft flags (from the fuzzy score)
| ID | Condition | Alert level |
|---|---|---|
| S1 | Level rose since previous score (e.g. Medium to High) | New level |
| S2 | News cluster: >= 3 distinct outlets with term weight >= 0.6 within 7 days | Capped at Medium, labeled unverified |

## 5. Alert hygiene
- `dedupe_key` unique: one alert per cause, so re-ingestion never duplicates
- Level-change alert only when the level actually changes
- Dismissed alerts do not reappear for the same cause

## 6. News scorer (rule-based)
Vendor name (or alias) must appear in headline or snippet. Then:
`termWeight` = highest matched term weight from the configurable list. Initial values (expert judgement, not empirical):

| Term | Weight |
|---|---|
| warning letter, import alert | 0.9 |
| contamination, data integrity, substandard / not of standard quality | 0.8 |
| seized | 0.7 |
| recall, ban / banned | 0.6 |
| lawsuit, penalty / fine | 0.4 |
| shortage | 0.3 |

Credibility tiers (configurable domain list): official regulator domains 1.0, major news outlets 0.7, other known outlets 0.4, unknown 0.2.
Recency decay `exp(-ageDays/14)`. Near-duplicate headlines (normalized-title similarity) count once.

**Known failure modes:** keyword used in another sense, name shared with an unrelated business, syndicated duplicates.
That is exactly why news stays unverified and human-reviewed. Upgrade path: LLM classification (roadmap).

## 7. Freshness (state this honestly)
End-to-end latency = source publication delay + at most one polling interval.
Polling faster than the source updates adds nothing (VERIFY the openFDA update cadence).
The UI always shows the last successful refresh and warns when overdue.

## 8. What the system cannot see
Unpublished problems and private word of mouth. News monitoring narrows that gap but cannot close it.