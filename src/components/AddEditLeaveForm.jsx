import Flatpickr from "react-flatpickr"
import { format } from "date-fns"
import { toTitleCase } from '../lib/format'
import { labelStyle, inputStyle } from '../lib/styles'
import ModalOverlay from './ModalOverlay'
import ActionButton from './ActionButton'

export default function AddEditLeaveForm({
  isOpen,
  modalMode,
  selectedStaffName,
  editingLeave,
  leaveTypes,
  durations,
  formDate,
  formLeaveType,
  formDurationId,
  formStatus,
  formReason,
  loadingAction,
  onDateChange,
  onLeaveTypeChange,
  onDurationChange,
  onStatusChange,
  onReasonChange,
  onSubmit,
  onCancel
}) {
  if (!isOpen) return null

  return (
    <ModalOverlay isOpen={isOpen} onClose={onCancel} width="420px">
      <h3 style={{ margin: '0 0 6px 0', color: '#111827', fontSize: '18px', fontWeight: '700' }}>
        {modalMode === 'add' ? '➕ Add Manual Leave' : '✏️ Edit Leave Application'}
      </h3>
      <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 16px 0' }}>
        Employee: <strong>{toTitleCase(selectedStaffName)}</strong>
      </p>

      {editingLeave?.needs_hr_review === true && (
        <div style={{
          padding: '10px 14px', backgroundColor: '#fffbeb', borderRadius: '8px',
          border: '1px solid #fde68a', marginBottom: '8px'
        }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#92400e' }}>
            ⚠️ This leave needs HR classification. Please set the final leave type.
          </span>
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Leave Date *</label>
          <Flatpickr
            value={formDate}
            onChange={([date]) => {
              const formatted = date ? format(date, "yyyy-MM-dd") : ''
              onDateChange(formatted)
            }}
            options={{ dateFormat: "Y-m-d" }}
            style={inputStyle}
            placeholder="Select Leave Date"
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Leave Type *</label>
          <select
            value={formLeaveType}
            onChange={(e) => onLeaveTypeChange(e.target.value)}
            style={inputStyle}
            required
          >
            {leaveTypes.map(t => (
              <option key={t.id} value={t.type_name}>{t.type_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Duration *</label>
          <select
            value={formDurationId}
            onChange={(e) => onDurationChange(e.target.value)}
            style={inputStyle}
            required
          >
            {durations.map(d => (
              <option key={d.id} value={d.id}>{d.duration_name} ({d.duration_value} day)</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Status *</label>
          <select
            value={formStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            style={inputStyle}
            required
          >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Reason / Remarks</label>
          <textarea
            value={formReason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Enter reason or notes..."
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <ActionButton variant="secondary" onClick={onCancel} disabled={loadingAction}>
            Cancel
          </ActionButton>
          <ActionButton
            variant="primary"
            type="submit"
            loading={loadingAction}
            loadingText="Saving..."
          >
            Save Leave
          </ActionButton>
        </div>
      </form>
    </ModalOverlay>
  )
}
