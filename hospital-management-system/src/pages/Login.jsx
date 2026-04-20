import { useState, useEffect, useRef } from 'react'
import { db } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './Login.css'

function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('viewer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const { login } = useAuth()
  const navigate = useNavigate()

  // Exact Google Antigravity particle effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationFrameId
    let particles = []

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Track mouse
    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Google colors
    const googleColors = [
      { r: 66, g: 133, b: 244 },   // Blue
      { r: 234, g: 67, b: 53 },    // Red
      { r: 251, g: 188, b: 5 },    // Yellow
      { r: 52, g: 168, b: 83 }     // Green
    ]

    // Particle class - smooth, slow movement
    class Particle {
      constructor() {
        // Random starting position
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height

        // Very slow base velocity
        this.baseVx = (Math.random() - 0.5) * 0.3
        this.baseVy = (Math.random() - 0.5) * 0.3

        this.vx = this.baseVx
        this.vy = this.baseVy

        // Visual properties
        this.color = googleColors[Math.floor(Math.random() * 4)]
        this.size = Math.random() * 2.5 + 1.5
        this.opacity = Math.random() * 0.4 + 0.3

        // Mouse interaction
        this.mouseInfluence = 0.02
        this.maxSpeed = 2
        this.friction = 0.98
      }

      update() {
        // Calculate distance from mouse
        const dx = this.x - mouseRef.current.x
        const dy = this.y - mouseRef.current.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const influenceRadius = 200

        // Mouse influence - very gentle push away
        if (distance < influenceRadius && distance > 0) {
          const force = (influenceRadius - distance) / influenceRadius
          const angle = Math.atan2(dy, dx)

          // Gentle push away from mouse
          this.vx += Math.cos(angle) * force * this.mouseInfluence
          this.vy += Math.sin(angle) * force * this.mouseInfluence
        } else {
          // Gradually return to base velocity
          this.vx += (this.baseVx - this.vx) * 0.01
          this.vy += (this.baseVy - this.vy) * 0.01
        }

        // Apply friction for smooth deceleration
        this.vx *= this.friction
        this.vy *= this.friction

        // Limit maximum speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
        if (speed > this.maxSpeed) {
          this.vx = (this.vx / speed) * this.maxSpeed
          this.vy = (this.vy / speed) * this.maxSpeed
        }

        // Update position
        this.x += this.vx
        this.y += this.vy

        // Wrap around edges smoothly
        if (this.x < -20) this.x = canvas.width + 20
        if (this.x > canvas.width + 20) this.x = -20
        if (this.y < -20) this.y = canvas.height + 20
        if (this.y > canvas.height + 20) this.y = -20
      }

      draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`
        ctx.fill()
      }
    }

    // Create more particles, spread out
    const particleCount = 100
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }

    // Animation loop
    const animate = () => {
      // Clear canvas completely (no trails)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw all particles
      particles.forEach(particle => {
        particle.update()
        particle.draw()
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: users, error: fetchError } = await db.getUsers()

      if (fetchError) throw fetchError

      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())

      if (!user) {
        throw new Error('User not found')
      }

      if (!user.is_active) {
        throw new Error('Account is inactive. Please contact administrator.')
      }

      if (!password) {
        throw new Error('Password is required')
      }

      login(user)
      navigate('/')
    } catch (err) {
      console.error('Login error:', err)
      // Distinguish network/config errors from auth errors
      if (err.message === 'Failed to fetch' || err.message?.includes('fetch')) {
        setError('Cannot connect to the server. Please check your internet connection or contact the administrator.')
      } else {
        setError(err.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = (newRole) => {
    setRole(newRole)
    if (newRole === 'viewer') {
      setDepartment('')
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !fullName || !password) {
        throw new Error('Please fill in all required fields')
      }

      const { data: existingUsers } = await db.getUsers()
      if (existingUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('Email already registered')
      }

      const newUser = {
        email: email.toLowerCase(),
        full_name: fullName,
        role,
        phone: phone || null,
        department: (role === 'admin' || role === 'staff') ? (department || null) : null,
        is_active: true
      }

      const { data, error: createError } = await db.createUser(newUser)

      if (createError) throw createError

      login(data[0])
      navigate('/')
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <canvas ref={canvasRef} className="background-canvas" />

      <div className="login-content">
        {/* Logo */}
        <div className="login-logo">
          <div className="logo-symbol">H+</div>
          <h1>Hospital Management System</h1>
        </div>

        {/* Login Form */}
        <div className="login-card">
          <div className="login-tabs">
            <button
              className={`tab ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              className={`tab ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="error-message">
              <span>⚠️</span> {error}
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <div className="demo-accounts">
                <p className="demo-title">Demo Accounts:</p>
                <div className="demo-list">
                  <button
                    type="button"
                    className="demo-btn"
                    onClick={() => {
                      setEmail('admin@hospital.com')
                      setPassword('admin123')
                    }}
                  >
                    👤 Admin
                  </button>
                  <button
                    type="button"
                    className="demo-btn"
                    onClick={() => {
                      setEmail('staff@hospital.com')
                      setPassword('staff123')
                    }}
                  >
                    👨‍⚕️ Staff
                  </button>
                  <button
                    type="button"
                    className="demo-btn"
                    onClick={() => {
                      setEmail('viewer@hospital.com')
                      setPassword('viewer123')
                    }}
                  >
                    👁️ Viewer
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="login-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label>Phone (Optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-group">
                <label>Role *</label>
                <div className="role-selector">
                  {['admin', 'staff', 'viewer'].map((r) => (
                    <div
                      key={r}
                      className={`role-option ${role === r ? 'active' : ''}`}
                      onClick={() => handleRoleChange(r)}
                    >
                      <div className="role-icon">
                        {r === 'admin' && '👑'}
                        {r === 'staff' && '👨‍⚕️'}
                        {r === 'viewer' && '👁️'}
                      </div>
                      <div className="role-info">
                        <div className="role-name">{r.charAt(0).toUpperCase() + r.slice(1)}</div>
                        <div className="role-desc">
                          {r === 'admin' && 'Full system access'}
                          {r === 'staff' && 'Create & edit data'}
                          {r === 'viewer' && 'Read-only access'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {(role === 'admin' || role === 'staff') && (
                <div className="form-group">
                  <label>Department (Optional)</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g., Emergency, ICU, Surgery"
                  />
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        <div className="login-footer">
          <p>© 2024 Hospital Management System. All rights reserved.</p>
          <p className="sdg-notice">🌍 Supporting SDG 11: Sustainable Cities and Communities</p>
        </div>
      </div>
    </div>
  )
}

export default Login