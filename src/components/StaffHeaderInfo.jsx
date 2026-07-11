import { toTitleCase } from '../lib/format'
import LeaveStatisticsCard from './LeaveStatisticsCard'

export default function StaffHeaderInfo({
  selectedStaff,
  eligibilityRecord,
  approvedAnnualDays,
  approvedMcDays
}) {
  if (!selectedStaff) return null

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderBottom: '1px solid #f3f4f6', paddingBottom: '16px'
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#111827' }}>
            {toTitleCase(selectedStaff.full_name)}
          </h2>
          <span style={{
            fontSize: '11px',
            backgroundColor: selectedStaff.staff_status === 'Resigned' ? '#fee2e2' : '#ecfdf5',
            color: selectedStaff.staff_status === 'Resigned' ? '#dc2626' : '#059669',
            padding: '3px 8px', borderRadius: '10px', fontWeight: '700'
          }}>
            {selectedStaff.staff_status || 'Active'}
          </span>
        </div>
        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
          {selectedStaff.position} &bull; {selectedStaff.departments?.name || 'No Department'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <LeaveStatisticsCard
          colorVariant="annual"
          eligibility={eligibilityRecord?.eligibility ?? 0}
          used={approvedAnnualDays}
          balance={eligibilityRecord?.balance ?? 0}
        />
        <LeaveStatisticsCard
          colorVariant="sick"
          eligibility={eligibilityRecord?.mc_eligibility ?? 0}
          used={approvedMcDays}
          balance={eligibilityRecord?.mc_balance ?? 0}
        />
      </div>
    </div>
  )
}
