import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
/* Dashboard styles are inline + App.css */
import {
  Bed, Wrench, Package, Activity, Users, TrendingUp, TrendingDown,
  RefreshCw, ArrowRight, AlertTriangle, CheckCircle, Clock, Zap
} from 'lucide-react'

// ── Tiny mock sparklines (realistic wave-shapes) ───────────────────────────────
const SPARKS = {
  rooms:       [{ v:30 },{ v:38 },{ v:34 },{ v:45 },{ v:42 },{ v:50 },{ v:47 },{ v:55 }],
  equipment:   [{ v:80 },{ v:76 },{ v:82 },{ v:78 },{ v:84 },{ v:87 },{ v:83 },{ v:90 }],
  inventory:   [{ v:60 },{ v:55 },{ v:62 },{ v:58 },{ v:65 },{ v:60 },{ v:57 },{ v:63 }],
  maintenance: [{ v:10 },{ v:14 },{ v:11 },{ v:18 },{ v:15 },{ v:20 },{ v:17 },{ v:22 }],
  patients:    [{ v:40 },{ v:48 },{ v:44 },{ v:52 },{ v:49 },{ v:57 },{ v:53 },{ v:61 }],
}

// ── Hero stat card (gradient) ──────────────────────────────────────────────────
function HeroCard({ title, value, subtitle, gradient, sparkColor, sparks, icon: Icon, onClick, trend, trendLabel }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: gradient,
        borderRadius: 14,
        padding: '22px 22px 0',
        cursor: onClick ? 'pointer' : 'default',
        color: 'white',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: hovered ? '0 16px 40px rgba(0,0,0,0.22)' : '0 6px 20px rgba(0,0,0,0.13)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        minHeight: 160,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Decorative circle */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 100, height: 100, borderRadius: '50%',
        background: 'rgba(255,255,255,0.10)',
        transition: 'transform 0.4s',
        transform: hovered ? 'scale(1.2)' : 'scale(1)',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div>
          <div style={{ fontSize: 31, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 4 }}>{value}</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, opacity: 0.85 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 3 }}>{subtitle}</div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.18)',
          borderRadius: 10, padding: 9, marginTop: 2,
        }}>
          <Icon size={20} />
        </div>
      </div>

      {/* Trend */}
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 12, fontSize: 12, fontWeight: 600 }}>
          {trend >= 0
            ? <TrendingUp size={13} style={{ opacity: 0.9 }} />
            : <TrendingDown size={13} style={{ opacity: 0.9 }} />}
          <span style={{ opacity: 0.9 }}>{trend >= 0 ? '+' : ''}{trend}% {trendLabel}</span>
        </div>
      )}

      {/* Sparkline */}
      <div style={{ marginTop: 'auto', marginLeft: -22, marginRight: -22, height: 52 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparks} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sg-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#fff" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#fff" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="#fff" strokeWidth={2}
              fill={`url(#sg-${title})`} dot={false} />
            <Tooltip
              contentStyle={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 6, fontSize: 11 }}
              itemStyle={{ color: '#fff' }} labelStyle={{ display: 'none' }}
              formatter={v => [v, 'Value']}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Small overview metric card ─────────────────────────────────────────────────
