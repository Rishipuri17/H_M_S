import { useState, useEffect } from 'react'
import { db } from '../lib/supabase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'
import './Analytics.css'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
)

function Analytics() {
  const [stats, setStats] = useState({
    rooms: { total: 0, available: 0, occupied: 0, maintenance: 0 },
    equipment: { total: 0, operational: 0, maintenance: 0, outOfService: 0 },
    inventory: { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
    maintenance: { total: 0, scheduled: 0, inProgress: 0, completed: 0 },
    patients: { total: 0, admitted: 0, observation: 0, discharged: 0, emergency: 0 }
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const data = await db.getDashboardStats()

      // Process rooms
      const roomStats = {
        total: data.rooms.length,
        available: data.rooms.filter(r => r.status === 'available').length,
        occupied: data.rooms.filter(r => r.status === 'occupied').length,
        maintenance: data.rooms.filter(r => r.status === 'maintenance').length
      }

      // Process equipment
      const equipmentStats = {
        total: data.equipment.length,
        operational: data.equipment.filter(e => e.status === 'operational').length,
        maintenance: data.equipment.filter(e => e.status === 'maintenance').length,
        outOfService: data.equipment.filter(e => e.status === 'out_of_service').length
      }

      // Process inventory
      const inventoryStats = {
        total: data.inventory.length,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0
      }
      data.inventory.forEach(item => {
        if (item.status === 'in_stock') inventoryStats.inStock++
        else if (item.status === 'low_stock') inventoryStats.lowStock++
        else if (item.status === 'out_of_stock') inventoryStats.outOfStock++
        else if (item.current_stock !== undefined && item.minimum_stock !== undefined) {
          if (item.current_stock === 0) inventoryStats.outOfStock++
          else if (item.current_stock <= item.minimum_stock) inventoryStats.lowStock++
          else inventoryStats.inStock++
        }
      })

      // Process maintenance
      const maintenanceStats = {
        total: data.maintenance.length,
        scheduled: data.maintenance.filter(m => m.status === 'scheduled').length,
        inProgress: data.maintenance.filter(m => m.status === 'in_progress').length,
        completed: data.maintenance.filter(m => m.status === 'completed').length
      }

      // Process patients
      const patientStats = {
        total: data.patients.length,
        admitted: data.patients.filter(p => p.status === 'admitted').length,
        observation: data.patients.filter(p => p.status === 'under_observation').length,
        emergency: data.patients.filter(p => p.status === 'emergency').length,
        discharged: data.patients.filter(p => p.status === 'discharged').length
      }

      setStats({
        rooms: roomStats,
        equipment: equipmentStats,
        inventory: inventoryStats,
        maintenance: maintenanceStats,
        patients: patientStats
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Chart configurations
  const roomChartData = {
    labels: ['Available', 'Occupied', 'Maintenance'],
    datasets: [{
      data: [stats.rooms.available, stats.rooms.occupied, stats.rooms.maintenance],
      backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(245,158,11,0.8)', 'rgba(239,68,68,0.8)'],
      borderColor: ['rgb(16,185,129)', 'rgb(245,158,11)', 'rgb(239,68,68)'],
      borderWidth: 2
    }]
  }

  const equipmentChartData = {
    labels: ['Operational', 'Maintenance', 'Out of Service'],
    datasets: [{
      data: [stats.equipment.operational, stats.equipment.maintenance, stats.equipment.outOfService],
      backgroundColor: ['rgba(52,168,83,0.8)', 'rgba(251,188,5,0.8)', 'rgba(234,67,53,0.8)'],
      borderColor: ['rgb(52,168,83)', 'rgb(251,188,5)', 'rgb(234,67,53)'],
      borderWidth: 2
    }]
  }

  const inventoryChartData = {
    labels: ['In Stock', 'Low Stock', 'Out of Stock'],
    datasets: [{
      label: 'Items',
      data: [stats.inventory.inStock, stats.inventory.lowStock, stats.inventory.outOfStock],
      backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)'],
      borderColor: ['rgb(16,185,129)', 'rgb(245,158,11)', 'rgb(239,68,68)'],
      borderWidth: 2
    }]
  }

  const maintenanceChartData = {
    labels: ['Scheduled', 'In Progress', 'Completed'],
    datasets: [{
      label: 'Tasks',
      data: [stats.maintenance.scheduled, stats.maintenance.inProgress, stats.maintenance.completed],
      backgroundColor: ['rgba(59,130,246,0.7)', 'rgba(245,158,11,0.7)', 'rgba(16,185,129,0.7)'],
      borderColor: ['rgb(59,130,246)', 'rgb(245,158,11)', 'rgb(16,185,129)'],
      borderWidth: 2
    }]
  }

  const patientChartData = {
    labels: ['Admitted', 'Under Observation', 'Emergency', 'Discharged'],
    datasets: [{
      data: [stats.patients.admitted, stats.patients.observation, stats.patients.emergency, stats.patients.discharged],
      backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(245,158,11,0.8)', 'rgba(239,68,68,0.8)', 'rgba(16,185,129,0.8)'],
      borderColor: ['rgb(59,130,246)', 'rgb(245,158,11)', 'rgb(239,68,68)', 'rgb(16,185,129)'],
      borderWidth: 2
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 15, font: { size: 12 } }
      }
    }
  }

  const barChartOptions = {
    ...chartOptions,
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  }

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1>Analytics &amp; Insights</h1>
          <p className="page-subtitle">Comprehensive view of hospital operations</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-value">{stats.rooms.total}</div>
          <div className="summary-label">Total Rooms</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{stats.equipment.total}</div>
          <div className="summary-label">Total Equipment</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{stats.inventory.total}</div>
          <div className="summary-label">Inventory Items</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{stats.patients.total}</div>
          <div className="summary-label">Total Patients</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Room Status Distribution</h3>
          <div className="chart-container">
            <Pie data={roomChartData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Equipment Status Distribution</h3>
          <div className="chart-container">
            <Pie data={equipmentChartData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Inventory Status</h3>
          <div className="chart-container">
            <Bar data={inventoryChartData} options={barChartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Maintenance Tasks Status</h3>
          <div className="chart-container">
            <Bar data={maintenanceChartData} options={barChartOptions} />
          </div>
        </div>

        <div className="chart-card full-width">
          <h3>Patient Status Overview</h3>
          <div className="chart-container">
            <Pie data={patientChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="insights-section">
        <h2>📊 Key Insights</h2>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">🏥</div>
            <div className="insight-content">
              <h4>Room Utilization</h4>
              <p className="insight-value">
                {stats.rooms.total > 0
                  ? `${Math.round((stats.rooms.occupied / stats.rooms.total) * 100)}%`
                  : '0%'}
              </p>
              <p className="insight-description">
                {stats.rooms.occupied} out of {stats.rooms.total} rooms are currently occupied
              </p>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon alert">⚠️</div>
            <div className="insight-content">
              <h4>Equipment Health</h4>
              <p className="insight-value">
                {stats.equipment.total > 0
                  ? `${Math.round((stats.equipment.operational / stats.equipment.total) * 100)}%`
                  : '0%'}
              </p>
              <p className="insight-description">
                {stats.equipment.operational} out of {stats.equipment.total} equipment items are operational
              </p>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">📦</div>
            <div className="insight-content">
              <h4>Inventory Alerts</h4>
              <p className="insight-value">{stats.inventory.lowStock + stats.inventory.outOfStock}</p>
              <p className="insight-description">
                Items requiring immediate attention or reordering
              </p>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">🔧</div>
            <div className="insight-content">
              <h4>Maintenance Completion Rate</h4>
              <p className="insight-value">
                {stats.maintenance.total > 0
                  ? `${Math.round((stats.maintenance.completed / stats.maintenance.total) * 100)}%`
                  : '0%'}
              </p>
              <p className="insight-description">
                {stats.maintenance.completed} out of {stats.maintenance.total} tasks completed
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics