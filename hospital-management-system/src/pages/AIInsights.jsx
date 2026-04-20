import React, { useState, useRef } from 'react'
import { Brain, Activity, Package, Users, Loader, AlertCircle, ChevronDown, ChevronRight, Download, Save, CheckCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar, Cell } from 'recharts'

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/predict` : 'http://127.0.0.1:8000/api/predict';

// ── Helpers ────────────────────────────────────────────────────────────────────
const RISK_COLORS = {
  Low:      { bg: '#dcfce7', text: '#16a34a', border: '#86efac', emoji: '🟢' },
  Medium:   { bg: '#fef3c7', text: '#d97706', border: '#fcd34d', emoji: '🟡' },
  High:     { bg: '#fee2e2', text: '#ef4444', border: '#fca5a5', emoji: '🔴' },
  Critical: { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4', emoji: '🚨' },
}

function getRiskStyle(level = 'Low') {
  return RISK_COLORS[level] || RISK_COLORS.Low
}

// ── XAI Explanation Panel ─────────────────────────────────────────────────────
function ExplanationPanel({ explanation }) {
  const [open, setOpen] = useState(false)
  if (!explanation || explanation.error) return null

  const maxContrib = Math.max(...(explanation.contributions || []).map(c => c.contribution_pct))
  const topColors  = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899']

  return (
    <div style={{ marginTop: 14, border: '1px solid #e0e7ff', borderRadius: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '10px 14px', background: '#f5f3ff',
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          border: 'none', outline: 'none', textAlign: 'left', color: '#4f46e5', fontWeight: 700, fontSize: 13
        }}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        🔍 Why this prediction?
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8b5cf6', fontWeight: 400 }}>Feature Importance XAI</span>
      </button>
      {open && (
        <div style={{ padding: '14px 16px', background: 'white' }}>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px', lineHeight: 1.6 }}>
            {explanation.summary}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {(explanation.contributions || []).map((c, i) => (
              <div key={c.feature}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{c.feature}</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{c.contribution_pct}%</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${(c.contribution_pct / maxContrib) * 100}%`,
                    background: topColors[i % topColors.length], borderRadius: 4,
                    transition: 'width 0.8s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0' }}>
            Method: {explanation.method}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Risk Badge ─────────────────────────────────────────────────────────────────
const RiskBadge = ({ level }) => {
  const s = getRiskStyle(level)
  return (
    <span style={{
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4
    }}>
      {s.emoji} {level} Risk
    </span>
  )
}

