import StatusBadge from './StatusBadge'

export default function LeaveTable({
  displayedLeaves,
  selectedLeaveIds,
  loadingHistory,
  showPendingOnly,
  selectedYear,
  onToggleSelectAll,
  onToggleSelection,
  onEditClick,
  onDeleteClick,
  loadingAction
}) {
  const allSelected = displayedLeaves.length > 0 && selectedLeaveIds.size === displayedLeaves.length

  return (
    <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0, zIndex: 1 }}>
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: '12px 12px', fontSize: '12px', fontWeight: '600', color: '#4b5563', width: '40px', textAlign: 'center' }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
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
              const isChecked = selectedLeaveIds.has(leave.id)
              return (
                <tr key={leave.id} style={{
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: isPendingHR ? '#fffbeb' : 'white'
                }}>
                  <td style={{ padding: '12px 12px', textAlign: 'center', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleSelection(leave.id)}
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
                    <StatusBadge
                      status={leave.status}
                      needsHrReview={isPendingHR}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => onEditClick(leave)}
                        disabled={loadingAction}
                        style={{
                          padding: '4px 8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
                          borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: '#1d4ed8', fontWeight: '600'
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => onDeleteClick(leave)}
                        disabled={loadingAction}
                        style={{
                          padding: '4px 8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                          borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: '#dc2626', fontWeight: '600'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
