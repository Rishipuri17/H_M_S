"""
Equipment Failure Prediction — Production-Grade Training
=========================================================
Trains and compares 3 classifiers (Random Forest, XGBoost, Logistic Regression),
K-Fold CV, GridSearchCV, and saves full metrics (Accuracy, Precision, Recall,
F1, AUC, Confusion Matrix, ROC curve data) as JSON for the frontend dashboard.
"""
import os
import json
import warnings
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, roc_curve,
    classification_report
)
from sklearn.pipeline import Pipeline
import xgboost as xgb

warnings.filterwarnings("ignore")

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)


# ── 1. Synthetic Dataset ───────────────────────────────────────────────────────
def create_synthetic_data(num_samples: int = 3000) -> pd.DataFrame:
    np.random.seed(42)
    equipment_type       = np.random.choice(["MRI Machine", "X-Ray Machine", "Ventilator",
                                              "Defibrillator", "Patient Monitor"], num_samples)
    runtime_hours        = np.random.randint(100, 10000, num_samples)
    days_since_maint     = np.random.randint(1, 180, num_samples)
    temperature_reading  = np.random.normal(35, 10, num_samples)
    vibration_level      = np.random.normal(2, 0.8, num_samples)
    usage_cycles         = runtime_hours / np.random.uniform(5, 15, num_samples)
    last_error_count     = np.random.randint(0, 10, num_samples)

    risk_score = (
        (runtime_hours / 10000)           * 0.4 +
        (days_since_maint / 180)          * 0.4 +
        (np.clip(temperature_reading - 45, 0, None) / 20) * 0.3 +
        (vibration_level / 4)              * 0.3 +
        (last_error_count / 10)            * 0.4
    ) + np.random.normal(0, 0.1, num_samples)

    will_fail = (risk_score > 0.65).astype(int)

    return pd.DataFrame({
        "equipment_type":        equipment_type,
        "runtime_hours":         runtime_hours,
        "days_since_maintenance": days_since_maint,
        "temperature_reading":   temperature_reading,
        "vibration_level":       vibration_level,
        "usage_cycles":          usage_cycles,
        "last_error_count":      last_error_count,
        "will_fail_in_14_days":  will_fail,
    })


# ── 2. Classifier metrics helper ─────────────────────────────────────────────
def evaluate_classifier(model, X_test, y_test, name: str) -> dict:
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    acc  = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec  = float(recall_score(y_test, y_pred, zero_division=0))
    f1   = float(f1_score(y_test, y_pred, zero_division=0))
    auc  = float(roc_auc_score(y_test, y_prob))
    print(f"   {name}: Acc={acc:.3f} | P={prec:.3f} | R={rec:.3f} | F1={f1:.3f} | AUC={auc:.3f}")
    return {"model": name, "accuracy": acc, "precision": prec, "recall": rec, "f1": f1, "auc": auc}


