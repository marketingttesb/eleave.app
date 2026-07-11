import { toTitleCase } from '../lib/format'
import { labelStyle, inputStyle } from '../lib/styles'
import ModalOverlay from './ModalOverlay'
import ActionButton from './ActionButton'

export default function BulkEditForm({
  isOpen,
  selectedStaffName,
  selectedCount,
  leaveTypes,
  bulkLeaveType,
  bulkStatus,
  loadingAction,
  onLeaveTypeChange,
  onStatusChange,
  onSubmit,
  onCancel
}) {
  if (!isOpen) return null

  return (
    <ModalOverlay isOpen={isOpen} onClose={onCancel} width="420px">
      <h3 style={{ margin: '0 0 6px 0', color: '#111827', fontSize: '18px', fontWeight: '700' }}>
        📦 Bulk Edit Leave Records
      </h3>
      <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 16px 0' }}>
        Employee: <strong>{toTitleCase(selectedStaffName)}</strong> &bull; {selectedCount} record(s) selected
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Leave Type *</label>
          <select
            value={bulkLeaveType}
            onChange={(e) => onLeaveTypeChange(e.target.value)}
            style={{ ...inputStyle, backgroundColor: 'white' }}
            required
          >
            <option value="">-- Select --</option>
            {leaveTypes.map(t => (
              <option key={t.id} value={t.type_name}>{t.type_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Status *</label>
          <select
            value={bulkStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            style={{ ...inputStyle, backgroundColor: 'white' }}
            required
          >
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        <div style={{ backgroundColor: '#fef3c7', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fde68a' }}>
          <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
            ⚠️ This will update all {selectedCount} selected record(s). Balances will be adjusted for Annual Leave / Sick Leave - MC.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <ActionButton variant="secondary" onClick={onCancel} disabled={loadingAction}>
            Cancel
          </ActionButton>
          <ActionButton
            variant="warning"
            type="submit"
            loading={loadingAction}
            loadingText="Updating..."
          >
            Update {selectedCount} Record(s)
          </ActionButton>
        </div>
      </form>
    </ModalOverlay>
  )
}
