import React, { useState, useEffect } from 'react'
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart'

export default function SystemSettings() {
  const [autoStart, setAutoStart] = useState(false)

  useEffect(() => {
    const checkAutoStart = async () => {
      const enabled = await isEnabled();
      setAutoStart(enabled);
    };
    checkAutoStart();
  }, []);

  const toggleAutoStart = async () => {
    try {
      if (autoStart) {
        await disable();
        setAutoStart(false);
      } else {
        await enable();
        setAutoStart(true);
      }
      localStorage.setItem('autostart_preference_set', 'true');
    } catch (err) {
      console.error("Autostart toggle failed:", err);
    }
  };

  const cardStyle = { 
    backgroundColor: 'white', 
    padding: '30px', 
    borderRadius: '12px', 
    border: '1px solid #e5e7eb', 
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    maxWidth: '500px',
    margin: '40px auto'
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 10px 0', color: '#4f46e5', fontSize: '20px' }}>⚙️ System Settings</h3>
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