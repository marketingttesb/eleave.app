export default function StatusBadge({ status, needsHrReview, size = 'sm' }) {
  const pad = size === 'sm' ? '3px 8px' : '4px 10px'
  const fontSize = size === 'sm' ? '11px' : '12px'

  if (needsHrReview) {
    return (
      <span style={{
        fontSize, padding: pad, borderRadius: '10px', fontWeight: '700',
        backgroundColor: '#fef3c7', color: '#d97706'
      }}>
        Needs Classification
      </span>
    )
  }

  const colors = {
    Approved: { bg: '#ecfdf5', color: '#059669' },
    Pending: { bg: '#eff6ff', color: '#2563eb' },
    Rejected: { bg: '#fef2f2', color: '#dc2626' }
  }
  const c = colors[status] || { bg: '#f3f4f6', color: '#6b7280' }

  return (
    <span style={{
      fontSize, padding: pad, borderRadius: '12px', fontWeight: '700',
      backgroundColor: c.bg, color: c.color
    }}>
      {status}
    </span>
  )
}
