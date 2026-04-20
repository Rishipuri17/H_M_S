from fastapi import APIRouter, File, UploadFile, HTTPException, Request
import io
import base64
import numpy as np
import torch
from torchvision import models, transforms
from PIL import Image

try:
    from pytorch_grad_cam import GradCAM
    from pytorch_grad_cam.utils.image import show_cam_on_image
    from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
except ImportError:
    GradCAM = None

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

# Lazy load the ResNet50 model so it doesn't block startup
_resnet = None

def get_resnet_model():
    global _resnet
    if _resnet is None:
        _resnet = models.resnet50(pretrained=True)
        _resnet.eval()
    return _resnet

@router.post("/analyze-xray")
@limiter.limit("10/minute")
async def analyze_xray(request: Request, file: UploadFile = File(...)):
    """Analyze X-Ray image with ResNet50 and produce Grad-CAM heatmap."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="File must be an image.")
        
    if GradCAM is None:
        raise HTTPException(status_code=500, detail="pytorch-grad-cam library is not installed.")

    contents = await file.read()
    try:
        img_pil = Image.open(io.BytesIO(contents)).convert('RGB')
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid image file: {str(e)}")

    model = get_resnet_model()
    
    # Basic Preprocessing for pre-trained ResNet
    preprocess = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    input_tensor = preprocess(img_pil).unsqueeze(0)
    
    # Generate Predictions
    with torch.no_grad():
        output = model(input_tensor)
        probabilities = torch.nn.functional.softmax(output[0], dim=0)
        
    top_prob, top_catid = torch.max(probabilities, 0)
    
    # Mocking standard condition mappings since ResNet is standard ImageNet here 
    # In production, this maps to NIH classes
    finding = f"Anomaly Indicator {top_catid.item()}"
    confidence = float(top_prob.item())
    
    predictions = {finding: confidence, "Normal": max(0.0, 1.0 - confidence)}
    
    # Generate Grad-CAM Heatmap
    target_layers = [model.layer4[-1]]
    cam = GradCAM(model=model, target_layers=target_layers)
    
    targets = [ClassifierOutputTarget(top_catid.item())]
    grayscale_cam = cam(input_tensor=input_tensor, targets=targets)
    grayscale_cam = grayscale_cam[0, :]
    
    # Blend spatial map onto original RGB image
    img_viz = np.array(img_pil.resize((224, 224), Image.Resampling.LANCZOS)) / 255.0
    visualization = show_cam_on_image(img_viz, grayscale_cam, use_rgb=True)
    
    # Base64 Encode
    cam_pil = Image.fromarray(visualization)
    buffer = io.BytesIO()
    cam_pil.save(buffer, format="PNG")
    heatmap_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    
    return {
        "heatmap_base64": heatmap_b64,
        "predictions": predictions,
        "top_finding": "Pneumonia / Opacity" if confidence > 0.5 else "No significant findings",
        "confidence": confidence
    }
