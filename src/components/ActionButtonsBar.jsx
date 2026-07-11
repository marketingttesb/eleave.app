import ActionButton from './ActionButton'

export default function ActionButtonsBar({
  selectedYear,
  years,
  selectedCount,
  onYearChange,
  onAddClick,
  onBulkEditClick,
  loadingAction
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Year:</span>
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(parseInt(e.target.value))}
          style={{
            padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db',
            fontSize: '14px', backgroundColor: 'white', fontWeight: '600'
          }}
        >
          {years.map(yr => (
            <option key={yr} value={yr}>{yr}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {selectedCount > 0 && (
          <>
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>
              {selectedCount} selected
            </span>
            <ActionButton variant="warning" onClick={onBulkEditClick} disabled={loadingAction}>
              📦 Bulk Edit
            </ActionButton>
          </>
        )}
        <ActionButton variant="primary" onClick={onAddClick} disabled={loadingAction}>
          ➕ Add Staff Leave
        </ActionButton>
      </div>
    </div>
  )
}
