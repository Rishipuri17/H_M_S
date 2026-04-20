import React, { useState, useEffect } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, Search, AlertTriangle } from 'lucide-react'
import '../components/ResponsiveTable.css'

const Inventory = () => {
  const { canEdit, canDelete } = useAuth()
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showLowStock, setShowLowStock] = useState(false)

  const [formData, setFormData] = useState({
    item_name: '',
    item_category: 'Medication',
    item_code: '',
    description: '',
    unit_of_measurement: 'pieces',
    current_stock: 0,
    minimum_stock: 10,
    maximum_stock: 1000,
    reorder_level: 20,
    unit_price: '',
    supplier: '',
    storage_location: '',
    expiry_date: '',
    batch_number: '',
    requires_prescription: false,
    is_controlled_substance: false,
    temperature_sensitive: false,
    storage_temperature_min: '',
    storage_temperature_max: '',
    notes: ''
  })

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    setLoading(true)
    const { data, error } = await db.getInventory()
    if (!error && data) {
      setInventory(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await db.updateInventoryItem(editingItem.id, formData)
      } else {
        await db.createInventoryItem(formData)
      }
      loadInventory()
      closeModal()
    } catch (error) {
      alert('Error saving item: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await db.deleteInventoryItem(id)
      loadInventory()
    }
  }

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item)
      setFormData(item)
    } else {
      setEditingItem(null)
      setFormData({
        item_name: '',
        item_category: 'Medication',
        item_code: '',
        description: '',
        unit_of_measurement: 'pieces',
        current_stock: 0,
        minimum_stock: 10,
        maximum_stock: 1000,
        reorder_level: 20,
        unit_price: '',
        supplier: '',
        storage_location: '',
        expiry_date: '',
        batch_number: '',
        requires_prescription: false,
        is_controlled_substance: false,
        temperature_sensitive: false,
        storage_temperature_min: '',
        storage_temperature_max: '',
        notes: ''
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingItem(null)
  }

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || item.item_category === filterCategory
    const matchesLowStock = !showLowStock || item.current_stock <= item.minimum_stock
    return matchesSearch && matchesCategory && matchesLowStock
  })

  const getStockStatus = (item) => {
    if (item.current_stock === 0) return { label: 'Out of Stock', class: 'badge-danger' }
    if (item.current_stock <= item.minimum_stock) return { label: 'Low Stock', class: 'badge-warning' }
    if (item.current_stock <= item.reorder_level) return { label: 'Reorder Soon', class: 'badge-info' }
    return { label: 'In Stock', class: 'badge-success' }
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="card-title">Inventory Management</h2>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => openModal()}>
              <Plus size={16} style={{ marginRight: '8px' }} />
              Add Item
            </button>
          )}
        </div>

        <div className="filter-bar">
          <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            <input
              type="text"
              className="search-box"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ maxWidth: '180px' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="Medication">Medication</option>
            <option value="Surgical Supply">Surgical Supply</option>
            <option value="Disposable">Disposable</option>
            <option value="PPE">PPE</option>
            <option value="Laboratory Supply">Laboratory Supply</option>
            <option value="Office Supply">Office Supply</option>
            <option value="Linen">Linen</option>
            <option value="Food">Food</option>
            <option value="Other">Other</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              style={{ marginRight: '6px' }}
            />
            Low Stock Only
          </label>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Code</th>
                <th>Current Stock</th>
                <th>Min Stock</th>
                <th>Status</th>
                <th>Unit Price</th>
                <th>Supplier</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map(item => {
                const status = getStockStatus(item)
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '600' }} data-label="Item Name">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        {item.current_stock === 0 && (
                          <AlertTriangle size={16} color="#dc3545" />
                        )}
                        {item.item_name}
                      </div>
                    </td>
                    <td data-label="Category">{item.item_category}</td>
                    <td style={{ fontSize: '13px', color: '#666' }} data-label="Code">{item.item_code || '-'}</td>
                    <td style={{ fontWeight: '600' }} data-label="Current Stock">
                      {item.current_stock} {item.unit_of_measurement}
                    </td>
                    <td data-label="Min Stock">{item.minimum_stock}</td>
                    <td data-label="Status">
                      <span className={`badge ${status.class}`}>
                        {status.label}
                      </span>
                    </td>
                    <td data-label="Unit Price">${item.unit_price || '-'}</td>
                    <td data-label="Supplier">{item.supplier || '-'}</td>
                    {canEdit && (
                      <td data-label="Actions">
                        <div className="action-buttons">
                          <button className="icon-button" onClick={() => openModal(item)}>
                            <Edit2 size={16} color="#0066cc" />
                          </button>
                          {canDelete && (
                            <button className="icon-button" onClick={() => handleDelete(item.id)}>
                              <Trash2 size={16} color="#dc3545" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingItem ? 'Edit Inventory Item' : 'Add New Item'}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Item Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-select"
                    value={formData.item_category}
                    onChange={(e) => setFormData({ ...formData, item_category: e.target.value })}
                    required
                  >
                    <option value="Medication">Medication</option>
                    <option value="Surgical Supply">Surgical Supply</option>
                    <option value="Disposable">Disposable</option>
                    <option value="PPE">PPE</option>
                    <option value="Laboratory Supply">Laboratory Supply</option>
                    <option value="Office Supply">Office Supply</option>
                    <option value="Linen">Linen</option>
                    <option value="Food">Food</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Item Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.item_code}
                    onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit of Measurement</label>
                  <select
                    className="form-select"
                    value={formData.unit_of_measurement}
                    onChange={(e) => setFormData({ ...formData, unit_of_measurement: e.target.value })}
                  >
                    <option value="pieces">Pieces</option>
                    <option value="boxes">Boxes</option>
                    <option value="liters">Liters</option>
                    <option value="kg">Kilograms</option>
                    <option value="bottles">Bottles</option>
                    <option value="vials">Vials</option>
                    <option value="packets">Packets</option>
                    <option value="sets">Sets</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '60px' }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-4">
                <div className="form-group">
                  <label className="form-label">Current Stock</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Minimum Stock</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData({ ...formData, minimum_stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Maximum Stock</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.maximum_stock}
                    onChange={(e) => setFormData({ ...formData, maximum_stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reorder Level</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Supplier</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Storage Location</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.storage_location}
                    onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Batch Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: '500', color: '#555', marginBottom: '8px', display: 'block' }}>
                    Special Conditions
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.requires_prescription}
                        onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.checked })}
                        style={{ marginRight: '6px' }}
                      />
                      Requires Prescription
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.is_controlled_substance}
                        onChange={(e) => setFormData({ ...formData, is_controlled_substance: e.target.checked })}
                        style={{ marginRight: '6px' }}
                      />
                      Controlled Substance
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.temperature_sensitive}
                        onChange={(e) => setFormData({ ...formData, temperature_sensitive: e.target.checked })}
                        style={{ marginRight: '6px' }}
                      />
                      Temperature Sensitive
                    </label>
                  </div>
                </div>
              </div>

              {formData.temperature_sensitive && (
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Min Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={formData.storage_temperature_min}
                      onChange={(e) => setFormData({ ...formData, storage_temperature_min: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={formData.storage_temperature_max}
                      onChange={(e) => setFormData({ ...formData, storage_temperature_max: e.target.value })}
                    />
                  </div>
                </div>
              )}

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
                  {editingItem ? 'Update Item' : 'Create Item'}
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

export default Inventory
