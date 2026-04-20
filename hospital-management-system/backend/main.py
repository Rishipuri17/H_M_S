from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Import our new modular routers
from routers import image_anomaly, machine_anomaly, hospital_predictions, patient, explain, metrics

try:
    from middleware.auth import verify_jwt
except ImportError:
    verify_jwt = None

try:
    from limiter import limiter
    from slowapi.middleware import SlowAPIMiddleware
    from slowapi.errors import RateLimitExceeded
    from slowapi import _rate_limit_exceeded_handler
except ImportError:
    limiter = None

# Load environment variables
load_dotenv()

app = FastAPI(title="Hospital Management System - ML Backend", version="1.0.0")

# Setup Rate Limiting
if limiter:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

# Setup JWT Authentication Middleware
if verify_jwt:
    app.middleware("http")(verify_jwt)

# Configure CORS
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular routers
app.include_router(image_anomaly.router, prefix="/api/predict", tags=["Medical Imaging"])
app.include_router(machine_anomaly.router, prefix="/api/predict", tags=["Machine Diagnostics"])
app.include_router(hospital_predictions.router, prefix="/api/predict", tags=["AI Brain Insights"])
app.include_router(patient.router, prefix="/api/predict", tags=["Patient Predictions"])
app.include_router(explain.router, prefix="/explain", tags=["XAI"])
app.include_router(metrics.router, prefix="/metrics", tags=["Metrics"])

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Backend is active. JWT verification is enforced on non-public routes."}
