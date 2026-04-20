import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell
} from 'recharts';
import { BarChart2, Activity, TrendingUp, Cpu, Download, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/predict` : 'http://127.0.0.1:8000/api/predict';

// ── Colour palette ─────────────────────────────────────────────────────────────
const COLORS    = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];
const MODEL_COLORS = { 'Linear Regression': '#6366f1', 'Random Forest': '#10b981', 'XGBoost': '#f59e0b', 'XGBoost (Tuned)': '#ef4444' };

// ── Spinner ────────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
    <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

// ── Section card wrapper ────────────────────────────────────────────────────────
const Card = ({ title, subtitle, children, icon, accent = '#6366f1' }) => (
  <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
    <div style={{ background: `linear-gradient(135deg, ${accent}15 0%, white 100%)`, padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ color: accent }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
    <div style={{ padding: 20 }}>{children}</div>
  </div>
);

// ── Metric badge ───────────────────────────────────────────────────────────────
const MetricBadge = ({ label, value, color = '#6366f1', unit = '' }) => (
  <div style={{ textAlign: 'center', padding: '14px 10px', background: `${color}10`, borderRadius: 10, border: `1px solid ${color}25` }}>
    <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}<span style={{ fontSize: 12, fontWeight: 400, color: '#64748b', marginLeft: 2 }}>{unit}</span></div>
    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
  </div>
);

// ── Custom bar chart tooltip ───────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#1e293b' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ fontSize: 13, color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ── Confusion Matrix visual ────────────────────────────────────────────────────
const ConfusionMatrix = ({ cm }) => {
  const total   = cm.tn + cm.fp + cm.fn + cm.tp;
  const cells   = [
    { label: 'True Negative', value: cm.tn, bg: '#dcfce7', text: '#16a34a', sub: 'Correct — No Failure' },
    { label: 'False Positive', value: cm.fp, bg: '#fef3c7', text: '#d97706', sub: 'False Alarm' },
    { label: 'False Negative', value: cm.fn, bg: '#fee2e2', text: '#dc2626', sub: 'Missed Failure ⚠️' },
    { label: 'True Positive', value: cm.tp, bg: '#dbeafe', text: '#1d4ed8', sub: 'Correct — Failure Caught' },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cells.map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: c.text }}>{c.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.text, marginTop: 2 }}>{c.label}</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{c.sub}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{((c.value / total) * 100).toFixed(1)}% of test set</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
        Predicted: No Failure (left) | Failure (right) · Actual: No Failure (top) | Failure (bottom)
      </div>
    </div>
  );
};

// ── Feature importance horizontal bars ────────────────────────────────────────
const FeatureImportanceChart = ({ data, color = '#6366f1' }) => {
  const max = Math.max(...data.map(d => d.importance));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d, i) => (
        <div key={d.feature}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{d.feature}</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>{(d.importance * 100).toFixed(1)}%</span>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: 4, height: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(d.importance / max) * 100}%`, background: COLORS[i % COLORS.length], borderRadius: 4, transition: 'width 1s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Model comparison chart ─────────────────────────────────────────────────────
const ModelComparisonChart = ({ data, metric, label, colors }) => {
  const chartData = data.map(d => ({
    name: d.model.replace(' Regression', ' Reg.').replace(' (Tuned)', '✦'),
    [metric]: +((d[metric] || 0).toFixed(3)),
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" fontSize={11} angle={-20} textAnchor="end" tick={{ fill: '#64748b' }} />
        <YAxis fontSize={11} domain={[0, metric === 'r2' ? 1 : undefined]} tick={{ fill: '#64748b' }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey={metric} name={label} radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ───────────────────────────────────────────────────────────────────────────────
// Main Page
// ───────────────────────────────────────────────────────────────────────────────
export default function MLMetrics() {
  const [losMetrics,    setLosMetrics]    = useState(null);
  const [equipMetrics,  setEquipMetrics]  = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const pageRef = useRef(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [losRes, equipRes] = await Promise.all([
        fetch(`${API}/metrics/los`),
        fetch(`${API}/metrics/equipment`),
      ]);

      if (!losRes.ok) throw new Error(`LOS metrics not ready (HTTP ${losRes.status}). Please run the training script.`);
      if (!equipRes.ok) throw new Error(`Equipment metrics not ready (HTTP ${equipRes.status}). Please run the training script.`);

      const [los, equip] = await Promise.all([losRes.json(), equipRes.json()]);
      setLosMetrics(los);
      setEquipMetrics(equip);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMetrics(); }, []);

  // ── PDF Export ──────────────────────────────────────────────────────────────
  const handleDownloadReport = () => {
    const style = document.createElement('style');
    style.textContent = `@media print { body { -webkit-print-color-adjust: exact; } }`;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  return (
    <div ref={pageRef} style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media print { button { display: none !important; } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart2 size={26} color="#6366f1" /> ML Model Performance Dashboard
          </h1>
          <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: 14 }}>
            Model comparison, accuracy metrics, feature importances, confusion matrix, and ROC curves.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchMetrics} title="Refresh" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleDownloadReport} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#6366f1', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'white' }}>
            <Download size={14} /> Export Report (PDF)
          </button>
        </div>
      </div>

      {/* Training Tip */}
      <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#92400e' }}>
        <AlertTriangle size={16} />
        <span>If metrics are not loading, run training scripts first: <code style={{ background: '#fef3c7', padding: '1px 6px', borderRadius: 4 }}>python backend/training/los_train.py</code> and <code style={{ background: '#fef3c7', padding: '1px 6px', borderRadius: 4 }}>python backend/training/equipment_failure_train.py</code></span>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 18px', marginBottom: 20, color: '#b91c1c', fontSize: 13 }}>
          <strong>⚠️ {error}</strong>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 1: LOS Model */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {losMetrics && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 4px' }}>
                <div style={{ height: 3, width: 28, background: '#6366f1', borderRadius: 2 }} />
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e293b' }}>🏥 Length of Stay Prediction</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#059669' }}>
                  <CheckCircle size={12} /> {losMetrics.best_model}
                </div>
              </div>

              {/* Key Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <MetricBadge label="Best R² Score"        value={losMetrics.best_r2.toFixed(3)}  color="#6366f1" />
                <MetricBadge label="Mean Abs Error"       value={losMetrics.best_mae.toFixed(2)} color="#10b981" unit="days" />
                <MetricBadge label="RMSE"                 value={losMetrics.best_rmse.toFixed(2)} color="#f59e0b" unit="days" />
                <MetricBadge label="Train Set Size"       value={losMetrics.train_size}          color="#3b82f6" unit="records" />
              </div>

              {/* Charts Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <Card title="Model Comparison — R² Score" subtitle="Higher is better (max 1.0)" icon={<BarChart2 size={18} />} accent="#6366f1">
                  <ModelComparisonChart data={losMetrics.comparison} metric="r2" label="R² Score" />
                </Card>
                <Card title="Model Comparison — MAE (days)" subtitle="Lower is better" icon={<TrendingUp size={18} />} accent="#10b981">
                  <ModelComparisonChart data={losMetrics.comparison} metric="mae" label="MAE" />
                </Card>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <Card title="Feature Importance" subtitle={`${losMetrics.best_model} — Top predictors`} icon={<Activity size={18} />} accent="#f59e0b">
                  <FeatureImportanceChart data={losMetrics.feature_importance} color="#6366f1" />
                </Card>

                <Card title="Actual vs Predicted — Length of Stay" subtitle="Sampled 100 test points" icon={<TrendingUp size={18} />} accent="#6366f1">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" dataKey="actual" name="Actual" domain={['auto', 'auto']} fontSize={10} tick={{ fill: '#94a3b8' }} label={{ value: 'Actual (days)', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis dataKey="predicted" name="Predicted" fontSize={10} tick={{ fill: '#94a3b8' }} />
                      <Tooltip formatter={(v) => v.toFixed(1)} />
                      <Line
                        type="monotone"
                        data={(losMetrics.actual_vs_predicted || []).sort((a, b) => a.actual - b.actual)}
                        dataKey="predicted"
                        stroke="#6366f1"
                        dot={{ r: 2, fill: '#6366f1' }}
                        strokeWidth={0}
                        name="Predicted"
                      />
                      {/* Perfect prediction reference */}
                      <Line
                        type="monotone"
                        data={[{ actual: 1, predicted: 1 }, { actual: 30, predicted: 30 }]}
                        dataKey="predicted"
                        stroke="#e2e8f0"
                        strokeWidth={1.5}
                        dot={false}
                        name="Perfect"
                        strokeDasharray="4 4"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* CV info strip */}
              <div style={{ background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ color: '#6366f1', fontWeight: 700 }}>📊 Cross-Validation (5-Fold):</span>
                {(losMetrics.comparison || []).map(m => (
                  <span key={m.model} style={{ color: '#475569' }}>
                    <strong>{m.model}</strong>: R² {m.cv_r2_mean?.toFixed(3)} ± {m.cv_r2_std?.toFixed(3)}
                  </span>
                ))}
                {losMetrics.gridcv_best_params && (
                  <span style={{ color: '#475569' }}>
                    | ⚙️ GridSearchCV Best: {JSON.stringify(losMetrics.gridcv_best_params)}
                  </span>
                )}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 2: Equipment Failure */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {equipMetrics && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 0 4px' }}>
                <div style={{ height: 3, width: 28, background: '#ef4444', borderRadius: 2 }} />
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e293b' }}>⚙️ Equipment Failure Prediction</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#dc2626' }}>
                  <CheckCircle size={12} /> {equipMetrics.best_model}
                </div>
              </div>

              {/* Classification Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                <MetricBadge label="Accuracy"  value={`${(equipMetrics.best_accuracy  * 100).toFixed(1)}%`} color="#6366f1" />
                <MetricBadge label="Precision" value={`${(equipMetrics.best_precision * 100).toFixed(1)}%`} color="#10b981" />
                <MetricBadge label="Recall"    value={`${(equipMetrics.best_recall    * 100).toFixed(1)}%`} color="#f59e0b" />
                <MetricBadge label="F1 Score"  value={equipMetrics.best_f1.toFixed(3)}                    color="#3b82f6" />
                <MetricBadge label="AUC-ROC"   value={equipMetrics.best_auc.toFixed(3)}                   color="#ef4444" />
              </div>

              {/* Charts Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <Card title="Model Comparison — AUC-ROC" subtitle="Higher is better (max 1.0)" icon={<BarChart2 size={18} />} accent="#ef4444">
                  <ModelComparisonChart data={equipMetrics.comparison} metric="auc" label="AUC-ROC" />
                </Card>
                <Card title="Model Comparison — F1 Score" subtitle="Balance of Precision & Recall" icon={<Activity size={18} />} accent="#f59e0b">
                  <ModelComparisonChart data={equipMetrics.comparison} metric="f1" label="F1" />
                </Card>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                <Card title="Confusion Matrix" subtitle={`${equipMetrics.best_model} on test set`} icon={<Cpu size={18} />} accent="#ef4444">
                  <ConfusionMatrix cm={equipMetrics.confusion_matrix} />
                </Card>

                <Card title="ROC Curve" subtitle="True Positive Rate vs False Positive Rate" icon={<TrendingUp size={18} />} accent="#6366f1">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={equipMetrics.roc_curve} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="fpr" fontSize={10} tick={{ fill: '#94a3b8' }} label={{ value: 'FPR', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis fontSize={10} tick={{ fill: '#94a3b8' }} domain={[0, 1]} />
                      <Tooltip formatter={(v) => v.toFixed(3)} />
                      <Line type="monotone" dataKey="tpr" stroke="#6366f1" strokeWidth={2.5} dot={false} name="TPR (Recall)" />
                      <Line type="monotone" data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]} dataKey="tpr" stroke="#e2e8f0" strokeWidth={1} dot={false} name="Random" strokeDasharray="4 4" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>AUC = {equipMetrics.best_auc.toFixed(3)}</div>
                </Card>

                <Card title="Feature Importance" subtitle={`${equipMetrics.best_model} — Risk drivers`} icon={<Activity size={18} />} accent="#f59e0b">
                  <FeatureImportanceChart data={equipMetrics.feature_importance} />
                </Card>
              </div>

              {/* CV info strip */}
              <div style={{ background: '#fef9f0', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ color: '#ea580c', fontWeight: 700 }}>📊 Cross-Validation (5-Fold AUC):</span>
                {(equipMetrics.comparison || []).map(m => (
                  <span key={m.model} style={{ color: '#475569' }}>
                    <strong>{m.model}</strong>: {m.cv_auc_mean?.toFixed(3)} ± {m.cv_auc_std?.toFixed(3)}
                  </span>
                ))}
                {equipMetrics.gridcv_best_params && (
                  <span style={{ color: '#475569' }}>
                    | ⚙️ GridSearchCV Best: {JSON.stringify(equipMetrics.gridcv_best_params)}
                  </span>
                )}
              </div>
            </>
          )}

          {/* Footer note */}
          <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', padding: '8px 0 4px' }}>
            Models trained on 5,000 synthetic patient records (LOS) and 3,000 equipment records. 80/20 stratified train/test split. 5-Fold cross-validation.
          </div>
        </div>
      )}
    </div>
  );
}
