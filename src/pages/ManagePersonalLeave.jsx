import React, { useState, useEffect } from 'react'
import { format } from "date-fns"

import { toTitleCase } from '../lib/format'
import { cardStyle } from '../lib/styles'
import StaffDirectory from '../components/StaffDirectory'
import StaffHeaderInfo from '../components/StaffHeaderInfo'
import PendingHrBanner from '../components/PendingHrBanner'
import ActionButtonsBar from '../components/ActionButtonsBar'
import LeaveTable from '../components/LeaveTable'
import AddEditLeaveForm from '../components/AddEditLeaveForm'
import PendingHrAlertPopup from '../components/PendingHrAlertPopup'
import BulkEditForm from '../components/BulkEditForm'

export default function ManagePersonalLeave({ supabase, profile, initialStaffId }) {
  const [staffList, setStaffList] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [departmentList, setDepartmentList] = useState([])
  const [selectedDeptId, setSelectedDeptId] = useState('All')
  
  const [leaveHistory, setLeaveHistory] = useState([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [eligibilityRecord, setEligibilityRecord] = useState(null)
  const [approvedAnnualDays, setApprovedAnnualDays] = useState(0)
  const [approvedMcDays, setApprovedMcDays] = useState(0)
  
  const [leaveTypes, setLeaveTypes] = useState([])
  const [durations, setDurations] = useState([])
  const [publicHolidays, setPublicHolidays] = useState([])

  const [staffPendingHR, setStaffPendingHR] = useState({})
  const [showPendingOnly, setShowPendingOnly] = useState(false)

  const [loadingStaff, setLoadingStaff] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [editingLeave, setEditingLeave] = useState(null)

  const [formDate, setFormDate] = useState('')
  const [formLeaveType, setFormLeaveType] = useState('')
  const [formDurationId, setFormDurationId] = useState('')
  const [formStatus, setFormStatus] = useState('Pending')
  const [formReason, setFormReason] = useState('')

  const [selectedLeaveIds, setSelectedLeaveIds] = useState(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkLeaveType, setBulkLeaveType] = useState('')
  const [bulkStatus, setBulkStatus] = useState('Approved')

  const [showPendingAlert, setShowPendingAlert] = useState(false)

  useEffect(() => {
    fetchMetadata()
    fetchStaffList()
  }, [])

  useEffect(() => {
    if (selectedStaffId) {
      fetchStaffLeaveData()
      setSelectedLeaveIds(new Set())
      if (staffPendingHR[selectedStaffId] > 0) {
        setShowPendingAlert(true)
      }
    } else if (initialStaffId) {
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

      const { data: leaves, error: leavesError } = await supabase
        .from('leave_applications')
        .select('*')
        .eq('staff_id', selectedStaffId)
        .gte('leave_date', startOfYear)
        .lte('leave_date', endOfYear)
        .order('leave_date', { ascending: false })

      if (leavesError) throw leavesError
      setLeaveHistory(leaves || [])

      const { data: eligRecord, error: eligError } = await supabase
        .from('leave_eligibility')
        .select('*')
        .eq('uid', selectedStaffId)
        .eq('year', selectedYear)
        .maybeSingle()

      if (eligError) throw eligError
      setEligibilityRecord(eligRecord || null)

      const approvedDays = (leaves || [])
        .filter(l => l.status === 'Approved' && l.leave_type === 'Annual Leave')
        .reduce((sum, l) => sum + parseFloat(l.duration_value), 0)
      
      setApprovedAnnualDays(approvedDays)

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

  const adjustLeaveBalance = async (staffId, year, diffValue, isMc = false) => {
    if (diffValue === 0) return

    const { data: eligRecord, error: fetchError } = await supabase
      .from('leave_eligibility')
      .select('*')
      .eq('uid', staffId)
      .eq('year', year)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (!eligRecord) {
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
          uid: staffId, year: year,
          eligibility: baseEligibility, balance: initialBalance,
          mc_eligibility: baseMcEligibility, mc_balance: initialMcBalance
        }])

      if (insertError) throw insertError
    } else {
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

      const existingOnThisDate = leaveHistory
        .filter(l => l.leave_date === formDate && l.status !== 'Rejected' && (!editingLeave || l.id !== editingLeave.id))
      const totalOnDate = existingOnThisDate.reduce((sum, l) => sum + parseFloat(l.duration_value), 0)

      if (totalOnDate + durationObj.duration_value > 1.0) {
        alert("Action Denied: Total leave duration on a single date cannot exceed 1 day.")
        setLoadingAction(false)
        return
      }

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

      if (editingLeave?.needs_hr_review === true) {
        payload.needs_hr_review = false
      }

      if (modalMode === 'add') {
        const { error: insertError } = await supabase
          .from('leave_applications')
          .insert([payload])

        if (insertError) throw insertError

        if (formStatus === 'Approved') {
          if (formLeaveType === 'Annual Leave') {
            await adjustLeaveBalance(selectedStaffId, leaveYear, durationObj.duration_value, false)
          } else if (formLeaveType === 'Sick Leave - MC') {
            await adjustLeaveBalance(selectedStaffId, leaveYear, durationObj.duration_value, true)
          }
        }
      } else {
        const { error: updateError } = await supabase
          .from('leave_applications')
          .update(payload)
          .eq('id', editingLeave.id)

        if (updateError) throw updateError

        const wasDeducted = editingLeave?.needs_hr_review !== true
        const oldDeduction = (wasDeducted && editingLeave.status === 'Approved' && editingLeave.leave_type === 'Annual Leave') ? parseFloat(editingLeave.duration_value) : 0
        const newDeduction = (formStatus === 'Approved' && formLeaveType === 'Annual Leave') ? durationObj.duration_value : 0

        const oldMcDeduction = (wasDeducted && editingLeave.status === 'Approved' && editingLeave.leave_type === 'Sick Leave - MC') ? parseFloat(editingLeave.duration_value) : 0
        const newMcDeduction = (formStatus === 'Approved' && formLeaveType === 'Sick Leave - MC') ? durationObj.duration_value : 0

        const oldYear = new Date(editingLeave.leave_date).getFullYear()

        if (oldYear === leaveYear) {
          const diff = newDeduction - oldDeduction
          const mcDiff = newMcDeduction - oldMcDeduction
          if (diff !== 0) await adjustLeaveBalance(selectedStaffId, leaveYear, diff, false)
          if (mcDiff !== 0) await adjustLeaveBalance(selectedStaffId, leaveYear, mcDiff, true)
        } else {
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
            await adjustLeaveBalance(selectedStaffId, leaveYear, newMcDeduction, true)
          }
        }
      }

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

      if (leave.status === 'Approved' && leave.needs_hr_review !== true) {
        const leaveYear = new Date(leave.leave_date).getFullYear()
        if (leave.leave_type === 'Annual Leave') {
          await adjustLeaveBalance(selectedStaffId, leaveYear, -parseFloat(leave.duration_value), false)
        } else if (leave.leave_type === 'Sick Leave - MC') {
          await adjustLeaveBalance(selectedStaffId, leaveYear, -parseFloat(leave.duration_value), true)
        }
      }

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

  const toggleLeaveSelection = (id) => {
    setSelectedLeaveIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

        const wasDeducted = leave.needs_hr_review !== true
        const oldDeduction = (wasDeducted && leave.status === 'Approved' && leave.leave_type === 'Annual Leave') ? durationVal : 0
        const oldMcDeduction = (wasDeducted && leave.status === 'Approved' && leave.leave_type === 'Sick Leave - MC') ? durationVal : 0
        const newDeduction = (bulkStatus === 'Approved' && bulkLeaveType === 'Annual Leave') ? durationVal : 0
        const newMcDeduction = (bulkStatus === 'Approved' && bulkLeaveType === 'Sick Leave - MC') ? durationVal : 0

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

        const diff = newDeduction - oldDeduction
        const mcDiff = newMcDeduction - oldMcDeduction
        if (diff !== 0) await adjustLeaveBalance(selectedStaffId, leaveYear, diff, false)
        if (mcDiff !== 0) await adjustLeaveBalance(selectedStaffId, leaveYear, mcDiff, true)

        affectedDates.push(leave.leave_date)
      }

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

  const filteredStaffList = staffList.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.position?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDept = selectedDeptId === 'All' || String(s.department_id || s.departments?.id) === String(selectedDeptId)
    return matchesSearch && matchesDept
  })

  const displayedLeaves = showPendingOnly
    ? leaveHistory.filter(l => l.needs_hr_review === true)
    : leaveHistory

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', width: '100%', height: '100%' }}>
      
      <StaffDirectory
        staffList={staffList}
        filteredStaffList={filteredStaffList}
        searchQuery={searchQuery}
        selectedDeptId={selectedDeptId}
        selectedStaffId={selectedStaffId}
        staffPendingHR={staffPendingHR}
        loadingStaff={loadingStaff}
        departmentList={departmentList}
        onSearchChange={setSearchQuery}
        onDeptFilterChange={setSelectedDeptId}
        onStaffSelect={setSelectedStaffId}
      />

      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        {!selectedStaffId ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: '#9ca3af'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>👤</div>
            <h3 style={{ margin: '0 0 4px 0', color: '#4b5563' }}>Select an Employee</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Click a staff member from the directory on the left to view leave history and manage leaves.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            
            <StaffHeaderInfo
              selectedStaff={selectedStaffObj}
              eligibilityRecord={eligibilityRecord}
              approvedAnnualDays={approvedAnnualDays}
              approvedMcDays={approvedMcDays}
            />

            <PendingHrBanner
              pendingCount={leaveHistory.filter(l => l.needs_hr_review === true).length}
              showPendingOnly={showPendingOnly}
              onTogglePendingFilter={() => setShowPendingOnly(!showPendingOnly)}
            />

            <ActionButtonsBar
              selectedYear={selectedYear}
              years={years}
              selectedCount={selectedLeaveIds.size}
              onYearChange={setSelectedYear}
              onAddClick={handleOpenAddModal}
              onBulkEditClick={handleOpenBulkModal}
              loadingAction={loadingAction}
            />

            <LeaveTable
              displayedLeaves={displayedLeaves}
              selectedLeaveIds={selectedLeaveIds}
              loadingHistory={loadingHistory}
              showPendingOnly={showPendingOnly}
              selectedYear={selectedYear}
              onToggleSelectAll={toggleSelectAll}
              onToggleSelection={toggleLeaveSelection}
              onEditClick={handleOpenEditModal}
              onDeleteClick={handleDeleteLeave}
              loadingAction={loadingAction}
            />

          </div>
        )}
      </div>

      <AddEditLeaveForm
        isOpen={showModal}
        modalMode={modalMode}
        selectedStaffName={selectedStaffObj?.full_name}
        editingLeave={editingLeave}
        leaveTypes={leaveTypes}
        durations={durations}
        formDate={formDate}
        formLeaveType={formLeaveType}
        formDurationId={formDurationId}
        formStatus={formStatus}
        formReason={formReason}
        loadingAction={loadingAction}
        onDateChange={setFormDate}
        onLeaveTypeChange={setFormLeaveType}
        onDurationChange={setFormDurationId}
        onStatusChange={setFormStatus}
        onReasonChange={setFormReason}
        onSubmit={handleSaveLeave}
        onCancel={() => setShowModal(false)}
      />

      <PendingHrAlertPopup
        isOpen={showPendingAlert}
        staffName={toTitleCase(selectedStaffObj?.full_name)}
        pendingCount={staffPendingHR[selectedStaffId] || 0}
        onClassify={() => { setShowPendingAlert(false); setShowPendingOnly(true); }}
        onDismiss={() => setShowPendingAlert(false)}
      />

      <BulkEditForm
        isOpen={showBulkModal}
        selectedStaffName={selectedStaffObj?.full_name}
        selectedCount={selectedLeaveIds.size}
        leaveTypes={leaveTypes}
        bulkLeaveType={bulkLeaveType}
        bulkStatus={bulkStatus}
        loadingAction={loadingAction}
        onLeaveTypeChange={setBulkLeaveType}
        onStatusChange={setBulkStatus}
        onSubmit={handleBulkSaveLeave}
        onCancel={() => setShowBulkModal(false)}
      />

    </div>
  )
}
