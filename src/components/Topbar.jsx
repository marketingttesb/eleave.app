import React, { useState } from 'react'

export default function Topbar({ profile, activeMenu, setActiveMenu }) {
  const [hoverMenu, setHoverMenu] = useState(null)

  const navStyle = {
    height: '55px', // Sedikit tinggi untuk estetika
    backgroundColor: '#212529', // Dark grey untuk menu bar utama
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    gap: '4px',
    zIndex: 99
  }

  const itemStyle = (menuKeys) => {
    const keys = Array.isArray(menuKeys) ? menuKeys : [menuKeys]
    const isActive = keys.includes(activeMenu)
    return {
      padding: '0 18px', // Padding sedikit lebih besar
      height: '100%', 
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: isActive ? '#ffffff' : '#adb5bd', // Teks putih untuk aktif, kelabu cerah untuk tidak aktif
      fontSize: '15px', // Saiz fon sedikit besar
      fontWeight: isActive ? '700' : '500', // Bold untuk aktif
      cursor: 'pointer',
      backgroundColor: isActive ? '#495057' : 'transparent', // Kelabu gelap untuk latar belakang aktif
      transition: 'all 0.2s ease',
      position: 'relative',
      userSelect: 'none'
    }
  }

  const dropdownStyle = {
    position: 'absolute',
    top: '100%',
    left: 0, // Kekalkan left 0 untuk dropdown kiri
    backgroundColor: '#f8f9fa', // Sangat cerah kelabu untuk dropdown
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    borderRadius: '0 0 8px 8px',
    minWidth: '220px',
    display: 'flex',
    flexDirection: 'column',
    padding: '10px 0', // Padding sedikit besar
    zIndex: 100
  }

  const dropdownItemStyle = (menuKey) => {
    const isActive = activeMenu === menuKey
    return {
      padding: '10px 20px',
      fontSize: '13px',
      color: isActive ? '#212529' : '#343a40', // Teks kelabu gelap untuk aktif, kelabu lebih gelap untuk tidak aktif
      backgroundColor: isActive ? '#e9ecef' : 'transparent', // Kelabu cerah untuk latar belakang aktif
      fontWeight: isActive ? '600' : '500', // Bold untuk aktif
      // Ensure transition is applied
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      transition: 'background-color 0.15s'
    }
  }

  return (
    <div style={navStyle}>
      {/* Dashboard */}
      <div 
        style={itemStyle('dashboard')} 
        onClick={() => setActiveMenu('dashboard')}
      >
        <span>📊</span> Dashboard
      </div>

      {/* Leave Management (Staff) */}
      {(profile?.is_staff || profile?.is_superior) && (
        <div 
          style={itemStyle(['apply', 'history', 'approval'])}
          onMouseEnter={() => setHoverMenu('leave')}
          onMouseLeave={() => setHoverMenu(null)}
        >
          <span>📝</span> Leave ▾
          {hoverMenu === 'leave' && (
            <div style={dropdownStyle}>
              {profile?.is_staff && (
                <>
                  <div
                    style={dropdownItemStyle('apply')}
                    onClick={() => { setActiveMenu('apply'); setHoverMenu(null); }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.color = '#212529'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = activeMenu === 'apply' ? '#e9ecef' : 'transparent'; e.currentTarget.style.color = activeMenu === 'apply' ? '#212529' : '#343a40'; }}
                  ><span>📝</span> Apply Leave</div>
                  <div
                    style={dropdownItemStyle('history')}
                    onClick={() => { setActiveMenu('history'); setHoverMenu(null); }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.color = '#212529'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = activeMenu === 'history' ? '#e9ecef' : 'transparent'; e.currentTarget.style.color = activeMenu === 'history' ? '#212529' : '#343a40'; }}
                  ><span>📜</span> Leave History</div>
                </>
              )}
              
              {profile?.is_staff && profile?.is_superior && (
                <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
              )}

              {profile?.is_superior && (
                <div 
                  style={dropdownItemStyle('approval')} 
                  onClick={() => { setActiveMenu('approval'); setHoverMenu(null); }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.color = '#212529'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = activeMenu === 'approval' ? '#e9ecef' : 'transparent'; e.currentTarget.style.color = activeMenu === 'approval' ? '#212529' : '#343a40'; }}
                ><span>📋</span> Approval</div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Human Resources (HR) */}
      {profile?.is_hr && (
        <div
          style={itemStyle([
            'manage_staff',
            'manage_department',
            'public_holiday',
            'leave_type',
            'shift_type',
            'daily_report',
            'monthly_report'
          ])}
          onMouseEnter={() => setHoverMenu('hr_management')}
          onMouseLeave={() => setHoverMenu(null)}
        >
          <span>👥</span> Human Resources ▾
          {hoverMenu === 'hr_management' && (
            <div style={dropdownStyle}>
              <div
                style={dropdownItemStyle('manage_staff')}
                onClick={() => { setActiveMenu('manage_staff'); setHoverMenu(null); }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.color = '#212529'; }}
                onMouseLeave={(e) => { 
                  const isActive = activeMenu === 'manage_staff';
                  e.currentTarget.style.backgroundColor = isActive ? '#e9ecef' : 'transparent'; 
                  e.currentTarget.style.color = isActive ? '#212529' : '#343a40'; 
                }}
              >
                <span>👥</span> Manage Staff
              </div>
              <div
                style={dropdownItemStyle('manage_department')}
                onClick={() => { setActiveMenu('manage_department'); setHoverMenu(null); }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.color = '#212529'; }}
                onMouseLeave={(e) => { 
                  const isActive = activeMenu === 'manage_department';
                  e.currentTarget.style.backgroundColor = isActive ? '#e9ecef' : 'transparent'; 
                  e.currentTarget.style.color = isActive ? '#212529' : '#343a40'; 
                }}
              >
                <span>🏢</span> Manage Department
              </div>
              <div
                style={dropdownItemStyle('public_holiday')}
                onClick={() => { setActiveMenu('public_holiday'); setHoverMenu(null); }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.color = '#212529'; }}
                onMouseLeave={(e) => { 
                  const isActive = activeMenu === 'public_holiday';
                  e.currentTarget.style.backgroundColor = isActive ? '#e9ecef' : 'transparent'; 
                  e.currentTarget.style.color = isActive ? '#212529' : '#343a40'; 
                }}
              >
                <span>📆</span> Yearly Public Holiday
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
              <div
                style={dropdownItemStyle('leave_type')}
                onClick={() => { setActiveMenu('leave_type'); setHoverMenu(null); }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.color = '#212529'; }}
                onMouseLeave={(e) => { 
                  const isActive = activeMenu === 'leave_type';
                  e.currentTarget.style.backgroundColor = isActive ? '#e9ecef' : 'transparent'; 
                  e.currentTarget.style.color = isActive ? '#212529' : '#343a40'; 
                }}
              >
                <span>🗂️</span> Leave Type
              </div>
              <div
                style={dropdownItemStyle('shift_type')}
                onClick={() => { setActiveMenu('shift_type'); setHoverMenu(null); }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.color = '#212529'; }}
                onMouseLeave={(e) => { 
                  const isActive = activeMenu === 'shift_type';
                  e.currentTarget.style.backgroundColor = isActive ? '#e9ecef' : 'transparent'; 
                  e.currentTarget.style.color = isActive ? '#212529' : '#343a40'; 
                }}
              >
                <span>📅</span> Shift Type
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
              <div 
                style={dropdownItemStyle('daily_report')} 
                onClick={() => { setActiveMenu('daily_report'); setHoverMenu(null); }} 
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.color = '#212529'; }} 
                onMouseLeave={(e) => { 
                  const isActive = activeMenu === 'daily_report';
                  e.currentTarget.style.backgroundColor = isActive ? '#e9ecef' : 'transparent'; 
                  e.currentTarget.style.color = isActive ? '#212529' : '#343a40'; 
                }}
              >
                <span>📋</span> Daily Report
              </div>
              <div 
                style={dropdownItemStyle('monthly_report')} 
                onClick={() => { setActiveMenu('monthly_report'); setHoverMenu(null); }} 
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.color = '#212529'; }} 
                onMouseLeave={(e) => { 
                  const isActive = activeMenu === 'monthly_report';
                  e.currentTarget.style.backgroundColor = isActive ? '#e9ecef' : 'transparent'; 
                  e.currentTarget.style.color = isActive ? '#212529' : '#343a40'; 
                }}
              >
                <span>📈</span> Monthly Report
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin */}
      {profile?.is_super_admin && (
        <div
          style={itemStyle(['manage_access'])}
          onMouseEnter={() => setHoverMenu('administrator')}
          onMouseLeave={() => setHoverMenu(null)}
        >
          <span>🔒</span> Administrator ▾
          {hoverMenu === 'administrator' && (
            <div style={dropdownStyle}>
              <div
                style={dropdownItemStyle('manage_access')}
                onClick={() => { setActiveMenu('manage_access'); setHoverMenu(null); }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.color = '#212529'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = activeMenu === 'manage_access' ? '#e9ecef' : 'transparent'; e.currentTarget.style.color = activeMenu === 'manage_access' ? '#212529' : '#343a40'; }}
              ><span>🔒</span> Access Control</div>
            </div>
          )}
        </div>
      )}

      {/* Spacer untuk menolak menu seterusnya ke kanan */}
      <div style={{ flex: 1 }}></div>

      {/* Menu Personal (Sebelah Kanan) */}
      <div 
        style={itemStyle('update_password')}
        onMouseEnter={() => setHoverMenu('personal')}
        onMouseLeave={() => setHoverMenu(null)}
      >
        <span>👤</span> Personal ▾
        {hoverMenu === 'personal' && (
          <div style={{ ...dropdownStyle, left: 'auto', right: 0 }}>
            <div
              style={dropdownItemStyle('update_password')}
              onClick={() => { setActiveMenu('update_password'); setHoverMenu(null); }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.color = '#212529'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = activeMenu === 'update_password' ? '#e9ecef' : 'transparent'; e.currentTarget.style.color = activeMenu === 'update_password' ? '#212529' : '#343a40'; }}
            >
              <span>🔐</span> Password
            </div>
          </div>
        )}
      </div>
    </div>
  )
}