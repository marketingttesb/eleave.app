import ModalOverlay from './ModalOverlay'
import ActionButton from './ActionButton'

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning',
  icon = '⚠️',
  loading = false
}) {
  return (
    <ModalOverlay isOpen={isOpen} onClose={onCancel} width="400px">
      <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px' }}>{icon}</div>
      <h3 style={{
        margin: '0 0 8px 0',
        color: variant === 'danger' ? '#dc2626' : variant === 'warning' ? '#92400e' : '#111827',
        fontSize: '18px', fontWeight: '700', textAlign: 'center'
      }}>
        {title}
      </h3>
      <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', margin: '0 0 20px 0' }}>
        {message}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <ActionButton variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </ActionButton>
        <ActionButton
          variant={variant === 'danger' ? 'danger' : 'warning'}
          onClick={onConfirm}
          loading={loading}
          loadingText="Processing..."
        >
          {confirmLabel}
        </ActionButton>
      </div>
    </ModalOverlay>
  )
}
