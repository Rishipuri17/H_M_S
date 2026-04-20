"""
Feedback Store Service
======================
Stores ML prediction results in Supabase for the feedback loop.
Uses the Supabase REST API directly (no extra SDK needed).
"""
import os
import json
import logging
from datetime import datetime

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("feedback_store")

SUPABASE_URL     = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY     = os.getenv("SUPABASE_ANON_KEY", "")
PREDICTIONS_TABLE = "ml_predictions"


def _get_headers() -> dict:
    return {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "application/json",
    }


async def store_prediction(
    prediction_type: str,
    input_data: dict,
    output_data: dict,
    risk_level: str | None = None,
) -> dict:
    """
    Asynchronously insert a prediction record into the ml_predictions table.
    Returns {"success": True} or {"success": False, "error": "..."}.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning("SUPABASE_URL / SUPABASE_ANON_KEY not set — feedback not stored.")
        return {"success": False, "error": "Supabase credentials not configured."}

    payload = {
        "prediction_type": prediction_type,
        "input_data":      input_data,
        "output_data":     output_data,
        "risk_level":      risk_level,
        "created_at":      datetime.utcnow().isoformat(),
    }

    url = f"{SUPABASE_URL}/rest/v1/{PREDICTIONS_TABLE}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=_get_headers(), json=payload)
            if resp.status_code in (200, 201):
                logger.info(f"✅ Stored {prediction_type} prediction in Supabase")
                return {"success": True}
            else:
                logger.error(f"Supabase insert failed: {resp.status_code} — {resp.text}")
                return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text}"}
    except Exception as e:
        logger.error(f"Supabase insert exception: {e}")
        return {"success": False, "error": str(e)}
