import React, { useState } from 'react'
import { cardStyle as baseCardStyle } from '../lib/styles'

export default function UpdatePassword({ supabase }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const cardStyle = { ...baseCardStyle, maxWidth: '400px', margin: '40px auto' }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setNewPassword('')
      setConfirmPassword('')
    }
    setLoading(false)
  }

  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>🔐 Update Password</h3>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '5px 0 0 0' }}>Change your system access credentials.</p>
      </div>

      <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>New Password</label>
          <input 
            type="password" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
            required 
            placeholder="Min 6 characters" 
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} 
          />
        </div>
        <div>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>Confirm New Password</label>
          <input 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
            placeholder="Repeat new password" 
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          style={{ 
            padding: '12px', 
            backgroundColor: loading ? '#9ca3af' : '#4f46e5', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: loading ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold',
            marginTop: '10px'
          }}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      {message.text && (
        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center', 
          fontSize: '14px', 
          color: message.type === 'error' ? '#ef4444' : '#10b981',
          backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
          padding: '10px',
          borderRadius: '6px',
          border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bcf0da'}`
        }}>
          {message.type === 'error' ? '⚠️ ' : '✅ '}{message.text}
        </div>
      )}
    </div>
  )
}