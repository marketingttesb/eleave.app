import React, { useState, useEffect } from 'react'
import { format, parseISO, isPast } from 'date-fns'

export default function Dashboard({ supabase, profile }) {
  const [approvedDays, setApprovedDays] = useState(0)
  const [metrics, setMetrics] = useState({ eligibility: 0, balance: 0 })
  const [upcomingPublicHolidays, setUpcomingPublicHolidays] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile) {
      fetchDashboardData()
    }
  }, [profile])

  const fetchDashboardData = async () => {
    setLoading(true)
    const currentYear = new Date().getFullYear()
    
    // 1. Fetch Eligibility and Balance from leave_eligibility table
    const { data: eligData } = await supabase
      .from('leave_eligibility')
      .select('eligibility, balance')
      .eq('uid', profile.id)
      .eq('year', currentYear)
      .maybeSingle()

    if (eligData) {
      setMetrics({
        eligibility: eligData.eligibility,
        balance: eligData.balance
      })
    }

    // Calculate total approved days for the current year
    const { data, error } = await supabase
      .from('leave_applications')
      .select('duration_value')
      .eq('staff_id', profile.id)
      .eq('status', 'Approved')
      .eq('leave_type', 'Annual Leave')
      .gte('leave_date', `${currentYear}-01-01`)
      .lte('leave_date', `${currentYear}-12-31`)

    if (!error && data) {
      const total = data.reduce((sum, item) => sum + parseFloat(item.duration_value), 0)
      setApprovedDays(total)
    }

    // Fetch and filter upcoming public holidays
    const { data: holidaysData, error: holidaysError } = await supabase
      .from('public_holidays')
      .select('holiday_date, holiday_name')
      .gte('holiday_date', `${currentYear}-01-01`)
      .lte('holiday_date', `${currentYear}-12-31`)
      .order('holiday_date', { ascending: true })

    if (!holidaysError && holidaysData) {
      const today = new Date()
      const upcoming = holidaysData.filter(holiday => {
        const holidayDateObj = parseISO(holiday.holiday_date)
        return !isPast(holidayDateObj, { inclusive: true }) // Only show holidays from today onwards
      })
      setUpcomingPublicHolidays(upcoming)
    }

    setLoading(false)
  }

  const cardStyle = { 
    backgroundColor: 'white', 
    padding: '24px', 
    borderRadius: '12px', 
    border: '1px solid #e5e7eb', 
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  }

  const labelStyle = { 
    fontSize: '12px', 
    fontWeight: '700', 
    color: '#6b7280', 
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }

  const valStyle = { 
    margin: 0, 
    fontSize: '36px', 
    fontWeight: '800',
    display: 'flex',
    alignItems: 'baseline'
  }

  const unitStyle = { 
    fontSize: '16px', 
    fontWeight: '500', 
    color: '#9ca3af',
    marginLeft: '6px'
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ margin: 0, color: '#111827', fontSize: '24px', fontWeight: '800' }}>Dashboard Overview</h2>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '15px' }}>
          Hello, <strong>{profile.full_name}</strong>. Here is your leave summary for {new Date().getFullYear()}.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        
        {/* Pill 1: Yearly Eligibility */}
        <div style={cardStyle}>
          <span style={labelStyle}>📅 Yearly Eligibility</span>
          <h1 style={{ ...valStyle, color: '#4f46e5' }}>
            {loading ? '...' : (metrics.eligibility || 0)}
            <span style={unitStyle}>Days</span>
          </h1>
        </div>

        {/* Pill 2: Approved Leave */}
        <div style={cardStyle}>
          <span style={labelStyle}>✅ Approved Leave</span>
          <h1 style={{ ...valStyle, color: '#10b981' }}>
            {loading ? '...' : approvedDays}
            <span style={unitStyle}>Days</span>
          </h1>
        </div>

        {/* Pill 3: Leave Balance */}
        <div style={cardStyle}>
          <span style={labelStyle}>💰 Current Balance</span>
          <h1 style={{ ...valStyle, color: '#f59e0b' }}>
            {loading ? '...' : (metrics.balance || 0)}
            <span style={unitStyle}>Days</span>
          </h1>
        </div>

      </div>

      {/* UPCOMING PUBLIC HOLIDAYS */}
      <div style={{ marginTop: '40px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#4f46e5', fontSize: '20px' }}>🗓️ Upcoming Public Holidays</h3>
        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'white' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Date</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Day</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Holiday Name</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    Loading public holidays...
                  </td>
                </tr>
              ) : upcomingPublicHolidays.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    No upcoming public holidays for this year.
                  </td>
                </tr>
              ) : (
                upcomingPublicHolidays.map((holiday) => (
                  <tr key={holiday.holiday_date} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                      {format(parseISO(holiday.holiday_date), 'dd MMMM yyyy')}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#4b5563' }}>
                      {format(parseISO(holiday.holiday_date), 'EEEE')}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#4b5563' }}>
                      {holiday.holiday_name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}