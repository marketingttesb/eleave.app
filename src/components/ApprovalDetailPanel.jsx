import { toTitleCase } from '../lib/format'
import { labelStyle, smallLabelStyle } from '../lib/styles'
import LeaveStatisticsCard from './LeaveStatisticsCard'
import ApproveRejectRow from './ApproveRejectRow'
import ActionButton from './ActionButton'

export default function ApprovalDetailPanel({
  selectedBatch,
  editingItems,
  applicantEligibility,
  rejectReason,
  loading,
  onItemStatusChange,
  onRejectReasonChange,
  onProcess
}) {
  const hasRejectedItems = editingItems.some(item => item.status === 'Rejected')
  const allItemsAssigned = editingItems.every(item => item.status === 'Approved' || item.status === 'Rejected')
  const totalDays = editingItems.reduce((sum, i) => sum + parseFloat(i.duration_value), 0)
  const approvedCount = editingItems.filter(i => i.status === 'Approved').length
  const rejectedCount = editingItems.filter(i => i.status === 'Rejected').length
  const isDisabled = loading || !allItemsAssigned || (hasRejectedItems && !rejectReason.trim())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        borderBottom: '2px solid #f3f4f6', paddingBottom: '15px'
      }}>
        <div>
          <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>📄 Request Details</h3>
          <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '13px' }}>
            Submitted on {new Date(selectedBatch.created_at).toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <LeaveStatisticsCard
            colorVariant="annual"
            size="mini"
            eligibility={applicantEligibility?.eligibility ?? 0}
            used={((applicantEligibility?.eligibility ?? 0) - (applicantEligibility?.balance ?? 0))}
            balance={applicantEligibility?.balance ?? 0}
          />
          <LeaveStatisticsCard
            colorVariant="sick"
            size="mini"
            eligibility={applicantEligibility?.mc_eligibility ?? 0}
            used={((applicantEligibility?.mc_eligibility ?? 0) - (applicantEligibility?.mc_balance ?? 0))}
            balance={applicantEligibility?.mc_balance ?? 0}
          />
        </div>
      </div>

      <div>
        <label style={smallLabelStyle}>Applicant</label>
        <div style={{ fontWeight: '600', color: '#111827' }}>{toTitleCase(selectedBatch.applicant?.full_name)}</div>
        <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedBatch.applicant?.position}</div>
      </div>

      <div>
        <label style={smallLabelStyle}>Reason</label>
        <div style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px', fontSize: '14px', marginTop: '5px', border: '1px solid #e5e7eb' }}>
          {selectedBatch.reason}
        </div>
      </div>

      <div>
        <label style={smallLabelStyle}>Approve or Reject Each Date</label>
        <div style={{ marginTop: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          {editingItems.map((item, idx) => (
            <ApproveRejectRow
              key={item.id}
              item={item}
              idx={idx}
              editingItems={editingItems}
              onStatusChange={onItemStatusChange}
            />
          ))}
        </div>
      </div>

      {hasRejectedItems && (
        <div>
          <label style={{ ...smallLabelStyle, color: '#dc2626' }}>Rejection Reason (Required)</label>
          <textarea
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder="State why the application is being rejected..."
            style={{
              width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca',
              fontSize: '14px', marginTop: '8px', minHeight: '80px', boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '10px', padding: '15px', backgroundColor: '#f5f3ff', borderRadius: '12px'
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600' }}>Total: {totalDays} Days</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            {approvedCount} Approved, {rejectedCount} Rejected
          </div>
        </div>
        <ActionButton
          variant="primary"
          onClick={onProcess}
          disabled={isDisabled}
          loading={loading}
          loadingText="Processing..."
        >
          Process Application
        </ActionButton>
      </div>
    </div>
  )
}
