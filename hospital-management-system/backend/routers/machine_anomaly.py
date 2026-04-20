from fastapi import APIRouter
from pydantic import BaseModel
import sys
import os

# Add the parent directory so we can import models from services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from services.ml_models import mri_machine_model, xray_machine_model
    import pandas as pd
except ImportError:
    pass

router = APIRouter()

class MRISensorInput(BaseModel):
    helium_level: float       
    magnetic_field: float     
    rf_power: float           
    gradient_temp: float      

class XRaySensorInput(BaseModel):
    tube_current: float       
    exposure_time: float      
    voltage: float            
    detector_temp: float      

@router.post("/mri-machine")
def predict_mri_machine_anomaly(data: MRISensorInput):
    """
    Input: 4 MRI machine sensor readings.
    Output: is_anomaly (bool), anomaly_score (float), status.
    """
    if mri_machine_model is None:
        return {"error": "MRI Machine model not loaded."}
    try:
        features = [[
            data.helium_level,
            data.magnetic_field,
            data.rf_power,
            data.gradient_temp
        ]]
        df = pd.DataFrame(features, columns=["helium_level", "magnetic_field", "rf_power", "gradient_temp"])
        prediction = mri_machine_model.predict(df)[0]   # 1 = normal, -1 = anomaly
        score = mri_machine_model.decision_function(df)[0]  # lower = more anomalous
        is_anomaly = bool(prediction == -1)
        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(float(score), 5),
            "prediction_label": "Anomaly" if is_anomaly else "Normal",
            "status": "success",
            "message": "⚠️ MRI Machine anomaly detected! Schedule maintenance." if is_anomaly else "✅ MRI Machine operating normally.",
            "input": data.dict()
        }
    except Exception as e:
        return {"error": str(e)}

@router.post("/xray-machine")
def predict_xray_machine_anomaly(data: XRaySensorInput):
    """
    Input: 4 X-Ray machine sensor readings.
    Output: is_anomaly (bool), anomaly_score (float), status.
    """
    if xray_machine_model is None:
        return {"error": "X-Ray Machine model not loaded."}
    try:
        features = [[
            data.tube_current,
            data.exposure_time,
            data.voltage,
            data.detector_temp
        ]]
        df = pd.DataFrame(features, columns=["tube_current", "exposure_time", "voltage", "detector_temp"])
        prediction = xray_machine_model.predict(df)[0]
        score = xray_machine_model.decision_function(df)[0]
        is_anomaly = bool(prediction == -1)
        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(float(score), 5),
            "prediction_label": "Anomaly" if is_anomaly else "Normal",
            "status": "success",
            "message": "⚠️ X-Ray Machine anomaly detected! Schedule maintenance." if is_anomaly else "✅ X-Ray Machine operating normally.",
            "input": data.dict()
        }
    except Exception as e:
        return {"error": str(e)}
