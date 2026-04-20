import { useState, useEffect } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './Patients.css'
import '../components/ResponsiveTable.css'

function Patients() {
  const [patients, setPatients] = useState([])
  const [rooms, setRooms] = useState([])
  const [filteredPatients, setFilteredPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingPatient, setEditingPatient] = useState(null)
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    patient_name: '',
    date_of_birth: '',
    gender: 'Male',
    blood_group: '',
    phone: '',
    current_room: '',
    status: 'admitted',
    admission_date: new Date().toISOString().slice(0, 16)
  })

  const generatePatientId = () => {
    const year = new Date().getFullYear()
    const rand = Math.floor(1000 + Math.random() * 9000)
    return `PT-${year}-${rand}`
  }

  useEffect(() => {
    loadPatients()
  }, [])

  useEffect(() => {
    filterPatients()
  }, [patients, searchTerm, statusFilter])

  const loadPatients = async () => {
    try {
      setLoading(true)
      const [
        { data: patientsData, error: patientsError },
        { data: roomsData, error: roomsError }
      ] = await Promise.all([
        db.getPatients(),
        db.getRooms()
      ])

      if (patientsError) throw patientsError

      setPatients(patientsData || [])
      if (roomsData) setRooms(roomsData.filter(r => r.status === 'available' || r.status === 'occupied'))
    } catch (error) {
      console.error('Error loading patients:', error)
      alert('Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  const filterPatients = () => {
    let filtered = patients

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patient_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone?.includes(searchTerm)
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    setFilteredPatients(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      // Sanitise: UUID columns must be null, not empty string
      const sanitised = {
        ...formData,
        current_room: formData.current_room || null
      }

      if (editingPatient) {
        const { error } = await db.updatePatient(editingPatient.id, sanitised)
        if (error) throw error
        alert('Patient updated successfully')
      } else {
        const dataWithId = { ...sanitised, patient_id: generatePatientId() }
        const { error } = await db.createPatient(dataWithId)
        if (error) throw error
        alert('Patient added successfully')
      }

      setShowModal(false)
      resetForm()
      loadPatients()
    } catch (error) {
      console.error('Error saving patient:', error)
      alert('Failed to save patient: ' + error.message)
    }
  }

  const handleEdit = (patient) => {
    setEditingPatient(patient)
    setFormData({
      patient_name: patient.patient_name || '',
      date_of_birth: patient.date_of_birth || '',
      gender: patient.gender || 'Male',
      blood_group: patient.blood_group || '',
      phone: patient.phone || '',
      current_room: patient.current_room || '',   // UUID or ''  
      status: patient.status || 'admitted',
      admission_date: patient.admission_date ? new Date(patient.admission_date).toISOString().slice(0, 16) : ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this patient?')) return

    try {
      const { error } = await db.deletePatient(id)
      if (error) throw error

      alert('Patient deleted successfully')
      loadPatients()
    } catch (error) {
      console.error('Error deleting patient:', error)
      alert('Failed to delete patient')
    }
  }

  const resetForm = () => {
    setFormData({
      patient_name: '',
      date_of_birth: '',
      gender: 'Male',
      blood_group: '',
      phone: '',
      current_room: '',
      status: 'admitted',
      admission_date: new Date().toISOString().slice(0, 16)
    })
    setEditingPatient(null)
  }

  const getStatusBadge = (status) => {
    const badges = {
      admitted: 'badge-info',
      discharged: 'badge-success',
      under_observation: 'badge-warning',
      emergency: 'badge-danger'
    }
    return badges[status] || 'badge-secondary'
  }

  const getStatusLabel = (status) => {
    const labels = {
      admitted: 'Admitted',
      discharged: 'Discharged',
      under_observation: 'Under Observation',
      emergency: 'Emergency'
    }
    return labels[status] || status
  }

  const canEdit = user?.role === 'admin' || user?.role === 'staff'

  if (loading) {
    return (
      <div className="patients-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading patients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="patients-page">
      <div className="page-header">
        <div>
          <h1>Patient Management</h1>
          <p className="page-subtitle">Manage patient records and admissions</p>
        </div>
        {canEdit && (
          <button
            className="btn-primary"
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
          >
            ➕ Add Patient
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, ID, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="admitted">Admitted</option>
          <option value="under_observation">Under Observation</option>
          <option value="emergency">Emergency</option>
          <option value="discharged">Discharged</option>
        </select>
      </div>

      {/* Patients Table */}
      <div className="table-container">
        <table className="patients-table">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Blood Group</th>
              <th>Phone</th>
              <th>Room</th>
              <th>Status</th>
              <th>Admission Date</th>
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 10 : 9} className="empty-state">
                  No patients found
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient) => {
                const age = patient.date_of_birth
                  ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
                  : '-'

                return (
                  <tr key={patient.id}>
                    <td className="patient-id" data-label="Patient ID">{patient.patient_id}</td>
                    <td className="patient-name" data-label="Name">{patient.patient_name}</td>
                    <td data-label="Age">{age}</td>
                    <td data-label="Gender">{patient.gender}</td>
                    <td data-label="Blood Group">{patient.blood_group || '-'}</td>
                    <td data-label="Phone">{patient.phone || '-'}</td>
                    <td data-label="Room">
                      {patient.rooms?.room_number || (patient.current_room ? 'Assigned' : '-')}
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${getStatusBadge(patient.status)}`}>
                        {getStatusLabel(patient.status)}
                      </span>
                    </td>
                    <td data-label="Admission Date">
                      {patient.admission_date
                        ? new Date(patient.admission_date).toLocaleDateString()
                        : '-'
                      }
                    </td>
                    {canEdit && (
                      <td className="actions" data-label="Actions">
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => handleEdit(patient)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(patient.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPatient ? 'Edit Patient' : 'Add New Patient'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {editingPatient && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient ID (auto-generated)</label>
                  <div style={{ padding: '8px 12px', background: '#f3f4f6', borderRadius: '6px', fontWeight: '700', color: '#374151', fontFamily: 'monospace', fontSize: '14px' }}>
                    {editingPatient.patient_id}
                  </div>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Blood Group</label>
                  <input
                    type="text"
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    placeholder="A+"
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="555-0101"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Room</label>
                  <select
                    value={formData.current_room}
                    onChange={(e) => setFormData({ ...formData, current_room: e.target.value })}
                  >
                    <option value="">No Room Assigned</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>
                        {room.room_number} ({room.room_type}) - {room.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                  >
                    <option value="admitted">Admitted</option>
                    <option value="under_observation">Under Observation</option>
                    <option value="emergency">Emergency</option>
                    <option value="discharged">Discharged</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Admission Date</label>
                <input
                  type="datetime-local"
                  value={formData.admission_date}
                  onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingPatient ? 'Update Patient' : 'Add Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Patients