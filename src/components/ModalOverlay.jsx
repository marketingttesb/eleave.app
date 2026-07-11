export default function ModalOverlay({ isOpen, onClose, width = '420px', children }) {
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
    }} onClick={() => onClose?.()}>
      <div style={{
        backgroundColor: 'white', padding: '24px', borderRadius: '12px',
        width, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        maxHeight: '90vh', overflowY: 'auto'
      }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
