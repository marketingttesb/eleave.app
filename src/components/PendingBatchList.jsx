import { toTitleCase } from '../lib/format'

export default function PendingBatchList({
  batches,
  selectedBatchKey,
  loading,
  formatDateDisplay,
  onBatchSelect
}) {
  return (
    <div style={{
      backgroundColor: 'white', padding: '24px', borderRadius: '12px',
      border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>📋 Pending Requests</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '5px 0 0 0' }}>{batches.length} total applications</p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && batches.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>Loading...</p>
        ) : batches.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>No requests found.</p>
        ) : (
          batches.map((batch) => (
            <div
              key={batch.key}
              onClick={() => onBatchSelect(batch.key)}
              style={{
                padding: '15px', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer',
                border: '1px solid',
                borderColor: selectedBatchKey === batch.key ? '#4f46e5' : '#f3f4f6',
                backgroundColor: selectedBatchKey === batch.key ? '#f5f3ff' : 'white',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>
                  {toTitleCase(batch.applicant?.full_name)}
                </span>
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
  )
}
