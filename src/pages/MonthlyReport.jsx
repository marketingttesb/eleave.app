import React, { useState, useEffect } from 'react'

import { toTitleCase } from '../lib/format'
import { cardStyle } from '../lib/styles'

export default function MonthlyReport({ supabase }) {
  const [reportData, setReportData] = useState({})
  const [loading, setLoading] = useState(false)
  
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  useEffect(() => {
    fetchData()
  }, [month, year])

  const fetchData = async () => {
    setLoading(true)
    // Dapatkan tarikh mula dan akhir bulan terpilih
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

    const { data, error } = await supabase
      .from('leave_applications')
      .select(`
        *,
        staff:profiles!leave_applications_staff_id_fkey (
          full_name,
          departments ( name )
        )
      `)
      .gte('leave_date', startDate)
      .lte('leave_date', endDate)
      .neq('status', 'Rejected')
      .order('leave_date', { ascending: true })

    if (error) {
      console.error("Error fetching report:", error.message)
    } else {
      // Grouping data mengikut Department > Staff
      const grouped = {}
      data.forEach(item => {
        const dept = item.staff?.departments?.name || 'Unassigned'
        const staff = toTitleCase(item.staff?.full_name) || 'Unknown Staff'
        
        if (!grouped[dept]) grouped[dept] = {}
        if (!grouped[dept][staff]) grouped[dept][staff] = []
        grouped[dept][staff].push(item)
      })
      setReportData(grouped)
    }
    setLoading(false)
  }

  const exportExcel = () => {
    if (Object.keys(reportData).length === 0) {
      alert("No data to export.");
      return;
    }

    try {
      let csv = "Department,Staff,Date,Leave Type,Duration,Duration Value,Status,Reason\n";
      Object.keys(reportData).forEach(dept => {
        Object.keys(reportData[dept]).forEach(staff => {
          const staffLeaves = reportData[dept][staff];
          
          staffLeaves.forEach(app => {
            const cleanReason = (app.reason || '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ');
            csv += `"${dept}","${staff}","${app.leave_date}","${app.leave_type}","${app.duration_type}","${app.duration_value}","${app.status}","${cleanReason}"\n`;
          });
        });
      });

      // Gunakan BOM untuk memastikan Excel mengenali UTF-8 (support simbol/karakter khas)
      const blob = new Blob(["\uFEFF", csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      link.setAttribute("href", url);
      link.setAttribute("download", `Leave_Report_${months[month-1]}_${year}.csv`);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Notifikasi setelah download bermula, memberitahu lokasi fail
      window.alert(`Excel report has been downloaded to your Downloads folder.\n\nFilename: Leave_Report_${months[month-1]}_${year}.csv`);

      document.body.removeChild(link);
      // Revoke URL selepas sedikit delay untuk memastikan 'Open' sempat diproses
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert("Failed to export Excel file: " + err.message);
    }
  }

  const exportPDF = () => {
    window.print();
  }

  return (
    <div style={cardStyle}>
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #report-print-area, #report-print-area * { visibility: visible; }
            #report-print-area { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .dept-section { border: 1px solid #eee !important; page-break-inside: avoid; }
            .summary-card { border: 1px solid #4f46e5 !important; margin-top: 20px !important; }
          }
          .print-only { display: none; }
        `}
      </style>

      {/* HEADER DENGAN DROPDOWN DI SEBELAH KANAN */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>📈 Monthly Leave Report</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white' }}>
            {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={exportExcel} style={{ padding: '8px 14px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Excel (CSV)</button>
          <button onClick={exportPDF} style={{ padding: '8px 14px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Print / PDF</button>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading data...</p>
      ) : Object.keys(reportData).length === 0 ? (
        <div className="no-print" style={{ padding: '50px', textAlign: 'center', color: '#9ca3af', border: '1px dashed #d1d5db', borderRadius: '12px' }}>
          No leave records found for {months[month-1]} {year}.
        </div>
      ) : (
        <div id="report-print-area">
          <div className="print-only" style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#4f46e5', margin: 0 }}>Monthly Leave Report</h2>
            <p style={{ margin: '5px 0' }}>{months[month-1]} {year}</p>
          </div>
          {Object.keys(reportData).map(dept => (
            <div key={dept} className="dept-section" style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
              <div className="dept-title" style={{ backgroundColor: '#f9fafb', padding: '12px 20px', fontWeight: '700', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>
                🏢 Department: {dept}
              </div>
              <div style={{ padding: '0 20px' }}>
                {Object.keys(reportData[dept]).map(staff => {
                  const staffLeaves = reportData[dept][staff];
                  
                  return (
                    <div key={staff} className="staff-group" style={{ borderBottom: '1px solid #f3f4f6', padding: '20px 0' }}>
                      <div className="staff-name" style={{ fontWeight: '600', color: '#4f46e5', marginBottom: '12px', fontSize: '15px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>👤 {staff}</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', color: '#6b7280', borderBottom: '2px solid #f3f4f6' }}>
                            <th style={{ padding: '10px 8px' }}>Date</th>
                            <th style={{ padding: '10px 8px' }}>Leave Type</th>
                            <th style={{ padding: '10px 8px' }}>Duration</th>
                            <th style={{ padding: '10px 8px' }}>Value</th>
                            <th style={{ padding: '10px 8px' }}>Status</th>
                            <th style={{ padding: '10px 8px' }}>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staffLeaves.map(app => (
                            <tr key={app.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '10px 8px' }}>{app.leave_date}</td>
                              <td style={{ padding: '10px 8px' }}>{app.leave_type}</td>
                              <td style={{ padding: '10px 8px' }}>{app.duration_type}</td>
                              <td style={{ padding: '10px 8px' }}>{app.duration_value}</td>
                              <td style={{ padding: '10px 8px' }}>
                                <span className="status-tag" style={{ 
                                  padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                                  backgroundColor: app.status === 'Approved' ? '#ecfdf5' : app.status === 'Pending' ? '#eff6ff' : '#fef2f2',
                                  color: app.status === 'Approved' ? '#059669' : app.status === 'Pending' ? '#2563eb' : '#dc2626'
                                }}>{app.status}</span>
                              </td>
                              <td style={{ padding: '10px 8px', color: '#6b7280' }}>{app.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}