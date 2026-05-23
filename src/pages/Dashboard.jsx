import React, { useState, useEffect } from 'react'

export default function Dashboard({ supabase, profile }) {
  const [approvedDays, setApprovedDays] = useState(0)
  const [metrics, setMetrics] = useState({ eligibility: 0, balance: 0 })
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
    </div>
  )
}