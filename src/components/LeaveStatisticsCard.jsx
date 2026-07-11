const colorThemes = {
  annual: {
    bg: '#f5f3ff',
    border: '#ddd6fe',
    text: '#7c3aed',
    balColor: '#4f46e5',
    icon: '📅',
    title: 'Annual Leave'
  },
  sick: {
    bg: '#eff6ff',
    border: '#bfdbfe',
    text: '#1d4ed8',
    balColor: '#2563eb',
    icon: '🤢',
    title: 'Sick Leave (MC)'
  }
}

export default function LeaveStatisticsCard({
  colorVariant = 'annual',
  eligibility = 0,
  eligibilityLabel = 'Elig.',
  used = 0,
  usedLabel = 'Used',
  balance = 0,
  balanceLabel = 'Bal.',
  size = 'full',
  eligibilitySuffix = 'd',
  usedSuffix = 'd',
  balanceSuffix = 'd'
}) {
  const theme = colorThemes[colorVariant] || colorThemes.annual

  const pad = size === 'full' ? '12px 18px' : '8px 14px'
  const titleFont = size === 'full' ? '11px' : '9px'
  const valFont = size === 'full' ? '15px' : '12px'
  const labelFont = size === 'full' ? '9px' : '8px'

  return (
    <div style={{
      padding: pad,
      backgroundColor: theme.bg,
      borderRadius: '10px',
      border: `1px solid ${theme.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: size === 'full' ? '200px' : 'auto'
    }}>
      <div style={{
        fontSize: titleFont, color: theme.text, fontWeight: '800',
        textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center'
      }}>
        {theme.icon} {theme.title}
      </div>
      <div style={{ display: 'flex', marginTop: '2px' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: labelFont, color: '#6b7280', fontWeight: '600' }}>{eligibilityLabel}</div>
          <div style={{ fontSize: valFont, fontWeight: '800', color: '#111827' }}>
            {eligibility}{eligibilitySuffix}
          </div>
        </div>
        <div style={{ borderLeft: `1px solid ${theme.border}`, paddingLeft: '14px', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: labelFont, color: '#6b7280', fontWeight: '600' }}>{usedLabel}</div>
          <div style={{ fontSize: valFont, fontWeight: '800', color: '#10b981' }}>
            {used}{usedSuffix}
          </div>
        </div>
        <div style={{ borderLeft: `1px solid ${theme.border}`, paddingLeft: '14px', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: labelFont, color: '#6b7280', fontWeight: '600' }}>{balanceLabel}</div>
          <div style={{ fontSize: valFont, fontWeight: '800', color: theme.balColor }}>
            {balance}{balanceSuffix}
          </div>
        </div>
      </div>
    </div>
  )
}
