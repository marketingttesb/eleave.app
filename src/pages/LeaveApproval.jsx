import React, { useState, useEffect } from 'react'

export default function LeaveApproval({ supabase, profile, onActionSuccess }) {
  const [pendingList, setPendingList] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedBatchKey, setSelectedBatchId] = useState(null)
  const [editingItems, setEditingItems] = useState([])
  const [rejectReason, setRejectReason] = useState('')
  const [deptApplications, setDeptApplications] = useState([])

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

  // Fungsi untuk mengira jumlah AL yang dipilih dalam editingItems
  const calculateTotalAL = (items) => {
    return items
      .filter(i => i.leave_type === 'Annual Leave' && i.status !== 'Rejected')
      .reduce((sum, i) => sum + (parseFloat(i.duration_value) || 0), 0)
  }

  // Keep editingItems in sync with selection
  useEffect(() => {
    if (selectedBatch) {
      const currentYear = new Date().getFullYear()
      const balance = selectedBatch.applicant?.leave_eligibility?.find(e => e.year === currentYear)?.balance ?? 0

      const initialItems = selectedBatch.items.map(item => ({
        ...item, 
        status: 'Pending',
        leave_type: '' // Set to empty to force superior selection
      }))
      setEditingItems(initialItems)
      fetchDeptApplications(selectedBatch)
    } else {
      setEditingItems([])
      setRejectReason('')
      setDeptApplications([])
    }
  }, [selectedBatchKey, batches])

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
          department_id,
          leave_eligibility!uid (*)
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

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return ''
    return dateStr.substring(0, 10)
  }

  const handleProcessApplication = async () => {
    const applicant = selectedBatch.applicant
    const applicantName = applicant.full_name
    const currentYear = new Date().getFullYear()
    const applicantElig = (applicant.leave_eligibility || []).find(e => e.year === currentYear)
    
    // Semak jika cuti tahunan diluluskan tetapi rekod kelayakan tidak wujud
    const containsAnnualLeaveApproval = editingItems.some(i => i.status === 'Approved' && i.leave_type === 'Annual Leave')
    if (containsAnnualLeaveApproval && !applicantElig) {
      alert(`Error: Tidak dapat meluluskan Cuti Tahunan. Rekod kelayakan cuti untuk ${applicantName} bagi tahun ${currentYear} tidak ditemui.`)
      return
    }

    const confirmCheck = window.confirm(`Are you sure you want to process the leave application for ${applicantName}?`)
    if (!confirmCheck) return

    setLoading(true)
    let hasError = false

    try {
      // 1. Proses setiap item permohonan secara jujukan untuk kebolehpercayaan dan verifikasi
      for (const item of editingItems) {
        const payload = { 
          status: item.status, 
          leave_type: item.leave_type, 
          processed_by: profile.id, 
          processed_at: new Date().toISOString(),
          // Lampirkan sebab penolakan jika berkaitan
          reason: item.status === 'Rejected' && rejectReason 
            ? `${item.reason || ''}\n\n[HOD Reject Reason: ${rejectReason}]` 
            : item.reason
        }

        // Gunakan count: 'exact' untuk sahkan baris dikemaskini tanpa bergantung pada pemulangan data
        const { error: updateError, count } = await supabase
          .from('leave_applications')
          .update(payload, { count: 'exact' })
          .eq('id', item.id)

        if (updateError) {
          console.error(`Update gagal untuk ID ${item.id}:`, updateError.message)
          hasError = true
          break
        }
        
        // Jika count adalah 0, bermakna polisi RLS UPDATE menghalang perubahan 
        // atau ID tidak ditemui
        if (count === 0) {
          console.error(`Update gagal: 0 baris dikemaskini untuk ID ${item.id}.`);
          alert(`Gagal mengemaskini permohonan ID ${item.id}. Sila pastikan anda mempunyai akses 'UPDATE' di polisi RLS Supabase untuk table leave_applications.`);
          hasError = true
          break
        }
      }

      // 2. Jika semua permohonan berjaya diproses, kemaskini baki cuti jika perlu
      if (!hasError && containsAnnualLeaveApproval && applicantElig) {
        const totalAnnual = editingItems
          .filter(i => i.status === 'Approved' && i.leave_type === 'Annual Leave')
          .reduce((sum, i) => sum + (parseFloat(i.duration_value) || 0), 0)
        
        if (totalAnnual > 0) {
          const newBalance = applicantElig.balance - totalAnnual
          const { error: eligError } = await supabase
            .from('leave_eligibility')
            .update({ balance: newBalance })
            .eq('id', applicantElig.id)
            
          if (eligError) {
            console.error("Gagal mengemaskini baki cuti:", eligError.message)
            alert(`Permohonan diproses, tetapi baki cuti gagal dikemaskini: ${eligError.message}`)
          }
        }
      }

      if (!hasError) {
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
  const allItemsAssigned = editingItems.every(item => item.leave_type !== '' || item.status === 'Rejected');

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
            <div style={{ borderBottom: '2px solid #f3f4f6', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>📄 Request Details</h3>
              <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '13px' }}>Submitted on {new Date(selectedBatch.created_at).toLocaleString()}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Applicant</label>
                <div style={{ fontWeight: '600', color: '#111827' }}>{selectedBatch.applicant?.full_name}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedBatch.applicant?.position}</div>
              </div>
              
              {/* Leave statistics cards for applicant context */}
              {(() => {
                const currentYear = new Date().getFullYear();
                const applicantElig = selectedBatch.applicant?.leave_eligibility?.find(e => e.year === currentYear);
                const usedAL = (applicantElig?.eligibility ?? 0) - (applicantElig?.balance ?? 0);
                const usedMC = (applicantElig?.mc_eligibility ?? 0) - (applicantElig?.mc_balance ?? 0);

                return (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {/* AL Card */}
                    <div style={{ padding: '8px 12px', backgroundColor: '#f5f3ff', borderRadius: '8px', border: '1px solid #ddd6fe', minWidth: '140px' }}>
                      <div style={{ fontSize: '9px', color: '#7c3aed', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>📅 Annual Leave</div>
                      <div style={{ display: 'flex', marginTop: '4px' }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '8px', color: '#6b7280' }}>Used</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>{usedAL}d</div>
                        </div>
                        <div style={{ borderLeft: '1px solid #ddd6fe', paddingLeft: '10px', flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '8px', color: '#6b7280' }}>Bal.</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#4f46e5' }}>{applicantElig?.balance ?? 0}d</div>
                        </div>
                      </div>
                    </div>
                    {/* MC Card */}
                    <div style={{ padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', minWidth: '140px' }}>
                      <div style={{ fontSize: '9px', color: '#1d4ed8', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>🤢 Sick Leave (MC)</div>
                      <div style={{ display: 'flex', marginTop: '4px' }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '8px', color: '#6b7280' }}>Used</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>{usedMC}d</div>
                        </div>
                        <div style={{ borderLeft: '1px solid #bfdbfe', paddingLeft: '10px', flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '8px', color: '#6b7280' }}>Bal.</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#2563eb' }}>{applicantElig?.mc_balance ?? 0}d</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Reason</label>
              <div style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px', fontSize: '14px', marginTop: '5px', border: '1px solid #e5e7eb' }}>
                {selectedBatch.reason}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>
                Assign Leave Type for Each Date
              </label>
              
              {/* Logik pengiraan baki berpusat sebelum render senarai */}
              {(() => {
                const currentYear = new Date().getFullYear();
                const balance = parseFloat(selectedBatch.applicant?.leave_eligibility?.find(e => e.year === currentYear)?.balance ?? 0);
                const totalALUsed = Math.round(calculateTotalAL(editingItems) * 100) / 100;
                const isALFull = totalALUsed >= balance;

                return (
                  <div style={{ marginTop: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    {editingItems.map((item, idx) => {
                      const isALOptionDisabled = isALFull && item.leave_type !== 'Annual Leave';

                      return (
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
                            updated[idx].leave_type = 'Rejected'
                          } else if (val === 'Annual Leave') {
                            // Simulasi jumlah baru sebelum update state
                            const tempItems = updated.map((it, i) => i === idx ? { ...it, leave_type: 'Annual Leave' } : it)
                            const newTotal = Math.round(calculateTotalAL(tempItems) * 100) / 100;
                            
                            if (newTotal > balance) {
                              alert(`❌ ACTION DENIED: Total Annual Leave selected (${newTotal} days) would exceed the staff's current balance of ${balance} days.`);
                              return
                            }

                            if (newTotal === balance) {
                              alert(`📢 INFO: Annual Leave for this staff has been fully utilized (${newTotal}/${balance} days). Any other dates must be assigned as Unpaid Leave or Rejected.`);
                            }

                            updated[idx].status = 'Approved'
                            updated[idx].leave_type = 'Annual Leave'
                          } else if (val === 'Unpaid Leave') {
                            updated[idx].status = 'Approved'
                            updated[idx].leave_type = 'Unpaid Leave'
                          } else {
                            updated[idx].status = 'Pending'
                            updated[idx].leave_type = ''
                          }
                          setEditingItems(updated)
                        }}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          border: '1px solid #d1d5db', 
                          fontSize: '13px', 
                          backgroundColor: item.status === 'Rejected' ? '#fee2e2' : (item.leave_type === 'Unpaid Leave' ? '#fff7ed' : item.leave_type === 'Annual Leave' ? '#ecfdf5' : 'white'),
                          color: item.status === 'Rejected' ? '#b91c1c' : '#111827',
                          fontWeight: (item.status === 'Rejected' || item.leave_type !== '') ? '700' : '400'
                        }}
                      >
                        <option value="">-- Please Select --</option>
                        <option value="Annual Leave" disabled={isALOptionDisabled}>
                          Annual Leave {isALOptionDisabled ? '(Insufficient Balance)' : ''}
                        </option>
                        <option value="Unpaid Leave">Unpaid Leave</option>
                        <option disabled>──────────</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                      );
                    })}
                  </div>
                );
              })()}
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