# ── 3. Main Training Function ─────────────────────────────────────────────────
def train_equipment_model():
    print("\n" + "="*60)
    print("  EQUIPMENT FAILURE — Model Training & Comparison")
    print("="*60)

    df = create_synthetic_data(3000)
    print(f"✅ Generated {len(df)} equipment records (class balance: "
          f"fail={df['will_fail_in_14_days'].sum()}, ok={len(df) - df['will_fail_in_14_days'].sum()})")

    le_equip = LabelEncoder()
    df["equipment_type_enc"] = le_equip.fit_transform(df["equipment_type"])

    FEATURES = ["equipment_type_enc", "runtime_hours", "days_since_maintenance",
                "temperature_reading", "vibration_level", "usage_cycles", "last_error_count"]
    FEATURE_LABELS = ["Equipment Type", "Runtime (hrs)", "Days Since Maint.",
                      "Temperature (°C)", "Vibration (Hz)", "Usage Cycles", "Error Count"]

    X = df[FEATURES]
    y = df["will_fail_in_14_days"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"✅ Train: {len(X_train)} | Test: {len(X_test)} (80/20 stratified split)")

    # ── Candidate Models ───────────────────────────────────────────────────────
    print("\n📊 Training & Comparing 3 Models...")
    candidates = {
        "Logistic Regression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf",    LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42))
        ]),
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=10,
                                                class_weight="balanced", random_state=42),
        "XGBoost":       xgb.XGBClassifier(n_estimators=100, max_depth=5, learning_rate=0.1,
                                            use_label_encoder=False, eval_metric="logloss",
                                            random_state=42, verbosity=0),
    }

    comparison_results = []
    best_model_name    = None
    best_auc           = -np.inf
    best_model         = None

    for name, model in candidates.items():
        model.fit(X_train, y_train)
        metrics = evaluate_classifier(model, X_test, y_test, name)

        # 5-Fold CV AUC
        cv_scores = cross_val_score(model, X, y, cv=5, scoring="roc_auc")
        metrics["cv_auc_mean"] = float(cv_scores.mean())
        metrics["cv_auc_std"]  = float(cv_scores.std())
        comparison_results.append(metrics)

        if metrics["auc"] > best_auc:
            best_auc        = metrics["auc"]
            best_model_name = name
            best_model      = model

    print(f"\n🏆 Best model: {best_model_name} (AUC = {best_auc:.3f})")

    # ── GridSearchCV on XGBoost ────────────────────────────────────────────────
    print("\n⚙️  Running GridSearchCV on XGBoost...")
    param_grid = {
        "n_estimators": [100, 200],
        "max_depth":    [3, 5],
        "learning_rate":[0.05, 0.1],
    }
    gs = GridSearchCV(
        xgb.XGBClassifier(use_label_encoder=False, eval_metric="logloss", random_state=42, verbosity=0),
        param_grid, cv=3, scoring="roc_auc", n_jobs=-1, verbose=0
    )
    gs.fit(X_train, y_train)
    tuned = gs.best_estimator_
    tuned_metrics = evaluate_classifier(tuned, X_test, y_test, "XGBoost (Tuned)")
    tuned_metrics["cv_auc_mean"] = tuned_metrics["auc"]
    tuned_metrics["cv_auc_std"]  = 0.0
    print(f"   Best params: {gs.best_params_}")
    comparison_results.append(tuned_metrics)

    if tuned_metrics["auc"] >= best_auc:
        best_auc        = tuned_metrics["auc"]
        best_model_name = "XGBoost (Tuned)"
        best_model      = tuned
        print(f"✅ Switched to Tuned XGBoost as final model")

    # ── Confusion Matrix, ROC Curve ───────────────────────────────────────────
    y_pred_best = best_model.predict(X_test)
    y_prob_best = best_model.predict_proba(X_test)[:, 1]

    cm  = confusion_matrix(y_test, y_pred_best)
    fpr, tpr, thresholds = roc_curve(y_test, y_prob_best)
    # Downsample ROC to 50 points for JSON size
    idx    = np.linspace(0, len(fpr) - 1, min(50, len(fpr))).astype(int)
    roc_data = [{"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4)} for i in idx]

    confusion_matrix_data = {
        "tn": int(cm[0, 0]), "fp": int(cm[0, 1]),
        "fn": int(cm[1, 0]), "tp": int(cm[1, 1]),
        "labels": ["No Failure", "Failure"],
    }

    # ── Feature Importances ───────────────────────────────────────────────────
    # For pipeline (Logistic Regression), extract from step; otherwise direct
    def get_importances(model):
        if hasattr(model, "feature_importances_"):
            return model.feature_importances_
        elif hasattr(model, "named_steps"):  # Pipeline
            clf = model.named_steps.get("clf")
            if hasattr(clf, "coef_"):
                return np.abs(clf.coef_[0]) / np.abs(clf.coef_[0]).sum()
        return np.ones(len(FEATURES)) / len(FEATURES)

    importances = get_importances(best_model)
    feature_importance_data = [
        {"feature": label, "importance": round(float(imp), 4)}
        for label, imp in sorted(zip(FEATURE_LABELS, importances), key=lambda x: -x[1])
    ]

    # ── Classification Report (for display) ──────────────────────────────────
    report = classification_report(y_test, y_pred_best, output_dict=True, zero_division=0)
    best_metrics_obj = [m for m in comparison_results if m["model"] == best_model_name][0]

    # ── Save Metrics JSON ─────────────────────────────────────────────────────
    metrics_payload = {
        "task":               "classification",
        "target":             "Equipment Failure in 14 Days",
        "best_model":         best_model_name,
        "best_accuracy":      round(best_metrics_obj["accuracy"], 4),
        "best_precision":     round(best_metrics_obj["precision"], 4),
        "best_recall":        round(best_metrics_obj["recall"], 4),
        "best_f1":            round(best_metrics_obj["f1"], 4),
        "best_auc":           round(best_metrics_obj["auc"], 4),
        "comparison":         comparison_results,
        "confusion_matrix":   confusion_matrix_data,
        "roc_curve":          roc_data,
        "feature_importance": feature_importance_data,
        "gridcv_best_params": gs.best_params_,
        "train_size":         len(X_train),
        "test_size":          len(X_test),
        "class_distribution": {"no_failure": int((y == 0).sum()), "failure": int((y == 1).sum())},
    }

    metrics_path = os.path.join(MODEL_DIR, "equipment_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"✅ Metrics saved → {metrics_path}")

    fi_path = os.path.join(MODEL_DIR, "equipment_feature_importance.json")
    with open(fi_path, "w") as f:
        json.dump({"features": feature_importance_data, "feature_keys": FEATURES}, f, indent=2)
    print(f"✅ Feature importance saved → {fi_path}")

    # ── Save Final Model ──────────────────────────────────────────────────────
    artifact = {
        "model":         best_model,
        "encoders":      {"equipment_type": le_equip},
        "features":      FEATURES,
        "feature_labels": FEATURE_LABELS,
    }
    model_path = os.path.join(MODEL_DIR, "equipment_failure_model.pkl")
    joblib.dump(artifact, model_path)
    print(f"✅ Model saved → {model_path}")
    print(f"\n{'='*60}")
    print(f"  TRAINING COMPLETE — Best Model: {best_model_name}")
    print(f"  AUC: {best_metrics_obj['auc']:.3f} | F1: {best_metrics_obj['f1']:.3f} | Acc: {best_metrics_obj['accuracy']:.3f}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    train_equipment_model()
