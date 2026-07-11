import React, { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { cardStyle } from '../lib/styles'

export default function MyMsg({ supabase, profile, onMarkRead, setActiveMenu }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile?.id) fetchNotifications()
  }, [profile?.id])

  const fetchNotifications = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*') 
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching notifications:', error.message)
    else setNotifications(data || [])
    setLoading(false)
  }

  const markAsRead = async (id) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (!error) {
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
      if (onMarkRead) onMarkRead()
    }
  }

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false)

    if (!error) {
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
      if (onMarkRead) onMarkRead()
    }
  }

  const handleNotificationClick = (n) => {
    // 1. Mark as read if it's new
    if (!n.is_read) {
      markAsRead(n.id)
    }

    // 2. Redirect based on type
    if (!setActiveMenu) return;

    if (n.type === 'application') {
      // If superior receives new application, navigate to Approval page
      setActiveMenu({ 
        page: 'approval', 
        data: { applicantId: n.related_user_id, createdAt: n.related_created_at } 
      });
    } else if (n.type === 'manual_change') {
      // HR actions on leave records always redirect the affected user to their own history
      setActiveMenu('history');
    } else if (n.type === 'approval') {
      // 'Leave Application Processed' — always redirect the applicant to their own history
      setActiveMenu('history');
    } else if (n.type === 'hr_review') {
      // 'HR Action Required' — redirect HR to manage the specific staff's leave
      setActiveMenu({ page: 'manage_personal_leave', data: { staffId: n.related_user_id } });
    }
  }

  const deleteNotification = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) {
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications(notifications.filter(n => n.id !== id));
      if (onMarkRead) onMarkRead(); // Kemaskini badge unread count jika mesej dipadam
    }
    setLoading(false);
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>🔔 My Notifications</h3>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '5px 0 0 0' }}>Latest updates regarding your leave applications.</p>
        </div>
        <button onClick={markAllAsRead} style={{ padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
          Mark all as read
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#9ca3af' }}>Loading messages...</p>
        ) : notifications.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>No notifications found.</p>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => handleNotificationClick(n)}
              style={{ 
                padding: '16px', borderRadius: '10px', border: '1px solid', 
                borderColor: n.is_read ? '#f3f4f6' : '#e0e7ff', 
                backgroundColor: n.is_read ? 'white' : '#f5f7ff', 
                position: 'relative', cursor: 'pointer',
                transition: 'transform 0.1s ease'
              }}
            >
              {!n.is_read && <div style={{ position: 'absolute', top: '16px', right: '16px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '700', fontSize: '14px', color: '#111827', marginBottom: '4px' }}>{n.title}</div>
                <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ef4444', padding: '0 5px', zIndex: 2 }}>🗑️</button>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>{n.message}</p>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#9ca3af' }}>{format(parseISO(n.created_at), 'PPp')}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}