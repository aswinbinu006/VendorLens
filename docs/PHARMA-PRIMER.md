# 14 - Pharma Primer (plain language)

## 1. The business in one picture
A drug company rarely makes everything itself. It buys **active ingredients** (the part that does the medicine's work),
**excipients** (fillers and binders), packaging, and often outsources manufacturing and testing.
Every one of those outside parties is a **vendor** (or supplier).

| Term | Meaning |
|---|---|
| API | Active Pharmaceutical Ingredient: the active chemical in a medicine |
| Excipient | Non-active ingredient (binder, filler, coating) |
| CMO / CDMO | Contract (Development and) Manufacturing Organization: makes drugs for another company |
| CRO | Contract Research Organization: runs trials or lab studies for another company |
| Distributor | Moves finished drugs to pharmacies and hospitals |

## 2. Why vendors are a big risk
Regulators hold the company that markets a drug responsible for its quality, even when the work is outsourced.
In US rules, the company's quality unit is responsible for products made under contract (see 21 CFR 211.22).
In short: **you can outsource the work, but not the responsibility.**

## 3. Rules and regulators
| Term | Meaning |
|---|---|
| FDA | US Food and Drug Administration |
| CDSCO | India's central drug regulator (state drug controllers also act) |
| EMA | European Medicines Agency; EudraGMDP is the EU's GMP database |
| WHO | Runs prequalification and issues medical product alerts |
| GMP / cGMP | (Current) Good Manufacturing Practice: minimum quality standards for making medicines |
| GxP | Umbrella for good practice rules (manufacturing, lab, clinical) |

## 4. Signals we monitor (FDA vocabulary)
| Term | Meaning |
|---|---|
| Inspection | FDA visits a facility to check compliance |
| Form 483 | List of observations handed over at the end of an inspection (not a final finding) |
| Warning Letter | Formal notice of significant violations; serious |
| NAI / VAI / OAI | Inspection outcomes: No Action Indicated / Voluntary Action Indicated / Official Action Indicated (most serious) |
| Recall | Product removed from market because of a problem |
| Recall Class I | Reasonable chance of serious harm or death |
| Recall Class II | May cause temporary or reversible harm, or a remote chance of serious harm |
| Recall Class III | Not likely to cause harm |
| Import Alert | FDA can detain a foreign firm's products at the border |
| NSQ | "Not of Standard Quality", a drug-quality failure label used by Indian regulators |
| Data integrity | Falsified or unreliable records and test data; a major red flag |

This version ingests **FDA drug recalls** (the enforcement data), which carry the Class I/II/III labels.

## 5. How a company manages vendors (context for the roadmap)
| Term | Meaning |
|---|---|
| Vendor qualification | Checking a vendor is fit before buying from it |
| Quality agreement | Contract defining who is responsible for what in quality |
| Audit | On-site or remote inspection by the buyer |
| CAPA | Corrective and Preventive Action: fixing a found problem and preventing repeats |
| Certificates | Proof such as GMP certificates, ISO certificates, licenses; they expire and can be misrepresented |
| 21 CFR Part 11 | US rules for electronic records and signatures (this project does not claim compliance) |

## 6. The story to tell
A supplier gets a recall or warning letter. The company that bought from them finds out weeks later, after
shipping product. The regulator holds the company accountable. Our system watches public signals
continuously, links them to the company's vendors, scores risk transparently, and alerts QA early.

## 7. What we do not claim
We cannot see non-public problems. We cannot prove a certificate is forged from a PDF.
We rank attention; we do not predict failures or replace audits.