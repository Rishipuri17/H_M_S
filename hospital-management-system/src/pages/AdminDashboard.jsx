import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './AdminDashboard.css'

/* ─── Notification ───────────────────────────────────────────────── */
function Notification({ message, type, onClose }) {
    useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
    return (
        <div className={`ad-notification ad-notification--${type}`}>
            <span>{type === 'success' ? '✅' : '❌'} {message}</span>
            <button onClick={onClose}>×</button>
        </div>
    )
}

/* ─── Confirm Dialog ─────────────────────────────────────────────── */
function ConfirmDialog({ message, onConfirm, onCancel }) {
    return (
        <div className="ad-overlay" onClick={onCancel}>
            <div className="ad-confirm" onClick={e => e.stopPropagation()}>
                <div className="ad-confirm__icon">⚠️</div>
                <h3>Confirm Deletion</h3>
                <p>{message}</p>
                <div className="ad-confirm__actions">
                    <button className="ad-btn ad-btn--secondary" onClick={onCancel}>Cancel</button>
                    <button className="ad-btn ad-btn--danger" onClick={onConfirm}>Delete</button>
                </div>
            </div>
        </div>
    )
}

/* ─── CSV Export util ────────────────────────────────────────────── */
function exportCSV(data, filename) {
    if (!data || data.length === 0) return
    const keys = Object.keys(data[0])
    const csv = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('overview')
    const [notification, setNotification] = useState(null)
    const [confirmDialog, setConfirmDialog] = useState(null)
    const [loading, setLoading] = useState(false)

    // Data
    const [users, setUsers] = useState([])
    const [rooms, setRooms] = useState([])
    const [patients, setPatients] = useState([])
    const [equipment, setEquipment] = useState([])
    const [inventory, setInventory] = useState([])
    const [maintenance, setMaintenance] = useState([])
    const [stats, setStats] = useState(null)
    const [alerts, setAlerts] = useState([])
    const [auditLog, setAuditLog] = useState([])

    // Modal
    const [showModal, setShowModal] = useState(false)
    const [modalType, setModalType] = useState('')
    const [editingItem, setEditingItem] = useState(null)
    const [formData, setFormData] = useState({})

    // Search/filter
    const [searches, setSearches] = useState({})
    const [statusFilters, setStatusFilters] = useState({})

    const notify = (message, type = 'success') => {
        setNotification({ message, type })
        addAudit(message, type)
    }

    const addAudit = (action, type = 'info') => {
        setAuditLog(prev => [{
            id: Date.now(), action, type, user: user?.full_name || 'Admin', time: new Date().toLocaleString()
        }, ...prev.slice(0, 49)])
    }

    /* ── Load ─────────────────────────────────────────────────────── */
    const loadAll = useCallback(async () => {
        setLoading(true)
        try {
            const [u, r, p, eq, inv, m] = await Promise.all([
                db.getUsers(), db.getRooms(), db.getPatients(),
                db.getEquipment(), db.getInventory(), db.getMaintenanceRecords()
            ])
            setUsers(u.data || [])
            setRooms(r.data || [])
            setPatients(p.data || [])
            setEquipment(eq.data || [])
            setInventory(inv.data || [])
            setMaintenance(m.data || [])

            // Compute stats
            const pts = p.data || []; const eqs = eq.data || []
            const invs = inv.data || []; const mnt = m.data || []
            const rms = r.data || []; const usr = u.data || []

            setStats({
                users: { total: usr.length, active: usr.filter(x => x.is_active).length, admins: usr.filter(x => x.role === 'admin').length, staff: usr.filter(x => x.role === 'staff').length },
                rooms: { total: rms.length, available: rms.filter(x => x.status === 'available').length, occupied: rms.filter(x => x.status === 'occupied').length, maintenance: rms.filter(x => x.status === 'maintenance').length },
                patients: { total: pts.length, admitted: pts.filter(x => x.status === 'admitted').length, discharged: pts.filter(x => x.status === 'discharged').length },
                equipment: { total: eqs.length, operational: eqs.filter(x => x.status === 'operational').length, critical: eqs.filter(x => x.criticality === 'critical').length },
                inventory: { total: invs.length, lowStock: invs.filter(x => x.status === 'low_stock').length, outOfStock: invs.filter(x => x.status === 'out_of_stock').length },
                maintenance: { total: mnt.length, pending: mnt.filter(x => x.status === 'scheduled' || x.status === 'in_progress').length },
            })

            // Build critical alerts
            const a = []
            invs.filter(x => x.status === 'out_of_stock').forEach(x => a.push({ type: 'danger', msg: `Out of stock: ${x.item_name}`, icon: '📦' }))
            invs.filter(x => x.status === 'low_stock').forEach(x => a.push({ type: 'warning', msg: `Low stock: ${x.item_name} (${x.current_stock} left)`, icon: '⚠️' }))
            eqs.filter(x => x.status === 'out_of_service').forEach(x => a.push({ type: 'danger', msg: `Equipment out of service: ${x.equipment_name}`, icon: '🔧' }))
            mnt.filter(x => x.priority === 'critical' && x.status !== 'completed').forEach(x => a.push({ type: 'danger', msg: `Critical maintenance: ${x.asset_name}`, icon: '🛠' }))
            setAlerts(a)
        } catch (err) {
            notify('Failed to load data', 'error')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadAll() }, [loadAll])

    /* ── Search/filter helper ─────────────────────────────────────── */
    const filtered = (list, tab, fields) => {
        let res = list
        const q = (searches[tab] || '').toLowerCase()
        if (q) res = res.filter(i => fields.some(f => String(i[f] || '').toLowerCase().includes(q)))
        const sf = statusFilters[tab]
        if (sf && sf !== 'all') res = res.filter(i => i.status === sf || i.role === sf || i.is_active?.toString() === sf)
        return res
    }

    /* ── Modal helpers ──────────────────────────────────────────────*/
    const defaults = {
        users: { email: '', full_name: '', role: 'staff', phone: '', department: '', is_active: true },
        rooms: { room_number: '', room_type: 'General', status: 'available', floor: 1, notes: '' },
        patients: { patient_id: '', patient_name: '', date_of_birth: '', gender: 'Male', blood_group: '', phone: '', current_room: '', status: 'admitted', admission_date: new Date().toISOString().slice(0, 16) },
        equipment: { equipment_name: '', equipment_type: '', serial_number: '', manufacturer: '', location: '', status: 'operational', criticality: 'low', department: '' },
        inventory: { item_name: '', category: '', code: '', current_stock: 0, minimum_stock: 0, status: 'in_stock', unit_price: 0, supplier: '' },
        maintenance: { maintenance_date: new Date().toISOString().slice(0, 10), maintenance_type: 'preventive', asset_name: '', issue_description: '', status: 'scheduled', priority: 'medium', performed_by: '', cost: 0 },
    }

    const openAdd = (type) => { setModalType(type); setEditingItem(null); setFormData(defaults[type]); setShowModal(true) }
    const openEdit = (type, item) => { setModalType(type); setEditingItem(item); setFormData({ ...item }); setShowModal(true) }

    /* ── CRUD Submit ─────────────────────────────────────────────── */
    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            let err
            const id = editingItem?.id
            if (modalType === 'users') {
                if (id) ({ error: err } = await db.updateUser(id, formData))
                else ({ error: err } = await db.createUser(formData))
            } else if (modalType === 'rooms') {
                if (id) ({ error: err } = await db.updateRoom(id, formData))
                else ({ error: err } = await db.createRoom(formData))
            } else if (modalType === 'patients') {
                if (id) ({ error: err } = await db.updatePatient(id, formData))
                else ({ error: err } = await db.createPatient(formData))
            } else if (modalType === 'equipment') {
                if (id) ({ error: err } = await db.updateEquipment(id, formData))
                else ({ error: err } = await db.createEquipment(formData))
            } else if (modalType === 'inventory') {
                if (id) ({ error: err } = await db.updateInventoryItem(id, formData))
                else ({ error: err } = await db.createInventoryItem(formData))
            } else if (modalType === 'maintenance') {
                if (id) ({ error: err } = await db.updateMaintenanceRecord(id, formData))
                else ({ error: err } = await db.createMaintenanceRecord(formData))
            }
            if (err) throw err
            notify(`${modalType} record ${id ? 'updated' : 'created'} successfully`)
            setShowModal(false)
            loadAll()
        } catch (err) {
            notify(err.message || 'Operation failed', 'error')
        }
    }

    /* ── Delete ──────────────────────────────────────────────────── */
    const handleDelete = (type, id, label) => {
        setConfirmDialog({
            message: `Delete "${label}"? This action cannot be undone.`,
            onConfirm: async () => {
                setConfirmDialog(null)
                try {
                    let err
                    if (type === 'users') ({ error: err } = await db.updateUser(id, { is_active: false })) // soft delete
                    else if (type === 'rooms') ({ error: err } = await db.deleteRoom(id))
                    else if (type === 'patients') ({ error: err } = await db.deletePatient(id))
                    else if (type === 'equipment') ({ error: err } = await db.deleteEquipment(id))
                    else if (type === 'inventory') ({ error: err } = await db.deleteInventoryItem(id))
                    else if (type === 'maintenance') ({ error: err } = await db.deleteMaintenanceRecord(id))
                    if (err) throw err
                    notify(`${type} record deleted`)
                    loadAll()
                } catch (err) { notify(err.message || 'Delete failed', 'error') }
            },
            onCancel: () => setConfirmDialog(null)
        })
    }

    const toggleActive = async (uid, current) => {
        const { error } = await db.updateUser(uid, { is_active: !current })
        if (error) notify(error.message, 'error')
        else { notify(`User ${!current ? 'activated' : 'deactivated'}`); loadAll() }
    }

    /* ── Badge ────────────────────────────────────────────────────── */
    const statusColor = { available: 'success', operational: 'success', admitted: 'info', in_stock: 'success', completed: 'success', occupied: 'warning', 'under_observation': 'warning', maintenance: 'warning', 'low_stock': 'warning', 'in_progress': 'warning', scheduled: 'info', 'out_of_service': 'danger', 'out_of_stock': 'danger', discharged: 'secondary', cancelled: 'secondary', emergency: 'danger' }
    const badge = (s) => <span className={`ad-badge ad-badge--${statusColor[s] || 'secondary'}`}>{s?.replace(/_/g, ' ')}</span>
    const roleBadge = (r) => {
        const map = { admin: 'role-admin', staff: 'role-staff', viewer: 'role-viewer' }
        return <span className={`ad-badge ${map[r] || ''}`}>{r}</span>
    }

    /* ── TABS ─────────────────────────────────────────────────────── */
    const TABS = [
        { id: 'overview', label: '📊 Overview' },
        { id: 'users', label: '👤 Users' },
        { id: 'rooms', label: '🏥 Rooms' },
        { id: 'patients', label: '👥 Patients' },
        { id: 'equipment', label: '🔧 Equipment' },
        { id: 'inventory', label: '📦 Inventory' },
        { id: 'maintenance', label: '🛠 Maintenance' },
        { id: 'audit', label: '📋 Audit Log' },
    ]

    /* ── RENDER ───────────────────────────────────────────────────── */
    return (
        <div className="ad-page">
            {notification && <Notification {...notification} onClose={() => setNotification(null)} />}
            {confirmDialog && <ConfirmDialog {...confirmDialog} />}

            {/* Header */}
            <div className="ad-header">
                <div>
                    <h1>Admin Dashboard</h1>
                    <p>Full system control · Logged in as <strong>{user?.full_name || 'Administrator'}</strong></p>
                </div>
                <div className="ad-header-actions">
                    <button className="ad-btn ad-btn--outline" onClick={loadAll}>🔄 Refresh</button>
                    <button className="ad-btn ad-btn--export" onClick={() => exportCSV(patients, 'patients.csv')}>📥 Export Patients</button>
                </div>
            </div>

            {/* Alerts Banner */}
            {alerts.length > 0 && (
                <div className="ad-alerts-banner">
                    <div className="ad-alerts-title">🚨 Critical Alerts ({alerts.length})</div>
                    <div className="ad-alerts-list">
                        {alerts.slice(0, 6).map((a, i) => (
                            <div key={i} className={`ad-alert-chip ad-alert-chip--${a.type}`}>{a.icon} {a.msg}</div>
                        ))}
                        {alerts.length > 6 && <div className="ad-alert-chip ad-alert-chip--secondary">+{alerts.length - 6} more</div>}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="ad-tabs">
                {TABS.map(t => (
                    <button key={t.id} className={`ad-tab ${activeTab === t.id ? 'ad-tab--active' : ''}`} onClick={() => setActiveTab(t.id)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="ad-content">
                {loading ? (
                    <div className="ad-loading"><div className="ad-spinner" /><p>Loading data...</p></div>
                ) : (
                    <>
                        {/* ── OVERVIEW ── */}
                        {activeTab === 'overview' && stats && (
                            <div className="ad-overview">
                                <div className="ad-stats-grid">
                                    <StatBox icon="👤" label="Total Users" value={stats.users.total} sub={`${stats.users.active} active`} color="blue" />
                                    <StatBox icon="🏥" label="Available Rooms" value={stats.rooms.available} sub={`of ${stats.rooms.total} total`} color="green" />
                                    <StatBox icon="👥" label="Admitted Patients" value={stats.patients.admitted} sub={`of ${stats.patients.total} total`} color="purple" />
                                    <StatBox icon="🔧" label="Operational Equip." value={stats.equipment.operational} sub={`${stats.equipment.critical} critical`} color="amber" />
                                    <StatBox icon="📦" label="Stock Issues" value={stats.inventory.lowStock + stats.inventory.outOfStock} sub={`${stats.inventory.outOfStock} out of stock`} color="red" />
                                    <StatBox icon="🛠" label="Pending Maintenance" value={stats.maintenance.pending} sub={`of ${stats.maintenance.total} total`} color="orange" />
                                </div>

                                {/* Role distribution */}
                                <div className="ad-overview-section">
                                    <h3>👥 User Distribution</h3>
                                    <div className="ad-role-bars">
                                        <RoleBar label="Admin" count={stats.users.admins} total={stats.users.total} color="#ea4335" />
                                        <RoleBar label="Staff" count={stats.users.staff} total={stats.users.total} color="#3b82f6" />
                                        <RoleBar label="Viewer" count={stats.users.total - stats.users.admins - stats.users.staff} total={stats.users.total} color="#10b981" />
                                    </div>
                                </div>

                                {/* Quick stats table */}
                                <div className="ad-overview-section">
                                    <h3>🏥 Room Status</h3>
                                    <div className="ad-mini-stats">
                                        <div className="ad-mini-stat ad-mini-stat--green"><span>Available</span><strong>{stats.rooms.available}</strong></div>
                                        <div className="ad-mini-stat ad-mini-stat--amber"><span>Occupied</span><strong>{stats.rooms.occupied}</strong></div>
                                        <div className="ad-mini-stat ad-mini-stat--red"><span>Maintenance</span><strong>{stats.rooms.maintenance}</strong></div>
                                    </div>
                                </div>

                                {/* Export section */}
                                <div className="ad-overview-section">
                                    <h3>📥 Export Data</h3>
                                    <div className="ad-export-btns">
                                        <button className="ad-btn ad-btn--export-sm" onClick={() => exportCSV(patients, 'patients.csv')}>📋 Patients CSV</button>
                                        <button className="ad-btn ad-btn--export-sm" onClick={() => exportCSV(equipment, 'equipment.csv')}>🔧 Equipment CSV</button>
                                        <button className="ad-btn ad-btn--export-sm" onClick={() => exportCSV(inventory, 'inventory.csv')}>📦 Inventory CSV</button>
                                        <button className="ad-btn ad-btn--export-sm" onClick={() => exportCSV(maintenance, 'maintenance.csv')}>🛠 Maintenance CSV</button>
                                        <button className="ad-btn ad-btn--export-sm" onClick={() => exportCSV(users, 'users.csv')}>👤 Users CSV</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── USERS ── */}
                        {activeTab === 'users' && (
                            <TablePanel title="User Management" onAdd={() => openAdd('users')}
                                search={searches.users || ''} onSearch={v => setSearches(p => ({ ...p, users: v }))}
                                statusFilter={statusFilters.users || 'all'} onStatusFilter={v => setStatusFilters(p => ({ ...p, users: v }))}
                                statusOptions={[{ v: 'admin', l: 'Admin' }, { v: 'staff', l: 'Staff' }, { v: 'viewer', l: 'Viewer' }]}
                                statusLabel="Role"
                                onExport={() => exportCSV(users, 'users.csv')}
                            >
                                <table className="ad-table">
                                    <thead><tr>
                                        <th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Phone</th><th>Status</th><th>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {filtered(users, 'users', ['full_name', 'email', 'department', 'phone']).map(u => (
                                            <tr key={u.id} className={!u.is_active ? 'ad-row--inactive' : ''}>
                                                <td data-label="Name"><strong>{u.full_name}</strong></td>
                                                <td data-label="Email">{u.email}</td>
                                                <td data-label="Role">{roleBadge(u.role)}</td>
                                                <td data-label="Department">{u.department || '-'}</td>
                                                <td data-label="Phone">{u.phone || '-'}</td>
                                                <td data-label="Status">
                                                    <span className={`ad-badge ${u.is_active ? 'ad-badge--success' : 'ad-badge--secondary'}`}>
                                                        {u.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td data-label="Actions" className="ad-actions">
                                                    <button className="ad-btn-icon ad-btn-icon--edit" onClick={() => openEdit('users', u)} title="Edit">✏️</button>
                                                    <button className={`ad-btn-icon ${u.is_active ? 'ad-btn-icon--warn' : 'ad-btn-icon--success'}`}
                                                        onClick={() => toggleActive(u.id, u.is_active)} title={u.is_active ? 'Deactivate' : 'Activate'}>
                                                        {u.is_active ? '🚫' : '✅'}
                                                    </button>
                                                    <button className="ad-btn-icon ad-btn-icon--delete" onClick={() => handleDelete('users', u.id, u.full_name)} title="Delete">🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filtered(users, 'users', ['full_name', 'email']).length === 0 && <tr><td colSpan="7" className="ad-empty">No users found</td></tr>}
                                    </tbody>
                                </table>
                            </TablePanel>
                        )}

                        {/* ── ROOMS ── */}
                        {activeTab === 'rooms' && (
                            <TablePanel title="Room Management" onAdd={() => openAdd('rooms')}
                                search={searches.rooms || ''} onSearch={v => setSearches(p => ({ ...p, rooms: v }))}
                                statusFilter={statusFilters.rooms || 'all'} onStatusFilter={v => setStatusFilters(p => ({ ...p, rooms: v }))}
                                statusOptions={[{ v: 'available', l: 'Available' }, { v: 'occupied', l: 'Occupied' }, { v: 'maintenance', l: 'Maintenance' }]}
                                onExport={() => exportCSV(rooms, 'rooms.csv')}
                            >
                                <table className="ad-table">
                                    <thead><tr>
                                        <th>Room No.</th><th>Type</th><th>Floor</th><th>Status</th><th>Notes</th><th>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {filtered(rooms, 'rooms', ['room_number', 'room_type', 'notes']).map(r => (
                                            <tr key={r.id}>
                                                <td data-label="Room No."><strong>{r.room_number}</strong></td>
                                                <td data-label="Type">{r.room_type}</td>
                                                <td data-label="Floor">Floor {r.floor}</td>
                                                <td data-label="Status">{badge(r.status)}</td>
                                                <td data-label="Notes" className="ad-truncate">{r.notes || '-'}</td>
                                                <td data-label="Actions" className="ad-actions">
                                                    <button className="ad-btn-icon ad-btn-icon--edit" onClick={() => openEdit('rooms', r)}>✏️</button>
                                                    <button className="ad-btn-icon ad-btn-icon--delete" onClick={() => handleDelete('rooms', r.id, r.room_number)}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filtered(rooms, 'rooms', ['room_number', 'room_type']).length === 0 && <tr><td colSpan="6" className="ad-empty">No rooms found</td></tr>}
                                    </tbody>
                                </table>
                            </TablePanel>
                        )}

                        {/* ── PATIENTS ── */}
                        {activeTab === 'patients' && (
                            <TablePanel title="Patient Management" onAdd={() => openAdd('patients')}
                                search={searches.patients || ''} onSearch={v => setSearches(p => ({ ...p, patients: v }))}
                                statusFilter={statusFilters.patients || 'all'} onStatusFilter={v => setStatusFilters(p => ({ ...p, patients: v }))}
                                statusOptions={[{ v: 'admitted', l: 'Admitted' }, { v: 'under_observation', l: 'Under Obs.' }, { v: 'emergency', l: 'Emergency' }, { v: 'discharged', l: 'Discharged' }]}
                                onExport={() => exportCSV(patients, 'patients.csv')}
                            >
                                <table className="ad-table">
                                    <thead><tr>
                                        <th>Patient ID</th><th>Name</th><th>Gender</th><th>Blood</th><th>Room</th><th>Status</th><th>Admitted</th><th>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {filtered(patients, 'patients', ['patient_id', 'patient_name', 'phone']).map(p => (
                                            <tr key={p.id}>
                                                <td data-label="Patient ID"><span className="ad-mono">{p.patient_id}</span></td>
                                                <td data-label="Name"><strong>{p.patient_name}</strong></td>
                                                <td data-label="Gender">{p.gender}</td>
                                                <td data-label="Blood"><span className="ad-blood">{p.blood_group || '-'}</span></td>
                                                <td data-label="Room">{p.current_room || '-'}</td>
                                                <td data-label="Status">{badge(p.status)}</td>
                                                <td data-label="Admitted">{p.admission_date ? new Date(p.admission_date).toLocaleDateString() : '-'}</td>
                                                <td data-label="Actions" className="ad-actions">
                                                    <button className="ad-btn-icon ad-btn-icon--edit" onClick={() => openEdit('patients', p)}>✏️</button>
                                                    <button className="ad-btn-icon ad-btn-icon--delete" onClick={() => handleDelete('patients', p.id, p.patient_name)}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filtered(patients, 'patients', ['patient_id', 'patient_name']).length === 0 && <tr><td colSpan="8" className="ad-empty">No patients found</td></tr>}
                                    </tbody>
                                </table>
                            </TablePanel>
                        )}

                        {/* ── EQUIPMENT ── */}
                        {activeTab === 'equipment' && (
                            <TablePanel title="Equipment Management" onAdd={() => openAdd('equipment')}
                                search={searches.equipment || ''} onSearch={v => setSearches(p => ({ ...p, equipment: v }))}
                                statusFilter={statusFilters.equipment || 'all'} onStatusFilter={v => setStatusFilters(p => ({ ...p, equipment: v }))}
                                statusOptions={[{ v: 'operational', l: 'Operational' }, { v: 'maintenance', l: 'Maintenance' }, { v: 'out_of_service', l: 'Out of Service' }]}
                                onExport={() => exportCSV(equipment, 'equipment.csv')}
                            >
                                <table className="ad-table">
                                    <thead><tr>
                                        <th>Name</th><th>Type</th><th>Serial</th><th>Dept.</th><th>Status</th><th>Criticality</th><th>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {filtered(equipment, 'equipment', ['equipment_name', 'equipment_type', 'serial_number', 'department']).map(e => (
                                            <tr key={e.id}>
                                                <td data-label="Name"><strong>{e.equipment_name}</strong></td>
                                                <td data-label="Type">{e.equipment_type}</td>
                                                <td data-label="Serial"><span className="ad-mono">{e.serial_number}</span></td>
                                                <td data-label="Dept.">{e.department}</td>
                                                <td data-label="Status">{badge(e.status)}</td>
                                                <td data-label="Criticality"><span className={`ad-criticality ad-criticality--${e.criticality}`}>{e.criticality}</span></td>
                                                <td data-label="Actions" className="ad-actions">
                                                    <button className="ad-btn-icon ad-btn-icon--edit" onClick={() => openEdit('equipment', e)}>✏️</button>
                                                    <button className="ad-btn-icon ad-btn-icon--delete" onClick={() => handleDelete('equipment', e.id, e.equipment_name)}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filtered(equipment, 'equipment', ['equipment_name']).length === 0 && <tr><td colSpan="7" className="ad-empty">No equipment found</td></tr>}
                                    </tbody>
                                </table>
                            </TablePanel>
                        )}

                        {/* ── INVENTORY ── */}
                        {activeTab === 'inventory' && (
                            <TablePanel title="Inventory Management" onAdd={() => openAdd('inventory')}
                                search={searches.inventory || ''} onSearch={v => setSearches(p => ({ ...p, inventory: v }))}
                                statusFilter={statusFilters.inventory || 'all'} onStatusFilter={v => setStatusFilters(p => ({ ...p, inventory: v }))}
                                statusOptions={[{ v: 'in_stock', l: 'In Stock' }, { v: 'low_stock', l: 'Low Stock' }, { v: 'out_of_stock', l: 'Out of Stock' }]}
                                onExport={() => exportCSV(inventory, 'inventory.csv')}
                            >
                                <table className="ad-table">
                                    <thead><tr>
                                        <th>Item</th><th>Category</th><th>Code</th><th>Stock</th><th>Min</th><th>Status</th><th>Price</th><th>Supplier</th><th>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {filtered(inventory, 'inventory', ['item_name', 'category', 'code', 'supplier']).map(i => (
                                            <tr key={i.id}>
                                                <td data-label="Item"><strong>{i.item_name}</strong></td>
                                                <td data-label="Category">{i.category}</td>
                                                <td data-label="Code"><span className="ad-mono">{i.code}</span></td>
                                                <td data-label="Stock"><span className={i.current_stock <= i.minimum_stock ? 'ad-stock-low' : ''}>{i.current_stock}</span></td>
                                                <td data-label="Min">{i.minimum_stock}</td>
                                                <td data-label="Status">{badge(i.status)}</td>
                                                <td data-label="Price">₹{Number(i.unit_price || 0).toFixed(2)}</td>
                                                <td data-label="Supplier">{i.supplier}</td>
                                                <td data-label="Actions" className="ad-actions">
                                                    <button className="ad-btn-icon ad-btn-icon--edit" onClick={() => openEdit('inventory', i)}>✏️</button>
                                                    <button className="ad-btn-icon ad-btn-icon--delete" onClick={() => handleDelete('inventory', i.id, i.item_name)}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filtered(inventory, 'inventory', ['item_name']).length === 0 && <tr><td colSpan="9" className="ad-empty">No items found</td></tr>}
                                    </tbody>
                                </table>
                            </TablePanel>
                        )}

                        {/* ── MAINTENANCE ── */}
                        {activeTab === 'maintenance' && (
                            <TablePanel title="Maintenance Records" onAdd={() => openAdd('maintenance')}
                                search={searches.maintenance || ''} onSearch={v => setSearches(p => ({ ...p, maintenance: v }))}
                                statusFilter={statusFilters.maintenance || 'all'} onStatusFilter={v => setStatusFilters(p => ({ ...p, maintenance: v }))}
                                statusOptions={[{ v: 'scheduled', l: 'Scheduled' }, { v: 'in_progress', l: 'In Progress' }, { v: 'completed', l: 'Completed' }, { v: 'cancelled', l: 'Cancelled' }]}
                                onExport={() => exportCSV(maintenance, 'maintenance.csv')}
                            >
                                <table className="ad-table">
                                    <thead><tr>
                                        <th>Date</th><th>Asset</th><th>Type</th><th>Issue</th><th>Status</th><th>Priority</th><th>Cost</th><th>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {filtered(maintenance, 'maintenance', ['asset_name', 'maintenance_type', 'performed_by']).map(m => (
                                            <tr key={m.id}>
                                                <td data-label="Date">{m.maintenance_date ? new Date(m.maintenance_date).toLocaleDateString() : '-'}</td>
                                                <td data-label="Asset"><strong>{m.asset_name}</strong></td>
                                                <td data-label="Type">{m.maintenance_type}</td>
                                                <td data-label="Issue" className="ad-truncate">{m.issue_description}</td>
                                                <td data-label="Status">{badge(m.status)}</td>
                                                <td data-label="Priority"><span className={`ad-criticality ad-criticality--${m.priority}`}>{m.priority}</span></td>
                                                <td data-label="Cost">₹{Number(m.cost || 0).toFixed(2)}</td>
                                                <td data-label="Actions" className="ad-actions">
                                                    <button className="ad-btn-icon ad-btn-icon--edit" onClick={() => openEdit('maintenance', m)}>✏️</button>
                                                    <button className="ad-btn-icon ad-btn-icon--delete" onClick={() => handleDelete('maintenance', m.id, m.asset_name)}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filtered(maintenance, 'maintenance', ['asset_name']).length === 0 && <tr><td colSpan="8" className="ad-empty">No records found</td></tr>}
                                    </tbody>
                                </table>
                            </TablePanel>
                        )}

                        {/* ── AUDIT LOG ── */}
                        {activeTab === 'audit' && (
                            <div className="ad-panel">
                                <div className="ad-panel__header">
                                    <h2>📋 Audit Log</h2>
                                    <button className="ad-btn ad-btn--secondary" onClick={() => setAuditLog([])}>Clear Log</button>
                                </div>
                                <div className="ad-audit-list">
                                    {auditLog.length === 0 ? (
                                        <div className="ad-empty" style={{ padding: '3rem', textAlign: 'center' }}>No audit entries yet. Perform CRUD operations to see logs here.</div>
                                    ) : auditLog.map(entry => (
                                        <div key={entry.id} className={`ad-audit-entry ad-audit-entry--${entry.type}`}>
                                            <div className="ad-audit-icon">{entry.type === 'error' ? '❌' : '✅'}</div>
                                            <div className="ad-audit-body">
                                                <div className="ad-audit-action">{entry.action}</div>
                                                <div className="ad-audit-meta">{entry.user} · {entry.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="ad-overlay" onClick={() => setShowModal(false)}>
                    <div className="ad-modal" onClick={e => e.stopPropagation()}>
                        <div className="ad-modal__header">
                            <h2>{editingItem ? '✏️ Edit' : '➕ Add'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}</h2>
                            <button className="ad-modal__close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="ad-modal__form">

                            {/* USER FORM */}
                            {modalType === 'users' && (
                                <>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Full Name *</label>
                                            <input type="text" required placeholder="Dr. Jane Smith"
                                                value={formData.full_name || ''}
                                                onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} />
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Email *</label>
                                            <input type="email" required placeholder="jane@hospital.com"
                                                value={formData.email || ''}
                                                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Role *</label>
                                            <select required value={formData.role || 'staff'} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}>
                                                <option value="admin">Admin</option>
                                                <option value="staff">Staff</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Department</label>
                                            <input type="text" placeholder="Cardiology"
                                                value={formData.department || ''}
                                                onChange={e => setFormData(p => ({ ...p, department: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Phone</label>
                                            <input type="tel" placeholder="+91 XXXXX XXXXX"
                                                value={formData.phone || ''}
                                                onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
                                        </div>
                                        <div className="ad-form-group ad-form-group--center">
                                            <label>Account Active</label>
                                            <label className="ad-toggle">
                                                <input type="checkbox" checked={!!formData.is_active}
                                                    onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} />
                                                <span className="ad-toggle__slider" />
                                                <span>{formData.is_active ? 'Active' : 'Inactive'}</span>
                                            </label>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ROOM FORM */}
                            {modalType === 'rooms' && (
                                <>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Room Number *</label>
                                            <input type="text" required placeholder="R-101"
                                                value={formData.room_number || ''}
                                                onChange={e => setFormData(p => ({ ...p, room_number: e.target.value }))} />
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Room Type</label>
                                            <select value={formData.room_type || 'General'} onChange={e => setFormData(p => ({ ...p, room_type: e.target.value }))}>
                                                <option>General</option><option>ICU</option><option>Private</option>
                                                <option>Semi-Private</option><option>Emergency</option><option>Operation Theatre</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Floor</label>
                                            <input type="number" min="0" value={formData.floor || 1}
                                                onChange={e => setFormData(p => ({ ...p, floor: Number(e.target.value) }))} />
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Status</label>
                                            <select value={formData.status || 'available'} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                                                <option value="available">Available</option>
                                                <option value="occupied">Occupied</option>
                                                <option value="maintenance">Maintenance</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="ad-form-group">
                                        <label>Notes</label>
                                        <textarea rows={3} placeholder="Additional notes..."
                                            value={formData.notes || ''}
                                            onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
                                    </div>
                                </>
                            )}

                            {/* PATIENT FORM */}
                            {modalType === 'patients' && (
                                <>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Patient ID *</label>
                                            <input type="text" required placeholder="PT-2024-001"
                                                value={formData.patient_id || ''}
                                                onChange={e => setFormData(p => ({ ...p, patient_id: e.target.value }))}
                                                disabled={!!editingItem} />
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Full Name *</label>
                                            <input type="text" required placeholder="Patient Name"
                                                value={formData.patient_name || ''}
                                                onChange={e => setFormData(p => ({ ...p, patient_name: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Date of Birth</label>
                                            <input type="date" value={formData.date_of_birth || ''}
                                                onChange={e => setFormData(p => ({ ...p, date_of_birth: e.target.value }))} />
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Gender</label>
                                            <select value={formData.gender || 'Male'} onChange={e => setFormData(p => ({ ...p, gender: e.target.value }))}>
                                                <option>Male</option><option>Female</option><option>Other</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Blood Group</label>
                                            <select value={formData.blood_group || ''} onChange={e => setFormData(p => ({ ...p, blood_group: e.target.value }))}>
                                                <option value="">Select</option>
                                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg}>{bg}</option>)}
                                            </select>
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Phone</label>
                                            <input type="tel" placeholder="Phone number"
                                                value={formData.phone || ''}
                                                onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Room</label>
                                            <select value={formData.current_room || ''} onChange={e => setFormData(p => ({ ...p, current_room: e.target.value }))}>
                                                <option value="">No Room</option>
                                                {rooms.map(r => <option key={r.id} value={r.room_number}>{r.room_number} ({r.room_type})</option>)}
                                            </select>
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Status *</label>
                                            <select required value={formData.status || 'admitted'} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                                                <option value="admitted">Admitted</option>
                                                <option value="under_observation">Under Observation</option>
                                                <option value="emergency">Emergency</option>
                                                <option value="discharged">Discharged</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="ad-form-group">
                                        <label>Admission Date</label>
                                        <input type="datetime-local" value={formData.admission_date || ''}
                                            onChange={e => setFormData(p => ({ ...p, admission_date: e.target.value }))} />
                                    </div>
                                </>
                            )}

                            {/* EQUIPMENT FORM */}
                            {modalType === 'equipment' && (
                                <>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Equipment Name *</label>
                                            <input type="text" required value={formData.equipment_name || ''}
                                                onChange={e => setFormData(p => ({ ...p, equipment_name: e.target.value }))} />
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Type</label>
                                            <input type="text" value={formData.equipment_type || ''}
                                                onChange={e => setFormData(p => ({ ...p, equipment_type: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Serial Number</label>
                                            <input type="text" value={formData.serial_number || ''}
                                                onChange={e => setFormData(p => ({ ...p, serial_number: e.target.value }))} />
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Manufacturer</label>
                                            <input type="text" value={formData.manufacturer || ''}
                                                onChange={e => setFormData(p => ({ ...p, manufacturer: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Department</label>
                                            <input type="text" value={formData.department || ''}
                                                onChange={e => setFormData(p => ({ ...p, department: e.target.value }))} />
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Location</label>
                                            <input type="text" value={formData.location || ''}
                                                onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Status</label>
                                            <select value={formData.status || 'operational'} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                                                <option value="operational">Operational</option>
                                                <option value="maintenance">Maintenance</option>
                                                <option value="out_of_service">Out of Service</option>
                                            </select>
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Criticality</label>
                                            <select value={formData.criticality || 'low'} onChange={e => setFormData(p => ({ ...p, criticality: e.target.value }))}>
                                                <option value="low">Low</option><option value="medium">Medium</option>
                                                <option value="high">High</option><option value="critical">Critical</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* INVENTORY FORM */}
                            {modalType === 'inventory' && (
                                <>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Item Name *</label>
                                            <input type="text" required value={formData.item_name || ''}
                                                onChange={e => setFormData(p => ({ ...p, item_name: e.target.value }))} />
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Category</label>
                                            <input type="text" value={formData.category || ''}
                                                onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Code</label>
                                            <input type="text" value={formData.code || ''}
                                                onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} />
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Supplier</label>
                                            <input type="text" value={formData.supplier || ''}
                                                onChange={e => setFormData(p => ({ ...p, supplier: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Current Stock</label>
                                            <input type="number" min="0" value={formData.current_stock || 0}
                                                onChange={e => setFormData(p => ({ ...p, current_stock: Number(e.target.value) }))} />
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Minimum Stock</label>
                                            <input type="number" min="0" value={formData.minimum_stock || 0}
                                                onChange={e => setFormData(p => ({ ...p, minimum_stock: Number(e.target.value) }))} />
                                        </div>
                                    </div>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Unit Price (₹)</label>
                                            <input type="number" min="0" step="0.01" value={formData.unit_price || 0}
                                                onChange={e => setFormData(p => ({ ...p, unit_price: Number(e.target.value) }))} />
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Status</label>
                                            <select value={formData.status || 'in_stock'} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                                                <option value="in_stock">In Stock</option>
                                                <option value="low_stock">Low Stock</option>
                                                <option value="out_of_stock">Out of Stock</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* MAINTENANCE FORM */}
                            {modalType === 'maintenance' && (
                                <>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Asset Name *</label>
                                            <input type="text" required value={formData.asset_name || ''}
                                                onChange={e => setFormData(p => ({ ...p, asset_name: e.target.value }))} />
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Maintenance Date</label>
                                            <input type="date" value={formData.maintenance_date || ''}
                                                onChange={e => setFormData(p => ({ ...p, maintenance_date: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Type</label>
                                            <select value={formData.maintenance_type || 'preventive'} onChange={e => setFormData(p => ({ ...p, maintenance_type: e.target.value }))}>
                                                <option value="preventive">Preventive</option><option value="corrective">Corrective</option>
                                                <option value="emergency">Emergency</option><option value="routine">Routine</option>
                                            </select>
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Priority</label>
                                            <select value={formData.priority || 'medium'} onChange={e => setFormData(p => ({ ...p, priority: e.target.value }))}>
                                                <option value="low">Low</option><option value="medium">Medium</option>
                                                <option value="high">High</option><option value="critical">Critical</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="ad-form-group">
                                        <label>Issue Description</label>
                                        <textarea rows={3} value={formData.issue_description || ''}
                                            onChange={e => setFormData(p => ({ ...p, issue_description: e.target.value }))} />
                                    </div>
                                    <div className="ad-form-row">
                                        <div className="ad-form-group">
                                            <label>Status</label>
                                            <select value={formData.status || 'scheduled'} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                                                <option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option>
                                                <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                        <div className="ad-form-group">
                                            <label>Performed By</label>
                                            <input type="text" value={formData.performed_by || ''}
                                                onChange={e => setFormData(p => ({ ...p, performed_by: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="ad-form-group">
                                        <label>Cost (₹)</label>
                                        <input type="number" min="0" step="0.01" value={formData.cost || 0}
                                            onChange={e => setFormData(p => ({ ...p, cost: Number(e.target.value) }))} />
                                    </div>
                                </>
                            )}

                            <div className="ad-modal__actions">
                                <button type="button" className="ad-btn ad-btn--secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="ad-btn ad-btn--primary">{editingItem ? '💾 Update' : '➕ Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ─── Sub-components ─────────────────────────────────────────────── */
function StatBox({ icon, label, value, sub, color }) {
    return (
        <div className={`ad-stat-box ad-stat-box--${color}`}>
            <div className="ad-stat-box__icon">{icon}</div>
            <div className="ad-stat-box__value">{value}</div>
            <div className="ad-stat-box__label">{label}</div>
            <div className="ad-stat-box__sub">{sub}</div>
        </div>
    )
}

function RoleBar({ label, count, total, color }) {
    const pct = total > 0 ? Math.round(count / total * 100) : 0
    return (
        <div className="ad-role-bar">
            <div className="ad-role-bar__label"><span>{label}</span><span>{count}</span></div>
            <div className="ad-role-bar__track">
                <div className="ad-role-bar__fill" style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    )
}

function TablePanel({ title, onAdd, search, onSearch, statusFilter, onStatusFilter, statusOptions, statusLabel = 'Status', onExport, children }) {
    return (
        <div className="ad-panel">
            <div className="ad-panel__header">
                <h2>{title}</h2>
                <div className="ad-toolbar">
                    <input type="text" placeholder="Search..." className="ad-search" value={search} onChange={e => onSearch(e.target.value)} />
                    <select className="ad-filter" value={statusFilter} onChange={e => onStatusFilter(e.target.value)}>
                        <option value="all">All {statusLabel}</option>
                        {statusOptions.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                    <button className="ad-btn ad-btn--export-sm" onClick={onExport}>📥 CSV</button>
                    <button className="ad-btn ad-btn--primary" onClick={onAdd}>➕ Add</button>
                </div>
            </div>
            <div className="ad-table-wrap">{children}</div>
        </div>
    )
}
