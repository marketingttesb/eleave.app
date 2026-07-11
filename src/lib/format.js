export function toTitleCase(input) {
  if (!input) return ''
  const lowered = String(input).toLowerCase().trim()
  return lowered
    .split(/\s+/)
    .map(word => {
      if (!word) return word
      if (/^[a-z]/.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      return word
    })
    .join(' ')
}

export function initials(input) {
  if (!input) return '?'
  return toTitleCase(input)
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
