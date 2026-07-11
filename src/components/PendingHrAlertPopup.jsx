import ModalOverlay from './ModalOverlay'
import ActionButton from './ActionButton'

export default function PendingHrAlertPopup({
  isOpen,
  staffName,
  pendingCount,
  onClassify,
  onDismiss
}) {
  if (!isOpen) return null

  return (
    <ModalOverlay isOpen={isOpen} onClose={onDismiss} width="400px">
      <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
      <h3 style={{ margin: '0 0 8px 0', color: '#92400e', fontSize: '18px', fontWeight: '700', textAlign: 'center' }}>
        Pending HR Classification
      </h3>
      <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', margin: '0 0 20px 0' }}>
        <strong>{staffName}</strong> has <strong>{pendingCount}</strong> leave record(s) that need your classification.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <ActionButton variant="secondary" onClick={onDismiss}>
          Dismiss
        </ActionButton>
        <ActionButton variant="warning" onClick={onClassify}>
          Classify Now
        </ActionButton>
      </div>
    </ModalOverlay>
  )
}
