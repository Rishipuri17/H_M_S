import React, { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Home, Bed, Wrench, Package, Activity, Users, BarChart3,
  LogOut, LayoutDashboard, Shield, Brain, Sparkles, BarChart2,
  ChevronLeft, ChevronRight, Bell, Search, Settings
} from 'lucide-react'

// ── Sidebar section definitions ───────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: 'MAIN',
    items: [
      { path: '/',          icon: Home,          label: 'Dashboard'          },
    ],
  },
  {
    label: 'HOSPITAL',
    items: [
      { path: '/patients',  icon: Users,          label: 'Patients'          },
      { path: '/rooms',     icon: Bed,            label: 'Rooms'             },
      { path: '/equipment', icon: Wrench,         label: 'Equipment'         },
      { path: '/inventory', icon: Package,        label: 'Inventory'         },
      { path: '/maintenance',icon: Activity,      label: 'Maintenance'       },
      { path: '/analytics', icon: BarChart3,      label: 'Analytics'         },
    ],
  },
  {
    label: 'AI & ML',
    items: [
      { path: '/ai-insights',          icon: Sparkles,     label: 'AI Insights'        },
      { path: '/ml-diagnostics',       icon: Brain,        label: 'ML Diagnostics'     },
      { path: '/patient-predictions',  icon: Activity,     label: 'Patient Forecast'   },
      { path: '/ml-metrics',           icon: BarChart2,    label: 'Model Performance', badge: 'NEW' },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      { path: '/staff', icon: LayoutDashboard, label: 'Staff Dashboard', role: 'staff' },
      { path: '/admin', icon: Shield,          label: 'Admin Panel',     role: 'admin' },
    ],
  },
]

const SIDEBAR_W_OPEN   = 240
const SIDEBAR_W_CLOSED = 64

export default function Layout() {
  const { user, logout }  = useAuth()
  const location          = useLocation()
  const navigate          = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const sidebarW = collapsed ? SIDEBAR_W_CLOSED : SIDEBAR_W_OPEN

  const handleLogout = () => { logout(); navigate('/login') }

  const activeLabel = NAV_SECTIONS
    .flatMap(s => s.items)
    .find(i => i.path === location.pathname)?.label || 'Dashboard'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100vh',
        width: sidebarW,
        background: 'linear-gradient(180deg, #1a2035 0%, #141929 100%)',
        color: 'white',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 1000,
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}>

        {/* Brand */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: collapsed ? '18px 14px' : '18px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          minHeight: 64, justifyContent: collapsed ? 'center' : 'space-between',
          transition: 'padding 0.25s',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg,#4361ee,#7209b7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
              }}>🏥</div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 800, fontSize: 14.5, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>Hospital HMS</div>
                <div style={{ fontSize: 10.5, color: '#7b8db5', marginTop: 1 }}>Management System</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg,#4361ee,#7209b7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
            }}>🏥</div>
          )}
          <button onClick={() => setCollapsed(c => !c)} style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6,
            color: '#a0b0d0', cursor: 'pointer', padding: '5px 6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s', flexShrink: 0,
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
          {NAV_SECTIONS.map(section => {
            const filtered = section.items.filter(item => !item.role || item.role === user?.role)
            if (!filtered.length) return null
            return (
              <div key={section.label}>
                {/* Section label */}
                {!collapsed && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: '#4a5e82',
                    padding: '14px 20px 5px', letterSpacing: '0.1em',
                  }}>{section.label}</div>
                )}
                {collapsed && <div style={{ height: 10 }} />}

                {/* Nav items */}
                {filtered.map(item => {
                  const Icon     = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <Link key={item.path} to={item.path} title={collapsed ? item.label : ''} style={{
                      display: 'flex', alignItems: 'center',
                      gap: 11, textDecoration: 'none',
                      padding: collapsed ? '9px 0' : '9px 16px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      color: isActive ? '#fff' : '#8da0c0',
                      fontWeight: isActive ? 600 : 400,
                      fontSize: 13.5,
                      background: isActive ? 'rgba(67,97,238,0.22)' : 'transparent',
                      borderLeft: isActive ? '3px solid #4361ee' : '3px solid transparent',
                      transition: 'all 0.15s',
                      position: 'relative',
                      whiteSpace: 'nowrap',
                    }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                    >
                      <Icon size={17} style={{ flexShrink: 0, color: isActive ? '#4361ee' : 'inherit' }} />
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1 }}>{item.label}</span>
                          {item.badge && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '2px 6px',
                              background: 'linear-gradient(135deg,#4361ee,#7209b7)',
                              borderRadius: 10, color: 'white', letterSpacing: '0.05em',
                            }}>{item.badge}</span>
                          )}
                        </>
                      )}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* User strip */}
        <div style={{
          padding: collapsed ? '12px 0' : '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {/* Avatar row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#4361ee,#7209b7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'white',
            }}>
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.full_name || 'User'}
                </div>
                <div style={{ fontSize: 11, color: '#7b8db5', textTransform: 'capitalize' }}>{user?.role || 'viewer'}</div>
              </div>
            )}
          </div>

          {/* Logout */}
          <button onClick={handleLogout} title={collapsed ? 'Logout' : ''} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: collapsed ? '7px' : '7px 12px',
            background: 'rgba(239,35,60,0.12)', border: '1px solid rgba(239,35,60,0.25)',
            borderRadius: 8, color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            fontFamily: 'inherit', transition: 'background 0.2s', width: '100%',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,35,60,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,35,60,0.12)'}
          >
            <LogOut size={14} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        marginLeft: sidebarW, transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
        minHeight: '100vh',
      }}>

        {/* Top bar */}
        <header style={{
          height: 60, background: 'white',
          borderBottom: '1px solid #e5e8ef',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          {/* Breadcrumb */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#a0aec0', marginBottom: 1 }}>
              <span>Home</span>
              <span>/</span>
              <span style={{ color: '#4361ee', fontWeight: 600 }}>{activeLabel}</span>
            </div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: '#1a2035', lineHeight: 1 }}>{activeLabel}</h1>
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Role badge */}
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              background: user?.role === 'admin' ? 'linear-gradient(135deg,#4361ee,#7209b7)'
                        : user?.role === 'staff' ? 'linear-gradient(135deg,#f7b731,#e67e22)'
                        : '#f0f2f5',
              color: (user?.role === 'admin' || user?.role === 'staff') ? 'white' : '#6b7a99',
            }}>
              {user?.role || 'viewer'}
            </span>

            {/* Bell */}
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '7px', borderRadius: 8, color: '#6b7a99', position: 'relative' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f0f2f5' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <Bell size={18} />
              <span style={{ position: 'absolute', top: 5, right: 5, width: 8, height: 8, background: '#ef233c', borderRadius: '50%', border: '2px solid white' }} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
