-- Phase 9b: Migration creating fuzzy_config version 2 (active), exactly matching docs/07
-- Version 1 becomes inactive and stays for audit history (E21)

UPDATE fuzzy_config
SET is_active = false
WHERE is_active = true;

INSERT INTO fuzzy_config (version, is_active, config)
VALUES (
  2,
  true,
  '{
    "version": 2,
    "isActive": true,
    "stage1": {
      "inputs": [
        {
          "name": "recalls12m",
          "range": [0, 10],
          "sets": [
            { "name": "Few", "type": "trapezoid", "params": [0, 0, 1, 3] },
            { "name": "Some", "type": "triangle", "params": [1, 3, 6] },
            { "name": "Many", "type": "trapezoid", "params": [4, 7, 10, 10] }
          ]
        },
        {
          "name": "worstClass",
          "range": [0, 3],
          "sets": [
            { "name": "Mild", "type": "trapezoid", "params": [0, 0, 1, 1.8] },
            { "name": "Moderate", "type": "triangle", "params": [1.2, 2, 2.8] },
            { "name": "Severe", "type": "trapezoid", "params": [2.2, 3, 3, 3] }
          ]
        },
        {
          "name": "daysSinceLatest",
          "range": [0, 730],
          "sets": [
            { "name": "Recent", "type": "trapezoid", "params": [0, 0, 60, 150] },
            { "name": "Medium", "type": "triangle", "params": [90, 240, 400] },
            { "name": "Old", "type": "trapezoid", "params": [300, 500, 730, 730] }
          ]
        }
      ],
      "output": {
        "name": "regulatory_risk",
        "range": [0, 100],
        "sets": [
          { "name": "Low", "type": "trapezoid", "params": [0, 0, 20, 40] },
          { "name": "Medium", "type": "triangle", "params": [25, 50, 75] },
          { "name": "High", "type": "trapezoid", "params": [60, 80, 100, 100] }
        ]
      },
      "rules": [
        { "id": "S1-R1", "stage": 1, "antecedents": [{ "variable": "recalls12m", "set": "Few" }, { "variable": "worstClass", "set": "Mild" }], "consequent": { "variable": "regulatory_risk", "set": "Low" }, "description": "Few recalls and mild worst class -> Low regulatory risk" },
        { "id": "S1-R2", "stage": 1, "antecedents": [{ "variable": "recalls12m", "set": "Few" }, { "variable": "worstClass", "set": "Moderate" }, { "variable": "daysSinceLatest", "set": "Old" }], "consequent": { "variable": "regulatory_risk", "set": "Low" }, "description": "Few recalls, moderate worst class, and old -> Low regulatory risk" },
        { "id": "S1-R3", "stage": 1, "antecedents": [{ "variable": "recalls12m", "set": "Few" }, { "variable": "worstClass", "set": "Moderate" }, { "variable": "daysSinceLatest", "set": ["Recent", "Medium"] }], "consequent": { "variable": "regulatory_risk", "set": "Medium" }, "description": "Few recalls, moderate worst class, and recent or medium -> Medium regulatory risk" },
        { "id": "S1-R4", "stage": 1, "antecedents": [{ "variable": "recalls12m", "set": "Few" }, { "variable": "worstClass", "set": "Severe" }], "consequent": { "variable": "regulatory_risk", "set": "High" }, "description": "Few recalls and severe worst class -> High regulatory risk" },
        { "id": "S1-R5", "stage": 1, "antecedents": [{ "variable": "recalls12m", "set": "Some" }, { "variable": "worstClass", "set": "Mild" }, { "variable": "daysSinceLatest", "set": "Old" }], "consequent": { "variable": "regulatory_risk", "set": "Low" }, "description": "Some recalls, mild worst class, and old -> Low regulatory risk" },
        { "id": "S1-R6", "stage": 1, "antecedents": [{ "variable": "recalls12m", "set": "Some" }, { "variable": "worstClass", "set": "Mild" }, { "variable": "daysSinceLatest", "set": ["Recent", "Medium"] }], "consequent": { "variable": "regulatory_risk", "set": "Medium" }, "description": "Some recalls, mild worst class, and recent or medium -> Medium regulatory risk" },
        { "id": "S1-R7", "stage": 1, "antecedents": [{ "variable": "recalls12m", "set": "Some" }, { "variable": "worstClass", "set": "Moderate" }], "consequent": { "variable": "regulatory_risk", "set": "Medium" }, "description": "Some recalls and moderate worst class -> Medium regulatory risk" },
        { "id": "S1-R8", "stage": 1, "antecedents": [{ "variable": "recalls12m", "set": "Some" }, { "variable": "worstClass", "set": "Severe" }], "consequent": { "variable": "regulatory_risk", "set": "High" }, "description": "Some recalls and severe worst class -> High regulatory risk" },
        { "id": "S1-R9", "stage": 1, "antecedents": [{ "variable": "recalls12m", "set": "Many" }, { "variable": "worstClass", "set": "Mild" }], "consequent": { "variable": "regulatory_risk", "set": "Medium" }, "description": "Many recalls and mild worst class -> Medium regulatory risk" },
        { "id": "S1-R10", "stage": 1, "antecedents": [{ "variable": "recalls12m", "set": "Many" }, { "variable": "worstClass", "set": ["Moderate", "Severe"] }], "consequent": { "variable": "regulatory_risk", "set": "High" }, "description": "Many recalls and moderate or severe worst class -> High regulatory risk" },
        { "id": "S1-R11", "stage": 1, "antecedents": [{ "variable": "daysSinceLatest", "set": "Recent" }, { "variable": "worstClass", "set": "Severe" }], "consequent": { "variable": "regulatory_risk", "set": "High" }, "description": "Recent recalls and severe worst class -> High regulatory risk" }
      ]
    },
    "stage2": {
      "inputs": [
        {
          "name": "regulatory_risk",
          "range": [0, 100],
          "sets": [
            { "name": "Low", "type": "trapezoid", "params": [0, 0, 20, 40] },
            { "name": "Medium", "type": "triangle", "params": [25, 50, 75] },
            { "name": "High", "type": "trapezoid", "params": [60, 80, 100, 100] }
          ]
        },
        {
          "name": "newsSignal",
          "range": [0, 1],
          "sets": [
            { "name": "Low", "type": "trapezoid", "params": [0, 0, 0.15, 0.35] },
            { "name": "Medium", "type": "triangle", "params": [0.2, 0.45, 0.7] },
            { "name": "High", "type": "trapezoid", "params": [0.55, 0.75, 1, 1] }
          ]
        },
        {
          "name": "criticality",
          "range": [1, 5],
          "sets": [
            { "name": "Low", "type": "trapezoid", "params": [1, 1, 2, 3] },
            { "name": "Medium", "type": "triangle", "params": [2, 3, 4] },
            { "name": "High", "type": "trapezoid", "params": [3, 4, 5, 5] }
          ]
        }
      ],
      "output": {
        "name": "overall_risk",
        "range": [0, 100],
        "sets": [
          { "name": "Low", "type": "trapezoid", "params": [0, 0, 15, 30] },
          { "name": "Medium", "type": "triangle", "params": [20, 40, 60] },
          { "name": "High", "type": "triangle", "params": [50, 70, 85] },
          { "name": "Critical", "type": "trapezoid", "params": [75, 90, 100, 100] }
        ]
      },
      "rules": [
        { "id": "S2-R1", "stage": 2, "antecedents": [{ "variable": "regulatory_risk", "set": "Low" }, { "variable": "newsSignal", "set": "Low" }], "consequent": { "variable": "overall_risk", "set": "Low" }, "description": "Low regulatory risk and low news signal -> Low overall risk" },
        { "id": "S2-R2", "stage": 2, "antecedents": [{ "variable": "regulatory_risk", "set": "Low" }, { "variable": "newsSignal", "set": "Medium" }], "consequent": { "variable": "overall_risk", "set": "Low" }, "description": "Low regulatory risk and medium news signal -> Low overall risk" },
        { "id": "S2-R3", "stage": 2, "antecedents": [{ "variable": "regulatory_risk", "set": "Low" }, { "variable": "newsSignal", "set": "High" }], "consequent": { "variable": "overall_risk", "set": "Medium" }, "description": "Low regulatory risk and high news signal -> Medium overall risk" },
        { "id": "S2-R4", "stage": 2, "antecedents": [{ "variable": "regulatory_risk", "set": "Medium" }, { "variable": "newsSignal", "set": "Low" }], "consequent": { "variable": "overall_risk", "set": "Medium" }, "description": "Medium regulatory risk and low news signal -> Medium overall risk" },
        { "id": "S2-R5", "stage": 2, "antecedents": [{ "variable": "regulatory_risk", "set": "Medium" }, { "variable": "newsSignal", "set": "Medium" }], "consequent": { "variable": "overall_risk", "set": "Medium" }, "description": "Medium regulatory risk and medium news signal -> Medium overall risk" },
        { "id": "S2-R6", "stage": 2, "antecedents": [{ "variable": "regulatory_risk", "set": "Medium" }, { "variable": "newsSignal", "set": "High" }], "consequent": { "variable": "overall_risk", "set": "High" }, "description": "Medium regulatory risk and high news signal -> High overall risk" },
        { "id": "S2-R7", "stage": 2, "antecedents": [{ "variable": "regulatory_risk", "set": "High" }, { "variable": "newsSignal", "set": "Low" }], "consequent": { "variable": "overall_risk", "set": "High" }, "description": "High regulatory risk and low news signal -> High overall risk" },
        { "id": "S2-R8", "stage": 2, "antecedents": [{ "variable": "regulatory_risk", "set": "High" }, { "variable": "newsSignal", "set": "Medium" }], "consequent": { "variable": "overall_risk", "set": "High" }, "description": "High regulatory risk and medium news signal -> High overall risk" },
        { "id": "S2-R9", "stage": 2, "antecedents": [{ "variable": "regulatory_risk", "set": "High" }, { "variable": "newsSignal", "set": "High" }], "consequent": { "variable": "overall_risk", "set": "Critical" }, "description": "High regulatory risk and high news signal -> Critical overall risk" },
        { "id": "S2-R10", "stage": 2, "antecedents": [{ "variable": "regulatory_risk", "set": "High" }, { "variable": "criticality", "set": "High" }], "consequent": { "variable": "overall_risk", "set": "Critical" }, "description": "High regulatory risk and high criticality -> Critical overall risk" },
        { "id": "S2-R11", "stage": 2, "antecedents": [{ "variable": "regulatory_risk", "set": "Medium" }, { "variable": "criticality", "set": "High" }], "consequent": { "variable": "overall_risk", "set": "High" }, "description": "Medium regulatory risk and high criticality -> High overall risk" },
        { "id": "S2-R12", "stage": 2, "antecedents": [{ "variable": "regulatory_risk", "set": "Low" }, { "variable": "criticality", "set": "Low" }], "consequent": { "variable": "overall_risk", "set": "Low" }, "description": "Low regulatory risk and low criticality -> Low overall risk" }
      ]
    },
    "crispThresholds": {
      "low": 25,
      "medium": 50,
      "high": 75,
      "critical": 100
    }
  }'::jsonb
)
ON CONFLICT (version) DO NOTHING;
