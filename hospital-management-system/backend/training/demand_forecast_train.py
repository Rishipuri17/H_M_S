import os
import joblib
import pandas as pd
import numpy as np
from prophet import Prophet

def create_synthetic_demand_data(medicine_name, num_days=730):
    np.random.seed(hash(medicine_name) % (2**32 - 1))
    
    dates = pd.date_range(end=pd.Timestamp.today(), periods=num_days, freq='D')
    
    # Base load
    base_demand = np.random.randint(50, 300)
    
    # Seasonality
    days = np.arange(num_days)
    yearly_seasonality = np.sin(2 * np.pi * days / 365) * (base_demand * 0.3)
    
    # Weekly pattern: more demand on weekdays (Mon-Fri)
    day_of_week = dates.dayofweek
    weekly_pattern = np.where(day_of_week < 5, base_demand * 0.2, -base_demand * 0.1)
    
    # Holiday spikes
    # Just rough proxy: winter holidays might see spike in certain meds
    is_winter = (dates.month == 12) | (dates.month == 1) | (dates.month == 2)
    winter_spike = np.where(is_winter, base_demand * 0.15, 0)
    
    noise = np.random.normal(0, base_demand * 0.1, num_days)
    
    demand = base_demand + yearly_seasonality + weekly_pattern + winter_spike + noise
    demand = np.clip(np.round(demand), 0, None).astype(int)
    
    df = pd.DataFrame({
        'ds': dates,
        'y': demand
    })
    return df

def train_demand_models():
    medicines = [
        "Paracetamol 500mg",
        "Amoxicillin 250mg",
        "Ibuprofen 400mg",
        "Omeprazole 20mg",
        "Metformin 500mg",
        "Atorvastatin 20mg",
        "Aspirin 75mg",
        "Lisinopril 10mg",
        "Amlodipine 5mg",
        "Levothyroxine 50mcg"
    ]
    
    model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models', 'demand_models')
    os.makedirs(model_dir, exist_ok=True)
    
    print(f"Generating synthetic dataset and training Prophet models for {len(medicines)} medicines...")
    
    for med in medicines:
        df = create_synthetic_demand_data(med, 730)
        
        # Prophet model
        m = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
        m.fit(df)
        
        # Save model
        safe_name = "".join([c if c.isalnum() else "_" for c in med])
        save_path = os.path.join(model_dir, f"{safe_name}.pkl")
        joblib.dump(m, save_path)
        print(f"Trained & Saved: {save_path}")

if __name__ == "__main__":
    train_demand_models()
