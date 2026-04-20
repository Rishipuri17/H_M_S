# 🏥 AI-Powered Hospital Management System (HMS)

A production-ready, full-stack Hospital Management System designed to modernize healthcare administration. This project eliminates manual record-keeping by providing a dynamic interface for patient tracking, inventory management, and hospital operations while integrating **cutting-edge Machine Learning** for predictive analytics, resource forecasting, and medical image anomaly detection.

## 🌟 The Novelty: AI & Machine Learning Intersections
Unlike traditional CRUD hospital systems, this platform employs a microservice AI backend seamlessly integrated into the frontend dashboard:

1. **Medical Image Anomaly Detection (Computer Vision)**
   - **X-Ray & MRI Scans**: Staff can upload scans. The backend utilizes custom-trained Autoencoder models to highlight structural anomalies (e.g., tumors, fractures) and returns a visual heatmap showing exactly where the anomaly was detected.

2. **Machine Diagnostics & Predictive Maintenance**
   - **Remaining Useful Life (RUL)**: Using XGBoost models trained on NASA turbofan engine sensor data (adapted for hospital machinery like MRI/CT scanners), the system predicts exactly when a machine is likely to fail, allowing for proactive maintenance.

3. **Hospital Forecasting & AI Insights**
   - **Patient Arrival Forecasting**: Utilizing Facebook's Prophet (Time-Series Forecasting) to predict peak patient volumes on a 30-day horizon.
   - **Length of Stay (LoS)**: Predicts how many days a newly admitted patient will occupy a bed based on age, gender, and condition.
   - **Medicine & Inventory Demand**: Forecasts medication depletion rates to automate restocking.

---

## 🏗️ Architecture & Cloud Infrastructure
The project is decoupled into a serverless frontend and a heavy compute backend, connected via REST APIs and a cloud database.

### 1. Frontend (Deployed on Vercel)
- **Framework**: React 18, Vite
- **Styling**: Vanilla CSS (Modern Glassmorphism, Google Antigravity UI)
- **Data Viz**: Recharts (for ML plotting), Chart.js
- **Responsibilities**: Handles all user interactions, RBAC (Role-Based Access Control) authentication, and displays dynamic dashboards.

### 2. Backend / AI Microservice (Deployed on Hugging Face Spaces)
- **Framework**: FastAPI (Python 3.10)
- **Environment**: Custom Docker container (`docker.io/library/python:3.10-slim`)
- **Libraries**: `PyTorch`, `Scikit-Learn`, `XGBoost`, `Prophet`, `opencv-python-headless`
- **Responsibilities**: Houses the massive `.pkl` and `.pth` mathematical models. Receives HTTPS requests from Vercel, processes arrays/images, and returns JSON predictions.

### 3. Database (Hosted on Supabase)
- **Database**: PostgreSQL
- **Schema**: 
  - `users`: Stores Admin, Staff, and Viewer RBAC roles.
  - `patients`: Demographics, admission details, AI-predicted stay lengths.
  - `rooms`: Bed capacity, ICU availability.
  - `equipment`: Serial numbers, active status.
  - `maintenance_records`: Logs of repairs and AI-predicted failure thresholds.
  - `inventory`: Medicine trackers with min/max stock levels.

---

## 🔒 Future Roadmap (Security Novelty)
To elevate the project to an enterprise standard, the following **Zero-Trust Military-Grade Security Architecture** is currently under development:

1. **End-to-End Encryption (E2EE)**: The React app uses `crypto-js` to AES-256 encrypt patient data before `fetch()` is called. The Hugging Face backend decrypts the payload in-memory, processes the ML prediction, and encrypts the response, ensuring true HIPAA compliance for data-in-transit.
2. **Strict JWT Gateway**: Standardizing full Supabase JSON Web Token verification on the FastAPI endpoints so unauthorized external queries to the Hugging Face space are rejected.
3. **SlowAPI Rate Limiting**: Preventing DDoS attacks on the computationally heavy ML endpoints.

---

## 📂 Repository Structure

```text
hospital-management-system/
│
├── src/                      # React Frontend (Vite)
│   ├── components/           # UI Components (Charts, Tables, Auth Wrappers)
│   ├── context/              # AuthContext (Session Management)
│   ├── lib/                  # Services (supabase.js client)
│   └── pages/                # Application routes (Dashboards, AI Insights, Login)
│
├── backend/                  # Python FastAPI Microservice (Hugging Face)
│   ├── main.py               # API Entry point & CORS configuration
│   ├── routers/              # Modular Endpoints (image_anomaly.py, patient.py)
│   ├── services/             # ML inference execution scripts
│   ├── models/               # Ignored by git; contains large AI binary models
│   ├── Dockerfile            # Hugging Face deployment instructions
│   └── requirements.txt      # Python dependencies (fastapi, uvicorn, prophet, python-multipart)
│
├── .env                      # Environment Variables (Vercel & Local)
└── package.json              # NPM dependencies
```

## 🚀 Environment Variables setup
To run this project, the following variables must be present in the Frontend's `.env` (or Vercel Dashboard):
```env
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_API_URL=https://your-hugging-face-space-url.hf.space
```

*Built to streamline healthcare administration while leveraging advanced mathematical modeling for proactive, data-driven decisions.*
