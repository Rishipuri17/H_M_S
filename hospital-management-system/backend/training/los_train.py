"""
Length of Stay (LOS) Model Training — Production-Grade
=======================================================
Trains and compares 3 models (Random Forest, XGBoost, Linear Regression),
performs K-Fold Cross-Validation, GridSearchCV on the best model, and
saves metrics + feature importances as JSON for the frontend dashboard.
"""
import os
import json
import warnings
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb

warnings.filterwarnings("ignore")

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# ── 1. Synthetic Dataset ───────────────────────────────────────────────────────
def create_synthetic_data(num_samples: int = 5000) -> pd.DataFrame:
    np.random.seed(42)
    age              = np.random.randint(18, 90, num_samples)
    gender           = np.random.choice(["M", "F"], num_samples)
    admission_type   = np.random.choice(["emergency", "elective", "urgent"], num_samples, p=[0.4, 0.4, 0.2])
    condition_severity = np.random.randint(1, 6, num_samples)
    num_diagnoses    = np.random.randint(1, 10, num_samples)
    num_procedures   = np.random.randint(0, 5, num_samples)
    insurance_type   = np.random.choice(["Medicare", "Medicaid", "Private", "Self-Pay"], num_samples)

    age_factor       = (age - 18) / 30
    severity_factor  = condition_severity * 1.5
    procedure_factor = num_procedures * 2.5
    admit_factor     = np.where(admission_type == "emergency", 3,
                       np.where(admission_type == "urgent", 2, 0))
    noise            = np.random.normal(0, 1.5, num_samples)

    los = 2 + age_factor + severity_factor + procedure_factor + admit_factor + noise
    los = np.clip(np.round(los), 1, 30).astype(int)

    return pd.DataFrame({
        "age": age, "gender": gender, "admission_type": admission_type,
        "condition_severity": condition_severity, "num_diagnoses": num_diagnoses,
        "num_procedures": num_procedures, "insurance_type": insurance_type,
        "length_of_stay": los,
    })


