# 🏥 AI-Powered Hospital Management System (HMS)

[![React](https://img.shields.io/badge/Frontend-React%2018-blue?logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/AI_Backend-FastAPI-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ecf8e?logo=supabase)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Build_Tool-Vite-646CFF?logo=vite)](https://vitejs.dev/)
[![ML](https://img.shields.io/badge/AI/ML-XGBoost%20|%20Prophet%20|%20SHAP-orange)](https://xgboost.ai/)

A production-grade, full-stack Hospital Management System designed to modernize healthcare administration. This project evolves traditional management tools into a **Production-Grade, AI-Powered Healthcare Ecosystem**, combining robust hospital operations with advanced predictive analytics, anomaly detection, and **Explainable AI (XAI)**.

---

## 🌟 The "Goated" Evolution: AI & ML Intersections

Unlike traditional CRUD hospital systems, this platform employs a microservice AI backend seamlessly integrated into a professional dashboard.

### 🧠 The AI Brain Features
The system features a dedicated **FastAPI ML Backend** powering several critical predictive modules:

1.  **📊 Patient Length of Stay (LOS)**: Uses XGBoost to predict discharge dates, identifying high-risk patients for better resource planning.
2.  **🔊 Acoustic Equipment Failure**: Analyzes sensor data (MFCCs) to predict machine failures before they happen, moving from reactive to proactive maintenance.
3.  **📈 Medicine Demand Forecasting**: Utilizes **Facebook Prophet** to predict pharmaceutical inventory needs 30-90 days in advance.
4.  **🌊 Patient Arrival Surge**: Forecasts daily patient inflows using **SARIMAX** models, including weather-factor adjustments for emergency preparedness.
5.  **🔍 Explainable AI (XAI)**: Every prediction includes a "Why?" panel powered by **SHAP**, showing exactly which features (age, symptoms, runtime) influenced the AI's decision.
6.  **🔄 Self-Improving Feedback Loop**: Stores prediction results in Supabase to facilitate future model retraining and accuracy improvement.

---

## 🛠️ Technology Stack

### **Frontend**
- **React 18** with **Vite** for blazing fast performance.
- **Recharts** & **Chart.js** for interactive medical telemetry and ML metrics.
- **Lucide Icons** for a modern, clean aesthetic.
- **Vanilla CSS** with a custom design system (Glassmorphism, High-contrast accessibility).

### **AI & ML Microservice**
- **FastAPI** (Python 3.10) for high-performance ML inference.
- **Libraries**: `XGBoost`, `Scikit-learn`, `Facebook Prophet`, `Statsmodels`, `SHAP`.
- **Image AI**: `PyTorch` & `torchvision` (Autoencoders for anomaly detection).
- **Security**: **SlowAPI** for rate limiting and **Jose** for JWT verification.

### **Backend & Infrastructure**
- **Supabase (PostgreSQL)**: Handles relational data with **Row Level Security (RLS)**.
- **JWT (JSON Web Tokens)**: Secure Role-Based Access Control (RBAC).
- **Docker**: Containerized deployment for consistent environments.

---

## 📂 Project Architecture

```bash
hospital-management-system/
├── 📂 backend/                   # 🧠 AI BRAIN - FASTAPI
│   ├── 📂 routers/               # ML Prediction Endpoints (LOS, Demand, XAI)
│   ├── 📂 models/                # Trained .pkl & .pth model artifacts
│   ├── 📂 training/              # ML training scripts and notebooks
│   ├── main.py                   # FastAPI entry point
│   └── requirements.txt          # Python ML dependencies
│
├── 📂 src/                       # 🎨 FRONTEND - REACT
│   ├── 📂 pages/                 # Admin, Staff, AI Insights, ML Metrics
│   ├── 📂 components/            # UI Components (Charts, Tables, Modals)
│   ├── 📂 lib/                   # Supabase client & API services
│   └── 📂 context/               # AuthContext for session management
│
├── 📄 supabase-schema.sql        # Database definitions & RLS policies
├── 📄 Dockerfile                 # Root containerization
└── 📄 .env                       # Environment secrets
```

---

## 📋 Core Modules

### 1. Advanced Dashboards
- **Admin Dashboard**: Full CRUD over Users, Rooms, Patients, Equipment, and Inventory. Features a dedicated **Audit Log**.
- **Staff Dashboard**: Optimized for daily hospital operations and patient care tracking.
- **AI Brain Insights**: Unified panel for all predictive capabilities with PDF report generation.

### 2. Operational Modules
- **🏥 Room Management**: Status tracking (Available/Occupied/Cleaning), type classification (ICU/General), and floor mapping.
- **🔧 Equipment & Telemetry**: Predictive maintenance logs, criticality levels, and sensor data integration.
- **📦 Inventory & Logistics**: Auto-stock status (Low/Out of Stock), pricing, and supplier management.
- **👥 Patient Care**: Registration, medical history, room assignment, and emergency contact registry.

### 3. Security & RBAC
| Role | Permissions | Primary Worksurface |
| :--- | :--- | :--- |
| **Admin** | Full System Control + CRUD | `AdminDashboard.jsx` |
| **Staff** | Operational Updates + AI Access | `StaffDashboard.jsx` |
| **Viewer** | Read-only access + Reports | `Dashboard.jsx` |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **Python** (3.10+)
- **Supabase Account** (Free tier works perfectly)

### Quick Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rishipuri17/H_M_S.git
   cd hospital-management-system
   ```

2. **Database Setup:**
   - Create a new project in **Supabase**.
   - Copy the contents of `supabase-schema.sql` and run it in the **Supabase SQL Editor**.

3. **Frontend Configuration:**
   - Create a `.env` file in the root:
     ```env
     VITE_SUPABASE_URL=YOUR_SUPABASE_URL
     VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
     VITE_API_URL=http://localhost:8000 # Local FastAPI
     ```
   - Install dependencies and run:
     ```bash
     npm install
     npm run dev
     ```

4. **Backend Configuration:**
   - Navigate to the `backend` folder:
     ```bash
     cd backend
     python -m venv venv
     source venv/bin/activate # or venv\Scripts\activate on Windows
     pip install -r requirements.txt
     python main.py
     ```

### Default Credentials
- **Admin**: `admin@hospital.com`
- **Staff**: `staff@hospital.com`
- **Viewer**: `viewer@hospital.com`

---

## 🎯 Roadmap
- [ ] **Image AI Integration**: Fully activating X-ray/MRI screening routers.
- [ ] **Real-time Notifications**: WebSockets for "Critical" equipment failure alerts.
- [ ] **Dynamic Retraining**: Automated model updates based on the Feedback Loop data.

---

## 📞 License & Contact
Distributed under the MIT License. Developed as a **Minor Project** by the team to push the boundaries of AI in Healthcare.

**Ready to start?** Check out the [QUICKSTART.md](QUICKSTART.md) for a 5-minute setup guide! 🎉
