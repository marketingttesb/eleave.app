import React, { useState, useEffect } from 'react'
import Flatpickr from "react-flatpickr"
import "flatpickr/dist/themes/light.css" // You can choose different themes
import { format, parseISO } from "date-fns" // Useful for parsing dates

export default function ApplyLeave({ supabase, profile, onApplicationSuccess }) {
  const [leaveTypes, setLeaveTypes] = useState([])
  const [durations, setDurations] = useState([])
  const [loading, setLoading] = useState(false)
  const [leaveHistory, setLeaveHistory] = useState([]) // Sejarah cuti staf
  const [showConfirmation, setShowConfirmation] = useState(false) // Mod pengesahan

  // Main Form States
  const [leaveType, setLeaveType] = useState('Annual Leave')
  const [reason, setReason] = useState('')
  const [addedDates, setAddedDates] = useState([]) // Simpan senarai tarikh yang dipilih

  // Temp Input States (untuk baris "Tambah Cuti")
  const [tempDate, setTempDate] = useState('')
  const [tempDurationId, setTempDurationId] = useState('')

  const cardStyle = { 
    backgroundColor: 'white', 
    padding: '30px', 
    borderRadius: '12px', 
    border: '1px solid #e5e7eb', 
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    width: '100%',
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
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    display: 'block',
    marginBottom: '8px'
  }

  useEffect(() => {
    fetchMetadata()
    fetchLeaveHistory()
  }, [])

  const fetchMetadata = async () => {
    const { data: types } = await supabase.from('leave_types').select('*').order('type_name', { ascending: true })
    const { data: durs } = await supabase.from('leave_durations').select('*').order('duration_value', { descending: true })
    
    if (types) {
      setLeaveTypes(types)
      const annual = types.find(t => t.type_name.toLowerCase().includes('annual'))
      if (annual) setLeaveType(annual.type_name)
      else if (types.length > 0) setLeaveType(types[0].type_name)
    }
    if (durs) {
      setDurations(durs)
      if (durs.length > 0) setTempDurationId(durs[0].id)
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

  // Helper to ensure dates are displayed as YYYY-MM-DD consistently
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return ''
    return dateStr.substring(0, 10) // Extracts YYYY-MM-DD from ISO strings or date strings
  }

  const addDateToList = () => {
    if (!tempDate || !tempDurationId) {
      alert("Please select both date and duration.")
      return
    }

    const newDurationObj = durations.find(d => String(d.id) === String(tempDurationId))
    
    // Rule: Semak pertindihan dalam form semasa & history
    const existingOnThisDate = addedDates.filter(d => d.date === tempDate)
    const existingInHistory = leaveHistory
      .filter(h => h.leave_date === tempDate && h.status !== 'Rejected')
    
    const totalCurrent = existingOnThisDate.reduce((sum, d) => sum + d.durationValue, 0)
    const totalHistory = existingInHistory.reduce((sum, h) => sum + h.duration_value, 0)

    // Rule: Total 1.0 day per date
    if (totalCurrent + totalHistory + newDurationObj.duration_value > 1.0) {
      alert("Total leave duration for a single date cannot exceed 1 day.")
      return
    }

    // Slot validation: Prevent duplicate AM or duplicate PM
    const isNewAM = newDurationObj.duration_name.toLowerCase().includes('am')
    const isNewPM = newDurationObj.duration_name.toLowerCase().includes('pm')

    const hasExistingAM = [...existingOnThisDate, ...existingInHistory.map(h => ({ durationName: h.duration_type }))]
      .some(d => d.durationName.toLowerCase().includes('am'))
    const hasExistingPM = [...existingOnThisDate, ...existingInHistory.map(h => ({ durationName: h.duration_type }))]
      .some(d => d.durationName.toLowerCase().includes('pm'))

    if (isNewAM && hasExistingAM) {
      alert("You have already added a Half Day (AM) for this date.")
      return
    }
    if (isNewPM && hasExistingPM) {
      alert("You have already added a Half Day (PM) for this date.")
      return
    }

    // Use date-fns to get the day name safely without timezone shifts
    const dayName = tempDate ? format(parseISO(tempDate), "EEEE") : ''

    const getSortWeight = (name) => {
      const low = name.toLowerCase()
      if (low.includes('am')) return 1
      if (low.includes('pm')) return 2
      return 3 // Full Day
    }

    const newEntry = {
      date: tempDate,
      day: dayName,
      durationName: newDurationObj.duration_name,
      durationValue: newDurationObj.duration_value
    }

    const updatedList = [...addedDates, newEntry].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return getSortWeight(a.durationName) - getSortWeight(b.durationName)
    })

    setAddedDates(updatedList)
    setTempDate('')
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

    const totalRequested = addedDates.reduce((sum, item) => sum + item.durationValue, 0)
    const currentBalance = profile.current_eligibility?.balance ?? 0

    if (leaveType.toLowerCase().includes('annual') && currentBalance < totalRequested) {
      alert(`Insufficient balance! (Requested: ${totalRequested}, Available: ${currentBalance})`)
      setLoading(false)
      setShowConfirmation(false)
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '30px', width: '100%' }}>
      
      {/* KIRI: BORANG PERMOHONAN / CONFIRMATION */}
      <div style={cardStyle}>
        {!showConfirmation ? (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>📝 Leave Application Form</h3>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '5px 0 0 0' }}>Fill in the details to request leave.</p>
            </div>

            <form onSubmit={handleProceedToConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>Reason</label>
                  <textarea 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason..."
                    style={{ ...inputStyle, minHeight: '44px' }}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Approved By</label>
                  <div style={{ padding: '10px 0', fontSize: '15px', color: '#111827', fontWeight: '600' }}>
                    {profile?.superior?.full_name || 'Not Assigned'}
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                <label style={{ ...labelStyle, marginBottom: '15px', color: '#4f46e5' }}>➕ Add Leave Dates</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600' }}>Date</label>
                    <Flatpickr
                      value={tempDate}
                      onChange={([date]) => {
                        // Use date-fns to format local date correctly without timezone shifts
                        const formatted = date ? format(date, "yyyy-MM-dd") : ''
                        setTempDate(formatted)
                      }}
                      options={{
                        dateFormat: "Y-m-d", // This forces the display to YYYY-MM-DD
                      }}
                      style={inputStyle}
                      placeholder="Select Date"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600' }}>Duration</label>
                    <select value={tempDurationId} onChange={(e) => setTempDurationId(e.target.value)} style={inputStyle}>
                      {durations.map(d => <option key={d.id} value={d.id}>{d.duration_name}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={addDateToList} style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>➕ Add</button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Selected Dates</label>
                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f3f4f6' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600' }}>Date</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600' }}>Duration</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', width: '80px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {addedDates.length === 0 ? (
                        <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>No dates selected.</td></tr>
                      ) : (
                        addedDates.map((item, idx) => (
                          <tr key={`${item.date}-${item.durationName}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatDateDisplay(item.date)} ({item.day})</td>
                            <td style={{ padding: '12px 16px', fontSize: '14px' }}>{item.durationName}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button type="button" onClick={() => removeDateFromList(item.date, item.durationName)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '14px' }}>Balance: <strong>{profile.current_eligibility?.balance ?? 0} Days</strong></div>
                <button type="submit" disabled={addedDates.length === 0} style={{ padding: '10px 24px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Proceed to Confirmation</button>
              </div>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#4f46e5' }}>⚠️ Confirm Your Application</h3>
            <p>Please review your leave request details before final submission.</p>
            
            <div style={{ textAlign: 'left', backgroundColor: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', margin: '20px 0' }}>
              <p><strong>Reason:</strong> {reason}</p>
              <p><strong>Approver:</strong> {profile?.superior?.full_name}</p>
              <p><strong>Total Days:</strong> {addedDates.reduce((sum, i) => sum + i.durationValue, 0)}</p>
              <hr />
              <label style={labelStyle}>Date Summary:</label>
              {addedDates.map((d, i) => (
                <div key={i} style={{ fontSize: '14px', marginBottom: '4px' }}>• {formatDateDisplay(d.date)} - {d.durationName}</div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={() => setShowConfirmation(false)} style={{ padding: '10px 24px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}>Cancel & Edit</button>
              <button onClick={handleFinalConfirm} disabled={loading} style={{ padding: '10px 24px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                {loading ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KANAN: SEJARAH CUTI (HISTORY) */}
      <div style={cardStyle}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#111827', fontSize: '18px' }}>📜 Leave History</h3>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: '5px 0 0 0' }}>Track your applied dates.</p>
        </div>
        
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {leaveHistory.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>No history found.</p>
          ) : (
            leaveHistory.map((h) => (
              <div key={h.id} style={{ padding: '12px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{formatDateDisplay(h.leave_date)}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{h.duration_type} ({h.duration_value})</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {h.status === 'Pending' && (
                    <button 
                      onClick={() => handleDeleteHistory(h.id, h.status)}
                      disabled={loading}
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Delete Application"
                    >
                      🗑️
                    </button>
                  )}
                  <span style={{ 
                    fontSize: '11px', 
                    padding: '3px 8px', 
                    borderRadius: '12px', 
                    fontWeight: '700',
                    backgroundColor: h.status === 'Approved' ? '#ecfdf5' : h.status === 'Pending' ? '#eff6ff' : '#fef2f2',
                    color: h.status === 'Approved' ? '#059669' : h.status === 'Pending' ? '#2563eb' : '#dc2626'
                  }}>
                    {h.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}