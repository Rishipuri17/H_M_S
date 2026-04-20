"""
Hospital Predictions Router — Production-Grade
===============================================
Endpoints for: LOS, Equipment Failure, Medicine Demand, Patient Arrivals,
               Model Metrics, XAI Explanations, and Prediction Feedback.
"""
import os
import sys
import json
import logging
import joblib
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

router = APIRouter()
logger = logging.getLogger("hospital_predictions")

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")

# ── Lazy import of services to avoid circular deps ────────────────────────────
from services.explainability import explain_los, explain_equipment

# ─── Load Models ──────────────────────────────────────────────────────────────
los_model_artifact       = None
equipment_model_artifact = None
arrival_model            = None
demand_models            = {}


def load_models():
    global los_model_artifact, equipment_model_artifact, arrival_model, demand_models
    try:
        los_model_artifact = joblib.load(os.path.join(MODEL_DIR, "los_model.pkl"))
        logger.info("✅ Loaded LOS Model")
    except Exception as e:
        logger.warning(f"⚠️ Could not load LOS Model: {e}")

    try:
        equipment_model_artifact = joblib.load(os.path.join(MODEL_DIR, "equipment_failure_model.pkl"))
        logger.info("✅ Loaded Equipment Failure Model")
    except Exception as e:
        logger.warning(f"⚠️ Could not load Equipment Failure Model: {e}")

    try:
        arrival_model = joblib.load(os.path.join(MODEL_DIR, "arrival_model.pkl"))
        logger.info("✅ Loaded Patient Arrival Model")
    except Exception as e:
        logger.warning(f"⚠️ Could not load Patient Arrival Model: {e}")

    demand_dir = os.path.join(MODEL_DIR, "demand_models")
    if os.path.exists(demand_dir):
        for file in os.listdir(demand_dir):
            if file.endswith(".pkl"):
                name = file.replace(".pkl", "")
                try:
                    demand_models[name] = joblib.load(os.path.join(demand_dir, file))
                except Exception as e:
                    logger.warning(f"⚠️ Could not load demand model {name}: {e}")
        logger.info(f"✅ Loaded {len(demand_models)} Demand Models")


load_models()


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────
class LOSRequest(BaseModel):
    age:                int   = Field(..., ge=0, le=120, description="Patient age in years")
    admission_type:     str   = Field(..., description="emergency | urgent | elective")
    condition_severity: int   = Field(..., ge=1, le=5, description="1 (mild) to 5 (critical)")
    num_diagnoses:      int   = Field(..., ge=1, le=30)
    num_procedures:     int   = Field(..., ge=0, le=20)

    @field_validator("admission_type")
    @classmethod
    def validate_admission(cls, v: str) -> str:
        allowed = {"emergency", "urgent", "elective"}
        if v.lower() not in allowed:
            raise ValueError(f"admission_type must be one of {allowed}")
        return v.lower()


class EquipmentRequest(BaseModel):
    equipment_id:           str   = Field(..., description="Equipment identifier (e.g. MRI-01)")
    runtime_hours:          int   = Field(..., ge=0, le=100_000)
    days_since_maintenance: int   = Field(..., ge=0, le=365)
    temperature_reading:    float = Field(..., ge=-10.0, le=200.0)
    vibration_level:        float = Field(..., ge=0.0, le=20.0)


class DemandRequest(BaseModel):
    medicine_name:  str = Field(...)
    forecast_days:  int = Field(30, ge=7, le=90)


class ArrivalRequest(BaseModel):
    forecast_date:          str  = Field(...)
    include_weather_factor: bool = False


class FeedbackRequest(BaseModel):
    prediction_type: str
    input_data:      dict
    output_data:     dict
    risk_level:      str | None = None


