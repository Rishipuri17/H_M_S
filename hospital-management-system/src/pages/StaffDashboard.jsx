import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './StaffDashboard.css'

/* ─── Notification helper ─────────────────────────────────────────── */
function Notification({ message, type, onClose }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3500)
        return () => clearTimeout(t)
    }, [onClose])
    return (
        <div className={`sd-notification sd-notification--${type}`}>
            <span>{type === 'success' ? '✅' : '❌'} {message}</span>
            <button onClick={onClose}>×</button>
        </div>
    )
}

/* ─── Confirm Dialog ──────────────────────────────────────────────── */
function ConfirmDialog({ message, onConfirm, onCancel }) {
    return (
        <div className="sd-overlay" onClick={onCancel}>
            <div className="sd-confirm" onClick={e => e.stopPropagation()}>
                <p>{message}</p>
                <div className="sd-confirm__actions">
                    <button className="sd-btn sd-btn--secondary" onClick={onCancel}>Cancel</button>
                    <button className="sd-btn sd-btn--danger" onClick={onConfirm}>Delete</button>
                </div>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function StaffDashboard() {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('patients')
    const [stats, setStats] = useState(null)
    const [notification, setNotification] = useState(null)
    const [confirmDialog, setConfirmDialog] = useState(null)

    // Data
    const [patients, setPatients] = useState([])
    const [equipment, setEquipment] = useState([])
    const [inventory, setInventory] = useState([])
    const [maintenance, setMaintenance] = useState([])
    const [rooms, setRooms] = useState([])
    const [loading, setLoading] = useState(false)

    // Modal
    const [showModal, setShowModal] = useState(false)
    const [modalType, setModalType] = useState('') // patients | equipment | inventory | maintenance
    const [editingItem, setEditingItem] = useState(null)
    const [formData, setFormData] = useState({})

    // Search/filter per tab
    const [searchTerms, setSearchTerms] = useState({ patients: '', equipment: '', inventory: '', maintenance: '', rooms: '' })
    const [statusFilters, setStatusFilters] = useState({ patients: 'all', equipment: 'all', inventory: 'all', maintenance: 'all' })

    const notify = (message, type = 'success') => setNotification({ message, type })

    /* ── Load data ─────────────────────────────────────────────────── */
    const loadAll = useCallback(async () => {
        setLoading(true)
        try {
            const [p, eq, inv, m, r] = await Promise.all([
                db.getPatients(), db.getEquipment(), db.getInventory(),
                db.getMaintenanceRecords(), db.getRooms()
            ])
            setPatients(p.data || [])
            setEquipment(eq.data || [])
            setInventory(inv.data || [])
            setMaintenance(m.data || [])
            setRooms(r.data || [])

            const pts = p.data || []; const eqs = eq.data || []; const invs = inv.data || []
            setStats({
                admitted: pts.filter(x => x.status === 'admitted').length,
                totalPatients: pts.length,
                operational: eqs.filter(x => x.status === 'operational').length,
                totalEq: eqs.length,
                lowStock: invs.filter(x => x.status === 'low_stock' || x.status === 'out_of_stock').length,
                totalInv: invs.length,
                pendingMaint: (m.data || []).filter(x => x.status === 'scheduled' || x.status === 'in_progress').length,
            })
        } catch (err) {
            notify('Failed to load data', 'error')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadAll() }, [loadAll])

    /* ── Filter helpers ──────────────────────────────────────────────*/
    const filtered = (list, tab, fields) => {
        let res = list
        const q = searchTerms[tab]?.toLowerCase()
        if (q) res = res.filter(i => fields.some(f => String(i[f] || '').toLowerCase().includes(q)))
        const sf = statusFilters[tab]
        if (sf && sf !== 'all') res = res.filter(i => i.status === sf)
        return res
    }

    /* ── Default form data per type ──────────────────────────────── */
    const defaultForm = (type) => ({
        patients: { patient_id: '', patient_name: '', date_of_birth: '', gender: 'Male', blood_group: '', phone: '', current_room: '', status: 'admitted', admission_date: new Date().toISOString().slice(0, 16) },
        equipment: { equipment_name: '', equipment_type: '', serial_number: '', manufacturer: '', location: '', status: 'operational', criticality: 'low', department: '' },
        inventory: { item_name: '', category: '', code: '', current_stock: 0, minimum_stock: 0, status: 'in_stock', unit_price: 0, supplier: '' },
        maintenance: { maintenance_date: new Date().toISOString().slice(0, 10), maintenance_type: 'preventive', asset_name: '', issue_description: '', status: 'scheduled', priority: 'medium', performed_by: '', cost: 0 },
    }[type])

    const openAdd = (type) => {
        setModalType(type); setEditingItem(null); setFormData(defaultForm(type)); setShowModal(true)
    }
    const openEdit = (type, item) => {
        setModalType(type); setEditingItem(item); setFormData({ ...item }); setShowModal(true)
    }

    /* ── CRUD Submit ─────────────────────────────────────────────── */
    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            let err
            if (modalType === 'patients') {
                if (editingItem) ({ error: err } = await db.updatePatient(editingItem.id, formData))
                else ({ error: err } = await db.createPatient(formData))
            } else if (modalType === 'equipment') {
                if (editingItem) ({ error: err } = await db.updateEquipment(editingItem.id, formData))
                else ({ error: err } = await db.createEquipment(formData))
            } else if (modalType === 'inventory') {
                if (editingItem) ({ error: err } = await db.updateInventoryItem(editingItem.id, formData))
                else ({ error: err } = await db.createInventoryItem(formData))
            } else if (modalType === 'maintenance') {
                if (editingItem) ({ error: err } = await db.updateMaintenanceRecord(editingItem.id, formData))
                else ({ error: err } = await db.createMaintenanceRecord(formData))
            }
            if (err) throw err
            notify(`${editingItem ? 'Updated' : 'Created'} successfully!`)
            setShowModal(false)
            loadAll()
        } catch (err) {
            notify(err.message || 'Operation failed', 'error')
        }
    }

    /* ── Delete ─────────────────────────────────────────────────── */
    const handleDelete = (type, id) => {
        setConfirmDialog({
            message: 'Are you sure you want to delete this record? This cannot be undone.',
            onConfirm: async () => {
                setConfirmDialog(null)
                try {
                    let err
                    if (type === 'patients') ({ error: err } = await db.deletePatient(id))
                    else if (type === 'equipment') ({ error: err } = await db.deleteEquipment(id))
                    else if (type === 'inventory') ({ error: err } = await db.deleteInventoryItem(id))
                    else if (type === 'maintenance') ({ error: err } = await db.deleteMaintenanceRecord(id))
                    if (err) throw err
                    notify('Record deleted successfully')
                    loadAll()
                } catch (err) { notify(err.message || 'Delete failed', 'error') }
            },
            onCancel: () => setConfirmDialog(null)
        })
    }

    /* ── Badge helpers ─────────────────────────────────────────── */
    const statusColor = { admitted: 'info', under_observation: 'warning', emergency: 'danger', discharged: 'success', operational: 'success', maintenance: 'warning', out_of_service: 'danger', in_stock: 'success', low_stock: 'warning', out_of_stock: 'danger', scheduled: 'info', in_progress: 'warning', completed: 'success', cancelled: 'secondary' }
    const badge = (s) => <span className={`sd-badge sd-badge--${statusColor[s] || 'secondary'}`}>{s?.replace(/_/g, ' ')}</span>

    /* ── Tabs ────────────────────────────────────────────────────── */
    const TABS = [
        { id: 'patients', label: '👥 Patients', editable: true },
        { id: 'equipment', label: '🔧 Equipment', editable: true },
        { id: 'inventory', label: '📦 Inventory', editable: true },
        { id: 'maintenance', label: '🛠 Maintenance', editable: true },
        { id: 'rooms', label: '🏥 Rooms', editable: false },
    ]

    /* ── Render ─────────────────────────────────────────────────── */
    return (
        <div className="sd-page">
            {notification && <Notification {...notification} onClose={() => setNotification(null)} />}
            {confirmDialog && <ConfirmDialog {...confirmDialog} />}

            {/* Header */}
            <div className="sd-header">
                <div>
                    <h1>Staff Dashboard</h1>
                    <p>Welcome back, <strong>{user?.full_name || 'Staff'}</strong> · {user?.department || 'General'}</p>
                </div>
                <button className="sd-btn sd-btn--outline" onClick={loadAll}>🔄 Refresh</button>
            </div>

            {/* Stats row */}
            {stats && (
                <div className="sd-stats">
                    <div className="sd-stat-card sd-stat-card--blue">
                        <div className="sd-stat-icon">👥</div>
                        <div>
                            <div className="sd-stat-value">{stats.admitted}</div>
                            <div className="sd-stat-label">Admitted Patients</div>
                            <div className="sd-stat-sub">of {stats.totalPatients} total</div>
                        </div>
                    </div>
                    <div className="sd-stat-card sd-stat-card--green">
                        <div className="sd-stat-icon">🔧</div>
                        <div>
                            <div className="sd-stat-value">{stats.operational}</div>
                            <div className="sd-stat-label">Operational Equipment</div>
                            <div className="sd-stat-sub">of {stats.totalEq} total</div>
                        </div>
                    </div>
                    <div className="sd-stat-card sd-stat-card--amber">
                        <div className="sd-stat-icon">📦</div>
                        <div>
                            <div className="sd-stat-value">{stats.lowStock}</div>
                            <div className="sd-stat-label">Inventory Alerts</div>
                            <div className="sd-stat-sub">of {stats.totalInv} items</div>
                        </div>
                    </div>
                    <div className="sd-stat-card sd-stat-card--red">
                        <div className="sd-stat-icon">🛠</div>
                        <div>
                            <div className="sd-stat-value">{stats.pendingMaint}</div>
                            <div className="sd-stat-label">Pending Maintenance</div>
                            <div className="sd-stat-sub">scheduled or in-progress</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick actions */}
            <div className="sd-quick-actions">
                <span className="sd-quick-label">⚡ Quick Add:</span>
                {TABS.filter(t => t.editable).map(t => (
                    <button key={t.id} className="sd-btn sd-btn--quick" onClick={() => { setActiveTab(t.id); openAdd(t.id) }}>
                        + {t.label.split(' ')[1]}
                    </button>
                ))}
            </div>

            {/* Tab bar */}
            <div className="sd-tabs">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        className={`sd-tab ${activeTab === t.id ? 'sd-tab--active' : ''}`}
                        onClick={() => setActiveTab(t.id)}
                    >
                        {t.label}
                        {!t.editable && <span className="sd-tab-badge">View</span>}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="sd-content">
                {loading ? (
                    <div className="sd-loading"><div className="sd-spinner" /><p>Loading...</p></div>
                ) : (
                    <>
                        {/* ── PATIENTS ── */}
                        {activeTab === 'patients' && (
                            <TabPanel
                                title="Patient Management"
                                onAdd={() => openAdd('patients')}
                                search={searchTerms.patients}
                                onSearch={v => setSearchTerms(p => ({ ...p, patients: v }))}
                                statusFilter={statusFilters.patients}
                                onStatusFilter={v => setStatusFilters(p => ({ ...p, patients: v }))}
                                statusOptions={['admitted', 'under_observation', 'emergency', 'discharged']}
                            >
                                <table className="sd-table">
                                    <thead><tr>
                                        <th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th>
                                        <th>Blood</th><th>Phone</th><th>Room</th><th>Status</th>
                                        <th>Admitted</th><th>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {filtered(patients, 'patients', ['patient_id', 'patient_name', 'phone']).map(p => (
                                            <tr key={p.id}>
                                                <td data-label="Patient ID"><span className="sd-mono">{p.patient_id}</span></td>
                                                <td data-label="Name"><strong>{p.patient_name}</strong></td>
                                                <td data-label="Age">{p.date_of_birth ? new Date().getFullYear() - new Date(p.date_of_birth).getFullYear() : '-'}</td>
                                                <td data-label="Gender">{p.gender}</td>
                                                <td data-label="Blood"><span className="sd-blood">{p.blood_group || '-'}</span></td>
                                                <td data-label="Phone">{p.phone || '-'}</td>
                                                <td data-label="Room">{p.current_room || '-'}</td>
                                                <td data-label="Status">{badge(p.status)}</td>
                                                <td data-label="Admitted">{p.admission_date ? new Date(p.admission_date).toLocaleDateString() : '-'}</td>
                                                <td data-label="Actions" className="sd-actions">
                                                    <button className="sd-btn-icon sd-btn-icon--edit" onClick={() => openEdit('patients', p)} title="Edit">✏️</button>
                                                    <button className="sd-btn-icon sd-btn-icon--delete" onClick={() => handleDelete('patients', p.id)} title="Delete">🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filtered(patients, 'patients', ['patient_id', 'patient_name', 'phone']).length === 0 && (
                                            <tr><td colSpan="10" className="sd-empty">No patients found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </TabPanel>
                        )}

                        {/* ── EQUIPMENT ── */}
                        {activeTab === 'equipment' && (
                            <TabPanel
                                title="Equipment Management"
                                onAdd={() => openAdd('equipment')}
                                search={searchTerms.equipment}
                                onSearch={v => setSearchTerms(p => ({ ...p, equipment: v }))}
                                statusFilter={statusFilters.equipment}
                                onStatusFilter={v => setStatusFilters(p => ({ ...p, equipment: v }))}
                                statusOptions={['operational', 'maintenance', 'out_of_service']}
                            >
                                <table className="sd-table">
                                    <thead><tr>
                                        <th>Name</th><th>Type</th><th>Serial</th><th>Manufacturer</th>
                                        <th>Department</th><th>Location</th><th>Status</th><th>Criticality</th><th>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {filtered(equipment, 'equipment', ['equipment_name', 'equipment_type', 'serial_number', 'department']).map(e => (
                                            <tr key={e.id}>
                                                <td data-label="Name"><strong>{e.equipment_name}</strong></td>
                                                <td data-label="Type">{e.equipment_type}</td>
                                                <td data-label="Serial"><span className="sd-mono">{e.serial_number}</span></td>
                                                <td data-label="Manufacturer">{e.manufacturer}</td>
                                                <td data-label="Department">{e.department}</td>
                                                <td data-label="Location">{e.location}</td>
                                                <td data-label="Status">{badge(e.status)}</td>
                                                <td data-label="Criticality"><span className={`sd-criticality sd-criticality--${e.criticality}`}>{e.criticality}</span></td>
                                                <td data-label="Actions" className="sd-actions">
                                                    <button className="sd-btn-icon sd-btn-icon--edit" onClick={() => openEdit('equipment', e)}>✏️</button>
                                                    <button className="sd-btn-icon sd-btn-icon--delete" onClick={() => handleDelete('equipment', e.id)}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filtered(equipment, 'equipment', ['equipment_name', 'equipment_type', 'serial_number', 'department']).length === 0 && (
                                            <tr><td colSpan="9" className="sd-empty">No equipment found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </TabPanel>
                        )}

                        {/* ── INVENTORY ── */}
                        {activeTab === 'inventory' && (
                            <TabPanel
                                title="Inventory Management"
                                onAdd={() => openAdd('inventory')}
                                search={searchTerms.inventory}
                                onSearch={v => setSearchTerms(p => ({ ...p, inventory: v }))}
                                statusFilter={statusFilters.inventory}
                                onStatusFilter={v => setStatusFilters(p => ({ ...p, inventory: v }))}
                                statusOptions={['in_stock', 'low_stock', 'out_of_stock']}
                            >
                                <table className="sd-table">
                                    <thead><tr>
                                        <th>Item Name</th><th>Category</th><th>Code</th>
                                        <th>Current Stock</th><th>Min Stock</th><th>Status</th>
                                        <th>Unit Price</th><th>Supplier</th><th>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {filtered(inventory, 'inventory', ['item_name', 'category', 'code', 'supplier']).map(i => (
                                            <tr key={i.id}>
                                                <td data-label="Item Name"><strong>{i.item_name}</strong></td>
                                                <td data-label="Category">{i.category}</td>
                                                <td data-label="Code"><span className="sd-mono">{i.code}</span></td>
                                                <td data-label="Current Stock">
                                                    <span className={i.current_stock <= i.minimum_stock ? 'sd-stock-low' : ''}>
                                                        {i.current_stock}
                                                    </span>
                                                </td>
                                                <td data-label="Min Stock">{i.minimum_stock}</td>
                                                <td data-label="Status">{badge(i.status)}</td>
                                                <td data-label="Unit Price">₹{Number(i.unit_price).toFixed(2)}</td>
                                                <td data-label="Supplier">{i.supplier}</td>
                                                <td data-label="Actions" className="sd-actions">
                                                    <button className="sd-btn-icon sd-btn-icon--edit" onClick={() => openEdit('inventory', i)}>✏️</button>
                                                    <button className="sd-btn-icon sd-btn-icon--delete" onClick={() => handleDelete('inventory', i.id)}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filtered(inventory, 'inventory', ['item_name', 'category', 'code', 'supplier']).length === 0 && (
                                            <tr><td colSpan="9" className="sd-empty">No inventory items found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </TabPanel>
                        )}

                        {/* ── MAINTENANCE ── */}
                        {activeTab === 'maintenance' && (
                            <TabPanel
                                title="Maintenance Records"
                                onAdd={() => openAdd('maintenance')}
                                search={searchTerms.maintenance}
                                onSearch={v => setSearchTerms(p => ({ ...p, maintenance: v }))}
                                statusFilter={statusFilters.maintenance}
                                onStatusFilter={v => setStatusFilters(p => ({ ...p, maintenance: v }))}
                                statusOptions={['scheduled', 'in_progress', 'completed', 'cancelled']}
                            >
                                <table className="sd-table">
                                    <thead><tr>
                                        <th>Date</th><th>Type</th><th>Asset</th><th>Issue</th>
                                        <th>Status</th><th>Priority</th><th>Performed By</th><th>Cost</th><th>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {filtered(maintenance, 'maintenance', ['asset_name', 'issue_description', 'performed_by', 'maintenance_type']).map(m => (
                                            <tr key={m.id}>
                                                <td data-label="Date">{m.maintenance_date ? new Date(m.maintenance_date).toLocaleDateString() : '-'}</td>
                                                <td data-label="Type">{m.maintenance_type}</td>
                                                <td data-label="Asset"><strong>{m.asset_name}</strong></td>
                                                <td data-label="Issue" className="sd-truncate">{m.issue_description}</td>
                                                <td data-label="Status">{badge(m.status)}</td>
                                                <td data-label="Priority"><span className={`sd-priority sd-priority--${m.priority}`}>{m.priority}</span></td>
                                                <td data-label="Performed By">{m.performed_by}</td>
                                                <td data-label="Cost">₹{Number(m.cost || 0).toFixed(2)}</td>
                                                <td data-label="Actions" className="sd-actions">
                                                    <button className="sd-btn-icon sd-btn-icon--edit" onClick={() => openEdit('maintenance', m)}>✏️</button>
                                                    <button className="sd-btn-icon sd-btn-icon--delete" onClick={() => handleDelete('maintenance', m.id)}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filtered(maintenance, 'maintenance', ['asset_name', 'issue_description', 'performed_by', 'maintenance_type']).length === 0 && (
                                            <tr><td colSpan="9" className="sd-empty">No maintenance records found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </TabPanel>
                        )}

                        {/* ── ROOMS (view only) ── */}
                        {activeTab === 'rooms' && (
                            <div className="sd-panel">
                                <div className="sd-panel__header">
                                    <h2>Rooms Overview <span className="sd-view-only-badge">View Only</span></h2>
                                    <div className="sd-toolbar">
                                        <input
                                            type="text" placeholder="Search rooms..."
                                            className="sd-search"
                                            value={searchTerms.rooms}
                                            onChange={e => setSearchTerms(p => ({ ...p, rooms: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="sd-rooms-grid">
                                    {rooms
                                        .filter(r => !searchTerms.rooms || r.room_number?.toLowerCase().includes(searchTerms.rooms.toLowerCase()) || r.room_type?.toLowerCase().includes(searchTerms.rooms.toLowerCase()))
                                        .map(r => (
                                            <div key={r.id} className={`sd-room-card sd-room-card--${r.status}`}>
                                                <div className="sd-room-number">{r.room_number}</div>
                                                <div className="sd-room-type">{r.room_type}</div>
                                                <div className="sd-room-floor">Floor {r.floor}</div>
                                                {badge(r.status)}
                                                {r.notes && <div className="sd-room-notes">{r.notes}</div>}
                                            </div>
                                        ))}
                                    {rooms.length === 0 && <p className="sd-empty">No rooms available</p>}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="sd-overlay" onClick={() => setShowModal(false)}>
                    <div className="sd-modal" onClick={e => e.stopPropagation()}>
                        <div className="sd-modal__header">
                            <h2>{editingItem ? 'Edit' : 'Add'} {modalType.charAt(0).toUpperCase() + modalType.slice(1).replace(/([A-Z])/g, ' $1')}</h2>
                            <button className="sd-modal__close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="sd-modal__form">
                            {/* PATIENT FORM */}
                            {modalType === 'patients' && (
                                <>
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Patient ID *</label>
                                            <input type="text" required placeholder="PT-2024-001"
                                                value={formData.patient_id || ''}
                                                onChange={e => setFormData(p => ({ ...p, patient_id: e.target.value }))}
                                                disabled={!!editingItem} />
                                        </div>
                                        <div className="sd-form-group">
                                            <label>Full Name *</label>
                                            <input type="text" required placeholder="Patient Name"
                                                value={formData.patient_name || ''}
                                                onChange={e => setFormData(p => ({ ...p, patient_name: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Date of Birth</label>
                                            <input type="date" value={formData.date_of_birth || ''}
                                                onChange={e => setFormData(p => ({ ...p, date_of_birth: e.target.value }))} />
                                        </div>
                                        <div className="sd-form-group">
                                            <label>Gender</label>
                                            <select value={formData.gender || 'Male'} onChange={e => setFormData(p => ({ ...p, gender: e.target.value }))}>
                                                <option>Male</option><option>Female</option><option>Other</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Blood Group</label>
                                            <select value={formData.blood_group || ''} onChange={e => setFormData(p => ({ ...p, blood_group: e.target.value }))}>
                                                <option value="">Select</option>
                                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg}>{bg}</option>)}
                                            </select>
                                        </div>
                                        <div className="sd-form-group">
                                            <label>Phone</label>
                                            <input type="tel" placeholder="Phone number"
                                                value={formData.phone || ''}
                                                onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Room</label>
                                            <select value={formData.current_room || ''} onChange={e => setFormData(p => ({ ...p, current_room: e.target.value }))}>
                                                <option value="">No Room</option>
                                                {rooms.map(r => <option key={r.id} value={r.room_number}>{r.room_number} ({r.room_type}) — {r.status}</option>)}
                                            </select>
                                        </div>
                                        <div className="sd-form-group">
                                            <label>Status *</label>
                                            <select required value={formData.status || 'admitted'} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                                                <option value="admitted">Admitted</option>
                                                <option value="under_observation">Under Observation</option>
                                                <option value="emergency">Emergency</option>
                                                <option value="discharged">Discharged</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="sd-form-group">
                                        <label>Admission Date</label>
                                        <input type="datetime-local" value={formData.admission_date || ''}
                                            onChange={e => setFormData(p => ({ ...p, admission_date: e.target.value }))} />
                                    </div>
                                </>
                            )}

                            {/* EQUIPMENT FORM */}
                            {modalType === 'equipment' && (
                                <>
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Equipment Name *</label>
                                            <input type="text" required placeholder="MRI Scanner"
                                                value={formData.equipment_name || ''}
                                                onChange={e => setFormData(p => ({ ...p, equipment_name: e.target.value }))} />
                                        </div>
                                        <div className="sd-form-group">
                                            <label>Type</label>
                                            <input type="text" placeholder="Imaging"
                                                value={formData.equipment_type || ''}
                                                onChange={e => setFormData(p => ({ ...p, equipment_type: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Serial Number</label>
                                            <input type="text" placeholder="SN-001"
                                                value={formData.serial_number || ''}
                                                onChange={e => setFormData(p => ({ ...p, serial_number: e.target.value }))} />
                                        </div>
                                        <div className="sd-form-group">
                                            <label>Manufacturer</label>
                                            <input type="text" placeholder="Siemens"
                                                value={formData.manufacturer || ''}
                                                onChange={e => setFormData(p => ({ ...p, manufacturer: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Department</label>
                                            <input type="text" placeholder="Radiology"
                                                value={formData.department || ''}
                                                onChange={e => setFormData(p => ({ ...p, department: e.target.value }))} />
                                        </div>
                                        <div className="sd-form-group">
                                            <label>Location</label>
                                            <input type="text" placeholder="Block A, Floor 2"
                                                value={formData.location || ''}
                                                onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Status</label>
                                            <select value={formData.status || 'operational'} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                                                <option value="operational">Operational</option>
                                                <option value="maintenance">Maintenance</option>
                                                <option value="out_of_service">Out of Service</option>
                                            </select>
                                        </div>
                                        <div className="sd-form-group">
                                            <label>Criticality</label>
                                            <select value={formData.criticality || 'low'} onChange={e => setFormData(p => ({ ...p, criticality: e.target.value }))}>
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                                <option value="critical">Critical</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* INVENTORY FORM */}
                            {modalType === 'inventory' && (
                                <>
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Item Name *</label>
                                            <input type="text" required placeholder="Surgical Gloves"
                                                value={formData.item_name || ''}
                                                onChange={e => setFormData(p => ({ ...p, item_name: e.target.value }))} />
                                        </div>
                                        <div className="sd-form-group">
                                            <label>Category</label>
                                            <input type="text" placeholder="PPE"
                                                value={formData.category || ''}
                                                onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Code</label>
                                            <input type="text" placeholder="INV-001"
                                                value={formData.code || ''}
                                                onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} />
                                        </div>
                                        <div className="sd-form-group">
                                            <label>Supplier</label>
                                            <input type="text" placeholder="MedSupply Co."
                                                value={formData.supplier || ''}
                                                onChange={e => setFormData(p => ({ ...p, supplier: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Current Stock</label>
                                            <input type="number" min="0" value={formData.current_stock || 0}
                                                onChange={e => setFormData(p => ({ ...p, current_stock: Number(e.target.value) }))} />
                                        </div>
                                        <div className="sd-form-group">
                                            <label>Minimum Stock</label>
                                            <input type="number" min="0" value={formData.minimum_stock || 0}
                                                onChange={e => setFormData(p => ({ ...p, minimum_stock: Number(e.target.value) }))} />
                                        </div>
                                    </div>
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Unit Price (₹)</label>
                                            <input type="number" min="0" step="0.01" value={formData.unit_price || 0}
                                                onChange={e => setFormData(p => ({ ...p, unit_price: Number(e.target.value) }))} />
                                        </div>
                                        <div className="sd-form-group">
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
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Asset Name *</label>
                                            <input type="text" required placeholder="MRI Scanner"
                                                value={formData.asset_name || ''}
                                                onChange={e => setFormData(p => ({ ...p, asset_name: e.target.value }))} />
                                        </div>
                                        <div className="sd-form-group">
                                            <label>Maintenance Date</label>
                                            <input type="date" value={formData.maintenance_date || ''}
                                                onChange={e => setFormData(p => ({ ...p, maintenance_date: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Type</label>
                                            <select value={formData.maintenance_type || 'preventive'} onChange={e => setFormData(p => ({ ...p, maintenance_type: e.target.value }))}>
                                                <option value="preventive">Preventive</option>
                                                <option value="corrective">Corrective</option>
                                                <option value="emergency">Emergency</option>
                                                <option value="routine">Routine</option>
                                            </select>
                                        </div>
                                        <div className="sd-form-group">
                                            <label>Priority</label>
                                            <select value={formData.priority || 'medium'} onChange={e => setFormData(p => ({ ...p, priority: e.target.value }))}>
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                                <option value="critical">Critical</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="sd-form-group">
                                        <label>Issue Description</label>
                                        <textarea rows={3} placeholder="Describe the issue..."
                                            value={formData.issue_description || ''}
                                            onChange={e => setFormData(p => ({ ...p, issue_description: e.target.value }))} />
                                    </div>
                                    <div className="sd-form-row">
                                        <div className="sd-form-group">
                                            <label>Status</label>
                                            <select value={formData.status || 'scheduled'} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                                                <option value="scheduled">Scheduled</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                        <div className="sd-form-group">
                                            <label>Performed By</label>
                                            <input type="text" placeholder="Technician name"
                                                value={formData.performed_by || ''}
                                                onChange={e => setFormData(p => ({ ...p, performed_by: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="sd-form-group">
                                        <label>Cost (₹)</label>
                                        <input type="number" min="0" step="0.01" value={formData.cost || 0}
                                            onChange={e => setFormData(p => ({ ...p, cost: Number(e.target.value) }))} />
                                    </div>
                                </>
                            )}

                            <div className="sd-modal__actions">
                                <button type="button" className="sd-btn sd-btn--secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="sd-btn sd-btn--primary">
                                    {editingItem ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ─── Reusable Tab Panel ───────────────────────────────────────────── */
function TabPanel({ title, onAdd, search, onSearch, statusFilter, onStatusFilter, statusOptions, children }) {
    return (
        <div className="sd-panel">
            <div className="sd-panel__header">
                <h2>{title}</h2>
                <div className="sd-toolbar">
                    <input type="text" placeholder="Search..." className="sd-search" value={search} onChange={e => onSearch(e.target.value)} />
                    <select className="sd-filter" value={statusFilter} onChange={e => onStatusFilter(e.target.value)}>
                        <option value="all">All Status</option>
                        {statusOptions.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                    <button className="sd-btn sd-btn--primary" onClick={onAdd}>➕ Add New</button>
                </div>
            </div>
            <div className="sd-table-wrap">{children}</div>
        </div>
    )
}
