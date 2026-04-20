import joblib
import pandas as pd
import numpy as np

# Load model and expected features
model_path = 'd:/Minor Project goated/hospital-management-system/backend/models/nasa_rul_rf_model.pkl'
features_path = 'd:/Minor Project goated/hospital-management-system/backend/models/nasa_rul_features.pkl'

rf_model = joblib.load(model_path)
expected_features = joblib.load(features_path)

columns = ["id", "cycle", "op_set_1", "op_set_2", "op_set_3"] + [f"sensor_{i}" for i in range(1, 22)]
test_file = 'd:/Minor Project goated/hospital-management-system/backend/data/equipment/test_FD001.txt'

# Original Parsing logic (from training script)
test_df = pd.read_csv(test_file, sep=" ", header=None, names=columns, engine='python')
test_df.dropna(axis=1, inplace=True)

last_cycles = test_df.groupby('id').tail(1).copy()

# The expected features might have different columns now because of the chaotic `sep=" "` parsing
try:
    X_test = last_cycles[expected_features]
    print( "Successfully extracted expected_features")
except Exception as e:
    print(f"Failed extracting features: {e}")

y_pred = rf_model.predict(X_test)
print(f"Predictions sample (First 10): {y_pred[:10]}")

truth_file = 'd:/Minor Project goated/hospital-management-system/backend/data/equipment/RUL_FD001.txt'
y_true = pd.read_csv(truth_file, sep="\s+", header=None, names=['RUL'], engine='python')['RUL'].values
print(f"Ground Truth sample (First 10): {y_true[:10]}")

from sklearn.metrics import mean_squared_error, r2_score
rmse = np.sqrt(mean_squared_error(y_true, y_pred))
r2 = r2_score(y_true, y_pred)
print(f"RMSE: {rmse:.2f}, R2: {r2:.3f}")
