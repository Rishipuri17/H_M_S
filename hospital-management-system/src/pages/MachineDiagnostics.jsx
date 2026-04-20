import { useState, useRef, useEffect } from 'react'
import { Brain, Zap, Upload, Activity, AlertTriangle, CheckCircle, Loader, ChevronRight, Info, Wifi, WifiOff } from 'lucide-react'

// ─── API base ─────────────────────────────────────────────────────────────────
const API = 'http://127.0.0.1:8000'

// ─── Friendly error helper ────────────────────────────────────────────────────
function friendlyError(e) {
    const msg = e.message || ''
    if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('net::ERR')) {
        return 'OFFLINE'
    }
    return msg
}

// ─── Backend Status Badge ─────────────────────────────────────────────────────
function BackendBadge({ online }) {
    if (online === null) return null
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            background: online ? '#16a34a33' : '#dc262633',
            border: `1px solid ${online ? '#16a34a66' : '#dc262666'}`,
            color: 'white'
        }}>
            {online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {online ? 'Backend Online' : 'Backend Offline'}
        </span>
    )
}

// ─── Offline Error Card ───────────────────────────────────────────────────────
function OfflineError({ onRetry }) {
    const [retrying, setRetrying] = useState(false)
    const handleRetry = () => {
        setRetrying(true)
        setTimeout(() => setRetrying(false), 3000)
        if (onRetry) onRetry()
    }
    return (
        <div style={{
            marginTop: '12px', padding: '16px',
            background: '#fff7ed', border: '1px solid #fed7aa',
            borderRadius: '10px', color: '#9a3412'
        }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <WifiOff size={15} /> Backend Server is Offline
                </span>
                <button onClick={handleRetry} disabled={retrying} style={{
                    background: retrying ? '#e2e8f0' : '#16a34a', color: 'white',
                    border: 'none', borderRadius: '6px', padding: '4px 12px',
                    fontSize: '12px', fontWeight: 600, cursor: retrying ? 'not-allowed' : 'pointer'
                }}>
                    {retrying ? '⏳ Checking…' : '🔄 Retry Connection'}
                </button>
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                The Python/FastAPI server is not running. To start it:
                <ol style={{ margin: '8px 0 0 18px', padding: 0 }}>
                    <li>Open a terminal inside the <code style={{ background: '#fde68a', padding: '1px 5px', borderRadius: '4px' }}>backend/</code> folder</li>
                    <li>Run: <code style={{ background: '#fde68a', padding: '1px 5px', borderRadius: '4px' }}>.\venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8000 --reload</code></li>
                    <li>Wait for <em>"Application startup complete"</em>, then click <strong>Retry</strong> above</li>
                </ol>
            </div>
        </div>
    )
}

// ─── Result Card ─────────────────────────────────────────────────────────────
function ResultCard({ result, onClear, fields }) {
    const anomaly = result?.is_anomaly

    // We don't need Recharts anymore, relying on custom CSS bars.

    return (
        <div style={{
            marginTop: '20px', padding: '20px', borderRadius: '14px',
            border: `2px solid ${anomaly ? '#f87171' : '#4ade80'}`,
            background: anomaly ? 'rgba(239,68,68,0.06)' : 'rgba(74,222,128,0.06)',
            position: 'relative'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                {anomaly ? <AlertTriangle size={28} color="#ef4444" /> : <CheckCircle size={28} color="#22c55e" />}
                <div>
                    <div style={{ fontWeight: 700, fontSize: '17px', color: anomaly ? '#ef4444' : '#16a34a' }}>
                        {anomaly ? 'Anomaly Detected' : 'Normal Operation'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{result?.message}</div>
                </div>
            </div>
            {result?.anomaly_score !== undefined && (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: '8px', padding: '10px 16px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Anomaly Score</div>
                        <div style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{result.anomaly_score}</div>
                    </div>
                    {result.threshold !== undefined && (
                        <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: '8px', padding: '10px 16px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Threshold</div>
                            <div style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{result.threshold}</div>
                        </div>
                    )}
                    {result.prediction_label && (
                        <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: '8px', padding: '10px 16px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Verdict</div>
                            <div style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{result.prediction_label}</div>
                        </div>
                    )}
                </div>
            )}
            {result?.tumor_type && (
                <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.04)', borderRadius: '8px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Detected Type</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{result.tumor_type}</div>
                </div>
            )}

            {/* Custom Safe Zone Visualization */}
            {fields && result?.input && (
                <div style={{ marginTop: '20px', background: 'white', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📊 Sensor Readings vs Safe Zones
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {fields.map(f => {
                            const val = result.input[f.key];
                            const isSafe = val >= f.safeMin && val <= f.safeMax;

                            // Calculate percentages for CSS positioning
                            // We map the absolute min and max of the field to 0% and 100%
                            const range = f.max - f.min;
                            const safeMinPct = Math.max(0, Math.min(100, ((f.safeMin - f.min) / range) * 100));
                            const safeMaxPct = Math.max(0, Math.min(100, ((f.safeMax - f.min) / range) * 100));
                            const safeWidth = safeMaxPct - safeMinPct;

                            const valPct = Math.max(0, Math.min(100, ((val - f.min) / range) * 100));

                            return (
                                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                                        <span>{f.label} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({f.unit})</span></span>
                                        <span style={{ color: isSafe ? '#16a34a' : '#ef4444', fontWeight: 700 }}>
                                            {val} {f.unit} {isSafe ? '✓' : '⚠️'}
                                        </span>
                                    </div>

                                    {/* The Progress Track */}
                                    <div style={{
                                        position: 'relative', width: '100%', height: '14px',
                                        background: '#f1f5f9', borderRadius: '7px', overflow: 'hidden'
                                    }}>
                                        {/* The Safe Zone Background */}
                                        <div style={{
                                            position: 'absolute', left: `${safeMinPct}%`, width: `${safeWidth}%`,
                                            height: '100%', background: '#bbf7d0', borderLeft: '1px solid #86efac', borderRight: '1px solid #86efac',
                                            boxSizing: 'border-box'
                                        }} title={`Safe Zone: ${f.normal}`}></div>

                                        {/* The Value Marker */}
                                        <div style={{
                                            position: 'absolute', left: `${valPct}%`, top: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            width: '10px', height: '18px', borderRadius: '3px',
                                            background: isSafe ? '#16a34a' : '#ef4444', border: '2px solid white',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)', zIndex: 10
                                        }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#cbd5e1' }}>
                                        <span>{f.min}</span>
                                        <span style={{ color: '#94a3b8' }}>Safe: {f.normal}</span>
                                        <span>{f.max}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <button onClick={onClear} style={{
                position: 'absolute', top: '12px', right: '12px',
                background: 'transparent', border: 'none', color: '#94a3b8',
                cursor: 'pointer', fontSize: '18px', lineHeight: 1
            }}>✕</button>
        </div>
    )
}

// ─── Section 1: Medical Image Upload ──────────────────────────────────────────
function ImageAnomalySection({ onRetry }) {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')
    const inputRef = useRef()

    const handleFile = (f) => {
        setFile(f); setResult(null); setError('')
        const reader = new FileReader()
        reader.onload = e => setPreview(e.target.result)
        reader.readAsDataURL(f)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        const f = e.dataTransfer.files[0]
        if (f) handleFile(f)
    }

    const handleSubmit = async () => {
        if (!file) return
        setLoading(true); setError('')
        try {
            const form = new FormData()
            form.append('file', file)
            const res = await fetch(`${API}/api/predict/maintenance`, { method: 'POST', body: form })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setResult(data)
        } catch (e) {
            setError(friendlyError(e))
        } finally { setLoading(false) }
    }

    return (
        <div style={cardStyle}>
            <div style={cardHeaderStyle('#6366f1')}>
                <Brain size={22} />
                <div>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>Medical Image Anomaly Scanner</div>
                    <div style={{ fontSize: '12px', opacity: 0.85 }}>Upload MRI or X-Ray scan → Detect tumors / lesions using CNN Autoencoder</div>
                </div>
            </div>

            {/* ── Input Guide ── */}
            <div style={{
                margin: '20px 20px 0', padding: '16px 18px',
                background: '#f0f9ff', borderRadius: '12px',
                border: '1.5px solid #bae6fd'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '13px', color: '#0369a1', marginBottom: '12px' }}>
                    <Info size={15} /> What image should I upload?
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* MRI box */}
                    <div style={{
                        background: 'white', borderRadius: '10px', padding: '14px',
                        border: '1.5px solid #c7d2fe'
                    }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#4f46e5', marginBottom: '8px' }}>
                            🧠 MRI Brain Scan
                        </div>
                        <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '12px', color: '#475569', lineHeight: 1.8 }}>
                            <li>Grayscale or coloured MRI slices</li>
                            <li>Accepted formats: <strong>PNG, JPG, JPEG</strong></li>
                            <li>Ideal size: any resolution (resized internally)</li>
                            <li>Examples: BraTS2020-style brain MRI images</li>
                            <li>Model flags tumors / lesions as anomaly</li>
                        </ul>
                    </div>
                    {/* X-Ray box */}
                    <div style={{
                        background: 'white', borderRadius: '10px', padding: '14px',
                        border: '1.5px solid #fcd34d'
                    }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#b45309', marginBottom: '8px' }}>
                            🩻 X-Ray Chest Scan
                        </div>
                        <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '12px', color: '#475569', lineHeight: 1.8 }}>
                            <li>Frontal chest X-ray images</li>
                            <li>Accepted formats: <strong>PNG, JPG, JPEG</strong></li>
                            <li>Ideal size: any resolution (resized internally)</li>
                            <li>Examples: NIH ChestX-ray14 dataset images</li>
                            <li>Model flags pneumonia / infiltrates as anomaly</li>
                        </ul>
                    </div>
                </div>
                <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                    ⚠️ Do <strong>not</strong> upload personal patient photos — only medical scan images are supported.
                </div>
            </div>

            <div style={{ padding: '16px 20px 20px' }}>
                {/* Drop zone */}
                <div
                    onClick={() => inputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    style={{
                        border: '2px dashed #c7d2fe', borderRadius: '12px',
                        padding: '32px', textAlign: 'center', cursor: 'pointer',
                        background: '#f8f7ff', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#c7d2fe'}
                >
                    {preview ? (
                        <img src={preview} alt="preview" style={{ maxHeight: '180px', borderRadius: '8px', maxWidth: '100%' }} />
                    ) : (
                        <>
                            <Upload size={36} color="#a5b4fc" style={{ marginBottom: '10px' }} />
                            <div style={{ fontWeight: 600, color: '#4f46e5' }}>Click or drag &amp; drop an image</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>MRI or X-Ray scan · PNG, JPG, JPEG accepted</div>
                        </>
                    )}
                    <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
                </div>

                {file && (
                    <div style={{ marginTop: '10px', fontSize: '13px', color: '#64748b' }}>
                        📄 {file.name} — {(file.size / 1024).toFixed(1)} KB
                    </div>
                )}

                {error === 'OFFLINE' ? <OfflineError onRetry={onRetry} /> : error && <div style={errorStyle}>{error}</div>}

                <button onClick={handleSubmit} disabled={!file || loading} style={submitBtn('#6366f1', !file || loading)}>
                    {loading ? <><Loader size={16} className="spin" /> Analysing...</> : <><ChevronRight size={16} /> Analyse Scan</>}
                </button>

                {result && <ResultCard result={result} onClear={() => { setResult(null); setFile(null); setPreview(null) }} />}
            </div>
        </div>
    )
}

// ─── Section 2: MRI Machine Sensors ───────────────────────────────────────────
function MRIMachineSection({ onRetry }) {
    const defaults = { helium_level: 90, magnetic_field: 1.5, rf_power: 18, gradient_temp: 22 }
    const [vals, setVals] = useState(defaults)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    const fields = [
        { key: 'helium_level', label: 'Helium Level', unit: '%', normal: '85–95', min: 0, max: 100, step: 0.5, safeMin: 85, safeMax: 95 },
        { key: 'magnetic_field', label: 'Magnetic Field', unit: 'T', normal: '1.4–1.6', min: 0, max: 3, step: 0.01, safeMin: 1.4, safeMax: 1.6 },
        { key: 'rf_power', label: 'RF Power', unit: 'kW', normal: '15–21', min: 0, max: 40, step: 0.5, safeMin: 15, safeMax: 21 },
        { key: 'gradient_temp', label: 'Gradient Temp', unit: '°C', normal: '18–26', min: -10, max: 80, step: 0.5, safeMin: 18, safeMax: 26 },
    ]

    const handleSubmit = async () => {
        setLoading(true); setError('')
        try {
            const res = await fetch(`${API}/api/predict/mri-machine`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vals)
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setResult(data)
        } catch (e) { setError(friendlyError(e)) }
        finally { setLoading(false) }
    }

    return (
        <div style={cardStyle}>
            <div style={cardHeaderStyle('#0891b2')}>
                <Activity size={22} />
                <div>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>MRI Machine Diagnostics</div>
                    <div style={{ fontSize: '12px', opacity: 0.85 }}>Input live sensor readings → Isolation Forest detects machine faults</div>
                </div>
            </div>

            {/* MRI Input Guide */}
            <div style={{
                margin: '20px 20px 0', padding: '14px 16px',
                background: '#ecfeff', borderRadius: '10px',
                border: '1.5px solid #a5f3fc', fontSize: '12px', color: '#164e63'
            }}>
                <div style={{ fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={13} /> How to fill in MRI sensor values
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
                    <span>🔵 <strong>Helium Level</strong> — Cryogenic coolant level in %</span>
                    <span>🔵 <strong>Magnetic Field</strong> — Main bore field strength (Tesla)</span>
                    <span>🔵 <strong>RF Power</strong> — Radio-frequency transmitter power (kW)</span>
                    <span>🔵 <strong>Gradient Temp</strong> — Gradient coil housing temperature (°C)</span>
                </div>
                <div style={{ marginTop: '8px', color: '#0e7490' }}>
                    Use <strong>Reset to Normal</strong> to load safe baseline values, or <strong>Inject Fault</strong> to simulate a broken machine.
                </div>
            </div>

            <div style={{ padding: '16px 20px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {fields.map(f => (
                        <div key={f.key}>
                            <label style={labelStyle}>{f.label} <span style={{ color: '#94a3b8' }}>({f.unit})</span></label>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Normal: {f.normal} {f.unit}</div>
                            <input type="number" value={vals[f.key]} min={f.min} max={f.max} step={f.step}
                                onChange={e => setVals(v => ({ ...v, [f.key]: parseFloat(e.target.value) }))}
                                style={inputStyle} />
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={handleSubmit} disabled={loading} style={submitBtn('#0891b2', loading)}>
                        {loading ? <><Loader size={16} /> Running...</> : <><ChevronRight size={16} /> Run Diagnosis</>}
                    </button>
                    <button onClick={() => { setVals(defaults); setResult(null); setError('') }} style={resetBtn}>
                        Reset to Normal
                    </button>
                    <button onClick={() => setVals({ helium_level: 45, magnetic_field: 1.35, rf_power: 27, gradient_temp: 42 })}
                        style={{ ...resetBtn, color: '#ef4444', borderColor: '#fca5a5' }}>
                        Inject Fault
                    </button>
                </div>

                {error === 'OFFLINE' ? <OfflineError onRetry={onRetry} /> : error && <div style={errorStyle}>{error}</div>}
                {result && <ResultCard result={result} onClear={() => setResult(null)} fields={fields} />}
            </div>
        </div>
    )
}

// ─── Section 3: X-Ray Machine Sensors ─────────────────────────────────────────
function XRayMachineSection({ onRetry }) {
    const defaults = { tube_current: 300, exposure_time: 150, voltage: 120, detector_temp: 25 }
    const [vals, setVals] = useState(defaults)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    const fields = [
        { key: 'tube_current', label: 'Tube Current', unit: 'mA', normal: '260–340', min: 0, max: 600, step: 1, safeMin: 260, safeMax: 340 },
        { key: 'exposure_time', label: 'Exposure Time', unit: 'ms', normal: '120–180', min: 0, max: 400, step: 1, safeMin: 120, safeMax: 180 },
        { key: 'voltage', label: 'Tube Voltage', unit: 'kV', normal: '108–132', min: 0, max: 200, step: 1, safeMin: 108, safeMax: 132 },
        { key: 'detector_temp', label: 'Detector Temp', unit: '°C', normal: '20–30', min: -10, max: 80, step: 0.5, safeMin: 20, safeMax: 30 },
    ]

    const handleSubmit = async () => {
        setLoading(true); setError('')
        try {
            const res = await fetch(`${API}/api/predict/xray-machine`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vals)
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setResult(data)
        } catch (e) { setError(friendlyError(e)) }
        finally { setLoading(false) }
    }

    return (
        <div style={cardStyle}>
            <div style={cardHeaderStyle('#d97706')}>
                <Zap size={22} />
                <div>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>X-Ray Machine Diagnostics</div>
                    <div style={{ fontSize: '12px', opacity: 0.85 }}>Input live sensor readings → Isolation Forest detects machine faults</div>
                </div>
            </div>

            {/* X-Ray Input Guide */}
            <div style={{
                margin: '20px 20px 0', padding: '14px 16px',
                background: '#fffbeb', borderRadius: '10px',
                border: '1.5px solid #fcd34d', fontSize: '12px', color: '#713f12'
            }}>
                <div style={{ fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={13} /> How to fill in X-Ray sensor values
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
                    <span>🟡 <strong>Tube Current</strong> — Electron beam current in the X-ray tube (mA)</span>
                    <span>🟡 <strong>Exposure Time</strong> — Duration of radiation emission (ms)</span>
                    <span>🟡 <strong>Tube Voltage</strong> — Peak kilovoltage applied across the tube (kV)</span>
                    <span>🟡 <strong>Detector Temp</strong> — Digital flat-panel detector temperature (°C)</span>
                </div>
                <div style={{ marginTop: '8px', color: '#92400e' }}>
                    Use <strong>Reset to Normal</strong> to load safe baseline values, or <strong>Inject Fault</strong> to simulate a broken machine.
                </div>
            </div>

            <div style={{ padding: '16px 20px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {fields.map(f => (
                        <div key={f.key}>
                            <label style={labelStyle}>{f.label} <span style={{ color: '#94a3b8' }}>({f.unit})</span></label>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Normal: {f.normal} {f.unit}</div>
                            <input type="number" value={vals[f.key]} min={f.min} max={f.max} step={f.step}
                                onChange={e => setVals(v => ({ ...v, [f.key]: parseFloat(e.target.value) }))}
                                style={inputStyle} />
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={handleSubmit} disabled={loading} style={submitBtn('#d97706', loading)}>
                        {loading ? <><Loader size={16} /> Running...</> : <><ChevronRight size={16} /> Run Diagnosis</>}
                    </button>
                    <button onClick={() => { setVals(defaults); setResult(null); setError('') }} style={resetBtn}>
                        Reset to Normal
                    </button>
                    <button onClick={() => setVals({ tube_current: 120, exposure_time: 280, voltage: 85, detector_temp: 44 })}
                        style={{ ...resetBtn, color: '#ef4444', borderColor: '#fca5a5' }}>
                        Inject Fault
                    </button>
                </div>

                {error === 'OFFLINE' ? <OfflineError onRetry={onRetry} /> : error && <div style={errorStyle}>{error}</div>}
                {result && <ResultCard result={result} onClear={() => setResult(null)} fields={fields} />}
            </div>
        </div>
    )
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const cardStyle = {
    background: 'white', borderRadius: '16px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
    overflow: 'hidden', border: '1px solid #e2e8f0',
}

const cardHeaderStyle = (color) => ({
    background: color, color: 'white', padding: '16px 20px',
    display: 'flex', alignItems: 'flex-start', gap: '12px',
})

const labelStyle = { display: 'block', fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '2px' }

const inputStyle = {
    width: '100%', padding: '9px 12px',
    border: '1px solid #d1d5db', borderRadius: '8px',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
}

const submitBtn = (color, disabled) => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    marginTop: '4px', padding: '10px 20px',
    background: disabled ? '#e2e8f0' : color,
    color: disabled ? '#94a3b8' : 'white',
    border: 'none', borderRadius: '8px',
    fontWeight: 600, fontSize: '14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.2s',
})

const resetBtn = {
    marginTop: '4px', padding: '10px 16px',
    background: 'transparent', border: '1px solid #d1d5db',
    borderRadius: '8px', fontSize: '13px', color: '#64748b', cursor: 'pointer',
}

const errorStyle = {
    marginTop: '12px', padding: '12px',
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: '8px', color: '#dc2626', fontSize: '13px',
}

// ─── Backend status check (8 s timeout, retryable) ───────────────────────────
function useBackendStatus() {
    const [online, setOnline] = useState(null)
    const [tick, setTick] = useState(0)
    useEffect(() => {
        setOnline(null)
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 8000)
        fetch(`${API}/health`, { signal: ctrl.signal })
            .then(r => setOnline(r.ok))
            .catch(() => setOnline(false))
            .finally(() => clearTimeout(timer))
    }, [tick])
    return { online, recheck: () => setTick(t => t + 1) }
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function MachineDiagnostics() {
    const { online: backendOnline, recheck } = useBackendStatus()

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Hero banner */}
            <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #1e3a5f 50%, #0f172a 100%)',
                borderRadius: '16px', padding: '28px 32px',
                color: 'white', marginBottom: '28px',
                display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap'
            }}>
                <div style={{
                    width: '56px', height: '56px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <Brain size={28} />
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>ML Anomaly Detection</h2>
                    <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '14px' }}>
                        Three AI models for medical image analysis and equipment health monitoring
                    </p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {[
                        { label: 'CNN Autoencoder', color: '#6366f1' },
                        { label: 'Isolation Forest ×2', color: '#0891b2' },
                    ].map(b => (
                        <span key={b.label} style={{
                            padding: '5px 12px', borderRadius: '20px',
                            background: b.color + '33', border: `1px solid ${b.color}66`,
                            fontSize: '12px', fontWeight: 600, color: 'white'
                        }}>{b.label}</span>
                    ))}
                    <BackendBadge online={backendOnline} />
                </div>
            </div>

            {/* Backend offline global notice */}
            {backendOnline === false && (
                <div style={{
                    marginBottom: '20px', padding: '14px 18px',
                    background: '#fff7ed', border: '1.5px solid #fed7aa',
                    borderRadius: '12px', color: '#9a3412',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '14px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <WifiOff size={18} color="#ea580c" />
                        <div>
                            <strong>Python backend is not running.</strong> Start it with{' '}
                            <code style={{ background: '#fde68a', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>
                                .\venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8000 --reload
                            </code>
                        </div>
                    </div>
                    <button onClick={recheck} style={{
                        background: '#16a34a', color: 'white', border: 'none',
                        borderRadius: '7px', padding: '6px 14px',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
                    }}>🔄 Retry</button>
                </div>
            )}

            {/* Three panels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <ImageAnomalySection onRetry={recheck} />
                <MRIMachineSection onRetry={recheck} />
                <XRayMachineSection onRetry={recheck} />
            </div>

            {/* Info footer */}
            <div style={{
                marginTop: '24px', padding: '16px 20px',
                background: '#f8fafc', borderRadius: '12px',
                border: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b'
            }}>
                💡 <strong>Tip:</strong> Use the <strong>"Inject Fault"</strong> button on the MRI/X-Ray panels to simulate an anomalous reading and see the model flag it as a defect.
            </div>
        </div>
    )
}
