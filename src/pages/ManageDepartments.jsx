import React, { useState, useEffect } from 'react'

export default function ManageDepartments({ supabase }) {
  const [departments, setDepartments] = useState([])
  const [newDeptName, setNewDeptName] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // States untuk fungsi Edit secara Inline
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  // Lebar penuh (Full Width) untuk konsistensi reka bentuk dengan Manage Staff
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
    fetchDepartments()
  }, [])

  // 1. Ambil Senarai Jabatan
  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true })
    
    if (!error) setDepartments(data)
  }

  // 2. Tambah Jabatan Baru
  const handleAddDepartment = async (e) => {
    e.preventDefault()
    if (!newDeptName.trim()) return

    setActionLoading(true)
    const { error } = await supabase
      .from('departments')
      .insert([{ name: newDeptName.trim() }])

    if (error) {
      alert(`Error adding department: ${error.message}`)
    } else {
      setNewDeptName('')
      await fetchDepartments()
    }
    setActionLoading(false)
  }

  // 3. Buka Mod Edit untuk baris tertentu
  const startEdit = (dept) => {
    setEditingId(dept.id)
    setEditingName(dept.name)
  }

  // 4. Batalkan Mod Edit
  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  // 5. Simpan Nama Jabatan yang Diedit (Kini disegerakan dengan refresh skrin)
  const handleUpdateDepartment = async (id) => {
    if (!editingName.trim()) return

    setActionLoading(true)
    const { error } = await supabase
      .from('departments')
      .update({ name: editingName.trim() })
      .eq('id', id)

    if (error) {
      alert(`Error updating department: ${error.message}`)
    } else {
      setEditingId(null)
      setEditingName('')
      await fetchDepartments() // Refresh data terus di skrin secara live
    }
    setActionLoading(false)
  }

  // 6. Padam Jabatan
  const handleDeleteDepartment = async (id, name) => {
    const confirmCheck = window.confirm(`Are you sure you want to delete the "${name}" department? Staf assigned to this department will display as empty and need to be updated manually.`)
    if (!confirmCheck) return

    setActionLoading(true)
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id)

    if (error) {
      alert(`Error deleting department: ${error.message}`)
    } else {
      await fetchDepartments()
    }
    setActionLoading(false)
  }

  return (
    <div style={cardStyle}>
      {/* HEADER PANEL */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '20px' }}>🏢 Manage Corporate Departments</h3>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '5px 0 0 0' }}>
          Total Configured Departments: <strong>{departments.length} sectors</strong>
        </p>
      </div>

      {/* FORM INPUT BAR */}
      <form onSubmit={handleAddDepartment} style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
        <input 
          type="text" 
          placeholder="🔍 Type new department name (e.g., Accounts, Marketing)..." 
          value={newDeptName}
          onChange={(e) => setNewDeptName(e.target.value)}
          required
          style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
        />
        <button 
          type="submit" 
          disabled={actionLoading}
          style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
        >
          ➕ Add Department
        </button>
      </form>

      {/* DIRECTORY TABLE (FULL WIDTH) */}
      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'white' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Department Name</th>
              <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#374151', textAlign: 'center', width: '180px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 ? (
              <tr>
                <td colSpan="2" style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                  No administrative departments configured yet.
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr key={dept.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                    
                    {/* INLINE EDIT INPUT */}
                    {editingId === dept.id ? (
                      <input 
                        type="text" 
                        value={editingName} 
                        onChange={(e) => setEditingName(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #4f46e5', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    ) : (
                      dept.name
                    )}

                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    
                    {/* BUTTON ACTIONS PANEL - CONSISTENT BUTTON STYLES */}
                    {editingId === dept.id ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleUpdateDepartment(dept.id)}
                          disabled={actionLoading}
                          style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                        >
                          Save
                        </button>
                        <button 
                          onClick={cancelEdit}
                          style={{ backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => startEdit(dept)}
                          style={{ padding: '6px 10px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#111827', fontWeight: '500' }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                          disabled={actionLoading}
                          style={{ padding: '6px 10px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}

                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}