import React from 'react'

export default function TopBanner({ profile, activeMenu, onLogout }) {
  const getPageTitle = () => {
    switch (activeMenu) {
      case 'dashboard': return '📊 Dashboard Overview'
      case 'apply': return '📝 Apply Leave'
      case 'history': return '📜 Leave History'
      case 'approval': return '📋 Leave Approval'
      case 'manage_staff': return '👥 Manage Staff Profiles'
      case 'leave_type': return '🗂️ Leave Type Configuration'
      case 'shift_type': return '📅 Shift Type Configuration'
      case 'public_holiday': return '📆 Yearly Public Holidays'
      case 'daily_report': return '📋 Daily Leave Report'
      case 'update_password': return '🔐 Update Password'
      case 'monthly_report': return '📈 Monthly Leave Report'
      case 'manage_department':return '🏢 Manage Corporate Departments'
      case 'manage_access': return '🔒 Access Control Management'
      default: return 'Tien Tien E-Leave System'
    }
  }

  return (
    <div style={{ height: '70px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 10 }}>
      {/* Brand Logo Panel */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '250px' }}>
        <img 
          src="/logo.png" 
          alt="Tien Tien Logo" 
          onError={(e) => {
            e.target.style.display = 'none'
            document.getElementById('fallback-text').style.display = 'block'
          }}
          style={{ height: '60px', objectFit: 'contain' }}
        />
        <h3 id="fallback-text" style={{ display: 'none', margin: 0, fontSize: '18px', fontWeight: '800', color: '#ef4444' }}>TIEN TIEN</h3>
      </div>

      {/* Active Page Title */}
      <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
        {getPageTitle()}
      </div>

      {/* User Block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{profile?.full_name}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>{profile?.position || 'Employee'}</div>
        </div>
        <button onClick={onLogout} style={{ padding: '8px 14px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
          Sign Out 🚪
        </button>
      </div>
    </div>
  )
}