# ─── Helper ──────────────────────────────────────────────────────────────────
def _load_json(filename: str) -> dict | None:
    path = os.path.join(MODEL_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


# ─── Endpoints ────────────────────────────────────────────────────────────────

# ── LOS Prediction ────────────────────────────────────────────────────────────
@router.post("/patient-stay")
def predict_patient_stay(data: LOSRequest):
    """Predict patient length of stay using trained XGBoost/RF model."""
    if not los_model_artifact:
        raise HTTPException(status_code=503, detail="LOS Model not loaded. Run training/los_train.py first.")

    try:
        model       = los_model_artifact["model"]
        le_admission = los_model_artifact["encoders"]["admission_type"]

        try:
            admission_enc = int(le_admission.transform([data.admission_type])[0])
        except ValueError:
            admission_enc = int(le_admission.transform(["emergency"])[0])

        features = pd.DataFrame([{
            "age":                  data.age,
            "gender_enc":           0,
            "admission_type_enc":   admission_enc,
            "condition_severity":   data.condition_severity,
            "num_diagnoses":        data.num_diagnoses,
            "num_procedures":       data.num_procedures,
            "insurance_type_enc":   2,
        }])

        y_pred        = float(model.predict(features)[0])
        predicted_stay = max(1, min(30, round(y_pred)))
        risk_level    = "High" if predicted_stay > 14 else ("Medium" if predicted_stay > 5 else "Low")

        # Get feature contributions for XAI
        explain_input = {
            "age": data.age, "gender_enc": 0, "admission_type_enc": admission_enc,
            "condition_severity": data.condition_severity,
            "num_diagnoses": data.num_diagnoses,
            "num_procedures": data.num_procedures, "insurance_type_enc": 2,
        }
        explanation = explain_los(explain_input)

        return {
            "predicted_stay_days":   predicted_stay,
            "confidence_range":      [max(1, predicted_stay - 2), min(30, predicted_stay + 2)],
            "risk_level":            risk_level,
            "explanation":           explanation,
        }
    except Exception as e:
        logger.error(f"LOS prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Equipment Failure ─────────────────────────────────────────────────────────
@router.post("/equipment-failure")
def predict_equipment_failure(data: EquipmentRequest):
    """Predict probability of equipment failure in next 14 days."""
    if not equipment_model_artifact:
        raise HTTPException(status_code=503, detail="Equipment Model not loaded. Run training/equipment_failure_train.py first.")

    try:
        model = equipment_model_artifact["model"]

        features = pd.DataFrame([{
            "equipment_type_enc":      0,
            "runtime_hours":           data.runtime_hours,
            "days_since_maintenance":  data.days_since_maintenance,
            "temperature_reading":     data.temperature_reading,
            "vibration_level":         data.vibration_level,
            "usage_cycles":            data.runtime_hours / 10.0,
            "last_error_count":        0,
        }])

        prob     = float(model.predict_proba(features)[0][1])
        risk     = ("Critical" if prob > 0.8 else "High" if prob > 0.6 else
                    "Medium"   if prob > 0.3 else "Low")
        action   = ("Immediate Replacement" if risk == "Critical" else
                    "Schedule Maintenance"  if risk in ("High", "Medium") else
                    "Continue Routine Checks")
        days_left = int((1.0 - prob) * 14) if prob > 0.5 else int((1.0 - prob) * 60)

        explain_input = {
            "equipment_type_enc": 0, "runtime_hours": data.runtime_hours,
            "days_since_maintenance": data.days_since_maintenance,
            "temperature_reading": data.temperature_reading,
            "vibration_level": data.vibration_level,
            "usage_cycles": data.runtime_hours / 10.0,
            "last_error_count": 0,
        }
        explanation = explain_equipment(explain_input)

        return {
            "failure_probability":      round(prob, 3),
            "risk_category":            risk,
            "recommended_action":       action,
            "days_to_predicted_failure": max(1, days_left),
            "explanation":              explanation,
        }
    except Exception as e:
        logger.error(f"Equipment failure prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Medicine Demand ───────────────────────────────────────────────────────────
@router.post("/medicine-demand")
def predict_medicine_demand(data: DemandRequest):
    """Forecast medicine demand using Facebook Prophet."""
    safe_name = "".join(c if c.isalnum() else "_" for c in data.medicine_name)
    if safe_name not in demand_models:
        if demand_models:
            safe_name = list(demand_models.keys())[0]
        else:
            raise HTTPException(status_code=503, detail="No demand models loaded.")

    try:
        m        = demand_models[safe_name]
        future   = m.make_future_dataframe(periods=data.forecast_days)
        forecast = m.predict(future)
        subset   = forecast.tail(data.forecast_days)

        results      = []
        for _, row in subset.iterrows():
            results.append({
                "date":             row["ds"].strftime("%Y-%m-%d"),
                "predicted_demand": max(0, int(row["yhat"])),
                "lower_bound":      max(0, int(row["yhat_lower"])),
                "upper_bound":      max(0, int(row["yhat_upper"])),
            })

        avg_demand    = float(np.mean([r["predicted_demand"] for r in results]))
        upper_demand  = float(np.mean([r["upper_bound"]      for r in results]))
        stockout_risk = "High" if data.forecast_days > 14 and upper_demand > avg_demand * 1.5 else "Low"
        reorder_amt   = int(upper_demand * 1.2)

        return {
            "medicine_name":         data.medicine_name,
            "forecast":              results,
            "reorder_recommendation": reorder_amt,
            "stockout_risk":         stockout_risk,
        }
    except Exception as e:
        logger.error(f"Medicine demand error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Patient Arrivals ──────────────────────────────────────────────────────────
@router.post("/patient-arrivals")
def predict_patient_arrivals(data: ArrivalRequest):
    """Forecast patient arrivals using SARIMAX model."""
    if not arrival_model:
        raise HTTPException(status_code=503, detail="Patient Arrival Model not loaded.")

    try:
        target_date = datetime.strptime(data.forecast_date, "%Y-%m-%d")
        days_ahead  = max(1, min(365, (target_date - datetime.now()).days or 1))

        forecast   = arrival_model.get_forecast(steps=days_ahead)
        mean_val   = float(forecast.predicted_mean.values[-1])
        conf_int   = forecast.conf_int().values[-1]

        if data.include_weather_factor:
            mean_val *= 1.15

        arrivals = int(mean_val)
        return {
            "date":                   data.forecast_date,
            "predicted_arrivals":     arrivals,
            "peak_hour_estimate":     "10:00 AM - 1:00 PM",
            "staffing_recommendation": f"Ensure {max(5, arrivals // 20)} triage nurses on duty.",
            "confidence_interval":    [max(0, int(conf_int[0])), int(conf_int[1])],
        }
    except Exception as e:
        logger.error(f"Patient arrival error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Model Metrics Endpoints ───────────────────────────────────────────────────
@router.get("/metrics/los")
def get_los_metrics():
    """Return LOS model performance metrics and comparison data."""
    data = _load_json("los_model_metrics.json")
    if not data:
        raise HTTPException(
            status_code=404,
            detail="LOS metrics not found. Run 'python training/los_train.py' to generate them."
        )
    return data


@router.get("/metrics/equipment")
def get_equipment_metrics():
    """Return Equipment Failure model performance metrics and comparison data."""
    data = _load_json("equipment_metrics.json")
    if not data:
        raise HTTPException(
            status_code=404,
            detail="Equipment metrics not found. Run 'python training/equipment_failure_train.py' to generate them."
        )
    return data


# ── XAI Explain Endpoints ─────────────────────────────────────────────────────
@router.post("/explain/los")
def explain_los_prediction(data: LOSRequest):
    """Return feature contribution breakdown for a LOS prediction (XAI)."""
    try:
        le_admission = los_model_artifact["encoders"]["admission_type"] if los_model_artifact else None
        admission_enc = 0
        if le_admission:
            try:
                admission_enc = int(le_admission.transform([data.admission_type])[0])
            except ValueError:
                pass

        return explain_los({
            "age": data.age, "gender_enc": 0, "admission_type_enc": admission_enc,
            "condition_severity": data.condition_severity,
            "num_diagnoses": data.num_diagnoses,
            "num_procedures": data.num_procedures, "insurance_type_enc": 2,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain/equipment")
def explain_equipment_prediction(data: EquipmentRequest):
    """Return feature contribution breakdown for an equipment failure prediction (XAI)."""
    try:
        return explain_equipment({
            "equipment_type_enc": 0, "runtime_hours": data.runtime_hours,
            "days_since_maintenance": data.days_since_maintenance,
            "temperature_reading": data.temperature_reading,
            "vibration_level": data.vibration_level,
            "usage_cycles": data.runtime_hours / 10.0,
            "last_error_count": 0,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Feedback / Store Prediction ───────────────────────────────────────────────
@router.post("/feedback")
async def store_prediction_feedback(data: FeedbackRequest):
    """Store a prediction result in Supabase for the feedback loop."""
    from services.feedback_store import store_prediction
    result = await store_prediction(
        prediction_type=data.prediction_type,
        input_data=data.input_data,
        output_data=data.output_data,
        risk_level=data.risk_level,
    )
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
    return {"message": "Prediction stored successfully."}
