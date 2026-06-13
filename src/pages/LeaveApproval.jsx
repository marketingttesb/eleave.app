import React, { useState, useEffect } from 'react'

export default function LeaveApproval({ supabase, profile, onActionSuccess, initialApplicantId, initialCreatedAt }) {
  const [pendingList, setPendingList] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedBatchKey, setSelectedBatchId] = useState(null)
  const [editingItems, setEditingItems] = useState([])
  const [rejectReason, setRejectReason] = useState('')
  const [deptApplications, setDeptApplications] = useState([])
  const [applicantEligibility, setApplicantEligibility] = useState(null)

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
      const initialItems = selectedBatch.items.map(item => ({
        ...item, 
        status: 'Pending'
      }))
      setEditingItems(initialItems)
      fetchDeptApplications(selectedBatch)
      fetchApplicantEligibility(selectedBatch.applicant.id, new Date().getFullYear())
    } else {
      setEditingItems([])
      setRejectReason('')
      setDeptApplications([])
      setApplicantEligibility(null)
    }
  }, [selectedBatchKey, batches, initialApplicantId, initialCreatedAt]) // Add initial props to dependencies

  // Effect to select batch if initialApplicantId and initialCreatedAt are provided
  useEffect(() => {
    if (initialApplicantId && initialCreatedAt && !selectedBatchKey) {
      const targetBatch = batches.find(b => b.applicant.id === initialApplicantId && b.created_at === initialCreatedAt);
      if (targetBatch) setSelectedBatchId(targetBatch.key);
    }
  }, [batches, initialApplicantId, initialCreatedAt, selectedBatchKey]);

  useEffect(() => {
    if (profile) fetchPendingApprovals()
  }, [profile])

  const fetchPendingApprovals = async () => {
    if (!profile) return
    setLoading(true)
    
    // Get only PENDING applications where the current user is the designated approver
    let query = supabase
      .from('leave_applications')
      .select(`
        *,
        applicant:profiles!leave_applications_staff_id_fkey (
          id,
          full_name,
          position,
          department_id
        )
      `)
      .eq('approver_id', profile.id)
      .eq('status', 'Pending')

    const { data, error } = await query.order('leave_date', { ascending: true })
    
    if (!error) setPendingList(data)
    setLoading(false)
  }

  const fetchDeptApplications = async (batch) => {
    const deptId = batch.applicant?.department_id
    if (!deptId) return

    const datesToCompare = batch.items.map(i => i.leave_date)
    
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        leave_applications!leave_applications_staff_id_fkey (
          id,
          leave_date,
          status,
          duration_type,
          created_at,
          reason
        )
      `)
      .eq('department_id', deptId)
      .neq('id', batch.applicant.id) // Exclude current applicant
      .order('full_name', { ascending: true })

    if (error) {
      console.error("Error fetching dept applications:", error.message)
      return
    }

    const processed = data.map(staff => {
      const allStaffLeaves = staff.leave_applications || []
      const staffBatches = {}

      // Group colleague leaves into batches
      allStaffLeaves.forEach(leave => {
        if (leave.status === 'Rejected') return
        const batchKey = `${leave.created_at}_${leave.reason}`
        if (!staffBatches[batchKey]) staffBatches[batchKey] = []
        staffBatches[batchKey].push(leave)
      })

      const relevantLeaves = []
      Object.values(staffBatches).forEach(sBatch => {
        const hasOverlap = sBatch.some(l => datesToCompare.includes(l.leave_date))
        if (hasOverlap) relevantLeaves.push(...sBatch)
      })

      if (relevantLeaves.length > 0) {
        return {
          id: staff.id,
          full_name: staff.full_name,
          relevant_leaves: relevantLeaves.sort((a, b) => a.leave_date.localeCompare(b.leave_date))
        }
      }
      return null
    }).filter(Boolean)

    setDeptApplications(processed)
  }

  const fetchApplicantEligibility = async (staffId, year) => {
    if (!staffId) return
    const { data, error } = await supabase
      .from('leave_eligibility')
      .select('*')
      .eq('uid', staffId)
      .eq('year', year)
      .maybeSingle()

    if (!error) setApplicantEligibility(data || null)
  }

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return ''
    return dateStr.substring(0, 10)
  }

  const handleProcessApplication = async () => {
    const applicant = selectedBatch.applicant
    const applicantName = applicant.full_name

    const confirmCheck = window.confirm(`Are you sure you want to process the leave application for ${applicantName}?`)
    if (!confirmCheck) return

    setLoading(true)
    let hasError = false

    try {
      for (const item of editingItems) {
        const isApproved = item.status === 'Approved'
        const isRejected = item.status === 'Rejected'

        const payload = { 
          status: item.status,
          processed_by: profile.id, 
          processed_at: new Date().toISOString(),
          needs_hr_review: isApproved,
          leave_type: isRejected ? 'Rejected' : item.leave_type,
          reason: isRejected && rejectReason 
            ? `${item.reason || ''}\n\n[HOD Reject Reason: ${rejectReason}]` 
            : item.reason
        }

        const { error: updateError, count } = await supabase
          .from('leave_applications')
          .update(payload, { count: 'exact' })
          .eq('id', item.id)

        if (updateError) {
          console.error(`Update gagal untuk ID ${item.id}:`, updateError.message)
          hasError = true
          break
        }
        
        if (count === 0) {
          console.error(`Update gagal: 0 baris dikemaskini untuk ID ${item.id}.`);
          alert(`Gagal mengemaskini permohonan ID ${item.id}. Sila pastikan anda mempunyai akses 'UPDATE' di polisi RLS Supabase untuk table leave_applications.`);
          hasError = true
          break
        }
      }

      if (!hasError) {
        const hasApprovedItems = editingItems.some(i => i.status === 'Approved')

        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: applicant.id,
          related_user_id: applicant.id,
          related_created_at: selectedBatch.created_at,
          title: 'Leave Application Processed',
          message: `Your leave request from ${new Date(selectedBatch.created_at).toLocaleDateString()} has been processed by ${profile.full_name}.`,
          type: 'approval'
        });
        if (notifError) console.error('Notification insert failed (applicant):', notifError.message);

        if (hasApprovedItems) {
          const { data: hrStaff, error: hrQueryError } = await supabase.from('profiles').select('id').eq('is_hr', true);
          if (hrQueryError) console.error('HR query failed:', hrQueryError.message);
          else if (hrStaff && hrStaff.length > 0) {
            const hrNotifs = hrStaff.map(hr => ({
              user_id: hr.id,
              related_user_id: applicant.id,
              related_created_at: selectedBatch.created_at,
              title: 'HR Action Required',
              message: `${applicant.full_name}'s leave has been approved by ${profile.full_name}. Please classify as Annual Leave or Unpaid Leave.`,
              type: 'hr_review'
            }));
            const { error: hrNotifError } = await supabase.from('notifications').insert(hrNotifs);
            if (hrNotifError) console.error('Notification insert failed (HR):', hrNotifError.message);
          }
        }

        alert('Application processed successfully!')
        setSelectedBatchId(null)
        fetchPendingApprovals()
        if (onActionSuccess) onActionSuccess()
      } else {
        alert('Terdapat ralat semasa memproses permohonan. Sila semak konsol untuk maklumat lanjut.')
      }
    } catch (err) {
      console.error("Ralat sistem:", err)
      alert(`Ralat tidak dijangka: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const hasRejectedItems = editingItems.some(item => item.status === 'Rejected');
  const allItemsAssigned = editingItems.every(item => item.status === 'Approved' || item.status === 'Rejected');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '20px', width: '100%', height: 'calc(100vh - 150px)' }}>
      
      {/* LEFT COLUMN: BATCH LIST */}
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>📋 Pending Requests</h3>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '5px 0 0 0' }}>{batches.length} total applications</p>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f3f4f6', paddingBottom: '15px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>📄 Request Details</h3>
                <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '13px' }}>Submitted on {new Date(selectedBatch.created_at).toLocaleString()}</p>
              </div>
              {/* Leave statistics cards for applicant context */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* AL Card */}
                <div style={{ padding: '8px 14px', backgroundColor: '#f5f3ff', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
                  <div style={{ fontSize: '9px', color: '#7c3aed', fontWeight: '800', textTransform: 'uppercase', textAlign: 'center', marginBottom: '2px' }}>📅 Annual Leave</div>
                  <div style={{ display: 'flex', marginTop: '2px', gap: '10px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '8px', color: '#6b7280' }}>Elig</div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#7c3aed' }}>{applicantEligibility?.eligibility ?? 0}d</div>
                    </div>
                    <div style={{ borderLeft: '1px solid #ddd6fe', paddingLeft: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '8px', color: '#6b7280' }}>Used</div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#10b981' }}>{((applicantEligibility?.eligibility ?? 0) - (applicantEligibility?.balance ?? 0))}d</div>
                    </div>
                    <div style={{ borderLeft: '1px solid #ddd6fe', paddingLeft: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '8px', color: '#6b7280' }}>Bal.</div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#4f46e5' }}>{applicantEligibility?.balance ?? 0}d</div>
                    </div>
                  </div>
                </div>
                {/* MC Card */}
                <div style={{ padding: '8px 14px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '9px', color: '#1d4ed8', fontWeight: '800', textTransform: 'uppercase', textAlign: 'center', marginBottom: '2px' }}>🤢 Sick Leave (MC)</div>
                  <div style={{ display: 'flex', marginTop: '2px', gap: '10px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '8px', color: '#6b7280' }}>Elig</div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#1d4ed8' }}>{applicantEligibility?.mc_eligibility ?? 0}d</div>
                    </div>
                    <div style={{ borderLeft: '1px solid #bfdbfe', paddingLeft: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '8px', color: '#6b7280' }}>Used</div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#10b981' }}>{((applicantEligibility?.mc_eligibility ?? 0) - (applicantEligibility?.mc_balance ?? 0))}d</div>
                    </div>
                    <div style={{ borderLeft: '1px solid #bfdbfe', paddingLeft: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '8px', color: '#6b7280' }}>Bal.</div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb' }}>{applicantEligibility?.mc_balance ?? 0}d</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Applicant</label>
              <div style={{ fontWeight: '600', color: '#111827' }}>{selectedBatch.applicant?.full_name}</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedBatch.applicant?.position}</div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Reason</label>
              <div style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px', fontSize: '14px', marginTop: '5px', border: '1px solid #e5e7eb' }}>
                {selectedBatch.reason}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>
                Approve or Reject Each Date
              </label>
              
              <div style={{ marginTop: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                {editingItems.map((item, idx) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', borderBottom: idx === selectedBatch.items.length - 1 ? 'none' : '1px solid #f3f4f6', backgroundColor: 'white' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{formatDateDisplay(item.leave_date)}</span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.duration_type} ({item.duration_value})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          const updated = [...editingItems]
                          updated[idx].status = 'Approved'
                          setEditingItems(updated)
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          backgroundColor: item.status === 'Approved' ? '#059669' : '#e5e7eb',
                          color: item.status === 'Approved' ? 'white' : '#374151',
                          transition: 'all 0.15s'
                        }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => {
                          const updated = [...editingItems]
                          updated[idx].status = 'Rejected'
                          updated[idx].leave_type = 'Rejected'
                          setEditingItems(updated)
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          backgroundColor: item.status === 'Rejected' ? '#dc2626' : '#e5e7eb',
                          color: item.status === 'Rejected' ? 'white' : '#374151',
                          transition: 'all 0.15s'
                        }}
                      >
                        ❌ Reject
                      </button>
                    </div>
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
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>Total: {editingItems.reduce((sum, i) => sum + parseFloat(i.duration_value), 0)} Days</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                  {editingItems.filter(i => i.status === 'Approved').length} Approved, {editingItems.filter(i => i.status === 'Rejected').length} Rejected
                </div>
              </div>
              <button 
                onClick={handleProcessApplication} 
                disabled={loading || !allItemsAssigned || (hasRejectedItems && !rejectReason.trim())} 
                style={{ 
                  padding: '10px 24px', 
                  backgroundColor: (loading || !allItemsAssigned || (hasRejectedItems && !rejectReason.trim())) ? '#9ca3af' : '#4f46e5', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: '700', 
                  cursor: (loading || !allItemsAssigned || (hasRejectedItems && !rejectReason.trim())) ? 'not-allowed' : 'pointer' 
                }}
              >
                {loading ? 'Processing...' : 'Process Application'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: DEPARTMENT OVERVIEW */}
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '18px' }}>🏢 Dept. Absence Overview</h3>
          <p style={{ color: '#6b7280', fontSize: '12px', margin: '5px 0 0 0' }}>Comparing applicant dates with colleagues</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!selectedBatch ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: '40px', fontSize: '13px' }}>Select a request to see department availability.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {deptApplications.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#10b981', padding: '20px', fontSize: '13px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bcf0da' }}>
                  ✅ No department overlaps found for these dates.
                </div>
              ) : (
                deptApplications.map((staff) => (
                  <div key={staff.id} style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '1px solid #e5e7eb',
                    backgroundColor: 'white' 
                  }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#111827', marginBottom: '8px' }}>
                      {staff.full_name}
                    </div>
                    
                    {staff.relevant_leaves.map((leave) => (
                      <div key={leave.id} style={{ 
                        marginTop: '6px', 
                        padding: '8px', 
                        borderRadius: '6px', 
                        backgroundColor: leave.status === 'Approved' ? '#ecfdf5' : '#eff6ff',
                        border: '1px solid',
                        borderColor: leave.status === 'Approved' ? '#bcf0da' : '#dbeafe'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#374151' }}>{formatDateDisplay(leave.leave_date)}</span>
                          <span style={{ 
                            fontSize: '9px', 
                            padding: '1px 5px', 
                            borderRadius: '4px', 
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            backgroundColor: leave.status === 'Approved' ? '#059669' : '#2563eb',
                            color: 'white'
                          }}>
                            {leave.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{leave.duration_type}</div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}