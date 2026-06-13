import React, { useState, useEffect } from 'react'
import Flatpickr from "react-flatpickr"
import "flatpickr/dist/themes/light.css"
import { format, parseISO } from "date-fns"

export default function ManagePersonalLeave({ supabase, profile, initialStaffId }) {
  const [staffList, setStaffList] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [departmentList, setDepartmentList] = useState([])
  const [selectedDeptId, setSelectedDeptId] = useState('All')
  
  // Selected staff leave states
  const [leaveHistory, setLeaveHistory] = useState([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [eligibilityRecord, setEligibilityRecord] = useState(null)
  const [approvedAnnualDays, setApprovedAnnualDays] = useState(0)
  const [approvedMcDays, setApprovedMcDays] = useState(0)
  
  // Metadata lists
  const [leaveTypes, setLeaveTypes] = useState([])
  const [durations, setDurations] = useState([])
  const [publicHolidays, setPublicHolidays] = useState([])

  // Pending HR review tracking
  const [staffPendingHR, setStaffPendingHR] = useState({}) // { staff_id: count }
  const [showPendingOnly, setShowPendingOnly] = useState(false)

  // Loading states
  const [loadingStaff, setLoadingStaff] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)

  // Modal Dialog States
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' or 'edit'
  const [editingLeave, setEditingLeave] = useState(null) // Stores leave object being edited

  // Form Field States
  const [formDate, setFormDate] = useState('')
  const [formLeaveType, setFormLeaveType] = useState('')
  const [formDurationId, setFormDurationId] = useState('')
  const [formStatus, setFormStatus] = useState('Pending')
  const [formReason, setFormReason] = useState('')

  // Bundle edit states
  const [selectedLeaveIds, setSelectedLeaveIds] = useState(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkLeaveType, setBulkLeaveType] = useState('')
  const [bulkStatus, setBulkStatus] = useState('Approved')

  // Pending review popup
  const [showPendingAlert, setShowPendingAlert] = useState(false)

  // Styling helpers
  const cardStyle = { 
    backgroundColor: 'white', 
    padding: '24px', 
    borderRadius: '12px', 
    border: '1px solid #e5e7eb', 
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    boxSizing: 'border-box'
  }

  const inputStyle = {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: 'white'
  }

  const labelStyle = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    display: 'block',
    marginBottom: '6px'
  }

  // Load basic page metadata
  useEffect(() => {
    fetchMetadata()
    fetchStaffList()
  }, [])

  // Load history when selected staff or year changes
  useEffect(() => {
    if (selectedStaffId) {
      fetchStaffLeaveData()
      // Reset selection on staff change
      setSelectedLeaveIds(new Set())
      // Show pending alert if staff has pending HR review items
      if (staffPendingHR[selectedStaffId] > 0) {
        setShowPendingAlert(true)
      }
    } else if (initialStaffId) {
      // If initialStaffId is provided and no staff is currently selected, set it.
      // This will trigger fetchStaffLeaveData in the next render cycle due to selectedStaffId change.
      setSelectedStaffId(initialStaffId);
    } else {
      setLeaveHistory([])
      setEligibilityRecord(null)
      setApprovedAnnualDays(0)
    }
  }, [selectedStaffId, selectedYear])

  const fetchMetadata = async () => {
    try {
      const { data: types } = await supabase.from('leave_types').select('*').order('type_name', { ascending: true })
      const { data: durs } = await supabase.from('leave_durations').select('*').order('duration_value', { descending: true })
      const { data: holidays } = await supabase.from('public_holidays').select('holiday_date')
      const { data: depts } = await supabase.from('departments').select('*').order('name', { ascending: true })

      if (types) {
        // Ensure 'Sick Leave - MC' is included in the options
        const hasSickLeave = types.some(t => t.type_name === 'Sick Leave - MC')
        if (!hasSickLeave) {
          types.push({ id: 'sick-leave-mc-fallback', type_name: 'Sick Leave - MC' })
        }
        setLeaveTypes(types)
        const annual = types.find(t => t.type_name.toLowerCase().includes('annual'))
        if (annual) setFormLeaveType(annual.type_name)
        else if (types.length > 0) setFormLeaveType(types[0].type_name)
      }
      if (durs) {
        setDurations(durs)
        if (durs.length > 0) setFormDurationId(durs[0].id)
      }
      if (holidays) {
        setPublicHolidays(holidays.map(h => h.holiday_date))
      }
      if (depts) {
        setDepartmentList(depts)
      }
    } catch (err) {
      console.error("Error fetching metadata:", err)
    }
  }

  const fetchStaffList = async () => {
    setLoadingStaff(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          position,
          staff_status,
          department_id,
          departments (
            id,
            name
          )
        `)
        .order('full_name', { ascending: true })

      if (error) throw error
      setStaffList(data || [])

      // Fetch pending HR review counts per staff
      const { data: pendingData } = await supabase
        .from('leave_applications')
        .select('staff_id')
        .eq('needs_hr_review', true)

      if (pendingData) {
        const counts = {}
        pendingData.forEach(item => {
          counts[item.staff_id] = (counts[item.staff_id] || 0) + 1
        })
        setStaffPendingHR(counts)
      }
    } catch (err) {
      console.error("Error fetching staff list:", err)
      alert("Failed to load staff list: " + err.message)
    } finally {
      setLoadingStaff(false)
    }
  }

  const fetchStaffLeaveData = async () => {
    if (!selectedStaffId) return
    setLoadingHistory(true)
    try {
      const startOfYear = `${selectedYear}-01-01`
      const endOfYear = `${selectedYear}-12-31`

      // 1. Fetch leave applications for the selected staff and year
      const { data: leaves, error: leavesError } = await supabase
        .from('leave_applications')
        .select('*')
        .eq('staff_id', selectedStaffId)
        .gte('leave_date', startOfYear)
        .lte('leave_date', endOfYear)
        .order('leave_date', { ascending: false })

      if (leavesError) throw leavesError
      setLeaveHistory(leaves || [])

      // 2. Fetch eligibility record for the selected year
      const { data: eligRecord, error: eligError } = await supabase
        .from('leave_eligibility')
        .select('*')
        .eq('uid', selectedStaffId)
        .eq('year', selectedYear)
        .maybeSingle()

      if (eligError) throw eligError
      setEligibilityRecord(eligRecord || null)

      // Calculate approved annual leave days
      const approvedDays = (leaves || [])
        .filter(l => l.status === 'Approved' && l.leave_type === 'Annual Leave')
        .reduce((sum, l) => sum + parseFloat(l.duration_value), 0)
      
      setApprovedAnnualDays(approvedDays)

      // Calculate approved Sick Leave (MC) days
      const approvedMcs = (leaves || [])
        .filter(l => l.status === 'Approved' && l.leave_type === 'Sick Leave - MC')
        .reduce((sum, l) => sum + parseFloat(l.duration_value), 0)
      
      setApprovedMcDays(approvedMcs)
    } catch (err) {
      console.error("Error fetching staff leave history:", err)
      alert("Failed to load leave history: " + err.message)
    } finally {
      setLoadingHistory(false)
    }
  }

  const selectedStaffObj = staffList.find(s => s.id === selectedStaffId)

  // Adjust leave balance
  const adjustLeaveBalance = async (staffId, year, diffValue, isMc = false) => {
    if (diffValue === 0) return

    // Fetch existing eligibility
    const { data: eligRecord, error: fetchError } = await supabase
      .from('leave_eligibility')
      .select('*')
      .eq('uid', staffId)
      .eq('year', year)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (!eligRecord) {
      // If eligibility for that year doesn't exist, create it.
      // We try to grab the staff's current year eligibility or fallback to 14.
      const currentYear = new Date().getFullYear()
      let baseEligibility = 14
      let baseMcEligibility = 14
      if (year !== currentYear) {
        const { data: currentRecord } = await supabase
          .from('leave_eligibility')
          .select('eligibility, mc_eligibility')
          .eq('uid', staffId)
          .eq('year', currentYear)
          .maybeSingle()
        if (currentRecord) {
          baseEligibility = currentRecord.eligibility ?? 14
          baseMcEligibility = currentRecord.mc_eligibility ?? 14
        }
      }

      const initialBalance = isMc ? baseEligibility : (baseEligibility - diffValue)
      const initialMcBalance = isMc ? (baseMcEligibility - diffValue) : baseMcEligibility

      const { error: insertError } = await supabase
        .from('leave_eligibility')
        .insert([{
          uid: staffId,
          year: year,
          eligibility: baseEligibility,
          balance: initialBalance,
          mc_eligibility: baseMcEligibility,
          mc_balance: initialMcBalance
        }])

      if (insertError) throw insertError
    } else {
      // Update balance
      const updatePayload = {}
      if (isMc) {
        updatePayload.mc_balance = (eligRecord.mc_balance ?? 14) - diffValue
      } else {
        updatePayload.balance = (eligRecord.balance ?? 14) - diffValue
      }

      const { error: updateError } = await supabase
        .from('leave_eligibility')
        .update(updatePayload)
        .eq('id', eligRecord.id)

      if (updateError) throw updateError
    }
  }

  const handleOpenAddModal = () => {
    setModalMode('add')
    setEditingLeave(null)
    setFormDate(format(new Date(), "yyyy-MM-dd"))
    if (leaveTypes.length > 0) {
      const annual = leaveTypes.find(t => t.type_name.toLowerCase().includes('annual'))
      setFormLeaveType(annual ? annual.type_name : leaveTypes[0].type_name)
    }
    if (durations.length > 0) setFormDurationId(durations[0].id)
    setFormStatus('Pending')
    setFormReason('')
    setShowModal(true)
  }

  const handleOpenEditModal = (leave) => {
    setModalMode('edit')
    setEditingLeave(leave)
    setFormDate(leave.leave_date)
    setFormLeaveType(leave.leave_type)
    const durationObj = durations.find(d => d.duration_name === leave.duration_type)
    if (durationObj) setFormDurationId(durationObj.id)
    setFormStatus(leave.status)
    setFormReason(leave.reason || '')
    setShowModal(true)
  }

  const handleSaveLeave = async (e) => {
    e.preventDefault()
    if (!formDate || !formLeaveType || !formDurationId) {
      alert("Please fill in all required fields.")
      return
    }

    const leaveYear = new Date(formDate).getFullYear()

    // Warning about Sunday and Public Holidays
    const isSunday = new Date(formDate).getDay() === 0
    const isHoliday = publicHolidays.includes(formDate)
    if (isSunday || isHoliday) {
      const confirmMsg = `Warning: Selected date falls on a ${isSunday ? 'Sunday' : 'Public Holiday'}. Do you wish to proceed?`
      if (!window.confirm(confirmMsg)) return
    }

    setLoadingAction(true)

    try {
      const durationObj = durations.find(d => String(d.id) === String(formDurationId))
      if (!durationObj) throw new Error("Selected duration is invalid.")

      // Overlap and capacity validations
      // Calculate how many leave hours/days the employee already has on this date (excl. editing item)
      const existingOnThisDate = leaveHistory
        .filter(l => l.leave_date === formDate && l.status !== 'Rejected' && (!editingLeave || l.id !== editingLeave.id))
      const totalOnDate = existingOnThisDate.reduce((sum, l) => sum + parseFloat(l.duration_value), 0)

      if (totalOnDate + durationObj.duration_value > 1.0) {
        alert("Action Denied: Total leave duration on a single date cannot exceed 1 day.")
        setLoadingAction(false)
        return
      }

      // Slot validations
      const isNewAM = durationObj.duration_name.toLowerCase().includes('am')
      const isNewPM = durationObj.duration_name.toLowerCase().includes('pm')
      const hasExistingAM = existingOnThisDate.some(l => l.duration_type.toLowerCase().includes('am'))
      const hasExistingPM = existingOnThisDate.some(l => l.duration_type.toLowerCase().includes('pm'))

      if (isNewAM && hasExistingAM) {
        alert("Action Denied: Staff already has an AM leave applied on this date.")
        setLoadingAction(false)
        return
      }
      if (isNewPM && hasExistingPM) {
        alert("Action Denied: Staff already has a PM leave applied on this date.")
        setLoadingAction(false)
        return
      }

      // Prepare payload
      const payload = {
        staff_id: selectedStaffId,
        leave_date: formDate,
        leave_type: formLeaveType,
        duration_type: durationObj.duration_name,
        duration_value: durationObj.duration_value,
        reason: formReason,
        status: formStatus,
        processed_by: (formStatus === 'Approved' || formStatus === 'Rejected') ? profile.id : null,
        processed_at: (formStatus === 'Approved' || formStatus === 'Rejected') ? new Date().toISOString() : null,
        approver_id: selectedStaffObj?.report_to || null
      }

      // If HR is reviewing, clear the needs_hr_review flag
      if (editingLeave?.needs_hr_review === true) {
        payload.needs_hr_review = false
      }

      if (modalMode === 'add') {
        // --- ADD LEAVE APPLICATION ---
        const { error: insertError } = await supabase
          .from('leave_applications')
          .insert([payload])

        if (insertError) throw insertError

        // Balance adjustment for ADD
        if (formStatus === 'Approved') {
          if (formLeaveType === 'Annual Leave') {
            await adjustLeaveBalance(selectedStaffId, leaveYear, durationObj.duration_value, false)
          } else if (formLeaveType === 'Sick Leave - MC') {
            await adjustLeaveBalance(selectedStaffId, leaveYear, durationObj.duration_value, true)
          }
        }
      } else {
        // --- EDIT LEAVE APPLICATION ---
        const { error: updateError } = await supabase
          .from('leave_applications')
          .update(payload)
          .eq('id', editingLeave.id)

        if (updateError) throw updateError

        // Calculate adjustments for Annual Leave
        // For needs_hr_review records, HOD approved but didn't deduct balance
        const wasDeducted = editingLeave?.needs_hr_review !== true
        const oldDeduction = (wasDeducted && editingLeave.status === 'Approved' && editingLeave.leave_type === 'Annual Leave') ? parseFloat(editingLeave.duration_value) : 0
        const newDeduction = (formStatus === 'Approved' && formLeaveType === 'Annual Leave') ? durationObj.duration_value : 0

        // Calculate adjustments for Sick Leave (MC)
        const oldMcDeduction = (wasDeducted && editingLeave.status === 'Approved' && editingLeave.leave_type === 'Sick Leave - MC') ? parseFloat(editingLeave.duration_value) : 0
        const newMcDeduction = (formStatus === 'Approved' && formLeaveType === 'Sick Leave - MC') ? durationObj.duration_value : 0

        const oldYear = new Date(editingLeave.leave_date).getFullYear()

        if (oldYear === leaveYear) {
          const diff = newDeduction - oldDeduction
          const mcDiff = newMcDeduction - oldMcDeduction
          if (diff !== 0) await adjustLeaveBalance(selectedStaffId, leaveYear, diff, false)
          if (mcDiff !== 0) await adjustLeaveBalance(selectedStaffId, leaveYear, mcDiff, true)
        } else {
          // Years are different: Refund old year, deduct from new year
          if (oldDeduction > 0) {
            await adjustLeaveBalance(selectedStaffId, oldYear, -oldDeduction, false)
          }
          if (oldMcDeduction > 0) {
            await adjustLeaveBalance(selectedStaffId, oldYear, -oldMcDeduction, true)
          }
          if (newDeduction > 0) {
            await adjustLeaveBalance(selectedStaffId, leaveYear, newDeduction, false)
          }
          if (newMcDeduction > 0) {
            await adjustLeaveBalance(selectedStaffId, leaveYear, newDeduction, true)
          }
        }
      }

      // Notify staff member of the manual adjustment
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: selectedStaffId,
        related_user_id: selectedStaffId,
        title: 'Leave Record Adjusted',
        message: `An HR administrator has ${modalMode === 'add' ? 'added' : 'updated'} a leave record for ${formDate}.`,
        type: 'manual_change'
      });
      if (notifError) console.error('Notification insert failed:', notifError.message);

      alert("Leave saved successfully!")
      setShowModal(false)
      fetchStaffLeaveData()
    } catch (err) {
      console.error("Error saving leave record:", err)
      alert("Error saving leave: " + err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleDeleteLeave = async (leave) => {
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete this leave application for ${leave.leave_date}?`)
    if (!confirmDelete) return

    setLoadingAction(true)
    try {
      const { error: deleteError } = await supabase
        .from('leave_applications')
        .delete()
        .eq('id', leave.id)

      if (deleteError) throw deleteError

      // Refund balance if it was already deducted (not a needs_hr_review record)
      if (leave.status === 'Approved' && leave.needs_hr_review !== true) {
        const leaveYear = new Date(leave.leave_date).getFullYear()
        if (leave.leave_type === 'Annual Leave') {
          await adjustLeaveBalance(selectedStaffId, leaveYear, -parseFloat(leave.duration_value), false)
        } else if (leave.leave_type === 'Sick Leave - MC') {
          await adjustLeaveBalance(selectedStaffId, leaveYear, -parseFloat(leave.duration_value), true)
        }
      }

      // Notify staff member of the removal
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: selectedStaffId,
        related_user_id: selectedStaffId,
        title: 'Leave Record Removed',
        message: `An HR administrator has removed your leave record for ${leave.leave_date}.`,
        type: 'manual_change'
      });
      if (notifError) console.error('Notification insert failed:', notifError.message);

      alert("Leave deleted successfully.")
      fetchStaffLeaveData()
    } catch (err) {
      console.error("Error deleting leave:", err)
      alert("Error deleting leave: " + err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  // Toggle a single leave record selection
  const toggleLeaveSelection = (id) => {
    setSelectedLeaveIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Select / deselect all displayed leaves
  const toggleSelectAll = () => {
    if (selectedLeaveIds.size === displayedLeaves.length) {
      setSelectedLeaveIds(new Set())
    } else {
      setSelectedLeaveIds(new Set(displayedLeaves.map(l => l.id)))
    }
  }

  const handleBulkSaveLeave = async (e) => {
    e.preventDefault()
    if (selectedLeaveIds.size === 0) {
      alert("No leave records selected.")
      return
    }
    if (!bulkLeaveType) {
      alert("Please select a leave type.")
      return
    }

    setLoadingAction(true)
    try {
      const selectedLeaves = leaveHistory.filter(l => selectedLeaveIds.has(l.id))
      const affectedDates = []

      for (const leave of selectedLeaves) {
        const durationVal = parseFloat(leave.duration_value)
        const leaveYear = new Date(leave.leave_date).getFullYear()

        // Calculate balance adjustments per record
        const wasDeducted = leave.needs_hr_review !== true
        const oldDeduction = (wasDeducted && leave.status === 'Approved' && leave.leave_type === 'Annual Leave') ? durationVal : 0
        const oldMcDeduction = (wasDeducted && leave.status === 'Approved' && leave.leave_type === 'Sick Leave - MC') ? durationVal : 0
        const newDeduction = (bulkStatus === 'Approved' && bulkLeaveType === 'Annual Leave') ? durationVal : 0
        const newMcDeduction = (bulkStatus === 'Approved' && bulkLeaveType === 'Sick Leave - MC') ? durationVal : 0

        // Build payload
        const payload = {
          leave_type: bulkLeaveType,
          status: bulkStatus,
          processed_by: (bulkStatus === 'Approved' || bulkStatus === 'Rejected') ? profile.id : null,
          processed_at: (bulkStatus === 'Approved' || bulkStatus === 'Rejected') ? new Date().toISOString() : null,
        }

        if (leave.needs_hr_review === true) {
          payload.needs_hr_review = false
        }

        const { error: updateError } = await supabase
          .from('leave_applications')
          .update(payload)
          .eq('id', leave.id)

        if (updateError) throw updateError

        // Balance adjustment
        const diff = newDeduction - oldDeduction
        const mcDiff = newMcDeduction - oldMcDeduction
        if (diff !== 0) await adjustLeaveBalance(selectedStaffId, leaveYear, diff, false)
        if (mcDiff !== 0) await adjustLeaveBalance(selectedStaffId, leaveYear, mcDiff, true)

        affectedDates.push(leave.leave_date)
      }

      // Single notification for the whole bundle
      const dateStr = affectedDates.length <= 3
        ? affectedDates.join(', ')
        : `${affectedDates[0]} … (+${affectedDates.length - 1} more)`

      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: selectedStaffId,
        related_user_id: selectedStaffId,
        title: 'Leave Record Adjusted',
        message: `An HR administrator has updated ${affectedDates.length} leave record(s) (${dateStr}).`,
        type: 'manual_change'
      })
      if (notifError) console.error('Bulk notification insert failed:', notifError.message)

      alert(`Successfully updated ${selectedLeaveIds.size} leave record(s).`)
      setShowBulkModal(false)
      setSelectedLeaveIds(new Set())
      fetchStaffLeaveData()
    } catch (err) {
      console.error("Error in bulk edit:", err)
      alert("Error updating records: " + err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleOpenBulkModal = () => {
    setBulkLeaveType('')
    setBulkStatus('Approved')
    setShowBulkModal(true)
  }

  // Filter staff list based on query and department
  const filteredStaffList = staffList.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.position?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDept = selectedDeptId === 'All' || String(s.department_id || s.departments?.id) === String(selectedDeptId)
    return matchesSearch && matchesDept
  })

  // Filter leaves for pending-only view
  const displayedLeaves = showPendingOnly
    ? leaveHistory.filter(l => l.needs_hr_review === true)
    : leaveHistory

  // Years for dropdown
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', width: '100%', height: 'calc(100vh - 160px)' }}>
      
      {/* LEFT COLUMN: STAFF LIST & SEARCH */}
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <h3 style={{ margin: '0 0 4px 0', color: '#111827', fontSize: '18px', fontWeight: '700' }}>👥 Staff Directory</h3>
        <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 16px 0' }}>Search and select staff to manage leaves</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <input 
            type="text"
            placeholder="🔍 Search name, position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, padding: '8px 12px', fontSize: '13px' }}
          />
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            style={{ ...inputStyle, padding: '8px 12px', fontSize: '13px', backgroundColor: 'white' }}
          >
            <option value="All">All Departments</option>
            {departmentList.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
          {loadingStaff ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', padding: '20px' }}>Loading staff...</p>
          ) : filteredStaffList.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', padding: '20px' }}>No staff found</p>
          ) : (
            filteredStaffList.map(staff => (
              <div
                key={staff.id}
                onClick={() => setSelectedStaffId(staff.id)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: selectedStaffId === staff.id ? '#4f46e5' : '#e5e7eb',
                  backgroundColor: selectedStaffId === staff.id ? '#f5f3ff' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedStaffId !== staff.id) {
                    e.currentTarget.style.backgroundColor = '#f9fafb'
                    e.currentTarget.style.borderColor = '#d1d5db'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedStaffId !== staff.id) {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.borderColor = '#e5e7eb'
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>{staff.full_name}</span>
                  {staffPendingHR[staff.id] > 0 && (
                    <span style={{ 
                      fontSize: '10px', 
                      padding: '2px 7px', 
                      borderRadius: '10px', 
                      fontWeight: '800',
                      backgroundColor: '#fffbeb',
                      color: '#d97706',
                      border: '1px solid #fde68a'
                    }}>
                      ⚠️ {staffPendingHR[staff.id]}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>{staff.position || '—'}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>{staff.departments?.name || 'No Dept'}</span>
                  <span style={{ 
                    fontSize: '9px', 
                    padding: '2px 6px', 
                    borderRadius: '10px', 
                    fontWeight: '700',
                    backgroundColor: staff.staff_status === 'Resigned' ? '#fee2e2' : '#ecfdf5',
                    color: staff.staff_status === 'Resigned' ? '#dc2626' : '#059669'
                  }}>
                    {staff.staff_status || 'Active'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: DETAIL & CONTROL PANEL */}
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        {!selectedStaffId ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>👤</div>
            <h3 style={{ margin: '0 0 4px 0', color: '#4b5563' }}>Select an Employee</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>Click a staff member from the directory on the left to view leave history and manage leaves.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            
            {/* Header info card */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderBottom: '1px solid #f3f4f6', 
              paddingBottom: '16px' 
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#111827' }}>
                    {selectedStaffObj?.full_name}
                  </h2>
                  <span style={{ 
                    fontSize: '11px', 
                    backgroundColor: selectedStaffObj?.staff_status === 'Resigned' ? '#fee2e2' : '#ecfdf5',
                    color: selectedStaffObj?.staff_status === 'Resigned' ? '#dc2626' : '#059669',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontWeight: '700'
                  }}>
                    {selectedStaffObj?.staff_status || 'Active'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                  {selectedStaffObj?.position} &bull; {selectedStaffObj?.departments?.name || 'No Department'}
                </p>
              </div>

              {/* Leave statistics cards */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {/* AL Combined Card */}
                <div style={{ 
                  padding: '12px 18px', 
                  backgroundColor: '#f5f3ff', 
                  borderRadius: '10px', 
                  border: '1px solid #ddd6fe',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  minWidth: '200px'
                }}>
                  <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign : 'center' }}>
                    📅 Annual Leave
                  </div>
                  <div style={{ display: 'flex', marginTop: '2px' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600' }}>Elig.</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>
                        {eligibilityRecord?.eligibility ?? 0}d
                      </div>
                    </div>
                    <div style={{ borderLeft: '1px solid #ddd6fe', paddingLeft: '14px', flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600' }}>Used</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#10b981' }}>
                        {approvedAnnualDays}d
                      </div>
                    </div>
                    <div style={{ borderLeft: '1px solid #ddd6fe', paddingLeft: '14px', flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600' }}>Bal.</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#4f46e5' }}>
                        {eligibilityRecord?.balance ?? 0}d
                      </div>
                    </div>
                  </div>
                </div>

                {/* MC Combined Card */}
                <div style={{ 
                  padding: '12px 18px', 
                  backgroundColor: '#eff6ff', 
                  borderRadius: '10px', 
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  minWidth: '200px'
                }}>
                  <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign : 'center' }}>
                    🤢 Sick Leave (MC)
                  </div>
                  <div style={{ display: 'flex', marginTop: '2px' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600' }}>Elig.</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>
                        {eligibilityRecord?.mc_eligibility ?? 0}d
                      </div>
                    </div>
                    <div style={{ borderLeft: '1px solid #bfdbfe', paddingLeft: '14px', flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600' }}>Used</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#10b981' }}>
                        {approvedMcDays}d
                      </div>
                    </div>
                    <div style={{ borderLeft: '1px solid #bfdbfe', paddingLeft: '14px', flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600' }}>Bal.</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#2563eb' }}>
                        {eligibilityRecord?.mc_balance ?? 0}d
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending HR Review Banner */}
            {(() => {
              const pendingLeaves = leaveHistory.filter(l => l.needs_hr_review === true)
              if (pendingLeaves.length === 0) return null
              return (
                <div style={{ 
                  padding: '12px 16px', 
                  backgroundColor: '#fffbeb', 
                  borderRadius: '8px', 
                  border: '1px solid #fde68a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#92400e' }}>
                    ⚠️ {pendingLeaves.length} leave(s) pending HR classification
                  </div>
                  <button
                    onClick={() => setShowPendingOnly(!showPendingOnly)}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: showPendingOnly ? '#d97706' : 'white',
                      color: showPendingOnly ? 'white' : '#92400e',
                      border: '1px solid #d97706',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {showPendingOnly ? 'Show All' : 'Show Pending Only'}
                  </button>
                </div>
              )
            })()}

            {/* Year selector & Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      fontWeight: '600'
                    }}
                  >
                    {years.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {selectedLeaveIds.size > 0 && (
                    <>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>
                        {selectedLeaveIds.size} selected
                      </span>
                      <button
                        onClick={handleOpenBulkModal}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#d97706',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📦 Bulk Edit
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleOpenAddModal}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    ➕ Add Staff Leave
                  </button>
                </div>
              </div>

            {/* Leave applications list table */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 12px', fontSize: '12px', fontWeight: '600', color: '#4b5563', width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={displayedLeaves.length > 0 && selectedLeaveIds.size === displayedLeaves.length}
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer', accentColor: '#4f46e5' }}
                      />
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4b5563' }}>Date</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4b5563' }}>Leave Type</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4b5563' }}>Duration</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4b5563' }}>Reason</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4b5563', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4b5563', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingHistory ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                        Loading leave records...
                      </td>
                    </tr>
                  ) : displayedLeaves.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                        {showPendingOnly ? 'No pending HR reviews.' : `No leave records found for year ${selectedYear}.`}
                      </td>
                    </tr>
                  ) : (
                    displayedLeaves.map((leave) => {
                      const isPendingHR = leave.needs_hr_review === true
                      return (
                      <tr key={leave.id} style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: isPendingHR ? '#fffbeb' : 'white'
                      }}>
                        <td style={{ padding: '12px 12px', textAlign: 'center', width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selectedLeaveIds.has(leave.id)}
                            onChange={() => toggleLeaveSelection(leave.id)}
                            style={{ cursor: 'pointer', accentColor: '#4f46e5' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                          {leave.leave_date}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>
                          {leave.leave_type}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>
                          {leave.duration_type} ({leave.duration_value}d)
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.reason}>
                          {leave.reason || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {isPendingHR ? (
                            <span style={{ 
                              fontSize: '11px', 
                              padding: '3px 8px', 
                              borderRadius: '10px', 
                              fontWeight: '700',
                              backgroundColor: '#fef3c7',
                              color: '#d97706'
                            }}>
                              Needs Classification
                            </span>
                          ) : (
                          <span style={{ 
                            fontSize: '11px', 
                            padding: '3px 8px', 
                            borderRadius: '10px', 
                            fontWeight: '700',
                            backgroundColor: leave.status === 'Approved' ? '#ecfdf5' : leave.status === 'Pending' ? '#eff6ff' : '#fef2f2',
                            color: leave.status === 'Approved' ? '#059669' : leave.status === 'Pending' ? '#2563eb' : '#dc2626'
                          }}>
                            {leave.status}
                          </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleOpenEditModal(leave)}
                              disabled={loadingAction}
                              style={{ 
                                padding: '4px 8px', 
                                backgroundColor: '#eff6ff', 
                                border: '1px solid #bfdbfe', 
                                borderRadius: '4px', 
                                cursor: 'pointer', 
                                fontSize: '11px', 
                                color: '#1d4ed8', 
                                fontWeight: '600' 
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteLeave(leave)}
                              disabled={loadingAction}
                              style={{ 
                                padding: '4px 8px', 
                                backgroundColor: '#fef2f2', 
                                border: '1px solid #fecaca', 
                                borderRadius: '4px', 
                                cursor: 'pointer', 
                                fontSize: '11px', 
                                color: '#dc2626', 
                                fontWeight: '600' 
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }))}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </div>

      {/* FLOATING DIALOG MODAL FOR ADD/EDIT LEAVE */}
      {showModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.6)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          zIndex: 100 
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '24px', 
            borderRadius: '12px', 
            width: '420px', 
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', 
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#111827', fontSize: '18px', fontWeight: '700' }}>
              {modalMode === 'add' ? '➕ Add Manual Leave' : '✏️ Edit Leave Application'}
            </h3>
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 16px 0' }}>
              Employee: <strong>{selectedStaffObj?.full_name}</strong>
            </p>

            {editingLeave?.needs_hr_review === true && (
              <div style={{ 
                padding: '10px 14px', 
                backgroundColor: '#fffbeb', 
                borderRadius: '8px', 
                border: '1px solid #fde68a',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#92400e' }}>
                  ⚠️ This leave needs HR classification. Please set the final leave type.
                </span>
              </div>
            )}

            <form onSubmit={handleSaveLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div>
                <label style={labelStyle}>Leave Date *</label>
                <Flatpickr
                  value={formDate}
                  onChange={([date]) => {
                    const formatted = date ? format(date, "yyyy-MM-dd") : ''
                    setFormDate(formatted)
                  }}
                  options={{
                    dateFormat: "Y-m-d"
                  }}
                  style={inputStyle}
                  placeholder="Select Leave Date"
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Leave Type *</label>
                <select 
                  value={formLeaveType} 
                  onChange={(e) => setFormLeaveType(e.target.value)} 
                  style={inputStyle}
                  required
                >
                  {leaveTypes.map(t => (
                    <option key={t.id} value={t.type_name}>{t.type_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Duration *</label>
                <select 
                  value={formDurationId} 
                  onChange={(e) => setFormDurationId(e.target.value)} 
                  style={inputStyle}
                  required
                >
                  {durations.map(d => (
                    <option key={d.id} value={d.id}>{d.duration_name} ({d.duration_value} day)</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Status *</label>
                <select 
                  value={formStatus} 
                  onChange={(e) => setFormStatus(e.target.value)} 
                  style={inputStyle}
                  required
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Reason / Remarks</label>
                <textarea 
                  value={formReason} 
                  onChange={(e) => setFormReason(e.target.value)} 
                  placeholder="Enter reason or notes..."
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  disabled={loadingAction}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#f3f4f6', 
                    color: '#374151', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    fontSize: '13px' 
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loadingAction}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#4f46e5', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    fontSize: '13px' 
                  }}
                >
                  {loadingAction ? 'Saving...' : 'Save Leave'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* PENDING HR REVIEW POPUP */}
      {showPendingAlert && (
        <div style={{ 
          position: 'fixed', 
          top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.6)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          zIndex: 100 
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '28px', 
            borderRadius: '12px', 
            width: '400px', 
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' 
          }}>
            <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#92400e', fontSize: '18px', fontWeight: '700', textAlign: 'center' }}>
              Pending HR Classification
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', margin: '0 0 20px 0' }}>
              <strong>{selectedStaffObj?.full_name}</strong> has <strong>{staffPendingHR[selectedStaffId]}</strong> leave record(s) that need your classification.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => { setShowPendingAlert(false); setShowPendingOnly(true); }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#d97706',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '14px'
                }}
              >
                Classify Now
              </button>
              <button
                onClick={() => setShowPendingAlert(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK EDIT MODAL */}
      {showBulkModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.6)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          zIndex: 100 
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '24px', 
            borderRadius: '12px', 
            width: '420px', 
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' 
          }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#111827', fontSize: '18px', fontWeight: '700' }}>
              📦 Bulk Edit Leave Records
            </h3>
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 16px 0' }}>
              Employee: <strong>{selectedStaffObj?.full_name}</strong> &bull; {selectedLeaveIds.size} record(s) selected
            </p>

            <form onSubmit={handleBulkSaveLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Leave Type *</label>
                <select 
                  value={bulkLeaveType} 
                  onChange={(e) => setBulkLeaveType(e.target.value)} 
                  style={{ ...inputStyle, backgroundColor: 'white' }}
                  required
                >
                  <option value="">-- Select --</option>
                  {leaveTypes.map(t => (
                    <option key={t.id} value={t.type_name}>{t.type_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Status *</label>
                <select 
                  value={bulkStatus} 
                  onChange={(e) => setBulkStatus(e.target.value)} 
                  style={{ ...inputStyle, backgroundColor: 'white' }}
                  required
                >
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div style={{ backgroundColor: '#fef3c7', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
                  ⚠️ This will update all {selectedLeaveIds.size} selected record(s). Balances will be adjusted for Annual Leave / Sick Leave - MC.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowBulkModal(false)} 
                  disabled={loadingAction}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#f3f4f6', 
                    color: '#374151', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    fontSize: '13px' 
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loadingAction}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#d97706', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    fontSize: '13px' 
                  }}
                >
                  {loadingAction ? 'Updating...' : `Update ${selectedLeaveIds.size} Record(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
