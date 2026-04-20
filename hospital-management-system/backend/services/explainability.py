"""
Explainability Service
======================
Provides lightweight "Why this prediction?" explanations using
feature importance × normalized input values as a proxy for SHAP.

This approach is fast (no extra dependencies) and academically sound
for demonstrating XAI concepts in a viva / project demonstration.
"""
import os
import json
import numpy as np


BASE_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR    = os.path.join(BASE_DIR, "models")

# ── Cache loaded importance files ─────────────────────────────────────────────
_los_fi      = None
_equip_fi    = None


def _load_fi(path: str) -> dict | None:
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def _get_los_fi():
    global _los_fi
    if _los_fi is None:
        _los_fi = _load_fi(os.path.join(MODEL_DIR, "los_feature_importance.json"))
    return _los_fi


def _get_equip_fi():
    global _equip_fi
    if _equip_fi is None:
        _equip_fi = _load_fi(os.path.join(MODEL_DIR, "equipment_feature_importance.json"))
    return _equip_fi


def _build_contributions(feature_labels: list, importances: list, raw_values: list) -> list:
    """
    Compute contribution of each feature as:
      contribution_i = importance_i × |normalized_value_i|
    Then normalize to percentage (0–100%).
    """
    raw_values   = np.array(raw_values, dtype=float)
    importances  = np.array(importances, dtype=float)

    # Min-max normalize each value to [0,1] (simple global norm to avoid division edge cases)
    v_range = raw_values.max() - raw_values.min()
    if v_range == 0:
        norm_values = np.ones_like(raw_values) * 0.5
    else:
        norm_values = (raw_values - raw_values.min()) / v_range

    scores = importances * norm_values
    total  = scores.sum()
    if total == 0:
        pcts = [round(100.0 / len(scores), 1)] * len(scores)
    else:
        pcts = [round(float(s / total * 100), 1) for s in scores]

    contributions = [
        {"feature": label, "contribution_pct": pct, "raw_value": round(float(val), 2)}
        for label, pct, val in zip(feature_labels, pcts, raw_values)
    ]
    # Sort by contribution descending
    return sorted(contributions, key=lambda x: -x["contribution_pct"])


# ── Public API ─────────────────────────────────────────────────────────────────

def explain_los(input_data: dict) -> dict:
    """
    Explain a Length of Stay prediction.
    input_data keys: age, gender_enc, admission_type_enc, condition_severity,
                     num_diagnoses, num_procedures, insurance_type_enc
    """
    fi = _get_los_fi()
    if fi is None:
        return {"error": "Feature importance data not found. Please retrain the model."}

    feature_keys  = fi["feature_keys"]
    fi_map        = {item["feature"]: item["importance"] for item in fi["features"]}

    # Map raw feature_key → label
    key_to_label  = {
        "age": "Age", "gender_enc": "Gender", "admission_type_enc": "Admission Type",
        "condition_severity": "Condition Severity", "num_diagnoses": "Num Diagnoses",
        "num_procedures": "Num Procedures", "insurance_type_enc": "Insurance Type",
    }

    raw_values   = [float(input_data.get(k, 0)) for k in feature_keys]
    labels       = [key_to_label.get(k, k) for k in feature_keys]
    importances  = [fi_map.get(label, 0.0) for label in labels]

    contributions = _build_contributions(labels, importances, raw_values)

    # Concise natural-language summary of top driver
    top = contributions[0]
    summary = (
        f"The biggest factor driving this prediction is '{top['feature']}' "
        f"(contributing {top['contribution_pct']}% of the model's decision weight). "
        f"Other significant factors are '{contributions[1]['feature']}' ({contributions[1]['contribution_pct']}%) "
        f"and '{contributions[2]['feature']}' ({contributions[2]['contribution_pct']}%)."
        if len(contributions) >= 3 else
        f"Key driver: '{top['feature']}' ({top['contribution_pct']}%)."
    )

    return {
        "model": "LOS Predictor (XGBoost / Random Forest)",
        "method": "Feature Importance × Normalized Input (XAI Proxy)",
        "contributions": contributions,
        "summary": summary,
    }


def explain_equipment(input_data: dict) -> dict:
    """
    Explain an Equipment Failure prediction.
    input_data keys: equipment_type_enc, runtime_hours, days_since_maintenance,
                     temperature_reading, vibration_level, usage_cycles, last_error_count
    """
    fi = _get_equip_fi()
    if fi is None:
        return {"error": "Feature importance data not found. Please retrain the model."}

    feature_keys = fi["feature_keys"]
    fi_map       = {item["feature"]: item["importance"] for item in fi["features"]}

    key_to_label = {
        "equipment_type_enc":      "Equipment Type",
        "runtime_hours":           "Runtime (hrs)",
        "days_since_maintenance":  "Days Since Maint.",
        "temperature_reading":     "Temperature (°C)",
        "vibration_level":         "Vibration (Hz)",
        "usage_cycles":            "Usage Cycles",
        "last_error_count":        "Error Count",
    }

    raw_values  = [float(input_data.get(k, 0)) for k in feature_keys]
    labels      = [key_to_label.get(k, k) for k in feature_keys]
    importances = [fi_map.get(label, 0.0) for label in labels]

    contributions = _build_contributions(labels, importances, raw_values)

    top = contributions[0]
    summary = (
        f"The dominant risk factor for this equipment is '{top['feature']}' "
        f"({top['contribution_pct']}% of failure risk weight). "
        f"Monitor '{contributions[1]['feature']}' ({contributions[1]['contribution_pct']}%) "
        f"and '{contributions[2]['feature']}' ({contributions[2]['contribution_pct']}%) closely."
        if len(contributions) >= 3 else
        f"Top risk driver: '{top['feature']}' ({top['contribution_pct']}%)."
    )

    return {
        "model": "Equipment Failure Classifier (XGBoost / Random Forest)",
        "method": "Feature Importance × Normalized Input (XAI Proxy)",
        "contributions": contributions,
        "summary": summary,
    }
