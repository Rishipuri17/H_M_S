import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import './App.css'

// ── Lazy-load every page so they're only downloaded when navigated to ──────────
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Rooms = lazy(() => import('./pages/Rooms'))
const Equipment = lazy(() => import('./pages/Equipment'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Maintenance = lazy(() => import('./pages/Maintenance'))
const Patients = lazy(() => import('./pages/Patients'))
const Analytics = lazy(() => import('./pages/Analytics'))
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const MachineDiagnostics = lazy(() => import('./pages/MachineDiagnostics'))
const AIInsights = lazy(() => import('./pages/AIInsights'))
const PatientPrediction = lazy(() => import('./pages/PatientPrediction'))
const MLMetrics = lazy(() => import('./pages/MLMetrics'))

// ── Minimal page-level loading skeleton ───────────────────────────────────────
const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: 'calc(100vh - 120px)', flexDirection: 'column', gap: 14,
    color: '#64748b'
  }}>
    <div style={{
      width: 36, height: 36,
      border: '3.5px solid #e2e8f0',
      borderTop: '3.5px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <span style={{ fontSize: 14, fontWeight: 500 }}>Loading…</span>
  </div>
)

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="equipment" element={<Equipment />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="patients" element={<Patients />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="staff" element={<StaffDashboard />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="ml-diagnostics" element={<MachineDiagnostics />} />
          <Route path="ai-insights" element={<AIInsights />} />
          <Route path="patient-predictions" element={<PatientPrediction />} />
          <Route path="ml-metrics" element={<MLMetrics />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App
