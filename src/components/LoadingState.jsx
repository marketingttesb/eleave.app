export function LoadingState({ message = 'Loading...' }) {
  return (
    <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', padding: '20px' }}>
      {message}
    </p>
  )
}

export function EmptyState({ message, icon }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
      {icon && <div style={{ fontSize: '48px', marginBottom: '12px' }}>{icon}</div>}
      <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>{message}</p>
    </div>
  )
}
