from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Import our new modular routers
from routers import image_anomaly, machine_anomaly, hospital_predictions, patient
from services.ml_models import get_vision_model, mri_machine_model, xray_machine_model

# Load environment variables
load_dotenv()

app = FastAPI(title="Hospital Management System - ML Backend", version="1.0.0")

# Configure CORS so the React frontend can communicate with this API
origins = [
    f"http://localhost:{port}" for port in range(5173, 5185)
] + [
    f"http://127.0.0.1:{port}" for port in range(5173, 5185)
] + [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

# Register modular routers
app.include_router(image_anomaly.router, prefix="/api/predict", tags=["Medical Imaging"])
app.include_router(machine_anomaly.router, prefix="/api/predict", tags=["Machine Diagnostics"])
app.include_router(hospital_predictions.router, prefix="/api/predict", tags=["AI Brain Insights"])
app.include_router(patient.router, prefix="/api/predict", tags=["Patient Predictions"])


@app.get("/health")
def health_check():
    # To check vision model without actually loading it yet, we check the _vision_loaded flag
    from services.ml_models import _vision_model, _vision_loaded
    return {
        "status": "ok",
        "models": {
            "vision_autoencoder": _vision_model is not None or not _vision_loaded,
            "mri_machine": mri_machine_model is not None,
            "xray_machine": xray_machine_model is not None,
        }
    }
