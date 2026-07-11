import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { isTauri } from './lib/tauri'
import { cardStyle } from './lib/styles'

// Import our new decoupled items
import { toTitleCase } from './lib/format'
import ErrorBoundary from './components/ErrorBoundary'
import TopBanner from './components/TopBanner'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import ManageAccess from './pages/ManageAccess'
import ManageStaff from './pages/ManageStaff'
import ManageDepartments from './pages/ManageDepartments'
import ApplyLeave from './pages/ApplyLeave'
import LeaveHistory from './pages/LeaveHistory'
import LeaveApproval from './pages/LeaveApproval'
import YearlyPublicHolidays from './pages/YearlyPublicHolidays'
import UpdatePassword from './pages/UpdatePassword'
import MonthlyReport from './pages/MonthlyReport'
import DailyReport from './pages/DailyReport'
import ManagePersonalLeave from './pages/ManagePersonalLeave'
import SystemSettings from './pages/SystemSettings'
import MyMsg from './components/MyMsg'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('') // State for authentication errors
  const [activeMenu, setActiveMenu] = useState({ page: 'dashboard', data: {} }) // activeMenu is now an object
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = async (userId) => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    if (!error) setUnreadCount(count || 0)
  }

  useEffect(() => {
    const checkForUpdates = async () => {
      if (!isTauri) return
      try {
        const { check } = await import('@tauri-apps/plugin-updater')
        const update = await check();
        if (update) {
          console.log(`Update to ${update.version} available!`);
          if (window.confirm(`Version ${update.version} is available. Install and restart?`)) {
            await update.downloadAndInstall();
          }
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    let notificationChannel = null;

    const setupNotificationListener = (userId) => {
      if (notificationChannel && notificationChannel.topic.includes(userId)) return;

      if (notificationChannel) {
        supabase.removeChannel(notificationChannel);
        notificationChannel = null;
      }

      notificationChannel = supabase
        .channel(`public:notifications:${userId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}` 
        }, async payload => {
          console.log('Notification received:', payload.new);
          
          alert(`🔔 ${payload.new.title}\n${payload.new.message}`);

          setUnreadCount(prev => prev + 1);

          if (isTauri) {
            try {
              const { sendNotification } = await import('@tauri-apps/plugin-notification')
              await sendNotification({ 
                title: payload.new.title, 
                body: payload.new.message 
              });
            } catch (e) {
              console.error("Native notification failed:", e);
            }
          }
        })
        .subscribe();
    };

    const initTauri = async () => {
      if (!isTauri) return

      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const { listen } = await import('@tauri-apps/api/event')
      const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification')
      const { enable, isEnabled } = await import('@tauri-apps/plugin-autostart')

      const appWindow = getCurrentWindow();

      await appWindow.onCloseRequested(async (event) => {
        event.preventDefault(); 
        await appWindow.hide(); 

        const hasNotified = localStorage.getItem('tray_minimized_notified');
        if (!hasNotified) {
          try {
            await sendNotification({
              title: 'e-Leave System',
              body: 'Aplikasi masih berjalan di latar belakang (System Tray).'
            });
            localStorage.setItem('tray_minimized_notified', 'true');
          } catch (e) {
            console.error("Failed to send tray notification:", e);
          }
        }
      });

      await listen('tauri://minimize', async () => {
        await appWindow.hide();
      });

      try {
        const permission = await isPermissionGranted();
        if (!permission) await requestPermission();
      } catch (err) {
        console.warn("Notification permissions could not be requested:", err);
      }

      try {
        const enabled = await isEnabled();
        const preferenceSet = localStorage.getItem('autostart_preference_set');
        if (!enabled && !preferenceSet) {
          await enable();
          localStorage.setItem('autostart_preference_set', 'true');
        }
      } catch (err) {
        console.error("Failed to init autostart:", err);
      }
    };

    const initApp = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchUnreadCount(session.user.id);
      }
    };

    initTauri();
    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        checkForUpdates();
        fetchProfile(session.user.id)
        fetchUnreadCount(session.user.id);
        setupNotificationListener(session.user.id);
      } else {
        setProfile(null)
        setActiveMenu('dashboard')
        if (notificationChannel) supabase.removeChannel(notificationChannel);
      }
    })

    return () => {
      subscription.unsubscribe();
      if (notificationChannel) supabase.removeChannel(notificationChannel);
    };
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

    const trimmed = name.trim().toLowerCase()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('full_name', trimmed)
      .maybeSingle()

    if (profileError || !profile?.email) {
      setAuthError('Invalid name or password. Please contact HR.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email: profile.email, password })
    if (error) { setAuthError(error.message); setLoading(false); }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setName('')
    setPassword('')
  }

  const renderContent = () => {
    const page = typeof activeMenu === 'string' ? activeMenu : activeMenu.page;
    const data = typeof activeMenu === 'string' ? {} : (activeMenu.data || {});

    switch (page) {
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
            initialApplicantId={data.applicantId}
            initialCreatedAt={data.createdAt}
          />
        )

      case 'manage_personal_leave':
        return (
          <ManagePersonalLeave 
            supabase={supabase} 
            profile={profile} 
            initialStaffId={data.staffId} 
          />
        )

      case 'my_messages':
        return (
          <MyMsg 
            supabase={supabase} 
            profile={profile} 
            setActiveMenu={setActiveMenu}
            onMarkRead={() => fetchUnreadCount(profile.id)} 
          />
        )

      case 'update_password':
        return <UpdatePassword supabase={supabase} />

      case 'system_settings':
        return <SystemSettings />

      case 'manage_staff': return <ManageStaff supabase={supabase} />
      case 'manage_department':return <ManageDepartments supabase={supabase} />
      case 'public_holiday': return <YearlyPublicHolidays supabase={supabase} />
      case 'daily_report': return <DailyReport supabase={supabase} />
      case 'monthly_report': return <MonthlyReport supabase={supabase} />
      default: return <div>Interface not found.</div>
    }
  }

  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'sans-serif' }}>
        <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', width: '360px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px', color: '#111827', fontWeight: '800' }}>Login E-Leave</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full Name" autoComplete="username" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password" autoComplete="current-password" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
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

  const currentPage = typeof activeMenu === 'string' ? activeMenu : activeMenu.page;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6' }}>
      <TopBanner profile={profile} activeMenu={currentPage} onLogout={handleLogout} />
      <Topbar 
        profile={profile} 
        activeMenu={currentPage} 
        setActiveMenu={setActiveMenu} 
        unreadCount={unreadCount}
      />
      
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <ErrorBoundary>
          {renderContent()}
        </ErrorBoundary>
      </div>
    </div>
  )
}