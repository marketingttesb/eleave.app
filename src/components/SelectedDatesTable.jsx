export default function SelectedDatesTable({ addedDates, onRemoveDate, formatDateDisplay }) {
  return (
    <div>
      <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>
        Selected Dates
      </label>
      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f3f4f6' }}>
            <tr>
              <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600' }}>Date</th>
              <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600' }}>Duration</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', width: '80px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {addedDates.length === 0 ? (
              <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>No dates selected.</td></tr>
            ) : (
              addedDates.map((item, idx) => (
                <tr key={`${item.date}-${item.durationName}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatDateDisplay(item.date)} ({item.day})</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{item.durationName}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onRemoveDate(item.date, item.durationName)}
                      style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
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
