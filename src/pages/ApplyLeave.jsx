import React, { useState, useEffect } from 'react'
import { format, parseISO, addDays } from "date-fns"
import { toTitleCase } from "../lib/format"
import { cardStyle, labelStyle, pageTitleStyle } from '../lib/styles'
import DateRangeInput from '../components/DateRangeInput'
import SelectedDatesTable from '../components/SelectedDatesTable'
import ConfirmationScreen from '../components/ConfirmationScreen'
import LeaveHistorySidebar from '../components/LeaveHistorySidebar'

export default function ApplyLeave({ supabase, profile, onApplicationSuccess }) {
  const [leaveTypes, setLeaveTypes] = useState([])
  const [durations, setDurations] = useState([])
  const [loading, setLoading] = useState(false)
  const [leaveHistory, setLeaveHistory] = useState([])
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [publicHolidays, setPublicHolidays] = useState([])

  const [leaveType, setLeaveType] = useState('Normal Leave')
  const [reason, setReason] = useState('')
  const [addedDates, setAddedDates] = useState([])

  const [tempRangeStart, setTempRangeStart] = useState('')
  const [tempRangeEnd, setTempRangeEnd] = useState('')
  const [rangeDurationId, setRangeDurationId] = useState('')
  const [userDepartmentName, setUserDepartmentName] = useState('')

  useEffect(() => {
    fetchMetadata()
  }, [])

  useEffect(() => {
    if (profile) fetchLeaveHistory()
  }, [profile])

  const fetchMetadata = async () => {
    const { data: durs } = await supabase.from('leave_durations').select('*').order('duration_value', { descending: true })
    const { data: holidays } = await supabase.from('public_holidays').select('holiday_date')

    setLeaveTypes([
      { id: 'normal', type_name: 'Normal Leave' },
      { id: 'sick', type_name: 'Sick Leave - MC' },
    ])
    if (durs) {
      setDurations(durs)
      if (durs.length > 0) {
        const fullDay = durs.find(d => d.duration_name.toLowerCase().includes('full day'))
        setRangeDurationId(fullDay ? fullDay.id : durs[0].id)
      }
    }
    if (holidays) {
      setPublicHolidays(holidays.map(h => h.holiday_date))
    }

    if (profile?.department_id) {
      const { data: dept } = await supabase.from('departments').select('name').eq('id', profile.department_id).single()
      if (dept) setUserDepartmentName(dept.name)
    }
  }

  const fetchLeaveHistory = async () => {
    if (!profile) return
    const { data, error } = await supabase
      .from('leave_applications')
      .select('*')
      .eq('staff_id', profile.id)
      .order('leave_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error) setLeaveHistory(data)
  }

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return ''
    return dateStr.substring(0, 10)
  }

  const isWeekend = (date) => {
    const day = date.getDay()
    if (profile.working_days_type === '5_days') {
      return day === 0 || day === 6
    }
    if (profile.working_days_type === '6_days') {
      const dept = userDepartmentName.toLowerCase()
      if (dept.includes('paka')) return day === 5
      if (dept.includes('kuantan')) return day === 0
    }
    return false
  }

  const addDateRangeToList = () => {
    if (!tempRangeStart || !tempRangeEnd || !rangeDurationId) {
      alert("Please select From Date, To Date, and Duration.")
      return
    }

    if (tempRangeStart > tempRangeEnd) {
      alert("From Date must be before To Date.")
      return
    }

    const rangeDurationObj = durations.find(d => String(d.id) === String(rangeDurationId))
    const allDates = []
    let current = parseISO(tempRangeStart)
    const end = parseISO(tempRangeEnd)
    while (current <= end) {
      allDates.push(format(current, "yyyy-MM-dd"))
      current = addDays(current, 1)
    }

    const added = []
    const skipped = []

    const isSickLeave = leaveType === 'Sick Leave - MC'

    for (const dateStr of allDates) {
      const dateObj = parseISO(dateStr)

      if (!isSickLeave) {
        if (isWeekend(dateObj)) {
          skipped.push({ date: dateStr, reason: 'Weekend' })
          continue
        }
        if (publicHolidays.includes(dateStr)) {
          skipped.push({ date: dateStr, reason: 'Public Holiday' })
          continue
        }
      }

      const existingOnThisDate = addedDates.filter(d => d.date === dateStr)
      const existingInHistory = leaveHistory.filter(h => h.leave_date === dateStr && h.status !== 'Rejected')
      const totalCurrent = existingOnThisDate.reduce((sum, d) => sum + d.durationValue, 0)
      const totalHistory = existingInHistory.reduce((sum, h) => sum + h.duration_value, 0)

      if (totalCurrent + totalHistory + rangeDurationObj.duration_value > 1.0) {
        skipped.push({ date: dateStr, reason: 'Overlapping with existing leave' })
        continue
      }

      const isNewAM = rangeDurationObj.duration_name.toLowerCase().includes('am')
      const isNewPM = rangeDurationObj.duration_name.toLowerCase().includes('pm')
      const hasExistingAM = [...existingOnThisDate, ...existingInHistory.map(h => ({ durationName: h.duration_type }))]
        .some(d => d.durationName.toLowerCase().includes('am'))
      const hasExistingPM = [...existingOnThisDate, ...existingInHistory.map(h => ({ durationName: h.duration_type }))]
        .some(d => d.durationName.toLowerCase().includes('pm'))

      if (isNewAM && hasExistingAM) {
        skipped.push({ date: dateStr, reason: 'AM slot already taken' })
        continue
      }
      if (isNewPM && hasExistingPM) {
        skipped.push({ date: dateStr, reason: 'PM slot already taken' })
        continue
      }

      const dayName = format(dateObj, "EEEE")
      added.push({
        date: dateStr,
        day: dayName,
        durationName: rangeDurationObj.duration_name,
        durationValue: rangeDurationObj.duration_value
      })
    }

    if (added.length > 0) {
      const getSortWeight = (name) => {
        const low = name.toLowerCase()
        if (low.includes('am')) return 1
        if (low.includes('pm')) return 2
        return 3
      }

      const updatedList = [...addedDates, ...added].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return getSortWeight(a.durationName) - getSortWeight(b.durationName)
      })
      setAddedDates(updatedList)
    }
  }

  const removeDateFromList = (dateStr, durationName) => {
    setAddedDates(addedDates.filter(d => !(d.date === dateStr && d.durationName === durationName)))
  }

  const handleProceedToConfirm = (e) => {
    e.preventDefault()
    if (addedDates.length === 0) {
      alert("Please add at least one leave date.")
      return
    }
    setShowConfirmation(true)
  }

  const handleFinalConfirm = async () => {
    setLoading(true)

    if (!profile.report_to) {
      alert("Application denied: You do not have a superior assigned to approve your leave. Please contact HR.")
      setLoading(false)
      return
    }

    const insertData = addedDates.map(d => ({
      staff_id: profile.id,
      approver_id: profile.report_to,
      leave_type: leaveType,
      leave_date: d.date,
      duration_type: d.durationName,
      duration_value: d.durationValue,
      reason: reason,
      status: 'Pending'
    }))

    const { error } = await supabase.from('leave_applications').insert(insertData)

    if (error) {
      alert(`Error submitting application: ${error.message}`)
    } else {
      await supabase.from('notifications').insert({
        user_id: profile.report_to,
        title: 'New Leave Request',
        message: `${toTitleCase(profile.full_name)} has submitted a request for ${addedDates.length} day(s).`,
        type: 'application'
      });

      alert('Leave application submitted successfully!')
      setReason('')
      setAddedDates([])
      setShowConfirmation(false)
      await fetchLeaveHistory()
      if (onApplicationSuccess) onApplicationSuccess()
    }
    setLoading(false)
  }

  const handleDeleteHistory = async (id, status) => {
    if (status !== 'Pending') return

    const confirmCheck = window.confirm("Are you sure you want to permanently delete this pending leave application?")
    if (!confirmCheck) return

    setLoading(true)
    const { error } = await supabase
      .from('leave_applications')
      .delete()
      .eq('id', id)

    if (error) {
      alert(`Error deleting application: ${error.message}`)
    } else {
      await fetchLeaveHistory()
      if (onApplicationSuccess) onApplicationSuccess()
    }
    setLoading(false)
  }

  const currentYear = new Date().getFullYear()
  const approvedAnnualDays = leaveHistory
    .filter(h => h.status === 'Approved' && h.leave_type === 'Annual Leave' && h.leave_date.startsWith(String(currentYear)))
    .reduce((sum, h) => sum + parseFloat(h.duration_value), 0)

  const approvedMcDays = leaveHistory
    .filter(h => h.status === 'Approved' && h.leave_type === 'Sick Leave - MC' && h.leave_date.startsWith(String(currentYear)))
    .reduce((sum, h) => sum + parseFloat(h.duration_value), 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '30px', width: '100%' }}>

      <div style={cardStyle}>
        {!showConfirmation ? (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={pageTitleStyle}>📝 Leave Application Form</h3>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '5px 0 0 0' }}>
                Fill in the details to request leave.
              </p>
            </div>

            <form onSubmit={handleProceedToConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              <div>
                <label style={labelStyle}>Leave Type</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {leaveTypes.map(t => {
                    const isActive = leaveType === t.type_name
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setLeaveType(t.type_name)}
                        style={{
                          flex: 1, padding: '10px 16px', borderRadius: '8px', border: '2px solid',
                          borderColor: isActive ? '#4f46e5' : '#d1d5db',
                          backgroundColor: isActive ? '#f5f3ff' : 'white',
                          color: isActive ? '#4f46e5' : '#374151',
                          fontWeight: isActive ? '700' : '500',
                          fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        {t.type_name === 'Sick Leave - MC' ? '🤒 Sick Leave' : '📅 ' + t.type_name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>Reason</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason..."
                    style={{
                      padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db',
                      fontSize: '14px', width: '100%', boxSizing: 'border-box',
                      backgroundColor: 'white', minHeight: '44px'
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Approved By</label>
                  <div style={{ padding: '10px 0', fontSize: '15px', color: '#111827', fontWeight: '600' }}>
                    {toTitleCase(profile?.superior?.full_name) || 'Not Assigned'}
                  </div>
                </div>
              </div>

              <DateRangeInput
                tempRangeStart={tempRangeStart}
                tempRangeEnd={tempRangeEnd}
                rangeDurationId={rangeDurationId}
                durations={durations}
                isWeekend={isWeekend}
                publicHolidays={publicHolidays}
                onStartChange={setTempRangeStart}
                onEndChange={setTempRangeEnd}
                onDurationChange={setRangeDurationId}
                onAdd={addDateRangeToList}
              />

              <SelectedDatesTable
                addedDates={addedDates}
                onRemoveDate={removeDateFromList}
                formatDateDisplay={formatDateDisplay}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <button
                  type="submit"
                  disabled={addedDates.length === 0}
                  style={{
                    padding: '10px 24px', backgroundColor: '#4f46e5', color: 'white',
                    border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  Confirm →
                </button>
              </div>
            </form>
          </>
        ) : (
          <ConfirmationScreen
            profile={profile}
            addedDates={addedDates}
            reason={reason}
            loading={loading}
            formatDateDisplay={formatDateDisplay}
            onConfirm={handleFinalConfirm}
            onCancel={() => setShowConfirmation(false)}
          />
        )}
      </div>

      <LeaveHistorySidebar
        profile={profile}
        approvedAnnualDays={approvedAnnualDays}
        approvedMcDays={approvedMcDays}
        leaveHistory={leaveHistory}
        loading={loading}
        formatDateDisplay={formatDateDisplay}
        onDeleteHistory={handleDeleteHistory}
      />

    </div>
  )
}