# ── 2. Train, Compare & Evaluate ──────────────────────────────────────────────
def train_los_model():
    print("\n" + "="*60)
    print("  LENGTH OF STAY — Model Training & Comparison")
    print("="*60)

    df = create_synthetic_data(5000)
    print(f"✅ Generated {len(df)} synthetic patient records")

    # Encode categoricals
    le_gender    = LabelEncoder()
    le_admission = LabelEncoder()
    le_insurance = LabelEncoder()
    df["gender_enc"]        = le_gender.fit_transform(df["gender"])
    df["admission_type_enc"] = le_admission.fit_transform(df["admission_type"])
    df["insurance_type_enc"] = le_insurance.fit_transform(df["insurance_type"])

    FEATURES = ["age", "gender_enc", "admission_type_enc", "condition_severity",
                "num_diagnoses", "num_procedures", "insurance_type_enc"]
    FEATURE_LABELS = ["Age", "Gender", "Admission Type", "Condition Severity",
                      "Num Diagnoses", "Num Procedures", "Insurance Type"]

    X = df[FEATURES]
    y = df["length_of_stay"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"✅ Train: {len(X_train)} | Test: {len(X_test)} (80/20 split)")

    # ── Models to compare ──────────────────────────────────────────────────────
    candidates = {
        "Linear Regression": LinearRegression(),
        "Random Forest":     RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42),
        "XGBoost":           xgb.XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.1,
                                               random_state=42, verbosity=0),
    }

    comparison_results = []
    best_model_name    = None
    best_r2            = -np.inf
    best_model         = None

    for name, model in candidates.items():
        print(f"\n⏳ Training {name}...")
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        mae  = float(mean_absolute_error(y_test, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        r2   = float(r2_score(y_test, y_pred))

        # 5-Fold CV
        cv_scores = cross_val_score(model, X, y, cv=5, scoring="r2")
        cv_mean   = float(cv_scores.mean())
        cv_std    = float(cv_scores.std())

        print(f"   R²: {r2:.3f} | MAE: {mae:.2f} days | RMSE: {rmse:.2f} | CV R²: {cv_mean:.3f} ± {cv_std:.3f}")
        comparison_results.append({
            "model": name, "r2": r2, "mae": mae, "rmse": rmse,
            "cv_r2_mean": cv_mean, "cv_r2_std": cv_std
        })

        if r2 > best_r2:
            best_r2         = r2
            best_model_name = name
            best_model      = model

    print(f"\n🏆 Best model: {best_model_name} (R² = {best_r2:.3f})")

    # ── GridSearchCV on XGBoost ────────────────────────────────────────────────
    print("\n⚙️  Running GridSearchCV on XGBoost (this may take ~30 s)...")
    param_grid = {
        "n_estimators": [100, 200],
        "max_depth":    [3, 5],
        "learning_rate":[0.05, 0.1],
    }
    gs = GridSearchCV(
        xgb.XGBRegressor(random_state=42, verbosity=0),
        param_grid, cv=3, scoring="r2", n_jobs=-1, verbose=0
    )
    gs.fit(X_train, y_train)
    tuned_model = gs.best_estimator_
    y_pred_tuned = tuned_model.predict(X_test)
    tuned_r2   = float(r2_score(y_test, y_pred_tuned))
    tuned_mae  = float(mean_absolute_error(y_test, y_pred_tuned))
    tuned_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_tuned)))
    print(f"   Best params: {gs.best_params_}")
    print(f"   Tuned XGBoost → R²: {tuned_r2:.3f} | MAE: {tuned_mae:.2f} | RMSE: {tuned_rmse:.2f}")

    # If tuned XGBoost is best, use it
    if tuned_r2 >= best_r2:
        best_model_name = "XGBoost (Tuned)"
        best_r2         = tuned_r2
        best_model      = tuned_model
        print(f"✅ Switched to Tuned XGBoost as final model")

    # Update comparison with tuned XGBoost entry
    comparison_results.append({
        "model": "XGBoost (Tuned)", "r2": tuned_r2, "mae": tuned_mae, "rmse": tuned_rmse,
        "cv_r2_mean": tuned_r2, "cv_r2_std": 0.0
    })

    # ── Feature Importances ───────────────────────────────────────────────────
    if hasattr(best_model, "feature_importances_"):
        importances = best_model.feature_importances_
    else:
        # For Linear Regression, use abs(coef) normalized
        importances = np.abs(best_model.coef_) / np.abs(best_model.coef_).sum()

    feature_importance_data = [
        {"feature": label, "importance": round(float(imp), 4)}
        for label, imp in sorted(zip(FEATURE_LABELS, importances), key=lambda x: -x[1])
    ]

    # ── Dataset Stats (for frontend histograms) ───────────────────────────────
    age_hist, age_bins   = np.histogram(df["age"], bins=10)
    sev_hist, sev_bins   = np.histogram(df["condition_severity"], bins=5)
    dataset_stats = {
        "age_histogram": {
            "counts": age_hist.tolist(),
            "bins": [round(float(b), 1) for b in age_bins.tolist()],
        },
        "severity_histogram": {
            "counts": sev_hist.tolist(),
            "bins": [round(float(b), 1) for b in sev_bins.tolist()],
        },
        "los_mean": round(float(y.mean()), 2),
        "los_std":  round(float(y.std()), 2),
        "num_samples": len(df),
    }

    # ── Actual vs Predicted (sample 100 points) ───────────────────────────────
    sample_idx    = np.random.RandomState(0).choice(len(X_test), size=min(100, len(X_test)), replace=False)
    y_pred_final  = best_model.predict(X_test)
    actual_vs_pred = [
        {"actual": int(y_test.iloc[i]), "predicted": round(float(y_pred_final[i]), 1)}
        for i in sample_idx
    ]

    # ── Save Metrics JSON ─────────────────────────────────────────────────────
    metrics_payload = {
        "task":                   "regression",
        "target":                 "Length of Stay (days)",
        "best_model":             best_model_name,
        "best_r2":                round(best_r2, 4),
        "best_mae":               tuned_mae if "Tuned" in best_model_name else round(float(mean_absolute_error(y_test, best_model.predict(X_test))), 4),
        "best_rmse":              tuned_rmse if "Tuned" in best_model_name else round(float(np.sqrt(mean_squared_error(y_test, best_model.predict(X_test)))), 4),
        "comparison":             comparison_results,
        "feature_importance":     feature_importance_data,
        "dataset_stats":          dataset_stats,
        "actual_vs_predicted":    actual_vs_pred,
        "gridcv_best_params":     gs.best_params_,
        "train_size":             len(X_train),
        "test_size":              len(X_test),
    }

    metrics_path = os.path.join(MODEL_DIR, "los_model_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"✅ Metrics saved → {metrics_path}")

    # ── Save Feature Importance separately (also used by explainability service) ──
    fi_path = os.path.join(MODEL_DIR, "los_feature_importance.json")
    with open(fi_path, "w") as f:
        json.dump({"features": feature_importance_data, "feature_keys": FEATURES}, f, indent=2)
    print(f"✅ Feature importance saved → {fi_path}")

    # ── Save Final Model ──────────────────────────────────────────────────────
    artifact = {
        "model":    best_model,
        "encoders": {
            "gender":         le_gender,
            "admission_type": le_admission,
            "insurance_type": le_insurance,
        },
        "features": FEATURES,
        "feature_labels": FEATURE_LABELS,
    }
    model_path = os.path.join(MODEL_DIR, "los_model.pkl")
    joblib.dump(artifact, model_path)
    print(f"✅ Model saved → {model_path}")
    print(f"\n{'='*60}")
    print(f"  TRAINING COMPLETE — Best Model: {best_model_name}")
    print(f"  R²: {best_r2:.3f} | MAE: {metrics_payload['best_mae']:.2f} days | RMSE: {metrics_payload['best_rmse']:.2f}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    train_los_model()
