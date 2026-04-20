import React, { useState, useEffect } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, Search, UserPlus, X, Users, Wrench, DoorOpen } from 'lucide-react'
import './Rooms.css'

const ROOM_TYPE_ICONS = {
  'ICU': '🏥', 'General Ward': '🛏️', 'Private Room': '🚪',
  'Emergency': '🚨', 'Operating Theater': '⚕️', 'Laboratory': '🧪',
  'Radiology': '📡', 'Consultation': '💬'
}

const STATUS_COLOR = {
  admitted: '#16a34a', under_observation: '#d97706',
  emergency: '#dc2626', discharged: '#94a3b8'
}

const Rooms = () => {
  const { canEdit, canDelete } = useAuth()
  const [rooms, setRooms] = useState([])
  const [allPatients, setAllPatients] = useState([])
  const [allEquipment, setAllEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [detailRoom, setDetailRoom] = useState(null)
  const [selectedPatientId, setSelectedPatientId] = useState('')
  // Assign Equipment to Room
  const [showAssignEquipModal, setShowAssignEquipModal] = useState(false)
  const [assignEquipRoom, setAssignEquipRoom] = useState(null)
  const [selectedEquipId, setSelectedEquipId] = useState('')

  const [formData, setFormData] = useState({
    room_number: '', room_type: 'General Ward', floor_number: 1,
    building: '', capacity: 1, current_occupancy: 0, status: 'available',
    bed_count: 1, has_oxygen: false, has_ventilator: false,
    has_monitor: false, daily_rate: '', notes: ''
  })

  useEffect(() => { loadRooms() }, [])

  const loadRooms = async () => {
    setLoading(true)
    try {
      const [{ data: roomsData, error: roomsError }, { data: patientsData }, { data: equipmentData }] =
        await Promise.all([db.getRooms(), db.getPatients(), db.getEquipment()])
      if (roomsError) {
        console.error('Rooms error:', roomsError)
        alert('Failed to load rooms: ' + roomsError.message)
      } else {
        setRooms(roomsData || [])
      }
      setAllPatients(patientsData || [])
      setAllEquipment(equipmentData || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Map roomId → patients in that room
  const patientsByRoom = allPatients.reduce((acc, p) => {
    if (p.current_room) {
      if (!acc[p.current_room]) acc[p.current_room] = []
      acc[p.current_room].push(p)
    }
    return acc
  }, {})

  // Map roomId → equipment in that room (location field = room UUID)
  const equipmentByRoom = allEquipment.reduce((acc, e) => {
    if (e.location) {
      if (!acc[e.location]) acc[e.location] = []
      acc[e.location].push(e)
    }
    return acc
  }, {})

  // Equipment not yet assigned to any room
  const unassignedEquipment = allEquipment.filter(e => !e.location)

  const admittedPatients = allPatients.filter(p =>
    p.status === 'admitted' || p.status === 'under_observation' || p.status === 'emergency'
  )

  const handleAssignPatient = async (e) => {
    e.preventDefault()
    if (!selectedRoom || !selectedPatientId) return
    try {
      const realOcc = (patientsByRoom[selectedRoom.id] || []).length
      if (realOcc >= selectedRoom.capacity) { alert('Room is at full capacity!'); return }
      const newOccupancy = realOcc + 1
      const newStatus = newOccupancy >= selectedRoom.capacity ? 'occupied' : 'available'
      await db.updateRoom(selectedRoom.id, { status: newStatus, current_occupancy: newOccupancy })
      const patient = admittedPatients.find(p => p.id === selectedPatientId)
      if (patient) {
        await db.updatePatient(patient.id, { current_room: selectedRoom.id })
      }
      setShowAssignModal(false)
      setSelectedRoom(null)
      setSelectedPatientId('')
      await loadRooms()
    } catch (error) {
      alert('Error assigning patient: ' + error.message)
    }
  }

  // ── Assign Equipment to Room ────────────────────────────────────────────
  const handleAssignEquipment = async (e) => {
    e.preventDefault()
    if (!assignEquipRoom || !selectedEquipId) return
    try {
      await db.updateEquipment(selectedEquipId, { location: assignEquipRoom.id })
      setShowAssignEquipModal(false)
      setAssignEquipRoom(null)
      setSelectedEquipId('')
      await loadRooms()
    } catch (err) {
      alert('Error assigning equipment: ' + err.message)
    }
  }

  const handleRemoveEquipment = async (equip) => {
    if (!window.confirm(`Remove ${equip.equipment_name} from this room?`)) return
    try {
      await db.updateEquipment(equip.id, { location: null })
      await loadRooms()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleRemovePatient = async (patient, room) => {
    if (!window.confirm(`Remove ${patient.patient_name} from Room ${room.room_number}?`)) return
    try {
      await db.updatePatient(patient.id, { current_room: null })
      const realOcc = (patientsByRoom[room.id] || []).length
      const newOcc = Math.max(0, realOcc - 1)
      const newStatus = newOcc === 0 ? 'available' : room.status
      await db.updateRoom(room.id, { current_occupancy: newOcc, status: newStatus })
      await loadRooms()
    } catch (error) {
      alert('Error removing patient: ' + error.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = { ...formData, daily_rate: formData.daily_rate || null }
      if (editingRoom) { await db.updateRoom(editingRoom.id, data) }
      else { await db.createRoom(data) }
      loadRooms()
      closeModal()
    } catch (error) {
      alert('Error saving room: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this room?')) {
      await db.deleteRoom(id)
      loadRooms()
    }
  }

  const openModal = (room = null) => {
    if (room) { setEditingRoom(room); setFormData({ ...room }) }
    else {
      setEditingRoom(null)
      setFormData({
        room_number: '', room_type: 'General Ward', floor_number: 1,
        building: '', capacity: 1, current_occupancy: 0, status: 'available',
        bed_count: 1, has_oxygen: false, has_ventilator: false,
        has_monitor: false, daily_rate: '', notes: ''
      })
    }
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditingRoom(null) }

  const openAssignModal = (room, e) => {
    e.stopPropagation()
    if (room.current_occupancy >= room.capacity) { alert('Room is full!'); return }
    setSelectedRoom(room)
    setShowAssignModal(true)
  }

  const openDetailModal = (room) => {
    setDetailRoom(room)
    setShowDetailModal(true)
  }

  // ── Filtering ─────────────────────────────────────────────
  const filteredRooms = rooms.filter(room => {
    const q = searchTerm.toLowerCase()
    const matchSearch = !q ||
      room.room_number.toLowerCase().includes(q) ||
      room.room_type.toLowerCase().includes(q) ||
      room.building?.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || room.status === filterStatus
    const matchType = filterType === 'all' || room.room_type === filterType
    return matchSearch && matchStatus && matchType
  })

  const counts = rooms.reduce((acc, r) => {
    acc.all++
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, { all: 0, available: 0, occupied: 0, maintenance: 0, reserved: 0, cleaning: 0 })

  const occClass = (occ, cap) => {
    if (!cap) return 'low'
    const pct = occ / cap
    return pct >= 0.9 ? 'high' : pct >= 0.5 ? 'medium' : 'low'
  }

  const fd = (k, v) => setFormData(f => ({ ...f, [k]: v }))

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
        <p>Loading rooms...</p>
      </div>
    )
  }

  return (
    <div className="rooms-page">
      {/* Header */}
      <div className="rooms-header">
        <div>
          <h2>🏥 Rooms Management</h2>
          <p>{rooms.length} rooms total · {counts.available} available · {counts.occupied} occupied</p>
        </div>
        {canEdit && (
          <button className="btn-primary-rooms" onClick={() => openModal()}>
            <Plus size={16} /> Add Room
          </button>
        )}
      </div>

      {/* Status Pill Filters */}
      <div className="rooms-summary">
        {[
          { key: 'all', label: 'All Rooms' },
          { key: 'available', label: 'Available' },
          { key: 'occupied', label: 'Occupied' },
          { key: 'maintenance', label: 'Maintenance' },
          { key: 'reserved', label: 'Reserved' },
          { key: 'cleaning', label: 'Cleaning' },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`summary-pill ${key} ${filterStatus === key ? 'active' : ''}`}
            onClick={() => setFilterStatus(key)}
          >
            {label}
            <span className="pill-count">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search + Type filter */}
      <div className="rooms-filter-bar">
        <div className="rooms-search">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search by room number, type or building..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="ICU">ICU</option>
          <option value="General Ward">General Ward</option>
          <option value="Private Room">Private Room</option>
          <option value="Emergency">Emergency</option>
          <option value="Operating Theater">Operating Theater</option>
          <option value="Laboratory">Laboratory</option>
          <option value="Radiology">Radiology</option>
          <option value="Consultation">Consultation</option>
        </select>
      </div>

      {/* Cards Grid */}
      <div className="rooms-grid">
        {filteredRooms.length === 0 ? (
          <div className="rooms-empty">
            <div className="empty-icon">🏥</div>
            <h3>{rooms.length === 0 ? 'No rooms yet' : 'No rooms match your filter'}</h3>
            <p>{rooms.length === 0 ? 'Click "Add Room" to create the first room.' : 'Try adjusting your search or filter.'}</p>
          </div>
        ) : filteredRooms.map(room => {
          const realOcc = (patientsByRoom[room.id] || []).length
          const occPct = room.capacity > 0 ? (realOcc / room.capacity) * 100 : 0
          const status = room.status || 'available'
          const roomPatients = patientsByRoom[room.id] || []
          const roomEquipment = equipmentByRoom[room.id] || []
          return (
            <div
              key={room.id}
              className="room-card"
              onClick={() => openDetailModal(room)}
              style={{ cursor: 'pointer' }}
            >
              {/* Banner */}
              <div className={`room-card-banner ${status}`}>
                <div>
                  <div className="room-number-badge">Room {room.room_number}</div>
                  <div className="room-number-sub">Floor {room.floor_number ?? '—'} · {room.building || 'Main Block'}</div>
                </div>
                <span className={`status-badge ${status}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>

              {/* Body */}
              <div className="room-card-body">
                <div className="room-type-tag">
                  <span className="type-icon">{ROOM_TYPE_ICONS[room.room_type] || '🏨'}</span>
                  {room.room_type}
                </div>

                <div className="room-meta">
                  <div className="room-meta-item">
                    <span className="room-meta-label">Capacity</span>
                    <span className="room-meta-value">{room.capacity} bed{room.capacity !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="room-meta-item">
                    <span className="room-meta-label">Occupancy</span>
                    <span className="room-meta-value">{realOcc} / {room.capacity}</span>
                  </div>
                  <div className="room-meta-item">
                    <span className="room-meta-label">Bed Count</span>
                    <span className="room-meta-value">{room.bed_count ?? room.capacity}</span>
                  </div>
                  <div className="room-meta-item">
                    <span className="room-meta-label">Daily Rate</span>
                    <span className="room-meta-value">
                      {room.daily_rate ? `₹${Number(room.daily_rate).toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Occupancy bar */}
                <div className="occupancy-section">
                  <div className="occupancy-header">
                    <span>Occupancy</span>
                    <span>{Math.round(occPct)}%</span>
                  </div>
                  <div className="occupancy-bar">
                    <div
                      className={`occupancy-fill ${occClass(realOcc, room.capacity)}`}
                      style={{ width: `${occPct}%` }}
                    />
                  </div>
                </div>

                {/* Patients in this room */}
                {roomPatients.length > 0 && (
                  <div className="room-patients-section">
                    <div className="room-patients-label">
                      <Users size={12} /> {roomPatients.length} Patient{roomPatients.length > 1 ? 's' : ''}
                    </div>
                    <div className="room-patient-chips">
                      {roomPatients.slice(0, 3).map(p => (
                        <span key={p.id} className="room-patient-chip">
                          <span className="patient-dot" style={{ background: STATUS_COLOR[p.status] || '#64748b' }} />
                          {p.patient_name}
                        </span>
                      ))}
                      {roomPatients.length > 3 && (
                        <span className="room-patient-chip room-patient-more">+{roomPatients.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Equipment in this room */}
                {roomEquipment.length > 0 && (
                  <div className="room-equipment-section">
                    <div className="room-equipment-label">
                      <Wrench size={12} /> {roomEquipment.length} Equipment
                    </div>
                    <div className="room-equip-chips">
                      {roomEquipment.slice(0, 3).map(eq => (
                        <span key={eq.id} className="room-equip-chip">🔧 {eq.equipment_name}</span>
                      ))}
                      {roomEquipment.length > 3 && (
                        <span className="room-equip-chip room-equip-more">+{roomEquipment.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Features */}
                {(room.has_oxygen || room.has_ventilator || room.has_monitor) && (
                  <div className="room-features">
                    {room.has_oxygen && <span className="feature-chip">💨 Oxygen</span>}
                    {room.has_ventilator && <span className="feature-chip">🌬️ Ventilator</span>}
                    {room.has_monitor && <span className="feature-chip">📺 Monitor</span>}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              {canEdit && (
                <div className="room-card-footer" onClick={e => e.stopPropagation()}>
                  <button
                    className="room-action-btn assign"
                    onClick={(e) => openAssignModal(room, e)}
                    title="Assign Patient"
                    disabled={room.status === 'maintenance' || room.status === 'cleaning'}
                  >
                    <UserPlus size={13} /> Patient
                  </button>
                  <button
                    className="room-action-btn equip-assign"
                    onClick={e => { e.stopPropagation(); setAssignEquipRoom(room); setSelectedEquipId(''); setShowAssignEquipModal(true) }}
                    title="Assign Equipment"
                    disabled={room.status === 'maintenance'}
                  >
                    <DoorOpen size={13} /> Equipment
                  </button>
                  <div className="room-actions">
                    <button className="room-action-btn edit" onClick={e => { e.stopPropagation(); openModal(room) }}>
                      <Edit2 size={13} /> Edit
                    </button>
                    {canDelete && (
                      <button className="room-action-btn delete" onClick={e => { e.stopPropagation(); handleDelete(room.id) }}>
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Room Detail Modal ───────────────────────────── */}
      {showDetailModal && detailRoom && (() => {
        const dp = patientsByRoom[detailRoom.id] || []
        const de = equipmentByRoom[detailRoom.id] || []
        const status = detailRoom.status || 'available'
        return (
          <div className="rooms-modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="rooms-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
              <div className="rooms-modal-header">
                <h3>{ROOM_TYPE_ICONS[detailRoom.room_type]} Room {detailRoom.room_number} — {detailRoom.room_type}</h3>
                <button className="modal-close-btn" onClick={() => setShowDetailModal(false)}><X size={16} /></button>
              </div>
              <div className="rooms-modal-body">
                {/* Room info strip */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                  <span className={`status-badge ${status}`} style={{ fontSize: 12, padding: '4px 14px' }}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                  <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    🏢 Floor {detailRoom.floor_number} · {detailRoom.building || 'Main Block'}
                  </span>
                  <span style={{ fontSize: 13, color: '#64748b' }}>
                    🛏️ {detailRoom.current_occupancy}/{detailRoom.capacity} beds
                  </span>
                  {detailRoom.daily_rate && (
                    <span style={{ fontSize: 13, color: '#64748b' }}>
                      💰 ₹{Number(detailRoom.daily_rate).toLocaleString()}/day
                    </span>
                  )}
                </div>

                {/* Features */}
                {(detailRoom.has_oxygen || detailRoom.has_ventilator || detailRoom.has_monitor) && (
                  <div className="room-features" style={{ marginBottom: 18 }}>
                    {detailRoom.has_oxygen && <span className="feature-chip">💨 Oxygen</span>}
                    {detailRoom.has_ventilator && <span className="feature-chip">🌬️ Ventilator</span>}
                    {detailRoom.has_monitor && <span className="feature-chip">📺 Monitor</span>}
                  </div>
                )}

                {/* Patients section */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} /> Patients in this Room ({dp.length})
                  </div>
                  {dp.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', background: '#f8fafc', borderRadius: 10 }}>
                      <div style={{ fontSize: 28 }}>🛏️</div>
                      <p style={{ margin: '6px 0 0', fontSize: 14 }}>No patients assigned to this room</p>
                      {canEdit && (
                        <button
                          className="btn-primary-rooms"
                          style={{ marginTop: 12, fontSize: 13, padding: '7px 16px' }}
                          onClick={() => { setShowDetailModal(false); openAssignModal(detailRoom, { stopPropagation: () => { } }) }}
                        >
                          <UserPlus size={13} /> Assign a Patient
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {dp.map(patient => (
                        <div key={patient.id} style={{
                          background: '#f8fafc', borderRadius: 12, padding: '14px 16px',
                          border: '1.5px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>
                              {patient.patient_name}
                              <span style={{
                                marginLeft: 8, fontSize: 11, fontWeight: 600,
                                padding: '2px 8px', borderRadius: 999,
                                background: STATUS_COLOR[patient.status] + '20',
                                color: STATUS_COLOR[patient.status]
                              }}>
                                {patient.status?.replace('_', ' ')}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              <span>🪪 {patient.patient_id}</span>
                              {patient.gender && <span>⚧ {patient.gender}</span>}
                              {patient.blood_group && <span>🩸 {patient.blood_group}</span>}
                              {patient.phone && <span>📞 {patient.phone}</span>}
                            </div>
                            {patient.allergies && (
                              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>
                                ⚠️ Allergies: {patient.allergies}
                              </div>
                            )}
                            {patient.admission_date && (
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                📅 Admitted: {new Date(patient.admission_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => handleRemovePatient(patient, detailRoom)}
                              style={{
                                background: '#fff1f2', color: '#dc2626', border: 'none',
                                borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap'
                              }}
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Equipment section ── */}
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Wrench size={14} /> Equipment in this Room ({de.length})
                  </div>
                  {de.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '18px', color: '#94a3b8', background: '#f8fafc', borderRadius: 10 }}>
                      <div style={{ fontSize: 24 }}>🔧</div>
                      <p style={{ margin: '6px 0 0', fontSize: 13 }}>No equipment assigned to this room</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {de.map(eq => (
                        <div key={eq.id} style={{
                          background: '#fffbeb', borderRadius: 10, padding: '10px 14px',
                          border: '1.5px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                              🔧 {eq.equipment_name}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                              {eq.equipment_type}{eq.serial_number ? ` · SN: ${eq.serial_number}` : ''}
                            </div>
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => handleRemoveEquipment(eq)}
                              style={{
                                background: '#fff1f2', color: '#dc2626', border: 'none',
                                borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                                fontSize: 12, fontWeight: 600
                              }}
                            >✕ Remove</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {canEdit && (
                <div className="rooms-modal-footer" style={{ gap: 8 }}>
                  {dp.length < detailRoom.capacity && detailRoom.status !== 'maintenance' && detailRoom.status !== 'cleaning' && (
                    <button className="btn-primary-rooms"
                      onClick={() => { setShowDetailModal(false); setSelectedRoom(detailRoom); setShowAssignModal(true) }}>
                      <UserPlus size={14} /> Assign Patient
                    </button>
                  )}
                  {detailRoom.status !== 'maintenance' && (
                    <button className="btn-primary-rooms" style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}
                      onClick={() => { setShowDetailModal(false); setAssignEquipRoom(detailRoom); setSelectedEquipId(''); setShowAssignEquipModal(true) }}>
                      <DoorOpen size={14} /> Assign Equipment
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Add/Edit Room Modal ─────────────────────────── */}
      {showModal && (
        <div className="rooms-modal-overlay" onClick={closeModal}>
          <div className="rooms-modal" onClick={e => e.stopPropagation()}>
            <div className="rooms-modal-header">
              <h3>{editingRoom ? 'Edit Room' : 'Add New Room'}</h3>
              <button className="modal-close-btn" onClick={closeModal}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="rooms-modal-body">
                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Room Number *</label>
                    <input value={formData.room_number} onChange={e => fd('room_number', e.target.value)} placeholder="e.g. 101" required />
                  </div>
                  <div className="form-field">
                    <label>Room Type *</label>
                    <select value={formData.room_type} onChange={e => fd('room_type', e.target.value)}>
                      {Object.keys(ROOM_TYPE_ICONS).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Floor Number</label>
                    <input type="number" value={formData.floor_number} onChange={e => fd('floor_number', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-field">
                    <label>Building</label>
                    <input value={formData.building} onChange={e => fd('building', e.target.value)} placeholder="e.g. Block A" />
                  </div>
                </div>
                <div className="form-grid-3">
                  <div className="form-field">
                    <label>Capacity</label>
                    <input type="number" min="1" value={formData.capacity} onChange={e => fd('capacity', parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="form-field">
                    <label>Current Occupancy</label>
                    <input type="number" min="0" value={formData.current_occupancy} onChange={e => fd('current_occupancy', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-field">
                    <label>Bed Count</label>
                    <input type="number" min="0" value={formData.bed_count} onChange={e => fd('bed_count', parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Status</label>
                    <select value={formData.status} onChange={e => fd('status', e.target.value)}>
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="reserved">Reserved</option>
                      <option value="cleaning">Cleaning</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Daily Rate (₹)</label>
                    <input type="number" value={formData.daily_rate} onChange={e => fd('daily_rate', e.target.value)} placeholder="e.g. 5000" />
                  </div>
                </div>
                <div className="switches-row">
                  <label className="switch-item">
                    <input type="checkbox" checked={formData.has_oxygen} onChange={e => fd('has_oxygen', e.target.checked)} />
                    💨 Oxygen
                  </label>
                  <label className="switch-item">
                    <input type="checkbox" checked={formData.has_ventilator} onChange={e => fd('has_ventilator', e.target.checked)} />
                    🌬️ Ventilator
                  </label>
                  <label className="switch-item">
                    <input type="checkbox" checked={formData.has_monitor} onChange={e => fd('has_monitor', e.target.checked)} />
                    📺 Monitor
                  </label>
                </div>
                <div className="form-grid-1">
                  <div className="form-field">
                    <label>Notes</label>
                    <textarea rows={2} value={formData.notes} onChange={e => fd('notes', e.target.value)} placeholder="Any additional notes..." style={{ resize: 'vertical' }} />
                  </div>
                </div>
              </div>
              <div className="rooms-modal-footer">
                <button type="button" className="btn-secondary-rooms" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary-rooms">
                  {editingRoom ? 'Update Room' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Patient Modal ────────────────────────── */}
      {showAssignModal && selectedRoom && (
        <div className="rooms-modal-overlay" onClick={() => { setShowAssignModal(false); setSelectedPatientId('') }}>
          <div className="rooms-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="rooms-modal-header">
              <h3>Assign Patient → Room {selectedRoom.room_number}</h3>
              <button className="modal-close-btn" onClick={() => { setShowAssignModal(false); setSelectedPatientId('') }}><X size={16} /></button>
            </div>
            <form onSubmit={handleAssignPatient}>
              <div className="rooms-modal-body">
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#475569' }}>
                  <strong style={{ color: '#1e293b' }}>Room {selectedRoom.room_number}</strong> — {selectedRoom.room_type}<br />
                  Occupancy: {selectedRoom.current_occupancy} / {selectedRoom.capacity}
                </div>
                <div className="form-field">
                  <label>Select Admitted Patient *</label>
                  <select value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)} required>
                    <option value="">— Choose patient —</option>
                    {admittedPatients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.patient_name} ({p.patient_id})
                        {p.current_room ? ' ⚠️ already has room' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {admittedPatients.length === 0 && (
                  <p style={{ color: '#f59e0b', fontSize: 13, marginTop: 8 }}>
                    ⚠️ No admitted patients found.
                  </p>
                )}
              </div>
              <div className="rooms-modal-footer">
                <button type="button" className="btn-secondary-rooms" onClick={() => { setShowAssignModal(false); setSelectedPatientId('') }}>Cancel</button>
                <button type="submit" className="btn-primary-rooms" disabled={!selectedPatientId}>
                  <UserPlus size={14} /> Assign Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ══ Assign Equipment to Room Modal ═════════════════════════════════ */}
      {showAssignEquipModal && assignEquipRoom && (
        <div className="rooms-modal-overlay" onClick={() => setShowAssignEquipModal(false)}>
          <div className="rooms-modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="rooms-modal-header">
              <h2>🔧 Assign Equipment to Room {assignEquipRoom.room_number}</h2>
              <button onClick={() => setShowAssignEquipModal(false)} className="rooms-modal-close">×</button>
            </div>
            <form onSubmit={handleAssignEquipment} style={{ padding: '20px 24px' }}>
              {/* Room info strip */}
              <div style={{
                background: '#fffbeb', borderRadius: 10, padding: '12px 16px',
                marginBottom: 18, border: '1.5px solid #fde68a',
                fontSize: 14, color: '#78350f'
              }}>
                <strong style={{ color: '#1e293b', fontSize: 15 }}>
                  Room {assignEquipRoom.room_number} — {assignEquipRoom.room_type}
                </strong>
                <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>
                  Floor {assignEquipRoom.floor_number} · {assignEquipRoom.building || 'Main Block'}
                </div>
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  Currently: {(equipmentByRoom[assignEquipRoom.id] || []).length} equipment assigned
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Select Equipment *</label>
                <select className="form-select" value={selectedEquipId}
                  onChange={e => setSelectedEquipId(e.target.value)} required>
                  <option value="">— Choose equipment —</option>
                  {allEquipment
                    .filter(eq => !eq.location || eq.location === assignEquipRoom.id)
                    .map(eq => (
                      <option key={eq.id} value={eq.id}>
                        {eq.equipment_name} ({eq.equipment_type})
                        {eq.location === assignEquipRoom.id ? ' ✓ Already here' : ''}
                        {eq.serial_number ? ` · SN: ${eq.serial_number}` : ''}
                      </option>
                    ))}
                </select>
                {allEquipment.filter(eq => !eq.location).length === 0 && (
                  <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 6 }}>
                    ⚠ All equipment is already assigned to rooms. Unassign from Equipment page first.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="submit" className="btn-primary-rooms" style={{ flex: 1 }}>
                  ✓ Confirm Assignment
                </button>
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowAssignEquipModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Rooms
