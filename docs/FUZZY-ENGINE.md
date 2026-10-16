# 07 - Fuzzy Risk Engine

All numbers below are **initial design parameters**, stored in `fuzzy_config` and tunable.
They are expert-judgement defaults, not statistically fitted values. Say so when presenting.

## 1. Plain-language idea
Instead of "high risk = 3+ recalls", a vendor can be partly "Some recalls" and partly "Many recalls"
at the same time. Rules written in plain language combine these partial truths into a smooth score.
A hard threshold would call 2 recalls safe and 3 dangerous. Fuzzy logic avoids that cliff.

## 2. Method
Mamdani inference: fuzzify inputs, AND = min, OR = max, rule output clipped at rule strength,
aggregate by max, defuzzify by centroid over a 0..100 grid (step 1).
Two stages keep the rule count small (~23 rules instead of hundreds).

## 3. Stage 1 - Regulatory risk
Inputs derive from **official, matched** recall signals in the last 12 months.

| Input | Range | Sets (trapezoid = a,b,c,d; triangle = a,b,c) |
|---|---|---|
| recalls_12m (count) | 0-10 (cap) | Few trap(0,0,1,3), Some tri(1,3,6), Many trap(4,7,10,10) |
| worst_class (0 none, 1 Class III, 2 Class II, 3 Class I) | 0-3 | Mild trap(0,0,1,1.8), Moderate tri(1.2,2,2.8), Severe trap(2.2,3,3,3) |
| days_since_latest | 0-730 (no recalls = 730) | Recent trap(0,0,60,150), Medium tri(90,240,400), Old trap(300,500,730,730) |

Output **regulatory_risk** 0-100: Low trap(0,0,20,40), Medium tri(25,50,75), High trap(60,80,100,100)

| Rule | IF | THEN |
|---|---|---|
| S1-R1 | Few AND Mild | Low |
| S1-R2 | Few AND Moderate AND Old | Low |
| S1-R3 | Few AND Moderate AND (Recent OR Medium) | Medium |
| S1-R4 | Few AND Severe | High |
| S1-R5 | Some AND Mild AND Old | Low |
| S1-R6 | Some AND Mild AND (Recent OR Medium) | Medium |
| S1-R7 | Some AND Moderate | Medium |
| S1-R8 | Some AND Severe | High |
| S1-R9 | Many AND Mild | Medium |
| S1-R10 | Many AND (Moderate OR Severe) | High |
| S1-R11 | Recent AND Severe | High |

## 4. Stage 2 - Overall risk
| Input | Range | Sets |
|---|---|---|
| regulatory_risk (Stage 1 output) | 0-100 | Low, Medium, High (same curves as above) |
| news_signal | 0-1 | Low trap(0,0,0.15,0.35), Medium tri(0.2,0.45,0.7), High trap(0.55,0.75,1,1) |
| criticality (set by user) | 1-5 | Low trap(1,1,2,3), Medium tri(2,3,4), High trap(3,4,5,5) |

Output **overall_risk** 0-100: Low trap(0,0,15,30), Medium tri(20,40,60), High tri(50,70,85), Critical trap(75,90,100,100)

| Rule | IF | THEN |
|---|---|---|
| S2-R1 | Reg Low AND News Low | Low |
| S2-R2 | Reg Low AND News Medium | Low |
| S2-R3 | Reg Low AND News High | Medium |
| S2-R4 | Reg Medium AND News Low | Medium |
| S2-R5 | Reg Medium AND News Medium | Medium |
| S2-R6 | Reg Medium AND News High | High |
| S2-R7 | Reg High AND News Low | High |
| S2-R8 | Reg High AND News Medium | High |
| S2-R9 | Reg High AND News High | Critical |
| S2-R10 | Reg High AND Crit High | Critical |
| S2-R11 | Reg Medium AND Crit High | High |
| S2-R12 | Reg Low AND Crit Low | Low |

**Design guardrail:** with no official signals (Reg Low), news alone can raise a vendor to at most **Medium** (R3).
Unverified chatter must not outrank regulator facts.

## 5. Crisp level from score
Low < 25, Medium 25-<50, High 50-<75, Critical >= 75. Thresholds are configurable.

## 6. News signal index (input to Stage 2)
For each matched news item in the last 30 days:
`w = termWeight x credibilityTier x exp(-ageDays / 14)`
`news_signal = 1 - exp(-sum(w))` (bounded 0..1, saturating)
Near-duplicate headlines count once. See 08-FLAGGING-LOGIC.md for term weights and tiers.

## 7. Explainability output
`fired_rules` stores, per rule with strength > 0: rule id, plain-language text, firing strength, output set, stage.
The UI lists the top rules by strength. Inputs and config version are saved with each score,
so any historical score can be reproduced exactly.

## 8. Worked-example method (use in the viva, with real numbers from the app)
1. Pick a real vendor in the app and read its inputs
2. Compute memberships by hand for each set
3. Apply min for AND, max for OR, clip the output sets
4. Compare the centroid to the app's score (should match within rounding)

## 9. Testing
Unit tests with hand-computed expectations for: each membership function at boundary points, a case where rules overlap, the no-recalls baseline (expect Low), a Class I only case (expect High in Stage 1), and guardrail R3.

## 10. Honest limitations
- Rule weights and curves are expert judgement, not learned
- Only US FDA recall data feeds Stage 1 in this version
- The score ranks attention; it does not predict failures