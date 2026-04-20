import React, { useState, useEffect } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import '../components/ResponsiveTable.css'

const Maintenance = () => {
  const { user, canEdit, canDelete } = useAuth()
  const [maintenance, setMaintenance] = useState([])
  const [equipment, setEquipment] = useState([])
  const [rooms, setRooms] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')

  const [formData, setFormData] = useState({
    maintenance_type: 'Preventive',
    asset_type: 'Equipment',
    equipment_id: '',
    room_id: '',
    maintenance_date: new Date().toISOString().split('T')[0],
    completed_date: '',
    status: 'scheduled',
    performed_by: '',
    approved_by: '',
    issue_description: '',
    action_taken: '',
    parts_replaced: '',
    cost: '',
    downtime_hours: '',
    priority: 'Medium',
    next_maintenance_date: '',
    warranty_claim: false,
    vendor_name: '',
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [maintenanceData, equipmentData, roomsData, usersData] = await Promise.all([
      db.getMaintenanceRecords(),
      db.getEquipment(),
      db.getRooms(),
      db.getUsers()
    ])
    if (maintenanceData.data) setMaintenance(maintenanceData.data)
    if (equipmentData.data) setEquipment(equipmentData.data)
    if (roomsData.data) setRooms(roomsData.data)
    if (usersData.data) setUsers(usersData.data)
    setLoading(false)
  }

  const handleMarkComplete = async (record) => {
    if (!window.confirm(`Mark "${record.asset_name}" maintenance as completed?`)) return
    try {
      await db.updateMaintenanceRecord(record.id, {
        status: 'completed',
        completed_date: new Date().toISOString(),
        action_taken: record.action_taken || 'Maintenance completed'
      })
      // Restore equipment to operational
      if (record.equipment_id) {
        await db.updateEquipment(record.equipment_id, { status: 'operational' })
      }
      loadData()
    } catch (err) {
      alert('Error completing maintenance: ' + err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Only send columns that exist in the schema
      const dataToSubmit = {
        maintenance_type: formData.maintenance_type,
        asset_name: formData.asset_type === 'Equipment'
          ? equipment.find(eq => eq.id === formData.equipment_id)?.equipment_name || formData.asset_name || ''
          : formData.asset_name || '',
        asset_type: formData.asset_type,
        equipment_id: formData.asset_type === 'Equipment' ? (formData.equipment_id || null) : null,
        maintenance_date: formData.maintenance_date ? new Date(formData.maintenance_date).toISOString() : new Date().toISOString(),
        completed_date: formData.completed_date ? new Date(formData.completed_date).toISOString() : null,
        status: formData.status,
        performed_by: formData.performed_by || user?.full_name || '',
        issue_description: formData.issue_description || null,
        action_taken: formData.action_taken || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        priority: formData.priority?.toLowerCase() || 'medium',
        notes: formData.notes || null
      }

      if (editingRecord) {
        await db.updateMaintenanceRecord(editingRecord.id, dataToSubmit)
        // If completed, restore equipment to operational
        if (dataToSubmit.status === 'completed' && editingRecord.equipment_id) {
          await db.updateEquipment(editingRecord.equipment_id, { status: 'operational' })
        }
        // If in_progress, mark equipment as maintenance
        if (dataToSubmit.status === 'in_progress' && editingRecord.equipment_id) {
          await db.updateEquipment(editingRecord.equipment_id, { status: 'maintenance' })
        }
      } else {
        await db.createMaintenanceRecord(dataToSubmit)
      }
      loadData()
      closeModal()
    } catch (error) {
      alert('Error saving maintenance record: ' + error.message)
    }
  }


  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this maintenance record?')) {
      await db.deleteMaintenanceRecord(id)
      loadData()
    }
  }

  const openModal = (record = null) => {
    if (record) {
      setEditingRecord(record)
      setFormData({
        maintenance_type: record.maintenance_type,
        asset_type: record.asset_type,
        equipment_id: record.equipment_id || '',
        room_id: record.room_id || '',
        maintenance_date: record.maintenance_date?.split('T')[0] || '',
        completed_date: record.completed_date?.split('T')[0] || '',
        status: record.status,
        performed_by: record.performed_by || '',
        approved_by: record.approved_by || '',
        issue_description: record.issue_description,
        action_taken: record.action_taken || '',
        parts_replaced: record.parts_replaced || '',
        cost: record.cost || '',
        downtime_hours: record.downtime_hours || '',
        priority: record.priority,
        next_maintenance_date: record.next_maintenance_date || '',
        warranty_claim: record.warranty_claim || false,
        vendor_name: record.vendor_name || '',
        notes: record.notes || ''
      })
    } else {
      setEditingRecord(null)
      setFormData({
        maintenance_type: 'Preventive',
        asset_type: 'Equipment',
        equipment_id: '',
        room_id: '',
        maintenance_date: new Date().toISOString().split('T')[0],
        completed_date: '',
        status: 'scheduled',
        performed_by: user.id,
        approved_by: '',
        issue_description: '',
        action_taken: '',
        parts_replaced: '',
        cost: '',
        downtime_hours: '',
        priority: 'Medium',
        next_maintenance_date: '',
        warranty_claim: false,
        vendor_name: '',
        notes: ''
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingRecord(null)
  }

  const filteredMaintenance = maintenance.filter(record => {
    const matchesSearch = record.issue_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.equipment?.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.rooms?.room_number?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus
    const matchesType = filterType === 'all' || record.maintenance_type === filterType
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (status) => {
    const badges = {
      'scheduled': 'badge-info',
      'in_progress': 'badge-warning',
      'completed': 'badge-success',
      'cancelled': 'badge-secondary',
      'pending_approval': 'badge-warning'
    }
    return badges[status] || 'badge-secondary'
  }

  const getPriorityBadge = (priority) => {
    const badges = {
      'Critical': 'badge-danger',
      'High': 'badge-warning',
      'Medium': 'badge-info',
      'Low': 'badge-secondary'
    }
    return badges[priority] || 'badge-secondary'
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="card-title">Maintenance Records</h2>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => openModal()}>
              <Plus size={16} style={{ marginRight: '8px' }} />
              Add Record
            </button>
          )}
        </div>

        <div className="filter-bar">
          <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            <input
              type="text"
              className="search-box"
              placeholder="Search maintenance..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ maxWidth: '180px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>

          </select>
          <select
            className="form-select"
            style={{ maxWidth: '180px' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="Preventive">Preventive</option>
            <option value="Corrective">Corrective</option>
            <option value="Emergency">Emergency</option>
            <option value="Calibration">Calibration</option>
            <option value="Inspection">Inspection</option>
            <option value="Upgrade">Upgrade</option>
          </select>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Asset</th>
                <th>Issue</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Performed By</th>
                <th>Cost</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredMaintenance.map(record => (
                <tr key={record.id}>
                  <td data-label="Date">{new Date(record.maintenance_date).toLocaleDateString()}</td>
                  <td data-label="Type">{record.maintenance_type}</td>
                  <td data-label="Asset">
                    {record.asset_name || record.equipment?.equipment_name || 'N/A'}
                  </td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} data-label="Issue">
                    {record.issue_description}
                  </td>
                  <td data-label="Status">
                    <span className={`badge ${getStatusBadge(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td data-label="Priority">
                    <span className={`badge ${getPriorityBadge(record.priority)}`}>
                      {record.priority}
                    </span>
                  </td>
                  <td data-label="Performed By">{record.performed_by || 'Unassigned'}</td>
                  <td data-label="Cost">${record.cost || '0'}</td>
                  {canEdit && (
                    <td data-label="Actions">
                      <div className="action-buttons">
                        {record.status !== 'completed' && record.status !== 'cancelled' && (
                          <button
                            className="icon-button"
                            onClick={() => handleMarkComplete(record)}
                            title="Mark as Completed"
                            style={{ marginRight: '4px' }}
                          >
                            <span style={{ fontSize: '16px', color: '#28a745', fontWeight: 'bold' }}>✓</span>
                          </button>
                        )}
                        <button className="icon-button" onClick={() => openModal(record)}>
                          <Edit2 size={16} color="#0066cc" />
                        </button>
                        {canDelete && (
                          <button className="icon-button" onClick={() => handleDelete(record.id)}>
                            <Trash2 size={16} color="#dc3545" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingRecord ? 'Edit Maintenance Record' : 'Add Maintenance Record'}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Maintenance Type *</label>
                  <select
                    className="form-select"
                    value={formData.maintenance_type}
                    onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
                    required
                  >
                    <option value="Preventive">Preventive</option>
                    <option value="Corrective">Corrective</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Calibration">Calibration</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Upgrade">Upgrade</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Asset Type *</label>
                  <select
                    className="form-select"
                    value={formData.asset_type}
                    onChange={(e) => setFormData({ ...formData, asset_type: e.target.value, equipment_id: '', room_id: '' })}
                    required
                  >
                    <option value="Equipment">Equipment</option>
                    <option value="Room">Room</option>
                    <option value="Building">Building</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-2">
                {formData.asset_type === 'Equipment' && (
                  <div className="form-group">
                    <label className="form-label">Equipment *</label>
                    <select
                      className="form-select"
                      value={formData.equipment_id}
                      onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                      required
                    >
                      <option value="">Select Equipment</option>
                      {equipment.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {eq.equipment_name} ({eq.serial_number})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {formData.asset_type === 'Room' && (
                  <div className="form-group">
                    <label className="form-label">Room *</label>
                    <select
                      className="form-select"
                      value={formData.room_id}
                      onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                      required
                    >
                      <option value="">Select Room</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>
                          {room.room_number} - {room.room_type}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Priority *</label>
                  <select
                    className="form-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    required
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Maintenance Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.maintenance_date}
                    onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="pending_approval">Pending Approval</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Issue Description *</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '80px' }}
                  value={formData.issue_description}
                  onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Action Taken</label>
                <textarea
                  className="form-textarea"
                  value={formData.action_taken}
                  onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Parts Replaced</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.parts_replaced}
                    onChange={(e) => setFormData({ ...formData, parts_replaced: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vendor Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Downtime (hours)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={formData.downtime_hours}
                    onChange={(e) => setFormData({ ...formData, downtime_hours: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Completed Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.completed_date}
                    onChange={(e) => setFormData({ ...formData, completed_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Next Maintenance Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.next_maintenance_date}
                    onChange={(e) => setFormData({ ...formData, next_maintenance_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.warranty_claim}
                    onChange={(e) => setFormData({ ...formData, warranty_claim: e.target.checked })}
                    style={{ marginRight: '6px' }}
                  />
                  Warranty Claim
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-textarea"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingRecord ? 'Update Record' : 'Create Record'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Maintenance
