import os
import joblib
import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.tsa.statespace.sarimax import SARIMAX

def create_synthetic_arrival_data(num_days=730):
    np.random.seed(42)
    
    dates = pd.date_range(end=pd.Timestamp.today(), periods=num_days, freq='D')
    
    base_arrivals = 200
    
    # Seasonality
    days = np.arange(num_days)
    yearly_seasonality = np.sin(2 * np.pi * days / 365) * 40 # Flu season peak proxy
    
    # Weekly pattern: more arrivals on Mon/Tue (0,1), dip on weekends (5,6)
    day_of_week = dates.dayofweek
    weekly_pattern = np.zeros(num_days)
    weekly_pattern[day_of_week == 0] = 30
    weekly_pattern[day_of_week == 1] = 20
    weekly_pattern[day_of_week == 5] = -40
    weekly_pattern[day_of_week == 6] = -50
    
    noise = np.random.normal(0, 15, num_days)
    
    arrivals = base_arrivals + yearly_seasonality + weekly_pattern + noise
    arrivals = np.clip(np.round(arrivals), 50, None).astype(int)
    
    df = pd.DataFrame({
        'ds': dates,
        'y': arrivals
    })
    df.set_index('ds', inplace=True)
    return df

def train_arrival_model():
    print("Generating synthetic dataset for Patient Arrivals...")
    df = create_synthetic_arrival_data(730)
    
    print("Training SARIMAX model...")
    # Using SARIMAX to account for weekly seasonality (m=7)
    model = SARIMAX(df['y'], order=(1, 1, 1), seasonal_order=(1, 1, 1, 7), enforce_stationarity=False, enforce_invertibility=False)
    results = model.fit(disp=False)
    
    # Evaluate loosely based on AIC
    print(f"Model trained. AIC: {results.aic:.2f}")
    
    # Save model wrapper
    model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
    os.makedirs(model_dir, exist_ok=True)
    
    save_path = os.path.join(model_dir, 'arrival_model.pkl')
    
    # We save the model parameters rather than the whole statsmodels object 
    # to avoid pickling issues, then recreate on inference
    # Or just save the fitted results wrapper
    joblib.dump(results, save_path)
    print(f"Model saved successfully to: {save_path}")

if __name__ == "__main__":
    import warnings
    warnings.filterwarnings('ignore')
    train_arrival_model()
