import React, { useState, useEffect } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, Search, Wrench, DoorOpen, X } from 'lucide-react'
import '../components/ResponsiveTable.css'

const Equipment = () => {
  const { canEdit, canDelete } = useAuth()
  const [equipment, setEquipment] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')

  // Maintenance Modal
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [maintenanceItem, setMaintenanceItem] = useState(null)
  const [maintenanceIssue, setMaintenanceIssue] = useState('')

  // Assign-to-Room Modal
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [roomAssignItem, setRoomAssignItem] = useState(null)
  const [selectedRoomId, setSelectedRoomId] = useState('')

  const [formData, setFormData] = useState({
    equipment_name: '', equipment_type: 'Medical Device',
    model_number: '', serial_number: '', manufacturer: '',
    purchase_date: '', purchase_price: '', warranty_expiry: '',
    status: 'operational', location: '', department: '',
    last_calibration_date: '', next_calibration_date: '',
    maintenance_interval_days: 180, criticality: 'Medium', notes: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [equipmentData, roomsData] = await Promise.all([
      db.getEquipment(), db.getRooms()
    ])
    if (equipmentData.data) setEquipment(equipmentData.data)
    if (roomsData.data) setRooms(roomsData.data)
    setLoading(false)
  }

  // ── Room lookup helper ─────────────────────────────────────────────────────
  const getRoomById = (id) => rooms.find(r => r.id === id) || null
  const getRoomLabel = (locationId) => {
    if (!locationId) return null
    const r = getRoomById(locationId)
    return r ? `Room ${r.room_number} (${r.room_type})` : null
  }

  // ── Assign to Room ─────────────────────────────────────────────────────────
  const openRoomModal = (item) => {
    setRoomAssignItem(item)
    setSelectedRoomId(item.location || '')
    setShowRoomModal(true)
  }

  const handleAssignToRoom = async (e) => {
    e.preventDefault()
    if (!roomAssignItem) return
    try {
      await db.updateEquipment(roomAssignItem.id, {
        location: selectedRoomId || null,
        status: selectedRoomId ? 'operational' : 'operational'
      })
      setShowRoomModal(false)
      setRoomAssignItem(null)
      setSelectedRoomId('')
      loadData()
    } catch (err) {
      alert('Error assigning room: ' + err.message)
    }
  }

  const handleUnassignRoom = async (equip) => {
    if (!window.confirm(`Remove ${equip.equipment_name} from its room?`)) return
    try {
      await db.updateEquipment(equip.id, { location: null })
      loadData()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  // ── Maintenance ────────────────────────────────────────────────────────────
  const openMaintenanceModal = (item) => {
    setMaintenanceItem(item)
    setMaintenanceIssue('')
    setShowMaintenanceModal(true)
  }

  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault()
    if (!maintenanceItem) return
    try {
      await db.createMaintenanceRecord({
        maintenance_type: 'Corrective',
        asset_name: maintenanceItem.equipment_name,
        asset_type: 'Equipment',
        equipment_id: maintenanceItem.id,
        issue_description: maintenanceIssue,
        status: 'scheduled',
        priority: 'high',
        maintenance_date: new Date().toISOString()
      })
      await db.updateEquipment(maintenanceItem.id, { status: 'maintenance' })
      alert('Equipment moved to maintenance successfully')
      setShowMaintenanceModal(false)
      loadData()
    } catch (error) {
      alert('Error moving to maintenance: ' + error.message)
    }
  }

  // ── Add / Edit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingEquipment) {
        await db.updateEquipment(editingEquipment.id, formData)
      } else {
        await db.createEquipment(formData)
      }
      loadData()
      closeModal()
    } catch (error) {
      alert('Error saving equipment: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      await db.deleteEquipment(id)
      loadData()
    }
  }

  const openModal = (equip = null) => {
    if (equip) {
      setEditingEquipment(equip)
      setFormData({
        equipment_name: equip.equipment_name, equipment_type: equip.equipment_type,
        model_number: equip.model_number || '', serial_number: equip.serial_number || '',
        manufacturer: equip.manufacturer || '', purchase_date: equip.purchase_date || '',
        purchase_price: equip.purchase_price || '', warranty_expiry: equip.warranty_expiry || '',
        status: equip.status, location: equip.location || '', department: equip.department || '',
        last_calibration_date: equip.last_calibration_date || '',
        next_calibration_date: equip.next_calibration_date || '',
        maintenance_interval_days: equip.maintenance_interval_days || 180,
        criticality: equip.criticality || 'Medium', notes: equip.notes || ''
      })
    } else {
      setEditingEquipment(null)
      setFormData({
        equipment_name: '', equipment_type: 'Medical Device',
        model_number: '', serial_number: '', manufacturer: '',
        purchase_date: '', purchase_price: '', warranty_expiry: '',
        status: 'operational', location: '', department: '',
        last_calibration_date: '', next_calibration_date: '',
        maintenance_interval_days: 180, criticality: 'Medium', notes: ''
      })
    }
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditingEquipment(null) }

  const filteredEquipment = equipment.filter(equip => {
    const matchesSearch =
      equip.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equip.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equip.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || equip.status === filterStatus
    const matchesType = filterType === 'all' || equip.equipment_type === filterType
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (status) => ({
    'operational': 'badge-success', 'maintenance': 'badge-warning',
    'under_maintenance': 'badge-warning', 'out_of_service': 'badge-danger',
    'reserved': 'badge-info', 'disposed': 'badge-secondary', 'in_use': 'badge-info'
  }[status] || 'badge-secondary')

  const getCriticalityBadge = (c) => ({
    'Critical': 'badge-danger', 'critical': 'badge-danger',
    'High': 'badge-warning', 'high': 'badge-warning',
    'Medium': 'badge-info', 'medium': 'badge-info',
    'Low': 'badge-secondary', 'low': 'badge-secondary'
  }[c] || 'badge-secondary')

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <div className="card">
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="card-title">Equipment Management</h2>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => openModal()}>
              <Plus size={16} style={{ marginRight: 8 }} /> Add Equipment
            </button>
          )}
        </div>

        {/* ── Filter bar ── */}
        <div className="filter-bar">
          <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            <input type="text" className="search-box" placeholder="Search equipment..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select className="form-select" style={{ maxWidth: 180 }} value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="operational">Operational</option>
            <option value="maintenance">Maintenance</option>
            <option value="out_of_service">Out of Service</option>
            <option value="reserved">Reserved</option>
            <option value="disposed">Disposed</option>
          </select>
          <select className="form-select" style={{ maxWidth: 180 }} value={filterType}
            onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="Medical Device">Medical Device</option>
            <option value="Diagnostic">Diagnostic</option>
            <option value="Surgical">Surgical</option>
            <option value="Life Support">Life Support</option>
            <option value="Monitoring">Monitoring</option>
            <option value="Laboratory">Laboratory</option>
            <option value="Imaging">Imaging</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* ── Table ── */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Type</th>
                <th>Serial #</th>
                <th>Location / Room</th>
                <th>Status</th>
                <th>Criticality</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEquipment.map(equip => {
                const roomLabel = getRoomLabel(equip.location)
                return (
                  <tr key={equip.id}>
                    <td style={{ fontWeight: 600 }} data-label="Equipment">{equip.equipment_name}</td>
                    <td data-label="Type">{equip.equipment_type}</td>
                    <td style={{ fontSize: 13, color: '#666' }} data-label="Serial #">{equip.serial_number || '—'}</td>
                    <td data-label="Location">
                      {roomLabel ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: '#eff6ff', color: '#1d4ed8',
                          padding: '3px 10px', borderRadius: 999,
                          fontSize: 12, fontWeight: 600, border: '1.5px solid #bfdbfe'
                        }}>
                          🚪 {roomLabel}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 13 }}>Unassigned</span>
                      )}
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${getStatusBadge(equip.status)}`}>{equip.status}</span>
                    </td>
                    <td data-label="Criticality">
                      <span className={`badge ${getCriticalityBadge(equip.criticality)}`}>{equip.criticality}</span>
                    </td>
                    {canEdit && (
                      <td data-label="Actions">
                        <div className="action-buttons">
                          {/* Assign / Unassign Room */}
                          <button
                            className="icon-button"
                            onClick={() => equip.location ? handleUnassignRoom(equip) : openRoomModal(equip)}
                            title={equip.location ? 'Remove from Room' : 'Assign to Room'}
                            style={{ color: equip.location ? '#dc2626' : '#2563eb' }}
                          >
                            <DoorOpen size={16} />
                          </button>
                          {/* Move to Maintenance */}
                          <button className="icon-button" onClick={() => openMaintenanceModal(equip)} title="Move to Maintenance">
                            <Wrench size={16} color="#f0ad4e" />
                          </button>
                          {/* Edit */}
                          <button className="icon-button" onClick={() => openModal(equip)}>
                            <Edit2 size={16} color="#0066cc" />
                          </button>
                          {canDelete && (
                            <button className="icon-button" onClick={() => handleDelete(equip.id)}>
                              <Trash2 size={16} color="#dc3545" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
              {filteredEquipment.length === 0 && (
                <tr><td colSpan={canEdit ? 7 : 6} style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
                  No equipment found.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ Assign to Room Modal ══════════════════════════════════════════════ */}
      {showRoomModal && roomAssignItem && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">🚪 Assign to Room</h3>
              <button className="modal-close" onClick={() => setShowRoomModal(false)}>×</button>
            </div>
            <form onSubmit={handleAssignToRoom}>
              {/* Equipment info strip */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 14, color: '#475569' }}>
                <strong style={{ color: '#1e293b', fontSize: 15 }}>{roomAssignItem.equipment_name}</strong>
                <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>
                  {roomAssignItem.equipment_type} · Serial: {roomAssignItem.serial_number || '—'}
                </div>
                {getRoomLabel(roomAssignItem.location) && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#d97706' }}>
                    ⚠️ Currently in: {getRoomLabel(roomAssignItem.location)}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Select Room *</label>
                <select className="form-select" value={selectedRoomId}
                  onChange={e => setSelectedRoomId(e.target.value)} required>
                  <option value="">— Choose a room —</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} — {r.room_type} (Floor {r.floor_number}, {r.building || 'Main'}) · {r.status}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <DoorOpen size={15} style={{ marginRight: 6 }} /> Confirm Assignment
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRoomModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Add / Edit Modal ══════════════════════════════════════════════════ */}
      {showModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Equipment Name *</label>
                  <input type="text" className="form-input" value={formData.equipment_name}
                    onChange={e => setFormData({ ...formData, equipment_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Equipment Type *</label>
                  <select className="form-select" value={formData.equipment_type}
                    onChange={e => setFormData({ ...formData, equipment_type: e.target.value })} required>
                    {['Medical Device', 'Diagnostic', 'Surgical', 'Life Support', 'Monitoring', 'Laboratory', 'Imaging', 'Other'].map(t =>
                      <option key={t} value={t}>{t}</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Model Number</label>
                  <input type="text" className="form-input" value={formData.model_number}
                    onChange={e => setFormData({ ...formData, model_number: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Serial Number</label>
                  <input type="text" className="form-input" value={formData.serial_number}
                    onChange={e => setFormData({ ...formData, serial_number: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Manufacturer</label>
                  <input type="text" className="form-input" value={formData.manufacturer}
                    onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input type="text" className="form-input" value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select className="form-select" value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })} required>
                    {['operational', 'maintenance', 'out_of_service', 'reserved', 'disposed'].map(s =>
                      <option key={s} value={s}>{s}</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Criticality</label>
                  <select className="form-select" value={formData.criticality}
                    onChange={e => setFormData({ ...formData, criticality: e.target.value })}>
                    {['Critical', 'High', 'Medium', 'Low'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Location (Room)</label>
                <select className="form-select" value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}>
                  <option value="">Unassigned</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>Room {r.room_number} — {r.room_type}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Purchase Date</label>
                  <input type="date" className="form-input" value={formData.purchase_date}
                    onChange={e => setFormData({ ...formData, purchase_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Purchase Price (₹)</label>
                  <input type="number" step="0.01" className="form-input" value={formData.purchase_price}
                    onChange={e => setFormData({ ...formData, purchase_price: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingEquipment ? 'Update Equipment' : 'Create Equipment'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Maintenance Modal ════════════════════════════════════════════════ */}
      {showMaintenanceModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Report Issue &amp; Move to Maintenance</h3>
              <button className="modal-close" onClick={() => setShowMaintenanceModal(false)}>×</button>
            </div>
            <form onSubmit={handleMaintenanceSubmit}>
              <div className="form-group">
                <label className="form-label">Issue Description *</label>
                <textarea className="form-textarea" style={{ minHeight: 100 }} value={maintenanceIssue}
                  onChange={e => setMaintenanceIssue(e.target.value)} required
                  placeholder="Describe the problem..." />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Confirm &amp; Move</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMaintenanceModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Equipment
