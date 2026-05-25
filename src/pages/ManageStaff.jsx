import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function ManageStaff({ supabase, currentAdminProfile }) {
  const [staffList, setStaffList] = useState([])
  const [departmentList, setDepartmentList] = useState([]) // Memegang senarai jabatan dari DB
  const [superiorList, setSuperiorList] = useState([]) // Senarai staf yang is_superior = true
  const [actionLoading, setActionLoading] = useState(false)
  
  // States untuk Search, Filter & Modal Windows
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('All') // Menggunakan ID untuk tapisan
  const [statusFilter, setStatusFilter] = useState('Active') // Default to Active
  const [showModal, setShowModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingStaffId, setEditingStaffId] = useState(null)

  // States untuk Borang Input (Form)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [position, setPosition] = useState('')
  const [departmentId, setDepartmentId] = useState('') // Menyimpan ID jabatan terpilih
  const [reportToId, setReportToId] = useState('') // Menyimpan ID penyelia (Superior)
  const [annualLeave, setAnnualLeave] = useState(14)
  const [leaveBalance, setLeaveBalance] = useState(14)
  const [workingDays, setWorkingDays] = useState('5_days')
  const [staffStatus, setStaffStatus] = useState('Active')

  // Ditukar kepada width 100% untuk konsistensi reka bentuk sistem
  const cardStyle = { 
    backgroundColor: 'white', 
    padding: '30px', 
    borderRadius: '12px', 
    border: '1px solid #e5e7eb', 
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    width: '100%',
    boxSizing: 'border-box'
  }

  // LOAD DATA SERENTAK MENGGUNAKAN ASYNC/AWAIT
  useEffect(() => {
    const initPageData = async () => {
      setActionLoading(true)
      await fetchDepartments() // Selesaikan ambil data jabatan dulu
      await fetchSuperiors()   // Ambil senarai superior
      await fetchStaff()       // Kemudian baru ambil data staf
      setActionLoading(false)
    }
    initPageData()
  }, [])

  // 1. Ambil Senarai Jabatan dari DB
  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) {
      console.error("Gagal ambil data departments:", error.message)
      return
    }

    if (data && data.length > 0) {
      setDepartmentList(data)
      setDepartmentId(data[0].id) // Set nilai awal form ke ID jabatan pertama
    }
  }

  // 1.1 Ambil Senarai Staf yang mempunyai akses Superior
  const fetchSuperiors = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_superior', true)
      .order('full_name', { ascending: true })
    
    if (!error) setSuperiorList(data)
  }

  // 2. Ambil Senarai Staf bersama Data Jabatan (JOIN QUERY)
  const fetchStaff = async () => {
    const currentYear = new Date().getFullYear()
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        departments (
          id,
          name
        ),
        superior:report_to (
          id,
          full_name
        ),
        leave_eligibility!uid (*)
      `)
      .order('full_name', { ascending: true })
    
    if (error) {
      console.error("Failed to fetch staff:", error.message)
      alert(`Database Error: ${error.message}`)
    } else {
      if (data) setStaffList(data)
    }
  }

  // 3. Buka Modal Tambah Pekerja Baru
  const openAddModal = () => {
    setIsEditMode(false)
    setEditingStaffId(null)
    setFullName('')
    setEmail('')
    setPassword('')
    setPosition('')
    setDepartmentId(departmentList.length > 0 ? departmentList[0].id : '')
    setReportToId('')
    setAnnualLeave(14)
    setLeaveBalance(14)
    setWorkingDays('5_days')
    setStaffStatus('Active')
    setShowModal(true)
  }

  // 4. Buka Modal Edit Pekerja Sedia Ada
  const openEditModal = (staff) => {
    setIsEditMode(true)
    setEditingStaffId(staff.id)
    setFullName(staff.full_name || '')
    setEmail(staff.email || '')
    setPassword('')
    setPosition(staff.position || '')
    setDepartmentId(staff.department_id || (departmentList.length > 0 ? departmentList[0].id : ''))
    setReportToId(staff.report_to || '')
    // Pull eligibility from the yearly record, default to 14 if record not yet created for current year
    const currentYear = new Date().getFullYear()
    const currentElig = staff.leave_eligibility?.find(e => e.year === currentYear)
    setAnnualLeave(currentElig?.eligibility ?? 14)
    setLeaveBalance(currentElig?.balance ?? 14)
    setWorkingDays(staff.working_days_type || '5_days')
    setStaffStatus(staff.staff_status || 'Active')
    setShowModal(true)
  }

  // 5. Fungsi Simpan (Daftar Baru / Kemas Kini)
  const handleSaveStaff = async (e) => {
    e.preventDefault()
    setActionLoading(true)

    const parsedLeave = parseFloat(annualLeave)
    const parsedBalance = parseFloat(leaveBalance)
    const chosenDeptId = departmentId ? parseInt(departmentId) : null
    const chosenReportTo = reportToId || null

    const currentYear = new Date().getFullYear()

    if (isEditMode) {
      // --- UPDATE PROFIL PEKERJA ---
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          position: position,
          department_id: chosenDeptId,
          report_to: chosenReportTo,
          working_days_type: workingDays,
          staff_status: staffStatus
        })
        .eq('id', editingStaffId)

      if (profileError) {
        alert(`Error updating profile: ${profileError.message}`)
        setActionLoading(false)
        return
      }

      // --- SYNC LEAVE ELIGIBILITY ---
      const { error: eligSyncError } = await supabase.rpc('sync_staff_leave_eligibility', {
        p_uid: editingStaffId,
        p_year: currentYear,
        p_eligibility: parsedLeave,
        p_balance: parsedBalance
      })

      if (eligSyncError) {
        alert(`Profile updated, but eligibility sync failed: ${eligSyncError.message}`)
      } else {
        alert('Staff credentials updated successfully!')
        setShowModal(false)
        await fetchSuperiors() 
        await fetchStaff()
      }
      setActionLoading(false)
    } else {
      // --- PENDAFTARAN AUTOMATIK AKAUN BARU (AUTH + PROFILE) ---
      
      // Cipta temporary client supaya sesi admin tidak 'overwritten' oleh staff baru
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      )

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: fullName } }
      })

      if (authError) {
        alert(`Authentication Error: ${authError.message}`)
        setActionLoading(false)
        return
      }

      const newUserId = authData.user?.id

      if (newUserId) {
        // Data email dimasukkan sekali ke dalam table public.profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: newUserId,
            email: email.trim(),
            full_name: fullName,
            position: position,
            department_id: chosenDeptId,
            report_to: chosenReportTo,
            working_days_type: workingDays,
            is_staff: true,
            staff_status: staffStatus
          }])

        if (profileError) {
          alert(`Auth account created, but profile failed: ${profileError.message}`)
        } else {
          // Create initial eligibility - ensuring balance matches annual leave and year is current
          const { error: eligError } = await supabase.rpc('sync_staff_leave_eligibility', {
            p_uid: newUserId,
            p_year: currentYear,
            p_eligibility: parsedLeave,
            p_balance: parsedBalance
          });

          if (eligError) {
            alert(`Auth account and profile created, but initial leave eligibility failed: ${eligError.message}`)
          } else {
            alert('New staff registered successfully!')
            setShowModal(false)
            await fetchStaff()
          }
        }
      }
      setActionLoading(false)
    }
  }

  // 6. Fungsi Padam Profil Pekerja
  const handleDeleteStaff = async (staff) => {
    if (staff.id === currentAdminProfile.id) {
      alert('Action Denied! You cannot delete your own logged-in account.')
      return
    }

    const confirmCheck = window.confirm(`Are you sure you want to permanently delete ${staff.full_name}?`)
    if (!confirmCheck) return

    setActionLoading(true)

    // Panggil fungsi RPC yang telah dicipta untuk padam akaun & profil sekali gus
    const { error } = await supabase.rpc('delete_staff_permanently', { 
      target_user_id: staff.id 
    })

    if (error) {
      alert(`Error deleting staff account: ${error.message}`)
    } else {
      await fetchStaff()
    }
    setActionLoading(false)
  }

  // --- TAPISAN DATA CARIAN & JABATAN MENGGUNAKAN ID ---
  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = staff.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          staff.position?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDept = selectedDepartmentId === 'All' || String(staff.department_id) === String(selectedDepartmentId)
    const matchesStatus = statusFilter === 'All' || (staff.staff_status || 'Active') === statusFilter
    return matchesSearch && matchesDept && matchesStatus
  })

  return (
    <div style={cardStyle}>
      
      {/* ATAS: HEADER & BUTTON BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>👥 Manage Staff Profiles</h3>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '5px 0 0 0' }}>
            Total Registered Staff: <strong>{staffList.length} people</strong>
          </p>
        </div>
        <button 
          onClick={openAddModal} 
          style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
        >
          ➕ Add New Staff
        </button>
      </div>

      {/* TENGAH: CONTROL FILTERS */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
        <input 
          type="text"
          placeholder="🔍 Search name or position..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
        />
        <select
          value={selectedDepartmentId}
          onChange={(e) => setSelectedDepartmentId(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: 'white' }}
        >
          <option value="All">All Departments</option>
          {departmentList.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: 'white' }}
        >
          <option value="All">All Status</option>
          <option value="Active">Active Only</option>
          <option value="Resigned">Resigned Only</option>
        </select>
      </div>

      {/* UTAMA: JADUAL DIREKTORI STAF */}
      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'white' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Full Name</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Department</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Reporting To</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Designation</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>Eligibility</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>Balance</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>Work Type</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                  No employee records found.
                </td>
              </tr>
            ) : (
              filteredStaff.map((staff) => (
                <tr key={staff.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                    <div>{staff.full_name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '400' }}>{staff.email || 'No Account Email'}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#4b5563' }}>
                    {staff.departments?.name || '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#4b5563' }}>
                    {staff.superior?.full_name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not Assigned</span>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#4b5563' }}>{staff.position || '—'}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '12px', fontWeight: '700', backgroundColor: staff.staff_status === 'Resigned' ? '#fee2e2' : '#ecfdf5', color: staff.staff_status === 'Resigned' ? '#dc2626' : '#059669' }}>
                      {staff.staff_status || 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#111827', fontWeight: '600', textAlign: 'center' }}>
                    {staff.leave_eligibility?.find(e => e.year === new Date().getFullYear())?.eligibility ?? 0} Days
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#4f46e5', fontWeight: '700', textAlign: 'center' }}>
                    {staff.leave_eligibility?.find(e => e.year === new Date().getFullYear())?.balance ?? 0} Days
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4b5563', textAlign: 'center' }}>
                    <span style={{ backgroundColor: staff.working_days_type === '5_days' ? '#ecfdf5' : '#fffbeb', color: staff.working_days_type === '5_days' ? '#059669' : '#d97706', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                      {staff.working_days_type === '5_days' ? '5 Days' : '6 Days'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => openEditModal(staff)} 
                        style={{ padding: '6px 10px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#111827', fontWeight: '500' }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteStaff(staff)} 
                        disabled={staff.id === currentAdminProfile.id} 
                        style={{ padding: '6px 10px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: staff.id === currentAdminProfile.id ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '600' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FLOATING DIALOG MODULE WINDOW (ADD / EDIT) */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflowY: 'auto', maxHeight: '90vh' }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#111827', fontSize: '18px' }}>
              {isEditMode ? '✏️ Edit Staff Credentials' : '➕ Register New Employee'}
            </h3>
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 20px 0' }}>
              {isEditMode ? 'Modify employee structural assignments.' : 'Create system login access credentials and basic profile.'}
            </p>

            <form onSubmit={handleSaveStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                Full Name
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }} />
              </label>

              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                Email Address
                <input 
                  type="email" 
                  required 
                  disabled={isEditMode} 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '6px', 
                    border: '1px solid #d1d5db', 
                    marginTop: '4px', 
                    boxSizing: 'border-box', 
                    backgroundColor: isEditMode ? '#f3f4f6' : 'white', 
                    cursor: isEditMode ? 'not-allowed' : 'text', 
                    color: isEditMode ? '#4b5563' : '#111827',
                    fontWeight: isEditMode ? '600' : '400'
                  }} 
                />
              </label>

              {!isEditMode && (
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                  Temporary Password
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }} />
                </label>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                  Department
                  <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', backgroundColor: 'white' }}>
                    {departmentList.length === 0 ? (
                      <option value="">No Department Available</option>
                    ) : (
                      departmentList.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))
                    )}
                  </select>
                </label>

                <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                  Designation (Position)
                  <input type="text" required value={position} onChange={(e) => setPosition(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }} />
                </label>
              </div>

              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                Reporting To (Superior / Approver)
                <select 
                  value={reportToId} 
                  onChange={(e) => setReportToId(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', backgroundColor: 'white' }}
                >
                  <option value="">-- No Superior Assigned --</option>
                  {superiorList.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.full_name}</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                  Annual Leave Eligibility
                  <input type="number" required step="0.5" value={annualLeave} onChange={(e) => {
                    const val = e.target.value
                    setAnnualLeave(val)
                    if (!isEditMode) setLeaveBalance(val)
                  }} min="0" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }} />
                </label>

                <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                  Current Leave Balance
                  <input type="number" required step="0.5" value={leaveBalance} onChange={(e) => setLeaveBalance(e.target.value)} min="0" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                  Working Structure
                  <select value={workingDays} onChange={(e) => setWorkingDays(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', backgroundColor: 'white' }}>
                    <option value="5_days">5 Days / Week</option>
                    <option value="6_days">6 Days / Week</option>
                  </select>
                </label>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                  Employment Status
                  <select value={staffStatus} onChange={(e) => setStaffStatus(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', backgroundColor: 'white' }}>
                    <option value="Active">Active</option>
                    <option value="Resigned">Resigned</option>
                  </select>
                </label>
              </div>

              {/* BUTANG PANEL DI BAWAH MODAL */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 16px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} style={{ padding: '10px 16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                  {actionLoading ? 'Saving...' : isEditMode ? 'Update Profile' : 'Register Employee'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}