function OverviewCard({ icon, title, value, label, accent = '#4361ee', bg = '#eef1fd' }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: '18px 20px',
      border: '1px solid #e5e8ef', display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#6b7a99', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11.5, color: '#a0aec0', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}

// ── Quick action button ────────────────────────────────────────────────────────
function QuickBtn({ icon, label, onClick, gradient }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      padding: '16px 10px', background: h ? '#f4f6fb' : 'white',
      border: '1.5px solid ' + (h ? '#4361ee40' : '#e5e8ef'),
      borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
      transition: 'all 0.18s', transform: h ? 'translateY(-2px)' : 'none',
      boxShadow: h ? '0 4px 14px rgba(67,97,238,0.12)' : 'none',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: gradient || 'linear-gradient(135deg,#4361ee,#7209b7)', fontSize: 18,
      }}>{icon}</div>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1a2035' }}>{label}</span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    rooms:       { total: 0, available: 0, occupied: 0, maintenance: 0 },
    equipment:   { total: 0, operational: 0, maintenance: 0, outOfService: 0 },
    inventory:   { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
    maintenance: { total: 0, scheduled: 0, inProgress: 0, completed: 0 },
    patients:    { total: 0, admitted: 0, observation: 0, discharged: 0 },
  })
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async (showSpin = true) => {
    if (showSpin) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await db.getDashboardStats()
      setStats({
        rooms:       { total: data.rooms.length, available: data.rooms.filter(r => r.status === 'available').length, occupied: data.rooms.filter(r => r.status === 'occupied').length, maintenance: data.rooms.filter(r => r.status === 'maintenance').length },
        equipment:   { total: data.equipment.length, operational: data.equipment.filter(e => e.status === 'operational').length, maintenance: data.equipment.filter(e => e.status === 'maintenance').length, outOfService: data.equipment.filter(e => e.status === 'out_of_service').length },
        inventory:   { total: data.inventory.length, inStock: data.inventory.filter(i => i.status === 'in_stock').length, lowStock: data.inventory.filter(i => i.status === 'low_stock').length, outOfStock: data.inventory.filter(i => i.status === 'out_of_stock').length },
        maintenance: { total: data.maintenance.length, scheduled: data.maintenance.filter(m => m.status === 'scheduled').length, inProgress: data.maintenance.filter(m => m.status === 'in_progress').length, completed: data.maintenance.filter(m => m.status === 'completed').length },
        patients:    { total: data.patients.length, admitted: data.patients.filter(p => p.status === 'admitted').length, observation: data.patients.filter(p => p.status === 'under_observation').length, discharged: data.patients.filter(p => p.status === 'discharged').length },
      })
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { loadData() }, [])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 120px)', gap: 14, color: '#6b7a99', fontFamily: 'inherit' }}>
      <div style={{ width: 38, height: 38, border: '3px solid #e5e8ef', borderTop: '3px solid #4361ee', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 14, fontWeight: 500 }}>Loading dashboard…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const roomPct    = stats.rooms.total    ? Math.round(stats.rooms.available    / stats.rooms.total    * 100) : 0
  const equipPct   = stats.equipment.total ? Math.round(stats.equipment.operational / stats.equipment.total * 100) : 0
  const alertItems = stats.inventory.lowStock + stats.inventory.outOfStock

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 1320, margin: '0 auto' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a2035', margin: 0 }}>Operations Overview</h1>
          <p style={{ color: '#6b7a99', margin: '4px 0 0', fontSize: 13.5 }}>Real-time hospital management · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={() => loadData(false)} disabled={refreshing} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 18px', background: 'white', border: '1.5px solid #e5e8ef',
          borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          color: '#1a2035', fontFamily: 'inherit',
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
        }}>
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ── Hero KPI Cards ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <HeroCard
          title="Patients"  value={stats.patients.total}
          subtitle={`${stats.patients.admitted} currently admitted`}
          gradient="linear-gradient(135deg,#4361ee 0%,#3a0ca3 100%)"
          sparks={SPARKS.patients} icon={Users}
          trend={5.2} trendLabel="vs last week"
          onClick={() => navigate('/patients')}
        />
        <HeroCard
          title="Rooms"     value={`${roomPct}%`}
          subtitle={`${stats.rooms.available} of ${stats.rooms.total} available`}
          gradient="linear-gradient(135deg,#06d6a0 0%,#1b9e7e 100%)"
          sparks={SPARKS.rooms} icon={Bed}
          trend={2.1} trendLabel="availability"
          onClick={() => navigate('/rooms')}
        />
        <HeroCard
          title="Equipment"  value={`${equipPct}%`}
          subtitle={`${stats.equipment.operational} operational`}
          gradient="linear-gradient(135deg,#f7b731 0%,#e67e22 100%)"
          sparks={SPARKS.equipment} icon={Wrench}
          trend={-1.4} trendLabel="vs last month"
          onClick={() => navigate('/equipment')}
        />
        <HeroCard
          title="Inventory"  value={stats.inventory.total}
          subtitle={`${alertItems} items need reorder`}
          gradient={alertItems > 0 ? "linear-gradient(135deg,#ef233c 0%,#c1121f 100%)" : "linear-gradient(135deg,#7209b7 0%,#b5179e 100%)"}
          sparks={SPARKS.inventory} icon={Package}
          trend={alertItems > 0 ? -3.8 : 0.8} trendLabel="stock health"
          onClick={() => navigate('/inventory')}
        />
        <HeroCard
          title="Maintenance" value={stats.maintenance.inProgress}
          subtitle={`${stats.maintenance.scheduled} scheduled · ${stats.maintenance.completed} done`}
          gradient="linear-gradient(135deg,#0096c7 0%,#4361ee 100%)"
          sparks={SPARKS.maintenance} icon={Activity}
          trend={1.2} trendLabel="tasks in progress"
          onClick={() => navigate('/maintenance')}
        />
      </div>

      {/* ── At-a-Glance + Quick Access ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, marginBottom: 24, alignItems: 'start' }}>

        {/* Overview metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <OverviewCard icon="🏥" title="Room Utilization" value={`${stats.rooms.total > 0 ? Math.round(stats.rooms.occupied / stats.rooms.total * 100) : 0}%`} label={`${stats.rooms.occupied} of ${stats.rooms.total} occupied`} accent="#06d6a0" bg="#e6faf5" />
          <OverviewCard icon="⚠️" title="Inventory Alerts"  value={alertItems} label="Items need reordering" accent="#ef233c" bg="#ffecee" />
          <OverviewCard icon="🛠️" title="Active Tasks"      value={stats.maintenance.inProgress} label="Maintenance in progress" accent="#f7b731" bg="#fff8e1" />
          <OverviewCard icon="📈" title="Equipment Health"  value={`${equipPct}%`} label="Operational rate" accent="#4361ee" bg="#eef1fd" />
          <OverviewCard icon="👥" title="Under Observation" value={stats.patients.observation}  label="Patients monitored" accent="#7209b7" bg="#f5e9ff" />
          <OverviewCard icon="✅" title="Discharged Today"   value={stats.patients.discharged}  label="Successful discharges" accent="#06d6a0" bg="#e6faf5" />
        </div>

        {/* Quick access grid */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e8ef', padding: '18px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', minWidth: 260 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2035', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Zap size={15} color="#f7b731" /> Quick Access
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <QuickBtn icon="👥" label="Patients"    onClick={() => navigate('/patients')}    gradient="linear-gradient(135deg,#4361ee,#7209b7)" />
            <QuickBtn icon="🏥" label="Rooms"       onClick={() => navigate('/rooms')}       gradient="linear-gradient(135deg,#06d6a0,#1b9e7e)" />
            <QuickBtn icon="🔧" label="Equipment"   onClick={() => navigate('/equipment')}   gradient="linear-gradient(135deg,#f7b731,#e67e22)" />
            <QuickBtn icon="📦" label="Inventory"   onClick={() => navigate('/inventory')}   gradient="linear-gradient(135deg,#ef233c,#c1121f)" />
            <QuickBtn icon="🛠️" label="Maint."     onClick={() => navigate('/maintenance')} gradient="linear-gradient(135deg,#0096c7,#4361ee)" />
            <QuickBtn icon="📊" label="Analytics"   onClick={() => navigate('/analytics')}   gradient="linear-gradient(135deg,#7209b7,#b5179e)" />
            <QuickBtn icon="✨" label="AI Insights" onClick={() => navigate('/ai-insights')} gradient="linear-gradient(135deg,#4361ee,#06d6a0)" />
            <QuickBtn icon="🤖" label="ML Models"   onClick={() => navigate('/ml-metrics')}  gradient="linear-gradient(135deg,#f7b731,#4361ee)" />
            <QuickBtn icon="🔬" label="Diagnosis"   onClick={() => navigate('/ml-diagnostics')} gradient="linear-gradient(135deg,#ef233c,#7209b7)" />
          </div>
        </div>
      </div>

      {/* ── Status Summary Bar ────────────────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e8ef', padding: '16px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', gap: 0, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Beds',       value: stats.rooms.total,                color: '#4361ee' },
          { label: 'Available Beds',   value: stats.rooms.available,            color: '#06d6a0' },
          { label: 'Admitted',         value: stats.patients.admitted,          color: '#7209b7' },
          { label: 'Under Obs.',       value: stats.patients.observation,       color: '#f7b731' },
          { label: 'Low Stock Items',  value: stats.inventory.lowStock,         color: '#ef233c' },
          { label: 'Scheduled Maint.', value: stats.maintenance.scheduled,      color: '#0096c7' },
          { label: 'Completed Tasks',  value: stats.maintenance.completed,      color: '#06d6a0' },
          { label: 'Equip. Issues',    value: stats.equipment.maintenance + stats.equipment.outOfService, color: '#f7b731' },
        ].map((item, i, arr) => (
          <div key={item.label} style={{
            flex: '1 1 100px', textAlign: 'center', padding: '8px 16px',
            borderRight: i < arr.length - 1 ? '1px solid #f0f2f5' : 'none',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</div>
            <div style={{ fontSize: 11, color: '#a0aec0', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}