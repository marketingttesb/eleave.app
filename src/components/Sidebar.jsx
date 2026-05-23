import React, { useState } from 'react'

export default function Sidebar({ profile, activeMenu, setActiveMenu }) {
  const [openManageLeave, setOpenManageLeave] = useState(true)
  const [openReports, setOpenReports] = useState(true)

  const sectionHeaderStyle = { fontSize: '11px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '1.5px', fontWeight: '700', margin: '20px 0 8px 10px' }
  
  const menuBtnStyle = (menuKey, isSub = false) => {
    const isAct = activeMenu === menuKey
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 14px',
      paddingLeft: isSub ? '34px' : '14px',
      backgroundColor: isAct ? '#4f46e5' : 'transparent',
      color: isAct ? '#ffffff' : '#9ca3af',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: isAct ? '600' : '500',
      transition: 'all 0.15s ease',
      marginBottom: '4px',
      userSelect: 'none'
    }
  }

  return (
    <div style={{ width: '260px', backgroundColor: '#0f172a', color: 'white', padding: '20px 14px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
        <li onClick={() => setActiveMenu('dashboard')} style={menuBtnStyle('dashboard')}>
          <span>📊</span> Dashboard
        </li>

        {profile?.is_staff && (
          <>
            <div style={sectionHeaderStyle}>Leave</div>
            <li onClick={() => setActiveMenu('apply')} style={menuBtnStyle('apply')}><span>📝</span> Apply</li>
            <li onClick={() => setActiveMenu('history')} style={menuBtnStyle('history')}><span>📜</span> History</li>
          </>
        )}
        {profile?.is_superior && (
          <li onClick={() => setActiveMenu('approval')} style={menuBtnStyle('approval')}><span>📋</span> Approval</li>
        )}

        {profile?.is_hr && (
          <>
            <div style={sectionHeaderStyle}>HR Management</div>
            <li onClick={() => setActiveMenu('manage_staff')} style={menuBtnStyle('manage_staff')}><span>👥</span> Manage Staff</li>
            
            {/* PENAMBAHAN MENU BARU: MANAGE DEPARTMENT UNDER HR */}
            <li onClick={() => setActiveMenu('manage_department')} style={menuBtnStyle('manage_department')}><span>🏢</span> Manage Department</li>
            
            <div>
              <div onClick={() => setOpenManageLeave(!openManageLeave)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', color: '#9ca3af', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>🛠️ Manage Leave</span>
                <span style={{ fontSize: '10px' }}>{openManageLeave ? '▲' : '▼'}</span>
              </div>
              {openManageLeave && (
                <div>
                  <li onClick={() => setActiveMenu('leave_type')} style={menuBtnStyle('leave_type', true)}>🗂️ Leave Type</li>
                  <li onClick={() => setActiveMenu('shift_type')} style={menuBtnStyle('shift_type', true)}>📅 Shift Type</li>
                </div>
              )}
            </div>

            <li onClick={() => setActiveMenu('public_holiday')} style={menuBtnStyle('public_holiday')}><span>📆</span> Yearly Public Holiday</li>
            
            <div>
              <div onClick={() => setOpenReports(!openReports)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', color: '#9ca3af', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>📊 Leave Report</span>
                <span style={{ fontSize: '10px' }}>{openReports ? '▲' : '▼'}</span>
              </div>
              {openReports && (
                <div>
                  <li onClick={() => setActiveMenu('daily_report')} style={menuBtnStyle('daily_report', true)}>📋 Daily Report</li>
                  <li onClick={() => setActiveMenu('monthly_report')} style={menuBtnStyle('monthly_report', true)}>📈 Monthly Report</li>
                </div>
              )}
            </div>
          </>
        )}

        {profile?.is_super_admin && (
          <>
            <div style={sectionHeaderStyle}>Administrator</div>
            <li onClick={() => setActiveMenu('manage_access')} style={menuBtnStyle('manage_access')}><span>🔒</span> Manage Access</li>
          </>
        )}
      </ul>
    </div>
  )
}