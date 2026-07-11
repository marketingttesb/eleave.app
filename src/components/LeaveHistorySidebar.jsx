import { toTitleCase } from '../lib/format'
import LeaveStatisticsCard from './LeaveStatisticsCard'
import StatusBadge from './StatusBadge'

export default function LeaveHistorySidebar({
  profile,
  approvedAnnualDays,
  approvedMcDays,
  leaveHistory,
  loading,
  formatDateDisplay,
  onDeleteHistory
}) {
  return (
    <div style={{
      backgroundColor: 'white', padding: '24px', borderRadius: '12px',
      border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      width: '100%', boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' }}>
        <LeaveStatisticsCard
          colorVariant="annual"
          eligibility={profile?.current_eligibility?.eligibility ?? 0}
          used={approvedAnnualDays}
          balance={profile?.current_eligibility?.balance ?? 0}
        />
        <LeaveStatisticsCard
          colorVariant="sick"
          eligibility={profile?.current_eligibility?.mc_eligibility ?? 0}
          used={approvedMcDays}
          balance={profile?.current_eligibility?.mc_balance ?? 0}
        />
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 -24px 25px -24px' }} />

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>📜 Leave History</h3>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '5px 0 0 0' }}>Track your applied dates.</p>
      </div>

      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {leaveHistory.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>No history found.</p>
        ) : (
          leaveHistory.map((h) => (
            <div key={h.id} style={{
              padding: '12px', borderBottom: '1px solid #f3f4f6',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{formatDateDisplay(h.leave_date)}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{h.duration_type} ({h.duration_value})</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {h.status === 'Pending' && (
                  <button
                    onClick={() => onDeleteHistory(h.id, h.status)}
                    disabled={loading}
                    style={{
                      background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer', padding: '4px 6px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    title="Delete Application"
                  >
                    🗑️
                  </button>
                )}
                <StatusBadge status={h.status} size="sm" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
