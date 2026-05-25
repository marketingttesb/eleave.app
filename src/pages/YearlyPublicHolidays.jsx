import React, { useState, useEffect } from 'react';
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/light.css"; // You can choose different themes
import { format } from "date-fns"; // Useful for parsing dates

export default function YearlyPublicHolidays({ supabase }) {
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // States for filtering
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // States for Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState(null);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');

  const cardStyle = {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    width: '100%',
    boxSizing: 'border-box',
  };

  const inputStyle = {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  };

  useEffect(() => {
    fetchPublicHolidays(selectedYear);
  }, [supabase, selectedYear]);

  const fetchPublicHolidays = async (year) => {
    setActionLoading(true);
    const { data, error } = await supabase
      .from('public_holidays')
      .select('*')
      .gte('holiday_date', `${year}-01-01`)
      .lte('holiday_date', `${year}-12-31`)
      .order('holiday_date', { ascending: true });

    if (error) {
      console.error('Error fetching public holidays:', error.message);
    } else {
      setPublicHolidays(data);
    }
    setActionLoading(false);
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingHolidayId(null);
    setHolidayDate('');
    setHolidayName('');
    setShowModal(true);
  };

  const openEditModal = (holiday) => {
    setIsEditMode(true);
    setEditingHolidayId(holiday.id);
    setHolidayDate(holiday.holiday_date);
    setHolidayName(holiday.holiday_name);
    setShowModal(true);
  };

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    const payload = {
      holiday_date: holidayDate,
      holiday_name: holidayName,
    };

    if (isEditMode) {
      const { error } = await supabase
        .from('public_holidays')
        .update(payload)
        .eq('id', editingHolidayId);

      if (error) {
        alert(`Error updating holiday: ${error.message}`);
      } else {
        alert('Holiday updated successfully!');
        setShowModal(false);
        fetchPublicHolidays(selectedYear);
      }
    } else {
      const { error } = await supabase
        .from('public_holidays')
        .insert([payload]);

      if (error) {
        alert(`Error adding holiday: ${error.message}`);
      } else {
        alert('Holiday added successfully!');
        setShowModal(false);
        fetchPublicHolidays(selectedYear);
      }
    }
    setActionLoading(false);
  };

  const handleDeleteHoliday = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    setActionLoading(true);
    const { error } = await supabase
      .from('public_holidays')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Error deleting holiday: ${error.message}`);
    } else {
      alert('Holiday deleted successfully!');
      fetchPublicHolidays(selectedYear);
    }
    setActionLoading(false);
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  };

  return (
    <div style={cardStyle}>
      {/* HEADER, YEAR FILTER & BUTTON BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>🗓️ Yearly Public Holidays</h3>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '5px 0 0 0' }}>
            Total holidays for {selectedYear}: <strong>{publicHolidays.length} days</strong>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Select Year:</label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: 'white' }}
        >
          {generateYearOptions().map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
          <button
            onClick={openAddModal}
            style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
          >
            ➕ Add New Holiday
          </button>
        </div>
      </div>

      {/* HOLIDAYS TABLE */}
      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'white' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Date</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Holiday Name</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151', textAlign: 'center', width: '180px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {actionLoading && publicHolidays.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                  Loading holidays...
                </td>
              </tr>
            ) : publicHolidays.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                  No public holidays found for {selectedYear}.
                </td>
              </tr>
            ) : (
              publicHolidays.map((holiday) => (
                <tr key={holiday.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>{holiday.holiday_date}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#4b5563' }}>{holiday.holiday_name}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => openEditModal(holiday)}
                        style={{ padding: '6px 10px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#111827', fontWeight: '500' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteHoliday(holiday.id, holiday.holiday_name)}
                        disabled={actionLoading}
                        style={{ padding: '6px 10px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflowY: 'auto', maxHeight: '90vh' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#111827', fontSize: '18px' }}>
              {isEditMode ? '✏️ Edit Public Holiday' : '➕ Add New Public Holiday'}
            </h3>
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 20px 0' }}>
              {isEditMode ? 'Modify holiday details.' : 'Enter details for the new public holiday.'}
            </p>

            <form onSubmit={handleSaveHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                Holiday Date
                <Flatpickr
                  value={holidayDate}
                  onChange={([date]) => {
                    const formatted = date ? format(date, "yyyy-MM-dd") : '';
                    setHolidayDate(formatted);
                  }}
                  options={{
                    dateFormat: "Y-m-d",
                  }}
                  style={inputStyle}
                  required
                  placeholder="Select Date"
                />
              </label>

              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                Holiday Name
                <input
                  type="text"
                  required
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 16px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '10px 16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  {actionLoading ? 'Saving...' : isEditMode ? 'Update Holiday' : 'Add Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}