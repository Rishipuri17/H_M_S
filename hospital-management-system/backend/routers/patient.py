from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from services.patient_models import (
    predict_length_of_stay,
    predict_readmission,
    forecast_patient_arrivals
)

router = APIRouter()

# ── Pydantic Schemas ──

class PatientDataInput(BaseModel):
    age: int = Field(..., gt=0, lt=130)
    gender: str
    disease: str
    admission_type: str
    history: bool
    bp: int = Field(..., gt=0, lt=300)
    sugar: int = Field(..., gt=0, lt=1000)

class LosResponse(BaseModel):
    predicted_los: float

class ReadmissionResponse(BaseModel):
    probability: float

class ForecastResponse(BaseModel):
    dates: list[str]
    predictions: list[int]


# ── Endpoints ──

@router.post("/patient/los", response_model=LosResponse)
async def get_patient_los(data: PatientDataInput):
    """Predict the length of stay in days for a given patient."""
    try:
        los = predict_length_of_stay(
            age=data.age,
            gender=data.gender,
            disease=data.disease,
            admission_type=data.admission_type,
            history=data.history,
            bp=data.bp,
            sugar=data.sugar
        )
        return {"predicted_los": los}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/patient/readmission", response_model=ReadmissionResponse)
async def get_patient_readmission(data: PatientDataInput):
    """Predict the probability (0-100%) of 30-day readmission."""
    try:
        prob = predict_readmission(
            age=data.age,
            gender=data.gender,
            disease=data.disease,
            admission_type=data.admission_type,
            history=data.history,
            bp=data.bp,
            sugar=data.sugar
        )
        return {"probability": prob}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patient/forecast", response_model=ForecastResponse)
async def get_patient_forecast(days: int = 7):
    """Forecast patient arrivals for the next N days."""
    try:
        if days > 30:
            days = 30
        result = forecast_patient_arrivals(days=days)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
