import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Import our new decoupled items
import TopBanner from './components/TopBanner'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import ManageAccess from './pages/ManageAccess'
import ManageStaff from './pages/ManageStaff'
import ManageDepartments from './pages/ManageDepartments'
import ApplyLeave from './pages/ApplyLeave'
import LeaveHistory from './pages/LeaveHistory'
import LeaveApproval from './pages/LeaveApproval'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [activeMenu, setActiveMenu] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setActiveMenu('dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const currentYear = new Date().getFullYear()
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        superior:report_to (
          full_name
        ),
        leave_eligibility!uid (*)
      `)
      .eq('id', userId)
      .single()

    if (error) console.error('Failed to fetch profile:', error.message)
    else {
      // Filter in JS to avoid inner-join filtering that hides the profile if the year row is missing
      const eligibility = data.leave_eligibility?.find(e => e.year === currentYear) || 
                         { eligibility: 0, balance: 0 }
      setProfile({ ...data, current_eligibility: eligibility })
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setAuthError(error.message); setLoading(false); }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setEmail('')
    setPassword('')
  }

  const cardStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }

  // Simple clean switch workspace switcher
  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard supabase={supabase} profile={profile} />
      
      case 'manage_access':
        return <ManageAccess supabase={supabase} currentAdminProfile={profile} />

      // Placeholders for next milestones
      case 'apply': 
        return (
          <ApplyLeave 
            supabase={supabase} 
            profile={profile} 
            onApplicationSuccess={() => fetchProfile(session.user.id)} 
          />
        )
      case 'history': 
        return (
          <LeaveHistory 
            supabase={supabase} 
            profile={profile} 
            onActionSuccess={() => fetchProfile(session.user.id)} 
          />
        )
      case 'approval': 
        return (
          <LeaveApproval 
            supabase={supabase} 
            profile={profile} 
            onActionSuccess={() => fetchProfile(session.user.id)} 
          />
        )
      //case 'manage_staff': return <div style={cardStyle}><h3>👥 Manage Staff Profiles</h3></div>
      case 'manage_staff': return <ManageStaff supabase={supabase} currentAdminProfile={profile} />
      case 'leave_type': return <div style={cardStyle}><h3>🗂️ Leave Type Configuration</h3></div>
      case 'manage_department':return <ManageDepartments supabase={supabase} />
      case 'shift_type': return <div style={cardStyle}><h3>📅 Shift Type Configuration</h3></div>
      case 'public_holiday': return <div style={cardStyle}><h3>⚱️ Yearly Public Holidays</h3></div>
      case 'daily_report': return <div style={cardStyle}><h3>📋 Daily Leave Report</h3></div>
      case 'monthly_report': return <div style={cardStyle}><h3>📈 Monthly Leave Report</h3></div>
      default: return <div>Interface not found.</div>
    }
  }

  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'sans-serif' }}>
        <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', width: '360px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px', color: '#111827', fontWeight: '800' }}>Login E-Leave</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email Address" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
            <button type="submit" disabled={loading} style={{ padding: '12px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
          {authError && <p style={{ color: '#ef4444', marginTop: '16px', textAlign: 'center', fontSize: '13px' }}>⚠️ {authError}</p>}
        </div>
      </div>
    )
  }

  if (!profile) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#4f46e5', fontWeight: 'bold' }}>Loading system...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6' }}>
      <TopBanner profile={profile} activeMenu={activeMenu} onLogout={handleLogout} />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar profile={profile} activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}