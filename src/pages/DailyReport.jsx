import React, { useState, useEffect } from 'react'
import Flatpickr from "react-flatpickr"
import "flatpickr/dist/themes/light.css"
import { format } from "date-fns"

export default function DailyReport({ supabase }) {
  const [reportData, setReportData] = useState({})
  const [loading, setLoading] = useState(false)
  
  const today = format(new Date(), "yyyy-MM-dd")
  const [selectedDate, setSelectedDate] = useState(today)

  const cardStyle = { 
    backgroundColor: 'white', 
    padding: '30px', 
    borderRadius: '12px', 
    border: '1px solid #e5e7eb', 
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    width: '100%',
    boxSizing: 'border-box'
  }

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leave_applications')
      .select(`
        *,
        staff:profiles!leave_applications_staff_id_fkey (
          full_name,
          departments ( name )
        )
      `)
      .eq('leave_date', selectedDate)
      .neq('status', 'Rejected')
      .order('created_at', { ascending: true })

    if (error) {
      console.error("Error fetching daily report:", error.message)
    } else {
      const grouped = {}
      data.forEach(item => {
        const dept = item.staff?.departments?.name || 'Unassigned'
        const staff = item.staff?.full_name || 'Unknown Staff'
        
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
      alert("Tiada data untuk dieksport.");
      return;
    }

    try {
      let csv = "Department,Staff,Date,Leave Type,Duration,Duration Value,Status,Reason\n";
      Object.keys(reportData).forEach(dept => {
        Object.keys(reportData[dept]).forEach(staff => {
          reportData[dept][staff].forEach(app => {
            const cleanReason = (app.reason || '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ');
            csv += `"${dept}","${staff}","${app.leave_date}","${app.leave_type}","${app.duration_type}","${app.duration_value}","${app.status}","${cleanReason}"\n`;
          });
        });
      });

      const blob = new Blob(["\uFEFF", csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      link.setAttribute("href", url);
      link.setAttribute("download", `Daily_Leave_Report_${selectedDate}.csv`);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      window.alert(`Laporan Excel telah berjaya dimuat turun ke folder 'Downloads' anda.\n\nNama fail: Daily_Leave_Report_${selectedDate}.csv`);

      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert("Gagal mengeksport fail Excel: " + err.message);
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
          }
          .print-only { display: none; }
        `}
      </style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>📋 Daily Leave Report</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Flatpickr
            value={selectedDate}
            onChange={([date]) => {
              const formatted = date ? format(date, "yyyy-MM-dd") : ''
              setSelectedDate(formatted)
            }}
            options={{ dateFormat: "Y-m-d" }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', width: '130px' }}
          />
          <button onClick={exportExcel} style={{ padding: '8px 14px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Excel (CSV)</button>
          <button onClick={exportPDF} style={{ padding: '8px 14px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Print / PDF</button>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading data...</p>
      ) : Object.keys(reportData).length === 0 ? (
        <div className="no-print" style={{ padding: '50px', textAlign: 'center', color: '#9ca3af', border: '1px dashed #d1d5db', borderRadius: '12px' }}>
          No leave records found for {selectedDate}.
        </div>
      ) : (
        <div id="report-print-area">
          <div className="print-only" style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#4f46e5', margin: 0 }}>Daily Leave Report</h2>
            <p style={{ margin: '5px 0' }}>Date: {selectedDate}</p>
          </div>
          {Object.keys(reportData).map(dept => (
            <div key={dept} className="dept-section" style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
              <div className="dept-title" style={{ backgroundColor: '#f9fafb', padding: '12px 20px', fontWeight: '700', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>
                🏢 Department: {dept}
              </div>
              <div style={{ padding: '0 20px' }}>
                {Object.keys(reportData[dept]).map(staff => (
                  <div key={staff} className="staff-group" style={{ borderBottom: '1px solid #f3f4f6', padding: '20px 0' }}>
                    <div className="staff-name" style={{ fontWeight: '600', color: '#4f46e5', marginBottom: '12px', fontSize: '15px' }}>
                      👤 {staff}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: '#6b7280', borderBottom: '2px solid #f3f4f6' }}>
                          <th style={{ padding: '10px 8px' }}>Leave Type</th>
                          <th style={{ padding: '10px 8px' }}>Duration</th>
                          <th style={{ padding: '10px 8px' }}>Value</th>
                          <th style={{ padding: '10px 8px' }}>Status</th>
                          <th style={{ padding: '10px 8px' }}>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData[dept][staff].map(app => (
                          <tr key={app.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}