// ── Save Prediction Button ─────────────────────────────────────────────────────
function SaveButton({ predictionType, inputData, outputData, riskLevel }) {
  const [state, setState] = useState('idle') // idle | saving | done | error

  const handleSave = async () => {
    setState('saving')
    try {
      await fetch(`${API}/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prediction_type: predictionType, input_data: inputData, output_data: outputData, risk_level: riskLevel })
      })
      setState('done')
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const label   = { idle: 'Save Prediction', saving: 'Saving…', done: '✅ Saved!', error: '❌ Failed' }
  const btnBg   = { idle: '#f8fafc', saving: '#f8fafc', done: '#dcfce7', error: '#fef2f2' }
  const btnColor = { idle: '#475569', saving: '#94a3b8', done: '#16a34a', error: '#dc2626' }

  return (
    <button
      onClick={handleSave}
      disabled={state === 'saving'}
      style={{
        marginTop: 8, width: '100%', padding: '8px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 6, background: btnBg[state], border: '1px solid #e2e8f0',
        borderRadius: 8, cursor: state === 'saving' ? 'not-allowed' : 'pointer',
        fontSize: 12, fontWeight: 600, color: btnColor[state], transition: 'all 0.2s'
      }}
    >
      <Save size={13} /> {label[state]}
    </button>
  )
}

// ── Shared Card ────────────────────────────────────────────────────────────────
const inputGrid  = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }

const Card = ({ title, icon, color, loading, onPredict, children }) => (
  <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
    <div style={{ background: color, color: 'white', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
      {icon} {title}
    </div>
    <div style={{ padding: 20 }}>
      {children}
      <button onClick={onPredict} disabled={loading} style={{
        marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: 12, background: loading ? '#e2e8f0' : '#1e293b', color: loading ? '#94a3b8' : 'white',
        border: 'none', borderRadius: 8, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15,
        transition: 'background 0.2s'
      }}>
        {loading ? <><Loader size={18} className="spin" /> Processing AI Model…</> : <><Brain size={18} /> Predict</>}
      </button>
    </div>
  </div>
)

const Input = ({ label, ...props }) => (
  <div>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{label}</label>
    <input {...props} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
  </div>
)

const Select = ({ label, options, ...props }) => (
  <div>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{label}</label>
    <select {...props} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none', textTransform: 'capitalize' }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
)

const ResultBox = ({ children }) => (
  <div style={{ marginTop: 14, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
    {children}
  </div>
)

const ErrorMsg = ({ msg }) => (
  <div style={{ marginTop: 14, padding: 12, background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
    <AlertCircle size={16} /> {msg}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// 1. Length of Stay Card
// ─────────────────────────────────────────────────────────────────────────────
function LengthOfStayCard() {
  const [loading, setLoading] = useState(false)
  const [result,  setResult ] = useState(null)
  const [error,   setError  ] = useState('')
  const [age,           setAge          ] = useState(65)
  const [admissionType, setAdmissionType] = useState('emergency')
  const [severity,      setSeverity     ] = useState(4)
  const [diagnoses,     setDiagnoses    ] = useState(3)
  const [procedures,    setProcedures   ] = useState(1)

  const inputData = { age: +age, admission_type: admissionType, condition_severity: +severity, num_diagnoses: +diagnoses, num_procedures: +procedures }

  const handlePredict = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`${API}/patient-stay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inputData) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Server error')
      setResult(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const riskStyle = result ? getRiskStyle(result.risk_level) : null

  return (
    <Card title="Patient Length of Stay" icon={<Activity size={20} />} color="#3b82f6" loading={loading} onPredict={handlePredict}>
      <div style={inputGrid}>
        <Input label="Age" type="number" value={age} onChange={e => setAge(e.target.value)} />
        <Select label="Admission" value={admissionType} onChange={e => setAdmissionType(e.target.value)} options={['emergency', 'urgent', 'elective']} />
        <Input label="Severity (1–5)" type="number" min="1" max="5" value={severity} onChange={e => setSeverity(e.target.value)} />
        <Input label="Diagnoses" type="number" min="1" value={diagnoses} onChange={e => setDiagnoses(e.target.value)} />
        <Input label="Procedures" type="number" min="0" value={procedures} onChange={e => setProcedures(e.target.value)} />
      </div>
      {error && <ErrorMsg msg={error} />}
      {result && (
        <>
          <ResultBox>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Predicted Stay</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b' }}>{result.predicted_stay_days} <span style={{ fontSize: 15, color: '#64748b', fontWeight: 600 }}>Days</span></div>
              <RiskBadge level={result.risk_level} />
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
              Confidence Range: <strong>{result.confidence_range?.[0]} – {result.confidence_range?.[1]} days</strong>
            </div>
            {/* High-risk alert */}
            {result.risk_level === 'High' && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>
                🚨 High-Risk Patient: Extended stay expected. Consider specialist consult and care plan review.
              </div>
            )}
          </ResultBox>
          <ExplanationPanel explanation={result.explanation} />
          <SaveButton predictionType="los" inputData={inputData} outputData={result} riskLevel={result.risk_level} />
        </>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Equipment Failure Card
// ─────────────────────────────────────────────────────────────────────────────
function EquipmentFailureCard() {
  const [loading,      setLoading     ] = useState(false)
  const [result,       setResult      ] = useState(null)
  const [error,        setError       ] = useState('')
  const [equipmentId,  setEquipmentId ] = useState('MRI-01')
  const [runtimeHours, setRuntimeHours] = useState(8500)
  const [daysSinceMaint, setDaysSinceMaint] = useState(120)
  const [temperature,  setTemperature ] = useState(48.5)
  const [vibration,    setVibration   ] = useState(3.2)

  const inputData = { equipment_id: equipmentId, runtime_hours: +runtimeHours, days_since_maintenance: +daysSinceMaint, temperature_reading: +temperature, vibration_level: +vibration }

  const handlePredict = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`${API}/equipment-failure`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inputData) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Server error')
      setResult(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Card title="Equipment Failure Prediction" icon={<Activity size={20} />} color="#ef4444" loading={loading} onPredict={handlePredict}>
      <div style={{ ...inputGrid, gridTemplateColumns: '1fr 1fr' }}>
        <Input label="Runtime (hrs)"    type="number" value={runtimeHours}  onChange={e => setRuntimeHours(e.target.value)} />
        <Input label="Days Since Maint."type="number" value={daysSinceMaint} onChange={e => setDaysSinceMaint(e.target.value)} />
        <Input label="Temp (°C)"        type="number" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} />
        <Input label="Vibration (Hz)"   type="number" step="0.1" value={vibration}   onChange={e => setVibration(e.target.value)} />
      </div>
      {error && <ErrorMsg msg={error} />}
      {result && (
        <>
          <ResultBox>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Failure Prob (14 Days)</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b' }}>{(result.failure_probability * 100).toFixed(1)}%</div>
              </div>
              <RiskBadge level={result.risk_category} />
            </div>

            {/* Probability bar */}
            <div style={{ marginTop: 10, background: '#f1f5f9', height: 10, borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${result.failure_probability * 100}%`, background: getRiskStyle(result.risk_category).text, transition: 'width 1s ease' }} />
            </div>

            <div style={{ fontSize: 12, color: '#475569', marginTop: 10, background: 'white', padding: 10, borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div><strong>Est. Days Left:</strong> {result.days_to_predicted_failure}</div>
              <div><strong>Action:</strong> <span style={{ color: '#0f172a', fontWeight: 700 }}>{result.recommended_action}</span></div>
            </div>

            {(result.risk_category === 'Critical' || result.risk_category === 'High') && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>
                ⚠️ Equipment at high failure risk — immediate maintenance recommended!
              </div>
            )}
          </ResultBox>
          <ExplanationPanel explanation={result.explanation} />
          <SaveButton predictionType="equipment_failure" inputData={inputData} outputData={result} riskLevel={result.risk_category} />
        </>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Medicine Demand Card
// ─────────────────────────────────────────────────────────────────────────────
function MedicineForecastingCard() {
  const [loading,       setLoading      ] = useState(false)
  const [result,        setResult       ] = useState(null)
  const [error,         setError        ] = useState('')
  const [medicineName,  setMedicineName ] = useState('Paracetamol 500mg')
  const [forecastDays,  setForecastDays ] = useState(30)

  const meds = ['Paracetamol 500mg', 'Amoxicillin 250mg', 'Ibuprofen 400mg', 'Omeprazole 20mg',
                'Metformin 500mg', 'Atorvastatin 20mg', 'Aspirin 75mg', 'Lisinopril 10mg',
                'Amlodipine 5mg', 'Levothyroxine 50mcg']

  const handlePredict = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`${API}/medicine-demand`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ medicine_name: medicineName, forecast_days: +forecastDays }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Server error')
      setResult(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Card title="Medicine Demand Forecast" icon={<Package size={20} />} color="#10b981" loading={loading} onPredict={handlePredict}>
      <div style={{ ...inputGrid, gridTemplateColumns: '2fr 1fr' }}>
        <Select label="Medicine" value={medicineName} onChange={e => setMedicineName(e.target.value)} options={meds} />
        <Input label="Days to Forecast" type="number" min="7" max="90" value={forecastDays} onChange={e => setForecastDays(e.target.value)} />
      </div>
      {error && <ErrorMsg msg={error} />}
      {result && (
        <ResultBox>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Suggested Reorder</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>{result.reorder_recommendation} units</div>
            </div>
            <span style={{ background: result.stockout_risk === 'High' ? '#fee2e2' : '#dcfce7', color: result.stockout_risk === 'High' ? '#ef4444' : '#16a34a', border: `1px solid`, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              {result.stockout_risk === 'High' ? '🔴' : '🟢'} {result.stockout_risk} Stockout Risk
            </span>
          </div>
          <div style={{ height: 140, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.forecast} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tickFormatter={v => v.substring(5)} fontSize={10} minTickGap={20} />
                <YAxis fontSize={10} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="predicted_demand" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDemand)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ResultBox>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Patient Arrivals Card
// ─────────────────────────────────────────────────────────────────────────────
function PatientArrivalsCard() {
  const [loading,      setLoading    ] = useState(false)
  const [result,       setResult     ] = useState(null)
  const [error,        setError      ] = useState('')
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const [forecastDate, setForecastDate] = useState(tomorrow.toISOString().split('T')[0])
  const [badWeather,   setBadWeather  ] = useState(false)

  const handlePredict = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`${API}/patient-arrivals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ forecast_date: forecastDate, include_weather_factor: badWeather }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Server error')
      setResult(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Card title="Patient Arrival Forecast" icon={<Users size={20} />} color="#f59e0b" loading={loading} onPredict={handlePredict}>
      <div style={{ ...inputGrid, gridTemplateColumns: '1fr 1fr' }}>
        <Input label="Forecast Date" type="date" value={forecastDate} onChange={e => setForecastDate(e.target.value)} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 18 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
            <input type="checkbox" checked={badWeather} onChange={e => setBadWeather(e.target.checked)} style={{ width: 16, height: 16 }} />
            Severe Weather Warning
          </label>
        </div>
      </div>
      {error && <ErrorMsg msg={error} />}
      {result && (
        <ResultBox>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Est. Arrivals</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b' }}>
                {result.predicted_arrivals} <span style={{ fontSize: 15, color: '#64748b' }}>Patients</span>
              </div>
            </div>
            {result.predicted_arrivals > 220 && (
              <span style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                🔴 High Surge
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div><strong>Confidence Range:</strong> {result.confidence_interval?.[0]} – {result.confidence_interval?.[1]}</div>
            <div><strong>Peak Hours:</strong> {result.peak_hour_estimate}</div>
            <div><strong>Staffing:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{result.staffing_recommendation}</span></div>
          </div>
        </ResultBox>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function AIInsights() {
  const pageRef = useRef(null)

  const handleDownload = () => {
    const style = document.createElement('style')
    style.textContent = '@media print { button { display: none !important; } }'
    document.head.appendChild(style)
    window.print()
    document.head.removeChild(style)
  }

  return (
    <div ref={pageRef} style={{ maxWidth: 1100, margin: '0 auto' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; } @media print { button { display: none !important; } }`}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
        borderRadius: 16, padding: '24px 28px', color: 'white', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Brain size={26} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>AI Brain Insights</h2>
            <p style={{ margin: '4px 0 0', color: '#c7d2fe', fontSize: 13 }}>
              Predictive analytics with Explainable AI — Length of Stay · Equipment Failure · Inventory · Arrivals
            </p>
          </div>
        </div>
        <button onClick={handleDownload} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 8, cursor: 'pointer', color: 'white', fontWeight: 700, fontSize: 13
        }}>
          <Download size={15} /> Download Report (PDF)
        </button>
      </div>

      {/* XAI info strip */}
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 12, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 8 }}>
        🔍 <strong>Explainable AI enabled</strong> — Each prediction includes a "Why this prediction?" panel showing feature contributions. Click the panel to expand.
      </div>

      {/* Grid of 4 Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24 }}>
        <LengthOfStayCard />
        <EquipmentFailureCard />
        <MedicineForecastingCard />
        <PatientArrivalsCard />
      </div>
    </div>
  )
}
