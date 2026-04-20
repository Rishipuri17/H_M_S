import os
import joblib

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")

# ─── 1. Vision model — lazy-loaded on first request (torch is heavy) ──────────
_vision_model = None
_vision_device = None
_vision_loaded = False

def get_vision_model():
    """Load PyTorch autoencoder on first use so server starts fast."""
    global _vision_model, _vision_device, _vision_loaded
    if _vision_loaded:
        return _vision_model, _vision_device
    _vision_loaded = True
    try:
        import torch
        import torch.nn as nn
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        _vision_device = device

        class MedicalAutoencoder(torch.nn.Module):
            def __init__(self):
                super().__init__()
                self.encoder = nn.Sequential(
                    nn.Conv2d(1, 16, kernel_size=3, stride=2, padding=1), nn.ReLU(),
                    nn.Conv2d(16, 32, kernel_size=3, stride=2, padding=1), nn.ReLU(),
                    nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1), nn.ReLU()
                )
                self.decoder = nn.Sequential(
                    nn.ConvTranspose2d(64, 32, kernel_size=3, stride=2, padding=1, output_padding=1), nn.ReLU(),
                    nn.ConvTranspose2d(32, 16, kernel_size=3, stride=2, padding=1, output_padding=1), nn.ReLU(),
                    nn.ConvTranspose2d(16, 1,  kernel_size=3, stride=2, padding=1, output_padding=1), nn.Sigmoid()
                )
            def forward(self, x):
                return self.decoder(self.encoder(x))

        model = MedicalAutoencoder().to(device)
        model.load_state_dict(
            torch.load(os.path.join(MODEL_DIR, "vision_anomaly_autoencoder.pth"), map_location=device)
        )
        model.eval()
        _vision_model = model
        print("OK Vision model loaded (lazy)")
    except Exception as e:
        print(f"WARN  Vision model load failed: {e}")
        _vision_model = None
    return _vision_model, _vision_device

# ─── 2. MRI Machine Isolation Forest (fast pkl — load eagerly) ────────────────
try:
    mri_machine_model = joblib.load(os.path.join(MODEL_DIR, "mri_anomaly_model.pkl"))
    print("OK Loaded MRI Machine Anomaly Model")
except Exception as e:
    mri_machine_model = None
    print(f"WARN Could not load MRI Machine Model: {e}")

# ─── 3. X-Ray Machine Isolation Forest (fast pkl — load eagerly) ──────────────
try:
    xray_machine_model = joblib.load(os.path.join(MODEL_DIR, "xray_anomaly_model.pkl"))
    print("OK Loaded X-Ray Machine Anomaly Model")
except Exception as e:
    xray_machine_model = None
    print(f"WARN Could not load X-Ray Machine Model: {e}")

# ─── 4. Tumor Classification Pipeline (Lazy-loaded via Transformers) ─────────
_tumor_classifier = None
_tumor_classifier_loaded = False

def get_tumor_classifier():
    """Lazy load the HuggingFace tumor classifier pipeline so startup is fast."""
    global _tumor_classifier, _tumor_classifier_loaded
    if _tumor_classifier_loaded:
        return _tumor_classifier
    _tumor_classifier_loaded = True
    try:
        from transformers import pipeline
        import torch
        device = 0 if torch.cuda.is_available() else -1
        # Downloading the 300MB model on the first run natively
        _tumor_classifier = pipeline(
            task="image-classification", 
            model="Hemgg/brain-tumor-classification", 
            device=device
        )
        print("OK Tumor Classifier pipeline loaded (lazy)")
    except Exception as e:
        print(f"WARN Tumor classifier pipeline load failed: {e}")
        _tumor_classifier = None
    return _tumor_classifier
