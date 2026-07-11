import React, { useState, useEffect } from 'react'
import { isTauri } from '../lib/tauri'
import { cardStyle as baseCardStyle } from '../lib/styles'

export default function SystemSettings() {
  const [autoStart, setAutoStart] = useState(false)
  const [supportsAutostart, setSupportsAutostart] = useState(false)

  useEffect(() => {
    if (!isTauri) return
    const checkAutoStart = async () => {
      try {
        const { isEnabled } = await import('@tauri-apps/plugin-autostart')
        const enabled = await isEnabled()
        setAutoStart(enabled)
        setSupportsAutostart(true)
      } catch (err) {
        console.error('Autostart check failed:', err)
      }
    }
    checkAutoStart()
  }, [])

  const toggleAutoStart = async () => {
    if (!isTauri) return
    try {
      const { enable, disable } = await import('@tauri-apps/plugin-autostart')
      if (autoStart) {
        await disable()
        setAutoStart(false)
      } else {
        await enable()
        setAutoStart(true)
      }
    } catch (err) {
      console.error('Autostart toggle failed:', err)
    }
  }

  const cardStyle = { ...baseCardStyle, maxWidth: '500px', margin: '40px auto', padding: '30px' }

  if (!isTauri || !supportsAutostart) {
    return (
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 10px 0', color: '#4f46e5', fontSize: '20px' }}>System Settings</h3>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>System settings are only available in the desktop app.</p>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 10px 0', color: '#4f46e5', fontSize: '20px' }}>System Settings</h3>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '25px' }}>Configure how the E-Leave application behaves on your computer.</p>
      
      <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '15px', color: '#374151', fontWeight: '600' }}>
          <input type="checkbox" checked={autoStart} onChange={toggleAutoStart} style={{ width: '18px', height: '18px' }} />
          Launch E-Leave automatically when Windows starts
        </label>
        <p style={{ margin: '8px 0 0 30px', fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>
          This is recommended so you can receive real-time notifications for leave approvals and applications even when the app is closed.
        </p>
      </div>
    </div>
  )
}
