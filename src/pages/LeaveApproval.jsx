import React, { useState, useEffect } from 'react'

import { toTitleCase } from '../lib/format'
import { cardStyle } from '../lib/styles'
import PendingBatchList from '../components/PendingBatchList'
import ApprovalDetailPanel from '../components/ApprovalDetailPanel'
import DeptAbsenceOverview from '../components/DeptAbsenceOverview'

export default function LeaveApproval({ supabase, profile, onActionSuccess, initialApplicantId, initialCreatedAt }) {
  const [pendingList, setPendingList] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedBatchKey, setSelectedBatchId] = useState(null)
  const [editingItems, setEditingItems] = useState([])
  const [rejectReason, setRejectReason] = useState('')
  const [deptApplications, setDeptApplications] = useState([])
  const [applicantEligibility, setApplicantEligibility] = useState(null)

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
  }, [selectedBatchKey])

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
      .neq('id', batch.applicant.id)
      .order('full_name', { ascending: true })

    if (error) {
      console.error("Error fetching dept applications:", error.message)
      return
    }

    const processed = data.map(staff => {
      const allStaffLeaves = staff.leave_applications || []
      const staffBatches = {}

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
    const applicantName = toTitleCase(applicant.full_name)

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
          console.error(`Update failed: 0 rows updated for ID ${item.id}.`);
          alert(`Failed to update application ID ${item.id}. Please ensure you have 'UPDATE' access in the Supabase RLS policy for the leave_applications table.`);
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
          message: `Your leave request from ${new Date(selectedBatch.created_at).toLocaleDateString()} has been processed by ${toTitleCase(profile.full_name)}.`,
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
              message: `${toTitleCase(applicant.full_name)}'s leave has been approved by ${toTitleCase(profile.full_name)}. Please classify as Annual Leave or Unpaid Leave.`,
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
        alert('An error occurred while processing the application. Please check the console for more details.')
      }
    } catch (err) {
      console.error("Ralat sistem:", err)
      alert(`Ralat tidak dijangka: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '20px', width: '100%', height: '100%' }}>

      <PendingBatchList
        batches={batches}
        selectedBatchKey={selectedBatchKey}
        loading={loading}
        formatDateDisplay={formatDateDisplay}
        onBatchSelect={setSelectedBatchId}
      />

      <div style={cardStyle}>
        {!selectedBatch || editingItems.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', color: '#9ca3af'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔍</div>
            <p>Select a request from the left to view details</p>
          </div>
        ) : (
          <ApprovalDetailPanel
            selectedBatch={selectedBatch}
            editingItems={editingItems}
            applicantEligibility={applicantEligibility}
            rejectReason={rejectReason}
            loading={loading}
            onItemStatusChange={(idx, newStatus) => {
              const updated = [...editingItems]
              updated[idx].status = newStatus
              if (newStatus === 'Rejected') {
                updated[idx].leave_type = 'Rejected'
              }
              setEditingItems(updated)
            }}
            onRejectReasonChange={setRejectReason}
            onProcess={handleProcessApplication}
          />
        )}
      </div>

      <DeptAbsenceOverview
        selectedBatch={selectedBatch}
        deptApplications={deptApplications}
        formatDateDisplay={formatDateDisplay}
      />

    </div>
  )
}
