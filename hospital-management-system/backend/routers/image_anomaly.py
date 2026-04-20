from fastapi import APIRouter, File, UploadFile
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from services.ml_models import get_vision_model
except ImportError:
    pass

router = APIRouter()

@router.post("/maintenance")
async def predict_medical_image_anomaly(file: UploadFile = File(...)):
    """Upload an MRI or X-Ray image → returns anomaly score."""
    import io
    import numpy as np
    import torch
    import torch.nn as nn
    from PIL import Image
    from skimage.transform import resize
    import requests

    model, device = get_vision_model()
    if model is None:
        return {"error": "Vision Anomaly model could not be loaded."}
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert('L')
        img_np = np.array(img)
        img_resized = resize(img_np, (128, 128), mode='constant', anti_aliasing=True)
        if img_resized.max() > 0:
            img_resized = img_resized / img_resized.max()
        tensor_img = torch.tensor(img_resized, dtype=torch.float32).unsqueeze(0).unsqueeze(0).to(device)
        with torch.no_grad():
            reconstructed = model(tensor_img)
            loss = nn.MSELoss()(reconstructed, tensor_img)
            anomaly_score = loss.item()
            
        THRESHOLD = 0.015
        is_anomaly = anomaly_score > THRESHOLD
        
        # Real classification via Hugging Face Transformers Local Pipeline
        tumor_type = None
        if is_anomaly:
            try:
                from services.ml_models import get_tumor_classifier
                classifier = get_tumor_classifier()
                
                if classifier is not None:
                    # Pass the PIL image directly into the huggingface pipeline
                    predictions = classifier(img)
                    if isinstance(predictions, list) and len(predictions) > 0:
                        # Grab the label with the highest confidence
                        best_pred = predictions[0]
                        label = best_pred.get("label", "Unknown")
                        conf = best_pred.get("score", 0)
                        
                        tumor_type = f"{label.capitalize()} (Confidence: {conf:.1%})"
                    else:
                        tumor_type = "Unclassified Anomaly"
                else:
                    tumor_type = "Classification Model Loading..."
            except Exception as classify_err:
                print(f"HF Local Pipeline Error: {classify_err}")
                tumor_type = "Classification Local Error"
                
        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(anomaly_score, 5),
            "threshold": THRESHOLD,
            "tumor_type": tumor_type,
            "status": "success",
            "message": "⚠️ Anomaly Detected in Scan!" if is_anomaly else "✅ Scan is Normal."
        }
    except Exception as e:
        return {"error": str(e)}
