export default function ApproveRejectRow({ item, idx, editingItems, onStatusChange }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 15px',
      borderBottom: idx === editingItems.length - 1 ? 'none' : '1px solid #f3f4f6',
      backgroundColor: 'white'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{item.leave_date}</span>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.duration_type} ({item.duration_value})</span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onStatusChange(idx, 'Approved')}
          style={{
            padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '12px',
            fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s',
            backgroundColor: item.status === 'Approved' ? '#059669' : '#e5e7eb',
            color: item.status === 'Approved' ? 'white' : '#374151'
          }}
        >
          ✅ Approve
        </button>
        <button
          onClick={() => onStatusChange(idx, 'Rejected')}
          style={{
            padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '12px',
            fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s',
            backgroundColor: item.status === 'Rejected' ? '#dc2626' : '#e5e7eb',
            color: item.status === 'Rejected' ? 'white' : '#374151'
          }}
        >
          ❌ Reject
        </button>
      </div>
    </div>
  )
}
