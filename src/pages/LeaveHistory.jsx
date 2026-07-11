import React, { useState, useEffect } from 'react'
import { cardStyle } from '../lib/styles'

export default function LeaveHistory({ supabase, profile, onActionSuccess }) {
  const [leaveHistory, setLeaveHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchLeaveHistory()
  }, [profile])

  const fetchLeaveHistory = async () => {
    if (!profile) return
    setLoading(true)
    const { data, error } = await supabase
      .from('leave_applications')
      .select('*')
      .eq('staff_id', profile.id)
      .order('leave_date', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (!error) setLeaveHistory(data)
    setLoading(false)
  }

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return ''
    return dateStr.substring(0, 10)
  }

  const handleDelete = async (id, status) => {
    if (status !== 'Pending') return
    const confirmCheck = window.confirm("Are you sure you want to permanently delete this pending leave application?")
    if (!confirmCheck) return

    setLoading(true)
    const { error } = await supabase
      .from('leave_applications')
      .delete()
      .eq('id', id)

    if (error) alert(`Error: ${error.message}`)
    await fetchLeaveHistory()
    if (onActionSuccess) onActionSuccess()
    setLoading(false)
  }

  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>📜 My Leave History</h3>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '5px 0 0 0' }}>Comprehensive list of all your leave requests.</p>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f9fafb' }}>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600' }}>Date</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600' }}>Type</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600' }}>Duration</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600' }}>Reason</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center' }}>Loading...</td></tr>
            ) : leaveHistory.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>No records found.</td></tr>
            ) : (
              leaveHistory.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600' }}>{formatDateDisplay(h.leave_date)}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px' }}>{h.leave_type}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px' }}>{h.duration_type} ({h.duration_value})</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{h.reason || '—'}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{ 
                      fontSize: '11px', padding: '4px 10px', borderRadius: '12px', fontWeight: '700',
                      backgroundColor: h.status === 'Approved' ? '#ecfdf5' : h.status === 'Pending' ? '#eff6ff' : '#fef2f2',
                      color: h.status === 'Approved' ? '#059669' : h.status === 'Pending' ? '#2563eb' : '#dc2626'
                    }}>
                      {h.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {h.status === 'Pending' ? (
                      <button 
                        onClick={() => handleDelete(h.id, h.status)}
                        disabled={loading}
                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
                      >
                        🗑️ Delete
                      </button>
                    ) : (
                      <span style={{ color: '#d1d5db', fontSize: '12px' }}>Locked</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}