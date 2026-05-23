import React, { useState, useEffect } from 'react'

export default function LeaveApproval({ supabase, profile, onActionSuccess }) {
  const [pendingList, setPendingList] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedBatchKey, setSelectedBatchId] = useState(null)
  const [editingItems, setEditingItems] = useState([])
  const [rejectReason, setRejectReason] = useState('')

  const cardStyle = { 
    backgroundColor: 'white', padding: '30px', borderRadius: '12px', 
    border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    width: '100%', boxSizing: 'border-box'
  }

  // Group pendingList into batches by applicant, created_at, and reason
  const batches = React.useMemo(() => {
    const groups = {}
    pendingList.forEach(item => {
      const groupKey = `${item.staff_id}_${item.created_at}_${item.reason}`
      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          applicant: item.applicant,
          reason: item.reason,
          created_at: item.created_at,
          leave_type: item.leave_type,
          status: item.status,
          items: []
        }
      }
      groups[groupKey].items.push(item)
    })
    return Object.values(groups)
  }, [pendingList])

  const selectedBatch = batches.find(b => b.key === selectedBatchKey)

  // Keep editingItems in sync with selection
  useEffect(() => {
    if (selectedBatch) {
      setEditingItems(selectedBatch.items.map(item => ({ 
        ...item, 
        status: item.status === 'Pending' ? 'Approved' : item.status 
      })))
    } else {
      setEditingItems([])
      setRejectReason('')
    }
  }, [selectedBatchKey, batches])

  useEffect(() => {
    if (profile) fetchPendingApprovals()
  }, [profile])

  const fetchPendingApprovals = async () => {
    if (!profile) return
    setLoading(true)
    const currentYear = new Date().getFullYear()
    
    // Get only PENDING applications where the current user is the designated approver
    let query = supabase
      .from('leave_applications')
      .select(`
        *,
        applicant:profiles!leave_applications_staff_id_fkey (
          full_name,
          position,
          leave_eligibility (*)
        )
      `)
      .eq('approver_id', profile.id)
      .eq('status', 'Pending')
      .eq('applicant.leave_eligibility.year', currentYear)

    const { data, error } = await query.order('leave_date', { ascending: true })
    
    if (!error) setPendingList(data)
    setLoading(false)
  }

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return ''
    return dateStr.substring(0, 10)
  }

  const handleProcessApplication = async () => {
    const applicant = selectedBatch.applicant
    const applicantName = applicant.full_name
    const currentYear = new Date().getFullYear()
    const applicantElig = applicant.leave_eligibility?.find(e => e.year === currentYear) || 
                         { balance: applicant.annual_leave_balance }

    const confirmCheck = window.confirm(`Are you sure you want to process the leave application for ${applicantName}?`)
    if (!confirmCheck) return

    setLoading(true)

    // Validate Balance for the items being approved as Annual Leave
    const totalAnnualToApprove = editingItems
      .filter(i => i.status === 'Approved' && i.leave_type === 'Annual Leave')
      .reduce((sum, i) => sum + parseFloat(i.duration_value), 0)
    
    if (totalAnnualToApprove > applicantElig.balance) {
      alert(`Insufficient balance! This processing requires ${totalAnnualToApprove} days, but user only has ${applicantElig.balance} days available.`)
      setLoading(false)
      return
    }

    // 1. Prepare updates for each item
    const updates = editingItems.map(item => 
      supabase.from('leave_applications')
        .update({ 
          status: item.status, 
          leave_type: item.leave_type, 
          processed_by: profile.id, 
          processed_at: new Date().toISOString(),
          // Append rejection reason if applicable
          reason: item.status === 'Rejected' && rejectReason 
            ? `${item.reason}\n\n[HOD Reject Reason: ${rejectReason}]` 
            : item.reason
        })
        .eq('id', item.id)
    )

    const results = await Promise.all(updates)
    const error = results.find(r => r.error)?.error

    // 2. Deduct balance only if there was a successful approval involving Annual Leave
    if (!error) {
      const totalAnnual = editingItems
        .filter(i => i.status === 'Approved' && i.leave_type === 'Annual Leave')
        .reduce((sum, i) => sum + parseFloat(i.duration_value), 0)
      
      if (totalAnnual > 0 && applicantElig.id) {
        const newBalance = applicantElig.balance - totalAnnual
        await supabase.from('leave_eligibility')
          .update({ balance: newBalance })
          .eq('id', applicantElig.id)
      }
    }

    if (error) alert(`Error: ${error.message}`)
    else {
      alert('Application processed successfully!')
      setSelectedBatchId(null)
      fetchPendingApprovals()
      if (onActionSuccess) onActionSuccess()
    }
    setLoading(false)
  }

  const hasRejectedItems = editingItems.some(item => item.status === 'Rejected')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px', width: '100%', height: 'calc(100vh - 150px)' }}>
      
      {/* LEFT COLUMN: BATCH LIST */}
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '18px' }}>📋 Pending Requests</h3>
              <p style={{ color: '#6b7280', fontSize: '12px', margin: '2px 0 0 0' }}>{batches.length} total applications</p>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && pendingList.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>Loading...</p>
          ) : batches.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>No requests found.</p>
          ) : (
            batches.map((batch) => (
              <div 
                key={batch.key} 
                onClick={() => setSelectedBatchId(batch.key)}
                style={{ 
                  padding: '15px', 
                  borderRadius: '10px', 
                  marginBottom: '10px', 
                  cursor: 'pointer', 
                  border: '1px solid',
                  borderColor: selectedBatchKey === batch.key ? '#4f46e5' : '#f3f4f6',
                  backgroundColor: selectedBatchKey === batch.key ? '#f5f3ff' : 'white',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>{batch.applicant?.full_name}</span>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>{formatDateDisplay(batch.created_at)}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {batch.reason}
                </div>
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                    {batch.items.length} {batch.items.length > 1 ? 'Days' : 'Day'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: DETAILS */}
      <div style={cardStyle}>
        {!selectedBatch || editingItems.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔍</div>
            <p>Select a request from the left to view details</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ borderBottom: '2px solid #f3f4f6', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#111827', fontSize: '20px' }}>Request Details</h3>
              <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '13px' }}>Submitted on {new Date(selectedBatch.created_at).toLocaleString()}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Applicant</label>
                <div style={{ fontWeight: '600', color: '#111827' }}>{selectedBatch.applicant?.full_name}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedBatch.applicant?.position}</div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Current Leave Balance</label>
                <div style={{ fontWeight: '800', color: '#4f46e5', fontSize: '18px' }}>
                  {selectedBatch.applicant?.leave_eligibility?.find(e => e.year === new Date().getFullYear())?.balance ?? 
                   selectedBatch.applicant?.annual_leave_balance} 
                  <span style={{ fontSize: '12px', fontWeight: '400' }}> Days</span>
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Reason</label>
              <div style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px', fontSize: '14px', marginTop: '5px', border: '1px solid #e5e7eb' }}>
                {selectedBatch.reason}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Review Dates & Authority</label>
              <div style={{ marginTop: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                {editingItems.map((item, idx) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderBottom: idx === selectedBatch.items.length - 1 ? 'none' : '1px solid #f3f4f6', backgroundColor: 'white' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{formatDateDisplay(item.leave_date)}</span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.duration_type} ({item.duration_value})</span>
                    </div>
                    <select 
                      value={item.status === 'Rejected' ? 'Rejected' : item.leave_type} 
                      onChange={(e) => {
                        const val = e.target.value
                        const updated = [...editingItems]
                        if (val === 'Rejected') {
                          updated[idx].status = 'Rejected'
                        } else {
                          updated[idx].status = 'Approved'
                          updated[idx].leave_type = val
                        }
                        setEditingItems(updated)
                      }}
                      style={{ 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        border: '1px solid #d1d5db', 
                        fontSize: '13px', 
                        backgroundColor: item.status === 'Rejected' ? '#fee2e2' : (item.leave_type === 'Unpaid Leave' ? '#fff7ed' : 'white'),
                        color: item.status === 'Rejected' ? '#b91c1c' : '#111827',
                        fontWeight: item.status === 'Rejected' ? '700' : '400'
                      }}
                    >
                      <option value="Annual Leave">Annual Leave</option>
                      <option value="Unpaid Leave">Unpaid Leave</option>
                      <option disabled>──────────</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {hasRejectedItems && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase' }}>Rejection Reason (Required)</label>
                <textarea 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="State why the application is being rejected..."
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '14px', marginTop: '8px', minHeight: '80px', boxSizing: 'border-box' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', padding: '15px', backgroundColor: '#f5f3ff', borderRadius: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Total reviewing: {editingItems.reduce((sum, i) => sum + parseFloat(i.duration_value), 0)} Days</div>
              <button 
                onClick={handleProcessApplication} 
                disabled={loading || (hasRejectedItems && !rejectReason.trim())} 
                style={{ 
                  padding: '10px 24px', 
                  backgroundColor: (hasRejectedItems && !rejectReason.trim()) ? '#9ca3af' : '#4f46e5', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: '700', 
                  cursor: (hasRejectedItems && !rejectReason.trim()) ? 'not-allowed' : 'pointer' 
                }}
              >
                {loading ? 'Processing...' : 'Process Application'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}