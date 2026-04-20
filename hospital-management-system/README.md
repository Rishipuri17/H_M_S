# AI-Powered Hospital Management System

A comprehensive, full-stack Hospital Management System (HMS) enhanced with Machine Learning for predictive analytics and medical image anomaly detection. This project modernizes hospital operations, ranging from patient admission and room management to equipment maintenance and intelligent forecasting.

## 🌟 Key Features

### 📋 Core Management
- **Role-Based Access Control (RBAC)**: Secure access for Admins, Staff, and regular users.
- **Patient Management**: Complete lifecycle tracking from admission to discharge.
- **Room & Bed Management**: Track occupancy, availability, and room types.
- **Equipment & Inventory**: Monitor stock levels, track medical devices, and schedule maintenance.
- **Maintenance Tracking**: Keep logs of preventive and corrective maintenance for machinery.
- **Interactive Dashboards**: Role-specific dashboards (Admin, Staff) for real-time operational overview.

### 🧠 AI & Machine Learning Integrations
- **Medical Image Anomaly Detection**: Upload MRI and X-ray images. Autoencoder models identify anomalies such as tumors or structural defects.
- **Machine Diagnostics**: Predictive maintenance models (XGBoost) estimate the remaining useful life of equipment to prevent failures.
- **Hospital Predictions & AI Insights**:
  - *Patient Arrival Forecasting*: Predict peak patient volumes using time-series forecasting (Prophet).
  - *Length of Stay (LoS)*: Estimate how long a patient will stay based on admission data.
  - *Medicine Demand*: Forecast required inventory levels to prevent medical shortages.
  - *Equipment Failure*: Estimate probability of imminent machine breakdown.

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18, Vite
- **Routing**: React Router v6
- **Charting & Data Viz**: Recharts, Chart.js
- **Icons**: Lucide React
- **Styling**: Vanilla CSS with modern, responsive layouts

### Backend (Machine Learning API)
- **Framework**: FastAPI (Python)
- **ML Libraries**: PyTorch, Scikit-Learn, XGBoost, Prophet, Statsmodels
- **Data Processing**: Pandas, NumPy, Scikit-Image, Pillow
- **Server**: Uvicorn

### Database & Authentication
- **Provider**: [Supabase](https://supabase.com/)
- **Database**: PostgreSQL (managed via Supabase SDK)
- **Authentication**: Built-in Supabase Auth

## 📂 Project Structure

```
hospital-management-system/
│
├── src/                      # React Frontend
│   ├── components/           # Reusable UI components
│   ├── context/              # React Context (AuthContext)
│   ├── lib/                  # Library configurations (Supabase client)
│   └── pages/                # Application routes/pages
│       ├── AdminDashboard.jsx
│       ├── AIInsights.jsx
│       ├── Login.jsx
│       ├── MachineDiagnostics.jsx
│       └── ...
│
├── backend/                  # Python FastAPI Backend
│   ├── main.py               # API Entry point
│   ├── routers/              # Modular API endpoints (image, ML, NLP)
│   ├── services/             # ML model loading and inference logic
│   ├── models/               # Serialized ML models (.joblib, .pth)
│   └── requirements.txt      # Python dependencies
│
├── .env                      # Environment Variables
├── package.json              # NPM dependencies and scripts
└── vite.config.js            # Vite bundler configuration
```

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Python 3.9+](https://www.python.org/downloads/)
- A [Supabase](https://supabase.com/) project

### 1. Frontend Setup
1. Open a terminal in the project root.
2. Install NPM dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables. Ensure `.env` contains:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```

### 2. Backend (ML API) Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```
   The ML API will be available at `http://127.0.0.1:8000`.

## 📡 API Endpoints (Backend)
- `GET /health` - Check API and ML model loading status.
- `POST /api/predict/image/upload` - Analyze Medical Images.
- `POST /api/predict/machine/mri` - Get MRI machine diagnostics.
- `GET /api/predict/hospital/length-of-stay` - Predict patient stay duration.
- `GET /api/predict/hospital/patient-arrival` - Forecast patient influx.

---
*Built to streamline healthcare administration while leveraging AI for proactive, data-driven decisions.*
