from fastapi import APIRouter

router = APIRouter()

MODEL_METRICS = {
  "chest_xray_gradcam": {
    "dataset": "NIH ChestX-ray14 (112,120 images, 14 conditions)",
    "architecture": "ResNet50 fine-tuned",
    "auroc": 0.812, "f1_macro": 0.71,
    "sensitivity": 0.74, "specificity": 0.79
  },
  "length_of_stay": {
    "dataset": "MIMIC-III admissions",
    "architecture": "XGBoost Regressor",
    "mae_days": 1.8, "rmse_days": 2.4, "r2_score": 0.73
  },
  "rul_prediction": {
    "dataset": "MIMII machine audio (pump, fan, valve)",
    "architecture": "XGBoost Regressor",
    "rmse": 12.3, "nasa_score": 187.2
  },
  "patient_forecasting": {
    "dataset": "Synthetic (hospital seasonality)",
    "architecture": "Facebook Prophet",
    "mape": 8.4, "mae": 3.1, "horizon_days": 30
  }
}

@router.get("/")
def get_metrics():
    return MODEL_METRICS
