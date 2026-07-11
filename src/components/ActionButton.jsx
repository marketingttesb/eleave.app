const variantStyles = {
  primary: {
    backgroundColor: '#4f46e5', color: 'white', border: 'none'
  },
  secondary: {
    backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db'
  },
  danger: {
    backgroundColor: '#dc2626', color: 'white', border: 'none'
  },
  warning: {
    backgroundColor: '#d97706', color: 'white', border: 'none'
  }
}

export default function ActionButton({
  variant = 'primary',
  disabled = false,
  loading = false,
  loadingText = 'Saving...',
  onClick,
  type = 'button',
  style,
  children
}) {
  const isDisabled = disabled || loading
  const v = variantStyles[variant] || variantStyles.primary

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontWeight: '600',
        fontSize: '13px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        ...v,
        ...(isDisabled ? { opacity: 0.6 } : {}),
        ...style
      }}
    >
      {loading ? loadingText : children}
    </button>
  )
}
