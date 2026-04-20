from fastapi import APIRouter, Request
from pydantic import BaseModel
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from services.shap_service import explain_los, explain_rul
except ImportError:
    pass

router = APIRouter()

try:
    from limiter import limiter
    if limiter is None:
        raise ImportError
except ImportError:
    class DummyLimiter:
        def limit(self, *args, **kwargs):
            return lambda f: f
    limiter = DummyLimiter()

class LOSInput(BaseModel):
    age: int
    gender: int
    condition_code: int

class RULInput(BaseModel):
    mfcc_mean_1: float
    mfcc_mean_2: float
    mfcc_mean_3: float
    mfcc_mean_4: float
    mfcc_mean_5: float
    mfcc_mean_6: float
    mfcc_mean_7: float
    mfcc_mean_8: float
    mfcc_mean_9: float
    mfcc_mean_10: float
    mfcc_mean_11: float
    mfcc_mean_12: float
    mfcc_mean_13: float
    rms_mean: float
    zcr_mean: float

@router.post("/los")
@limiter.limit("30/minute")
def post_explain_los(request: Request, data: LOSInput):
    return explain_los(data.dict())

@router.post("/rul")
@limiter.limit("30/minute")
def post_explain_rul(request: Request, data: RULInput):
    return explain_rul(data.dict())
