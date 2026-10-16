# 16 - Viva Q&A

**Why is this a soft computing project?**
The risk engine is a Mamdani fuzzy inference system: linguistic variables, membership functions, a rule base, and centroid defuzzification.

**Why fuzzy logic?**
Risk is graded, and regulator wording is vague. Fuzzy sets avoid the cliff where 2 recalls are "safe" and 3 are "dangerous", and the rules are readable by QA staff.

**Why not a neural network?**
There is no labeled history of vendor failures to train on, there is no time to validate one, and a black box is hard to defend in a regulated setting.

**Where do the rules and curves come from?**
Expert-judgement defaults, stored as versioned configuration and editable. They are not statistically fitted, and we say so.

**How do you know the score is right?**
It is deterministic and reproducible: inputs, fired rules and config version are stored with every score. We can recompute any score by hand. It ranks attention rather than predicting failure.

**Is the data real?**
Yes. Recall data comes from openFDA and news from public feeds. Every item links to its source and the ingestion page shows when it was pulled. Internal items like CAPAs are not simulated; they are out of scope.

**How does something get flagged without ML?**
The regulator classifies severity already. We detect new records, match them to vendors, and apply hard rules (e.g. Class I always alerts) plus the fuzzy score for accumulated patterns.

**How do you avoid wrongly blaming a vendor?**
Auto-link only on exact normalized name or alias. Close matches go to a human review queue. Weak matches are discarded.

**Why separate news from official data?**
News can be wrong. Mixing it with regulator facts would mislead, and publishing unverified claims about a company carries legal risk. News is labeled unverified and can lift a vendor only to Medium on its own.

**What if an official source goes down?**
Cached data stays available, the run is recorded as failed, the UI warns about stale data, and an admin alert fires after repeated failures.

**How fresh are the alerts?**
Source publication delay plus at most one polling interval. We cannot detect what has not been published.

**Can it detect fake certificates?**
Not from a document alone. A future version can cross-check certificate numbers against public registries and flag inconsistencies for a human.

**Is a local install safer than a website?**
It keeps vendor data inside the company's network, which is the real benefit. It is not automatically unhackable: the company's IT team becomes responsible for host security.

**Do big companies use hosted software?**
Yes, after security vetting. Offering both modes lets each company choose.

**Is it GxP or Part 11 compliant?**
No. It is a decision-support tool; validation and electronic signatures are roadmap items.

**What are the main limitations?**
US FDA recalls and news only, keyword-based news scoring, expert-set rule weights, single admin user, free-tier hosting.

**What would you build next?**
CDSCO and EU sources, certificate cross-checks, local bulk matching so vendor names never leave the machine, roles, CAPA tracking, LLM-assisted classification, and a backtest of scores against later recalls.

**What happens if the same recall is fetched twice?**
Nothing. Records are unique by source and source ID, and alerts are unique by a dedupe key.

**How did you split the work?**
Backend, data and core logic by one member; frontend by the other. Both can explain the whole system.

**Why Postgres?**
Relational integrity, JSONB for raw payloads and fired rules, and `pg_trgm` for similarity matching in one reliable system.