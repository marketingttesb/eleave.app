export default function PendingHrBanner({ pendingCount, showPendingOnly, onTogglePendingFilter }) {
  if (pendingCount === 0) return null

  return (
    <div style={{
      padding: '12px 16px', backgroundColor: '#fffbeb', borderRadius: '8px',
      border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    }}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: '#92400e' }}>
        ⚠️ {pendingCount} leave(s) pending HR classification
      </div>
      <button
        onClick={onTogglePendingFilter}
        style={{
          padding: '6px 14px',
          backgroundColor: showPendingOnly ? '#d97706' : 'white',
          color: showPendingOnly ? 'white' : '#92400e',
          border: '1px solid #d97706',
          borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
        }}
      >
        {showPendingOnly ? 'Show All' : 'Show Pending Only'}
      </button>
    </div>
  )
}
