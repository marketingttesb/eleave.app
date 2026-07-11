import React, { useState, useEffect } from 'react'

import { toTitleCase } from '../lib/format'
import { cardStyle } from '../lib/styles'

export default function ManageAccess({ supabase, currentAdminProfile }) {
  const [managedUsers, setManagedUsers] = useState([])
  const [allStaffList, setAllStaffList] = useState([])
  const [actionLoading, setActionLoading] = useState(false)

  // States for Search & Modal Window
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)

  // States for Checkbox inside Modal Pop-up
  const [modalIsSuperior, setModalIsSuperior] = useState(false)
  const [modalIsHr, setModalIsHr] = useState(false)
  const [modalIsSuperAdmin, setModalIsSuperAdmin] = useState(false)

  useEffect(() => {
    fetchElevatedUsers()
    fetchAllUsers()
  }, [])

  const fetchElevatedUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or('is_superior.eq.true,is_hr.eq.true,is_super_admin.eq.true')
      .order('full_name', { ascending: true })
    
    if (!error) setManagedUsers(data)
  }

  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, position')
      .order('full_name', { ascending: true })
    
    if (!error) setAllStaffList(data)
  }

  // Toggle Single Role directly from Table Checkbox
  const handleToggleRole = async (userId, roleColumn, currentStatus) => {
    if (roleColumn === 'is_super_admin' && currentStatus === true) {
      const totalAdmins = managedUsers.filter(u => u.is_super_admin).length
      if (totalAdmins <= 1) {
        alert('Action Denied! System requires at least ONE Super Admin to function.')
        return
      }
    }

    setActionLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ [roleColumn]: !currentStatus })
      .eq('id', userId)

    if (error) {
      alert(`Error updating permission: ${error.message}`)
    } else {
      fetchElevatedUsers()
    }
    setActionLoading(false)
  }

  // Open Modal Box when staff is selected from search dropdown
  const openPromotionModal = (staff) => {
    setSelectedStaff(staff)
    setModalIsSuperior(false)
    setModalIsHr(false)
    setModalIsSuperAdmin(false)
    setShowModal(true)
    setSearchQuery('')
  }

  // Save new privileges assigned from Modal Window
  const handleSaveNewAccess = async () => {
    if (!selectedStaff) return
    
    if (!modalIsSuperior && !modalIsHr && !modalIsSuperAdmin) {
      alert('Please select at least one elevated role permission.')
      return
    }

    setActionLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        is_superior: modalIsSuperior,
        is_hr: modalIsHr,
        is_super_admin: modalIsSuperAdmin
      })
      .eq('id', selectedStaff.id)

    if (error) {
      alert(`Error granting access: ${error.message}`)
    } else {
      setShowModal(false)
      setSelectedStaff(null)
      fetchElevatedUsers()
    }
    setActionLoading(false)
  }

  // Revoke ALL access levels (Back to standard base staff)
  const handleRemoveAllAccess = async (user) => {
    if (user.is_super_admin) {
      const totalAdmins = managedUsers.filter(u => u.is_super_admin).length
      if (totalAdmins <= 1) {
        alert('Action Denied! Cannot remove the last remaining Super Admin from the system.')
        return
      }
    }

    const confirmCheck = window.confirm(`Are you sure you want to revoke ALL elevated management access for ${toTitleCase(user.full_name)}?`)
    if (!confirmCheck) return

    setActionLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        is_superior: false,
        is_hr: false,
        is_super_admin: false
      })
      .eq('id', user.id)

    if (error) {
      alert(`Error revoking access: ${error.message}`)
    } else {
      fetchElevatedUsers()
    }
    setActionLoading(false)
  }

  // Live filter staff based on typing input (Exclude already elevated ones)
  const filteredStaffSearchResults = allStaffList.filter(staff => {
    const matchingName = staff.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    const alreadyHasAccess = managedUsers.some(m => m.id === staff.id)
    return searchQuery !== '' && matchingName && !alreadyHasAccess
  })

  return (
    <div style={cardStyle}>
      
      {/* HEADER SECTION & LIVE SEARCH FIELD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', gap: '20px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#be123c', fontSize: '20px' }}>🔒 Access Control List</h3>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '5px 0 0 0' }}>
            Manage administrative clearings, managers, and human resource security tiers.
          </p>
        </div>

        {/* Live Search Input Component */}
        <div style={{ position: 'relative', width: '300px' }}>
          <input 
            type="text"
            placeholder="🔍 Search staff name to promote..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
          />
          
          {/* Floating Live Results Dropdown Window */}
          {filteredStaffSearchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '45px', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflowY: 'auto', maxHeight: '200px', zIndex: 50 }}>
              {filteredStaffSearchResults.map(staff => (
                <div 
                  key={staff.id}
                  onClick={() => openPromotionModal(staff)}
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <div style={{ fontWeight: '600', color: '#111827' }}>{toTitleCase(staff.full_name)}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{staff.position || 'General Staff'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CORE CONFIGURATION TABLE */}
      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'white' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Full Name</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Designation</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>Superior (Manager)</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>HR Department</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>Super Admin</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {managedUsers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                  No administrative accounts config found. Type a name in the search field above to grant access.
                </td>
              </tr>
            ) : (
              managedUsers.map((user) => {
                // Dynamically look up safeguards for the last admin standing
                const totalSuperAdmins = managedUsers.filter(u => u.is_super_admin).length
                const isLastSuperAdmin = user.is_super_admin && totalSuperAdmins <= 1

                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>{toTitleCase(user.full_name)}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#4b5563' }}>{user.position || '—'}</td>
                    
                    {/* Superior Flag Checkbox */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={user.is_superior} 
                        disabled={actionLoading}
                        onChange={() => handleToggleRole(user.id, 'is_superior', user.is_superior)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>

                    {/* HR Flag Checkbox */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={user.is_hr} 
                        disabled={actionLoading}
                        onChange={() => handleToggleRole(user.id, 'is_hr', user.is_hr)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>

                    {/* Super Admin Flag Checkbox */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={user.is_super_admin} 
                        disabled={actionLoading || isLastSuperAdmin || user.id === currentAdminProfile.id} 
                        onChange={() => handleToggleRole(user.id, 'is_super_admin', user.is_super_admin)}
                        style={{ width: '16px', height: '16px', cursor: isLastSuperAdmin ? 'not-allowed' : 'pointer' }}
                      />
                    </td>

                    {/* Revoke All Privileges Action Button */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveAllAccess(user)}
                        disabled={actionLoading || isLastSuperAdmin} // Inactive block if last admin standing
                        style={{ 
                          padding: '6px 12px', 
                          backgroundColor: isLastSuperAdmin ? '#f3f4f6' : '#fee2e2', 
                          color: isLastSuperAdmin ? '#9ca3af' : '#ef4444', 
                          border: isLastSuperAdmin ? '1px solid #e5e7eb' : 'none', 
                          borderRadius: '6px', 
                          cursor: isLastSuperAdmin ? 'not-allowed' : 'pointer', 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          transition: 'all 0.15s' 
                        }}
                        onMouseEnter={(e) => { 
                          if (!isLastSuperAdmin) {
                            e.target.style.backgroundColor = '#ef4444'
                            e.target.style.color = 'white'
                          }
                        }}
                        onMouseLeave={(e) => { 
                          if (!isLastSuperAdmin) {
                            e.target.style.backgroundColor = '#fee2e2'
                            e.target.style.color = '#ef4444'
                          }
                        }}
                      >
                        {isLastSuperAdmin ? 'Locked 🔒' : 'Remove Access 🚨'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FIXED BACKDROP WINDOW: POP-UP MODAL PANEL */}
      {showModal && selectedStaff && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#111827', fontSize: '18px' }}>Configure System Access</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 20px 0' }}>
              Assign elevated permissions for <strong>{toTitleCase(selectedStaff.full_name)}</strong> ({selectedStaff.position || 'Staff'}).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>
                <input type="checkbox" checked={modalIsSuperior} onChange={(e) => setModalIsSuperior(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                Superior (Manager / Approver)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>
                <input type="checkbox" checked={modalIsHr} onChange={(e) => setModalIsHr(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                HR Department (Leave Config & Reports)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>
                <input type="checkbox" checked={modalIsSuperAdmin} onChange={(e) => setModalIsSuperAdmin(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                Super Admin (Full System Access Control)
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => { setShowModal(false); setSelectedStaff(null); }}
                style={{ padding: '10px 16px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveNewAccess}
                disabled={actionLoading}
                style={{ padding: '10px 16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}