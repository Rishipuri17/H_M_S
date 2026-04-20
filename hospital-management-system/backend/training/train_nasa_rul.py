import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os

# Define paths
DATA_DIR = os.path.join(os.path.dirname(__file__), "../data/equipment")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "../models")

def load_data(file_path):
    """Loads and returns NASA Turbofan dataset from txt file."""
    # The NASA dataset has 26 columns without headers
    columns = ["id", "cycle", "op_set_1", "op_set_2", "op_set_3"] + \
              [f"sensor_{i}" for i in range(1, 22)]
    
    if not os.path.exists(file_path):
        print(f"Error: Could not find {file_path}")
        print("Please ensure you placed the NASA dataset files in backend/data/equipment/")
        return None

    df = pd.read_csv(file_path, sep="\s+", header=None, names=columns, engine='python')
    # The dataset has trailing spaces that create NaNs in the last two cols, so we drop them
    df.dropna(axis=1, inplace=True) 
    return df

def add_rul(df):
    """Calculates the Remaining Useful Life (RUL) for each engine cycle."""
    # Find the max cycle (time of failure) for each engine ID
    max_cycles = df.groupby('id')['cycle'].max().reset_index()
    max_cycles.rename(columns={'cycle': 'max_cycle'}, inplace=True)
    
    # Merge max cycles back into original df
    df = df.merge(max_cycles, on=['id'], how='left')
    
    # RUL is the difference between failure cycle and current cycle
    df['RUL'] = df['max_cycle'] - df['cycle']
    
    df.drop('max_cycle', axis=1, inplace=True)
    return df

def train_rul_model():
    print("Loading training data...")
    train_file = os.path.join(DATA_DIR, "train_FD001.txt")
    
    train_df = load_data(train_file)
    if train_df is None:
        return
        
    print(f"Loaded {len(train_df)} rows of sensor data.")
    
    print("Calculating Remaining Useful Life (RUL) labels...")
    train_df = add_rul(train_df)
    
    # We will use the sensor readings as features (dropping ID, cycle, and target RUL)
    # Some sensors (like 1, 5, 10, 16, 18, 19) in FD001 do not vary and don't provide information,
    # but for simplicity, we'll let the Random Forest handle feature importance.
    features = [col for col in train_df.columns if col not in ['id', 'cycle', 'RUL']]
    
    X_train = train_df[features]
    y_train = train_df['RUL']
    
    print("Training Random Forest Regressor (this may take a minute)...")
    # Training the model
    model = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    
    # Quick evaluation on training data
    predictions = model.predict(X_train)
    rmse = np.sqrt(mean_squared_error(y_train, predictions))
    r2 = r2_score(y_train, predictions)
    
    print(f"\nModel Training Complete!")
    print(f"Training RMSE: {rmse:.2f} cycles")
    print(f"Training R² Score: {r2:.3f}")
    
    # Save the trained model to disk so FastAPI can load it
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, "nasa_rul_rf_model.pkl")
    
    joblib.dump(model, model_path)
    print(f"\nModel successfully saved to: {model_path}")
    
    # Also save the list of expected features so the FastAPI backend knows what to input
    features_path = os.path.join(MODEL_DIR, "nasa_rul_features.pkl")
    joblib.dump(features, features_path)

if __name__ == "__main__":
    train_rul_model()
