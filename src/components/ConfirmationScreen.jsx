import { toTitleCase } from '../lib/format'
import { labelStyle } from '../lib/styles'
import ActionButton from './ActionButton'

export default function ConfirmationScreen({
  profile,
  addedDates,
  reason,
  loading,
  formatDateDisplay,
  onConfirm,
  onCancel
}) {
  const totalDuration = addedDates.reduce((sum, i) => sum + i.durationValue, 0)

  return (
    <div>
      <div style={{ marginBottom: '25px' }}>
        <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>⚠️ Confirm Leave Application</h3>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '5px 0 0 0' }}>
          Please review your leave request details before final submission.
        </p>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: '20px',
        backgroundColor: '#f9fafb', padding: '25px', borderRadius: '12px',
        border: '1px solid #e5e7eb', marginBottom: '25px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Approver</label>
            <div style={{ fontSize: '15px', color: '#111827', fontWeight: '500' }}>
              {toTitleCase(profile?.superior?.full_name) || 'Not Assigned'}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Total Duration</label>
            <div style={{ fontSize: '18px', color: '#4f46e5', fontWeight: '800' }}>
              {totalDuration} <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>Days</span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
          <label style={labelStyle}>Reason</label>
          <div style={{ fontSize: '15px', color: '#111827', fontWeight: '500' }}>{reason}</div>
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
          <label style={labelStyle}>Date Breakdown</label>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '8px 0', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '8px 0', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Day</th>
                  <th style={{ padding: '8px 0', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {addedDates.map((d, i) => (
                  <tr key={i} style={{ borderBottom: i === addedDates.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{formatDateDisplay(d.date)}</td>
                    <td style={{ padding: '10px 0', fontSize: '14px', color: '#4b5563' }}>{d.day}</td>
                    <td style={{ padding: '10px 0', fontSize: '14px', color: '#4b5563' }}>{d.durationName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <ActionButton variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel & Edit
        </ActionButton>
        <ActionButton variant="primary" onClick={onConfirm} loading={loading} loadingText="Submitting...">
          Confirm & Submit
        </ActionButton>
      </div>
    </div>
  )
}
