import React, { useState, useEffect } from 'react';
import PredictionForm from '../components/PredictionForm';
import { ForecastLineChart, HistoricalBarChart, DiseasePieChart } from '../components/PredictionCharts';

const PatientPrediction = () => {
  const [formData, setFormData] = useState({
    age: 45,
    gender: 'male',
    disease: 'Cardiac',
    admission_type: 'Emergency',
    history: true,
    bp: 130,
    sugar: 150
  });

  const [loading, setLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [error, setError] = useState(null);

  const [predictionResults, setPredictionResults] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [historicalData, setHistoricalData] = useState([
    { name: 'Last Week', historical: 820, predicted: 850 }
  ]);

  // Load forecast on mount
  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    try {
      setForecastLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${API_URL}/api/predict/patient/forecast?days=7`);
      if (!res.ok) throw new Error('Failed to fetch forecast');
      const data = await res.json();
      
      const chartData = data.dates.map((d, i) => ({
        date: d,
        patients: data.predictions[i]
      }));
      setForecastData(chartData);
      
      // Update historical mock vs predicted total for the week
      const totalPredicted = data.predictions.reduce((a, b) => a + b, 0);
      setHistoricalData([
        { name: 'This Week', historical: 820, predicted: totalPredicted }
      ]);
    } catch (err) {
      console.error(err);
      // Fallback for development if backend isn't running yet
      setForecastData([
        { date: '2026-03-25', patients: 120 },
        { date: '2026-03-26', patients: 135 },
        { date: '2026-03-27', patients: 142 },
        { date: '2026-03-28', patients: 110 },
        { date: '2026-03-29', patients: 95 },
        { date: '2026-03-30', patients: 150 },
        { date: '2026-03-31', patients: 160 },
      ]);
    } finally {
      setForecastLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPredictionResults(null);

    try {
      const [losRes, readmissionRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/predict/patient/los`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }),
        fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/predict/patient/readmission`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
      ]);

      if (!losRes.ok) throw new Error('LoS Prediction failed');
      if (!readmissionRes.ok) throw new Error('Readmission Prediction failed');

      const [losData, readmissionData] = await Promise.all([
        losRes.json(),
        readmissionRes.json()
      ]);

      setPredictionResults({
        los: losData.predicted_los,
        readmissionProb: readmissionData.probability
      });

    } catch (err) {
      setError(err.message || 'An error occurred during prediction.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (prob) => {
    if (prob < 20) return { level: 'Low Risk', color: '#10b981' };
    if (prob < 50) return { level: 'Medium Risk', color: '#f59e0b' };
    return { level: 'High Risk', color: '#ef4444' };
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Patient Predictions & Forecasts</h1>
          <p style={{ color: '#64748b', margin: '8px 0 0 0', fontSize: '15px' }}>
            AI-powered insights for length of stay, readmission risks, and hospital capacity planning.
          </p>
        </div>
        <button 
          onClick={fetchForecast}
          style={{ 
            background: 'white', border: '1px solid #cbd5e1', padding: '8px 16px', 
            borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            color: '#334155', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          🔄 Refresh Forecast
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', marginBottom: '24px', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Top Grid: Form & Results */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        
        {/* Input Form Card */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid #f1f5f9' }}>
          <PredictionForm 
            formData={formData} 
            handleInputChange={handleInputChange} 
            handleSubmit={handleSubmit} 
            loading={loading} 
          />
        </div>

        {/* Prediction Results Card */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Prediction Results</h3>
          
          {predictionResults ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'center' }}>
              
              {/* LoS Result */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#1d4ed8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Predicted Length of Stay
                </div>
                <div style={{ fontSize: '36px', fontWeight: 800, color: '#1e3a8a' }}>
                  {predictionResults.los} <span style={{ fontSize: '18px', fontWeight: 500, color: '#3b82f6' }}>Days</span>
                </div>
              </div>

              {/* Readmission Risk Result */}
              {(() => {
                const risk = getRiskLevel(predictionResults.readmissionProb);
                return (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>Readmission Risk</span>
                      <span style={{ 
                        background: `${risk.color}20`, color: risk.color, 
                        padding: '4px 10px', borderRadius: '999px', fontSize: '13px', fontWeight: 700 
                      }}>
                        {risk.level}
                      </span>
                    </div>
                    
                    <div style={{ width: '100%', background: '#f1f5f9', height: '12px', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', width: `${predictionResults.readmissionProb}%`, 
                        background: risk.color, transition: 'width 1s ease-in-out' 
                      }} />
                    </div>
                    <div style={{ textAlign: 'right', marginTop: '8px', fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                      {predictionResults.readmissionProb}% Probability
                    </div>
                  </div>
                );
              })()}

            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '10px' }}>
              Fill the form and click "Run Predictions" to view results.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Charts */}
      <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Hospital Analytics & Forecasts</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        
        {/* Forecast Chart */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
          {forecastLoading ? (
             <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading forecast...</div>
          ) : (
             <ForecastLineChart data={forecastData} />
          )}
        </div>

        {/* Historical/Predicted Bar Chart */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
          <HistoricalBarChart data={historicalData} />
        </div>

        {/* System Risk Distribution Pie Chart */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
          <DiseasePieChart />
        </div>

      </div>
    </div>
  );
};

export default PatientPrediction;
