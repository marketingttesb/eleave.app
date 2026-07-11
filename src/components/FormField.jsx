import { inputStyle, labelStyle } from '../lib/styles'

export function Label({ children, required }) {
  return (
    <label style={labelStyle}>
      {children} {required && <span style={{ color: '#dc2626' }}>*</span>}
    </label>
  )
}

export function TextInput({ label, value, onChange, placeholder, required, style }) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{ ...inputStyle, ...style }}
      />
    </div>
  )
}

export function SelectField({ label, value, onChange, required, children, style }) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <select
        value={value}
        onChange={onChange}
        required={required}
        style={{ ...inputStyle, ...style }}
      >
        {children}
      </select>
    </div>
  )
}

export function TextAreaField({ label, value, onChange, placeholder, required, minHeight = '80px', style }) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{ ...inputStyle, minHeight, resize: 'vertical', ...style }}
      />
    </div>
  )
}
