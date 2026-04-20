import os
import joblib
try:
    import shap
except ImportError:
    shap = None
import pandas as pd
import numpy as np

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")

# Lazy-loading models to prevent startup crashes if missing
try:
    xgb_los = joblib.load(os.path.join(MODEL_DIR, "los_model.pkl"))
except:
    xgb_los = None

try:
    xgb_rul = joblib.load(os.path.join(MODEL_DIR, "nasa_rul_rf_model.pkl"))
except:
    try: 
        xgb_rul = joblib.load(os.path.join(MODEL_DIR, "equipment_failure_model.pkl"))
    except:
        xgb_rul = None

def get_base_value(expected_value):
    if isinstance(expected_value, (list, np.ndarray)):
        return float(expected_value[0])
    return float(expected_value)

def explain_los(patient_data: dict) -> dict:
    if shap is None:
        return {"error": "shap is not installed."}
    if not xgb_los:
        return {"error": "LOS model not found"}
        
    try:
        df = pd.DataFrame([patient_data])
        model = xgb_los.get("model", xgb_los) if isinstance(xgb_los, dict) else xgb_los
        
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(df)
        
        sv = shap_values[1][0] if isinstance(shap_values, list) else shap_values[0]
        
        pred = float(model.predict(df)[0])
        base_value = get_base_value(explainer.expected_value)
        
        explanation = []
        for i, col in enumerate(df.columns):
            explanation.append({
                "feature": col,
                "shap_value": float(sv[i]),
                "input_value": float(df.iloc[0, i])
            })
            
        explanation.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        
        return {
            "predicted_los_days": pred,
            "base_value": base_value,
            "explanation": explanation
        }
    except Exception as e:
        return {"error": str(e)}

def explain_rul(machine_data: dict) -> dict:
    if shap is None:
        return {"error": "shap is not installed."}
    if not xgb_rul:
        return {"error": "RUL model not found"}
        
    try:
        df = pd.DataFrame([machine_data])
        model = xgb_rul.get("model", xgb_rul) if isinstance(xgb_rul, dict) else xgb_rul
        
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(df)
        
        sv = shap_values[1][0] if isinstance(shap_values, list) else shap_values[0]
        
        if hasattr(model, "predict_proba"):
            pred = float(model.predict_proba(df)[0][1])
        else:
            pred = float(model.predict(df)[0])
            
        base_value = get_base_value(explainer.expected_value)
        
        explanation = []
        for i, col in enumerate(df.columns):
            explanation.append({
                "feature": col,
                "shap_value": float(sv[i]),
                "input_value": float(df.iloc[0, i])
            })
            
        explanation.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        
        return {
            "predicted_rul": pred,
            "base_value": base_value,
            "explanation": explanation
        }
    except Exception as e:
        return {"error": str(e)}
