import { toTitleCase } from '../lib/format'
import { cardStyle } from '../lib/styles'

export default function DeptAbsenceOverview({ selectedBatch, deptApplications, formatDateDisplay }) {
  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '18px' }}>🏢 Dept. Absence Overview</h3>
        <p style={{ color: '#6b7280', fontSize: '12px', margin: '5px 0 0 0' }}>Comparing applicant dates with colleagues</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!selectedBatch ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: '40px', fontSize: '13px' }}>
            Select a request to see department availability.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {deptApplications.length === 0 ? (
              <div style={{
                textAlign: 'center', color: '#10b981', padding: '20px', fontSize: '13px',
                backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bcf0da'
              }}>
                ✅ No department overlaps found for these dates.
              </div>
            ) : (
              deptApplications.map((staff) => (
                <div key={staff.id} style={{
                  padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: 'white'
                }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#111827', marginBottom: '8px' }}>
                    {toTitleCase(staff.full_name)}
                  </div>

                  {staff.relevant_leaves.map((leave) => (
                    <div key={leave.id} style={{
                      marginTop: '6px', padding: '8px', borderRadius: '6px',
                      backgroundColor: leave.status === 'Approved' ? '#ecfdf5' : '#eff6ff',
                      border: '1px solid',
                      borderColor: leave.status === 'Approved' ? '#bcf0da' : '#dbeafe'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#374151' }}>
                          {formatDateDisplay(leave.leave_date)}
                        </span>
                        <span style={{
                          fontSize: '9px', padding: '1px 5px', borderRadius: '4px', fontWeight: '800',
                          textTransform: 'uppercase',
                          backgroundColor: leave.status === 'Approved' ? '#059669' : '#2563eb',
                          color: 'white'
                        }}>
                          {leave.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{leave.duration_type}</div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
