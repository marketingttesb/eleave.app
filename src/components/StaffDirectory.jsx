import { toTitleCase } from '../lib/format'
import { cardStyle, inputStyle } from '../lib/styles'
import { LoadingState, EmptyState } from './LoadingState'

export default function StaffDirectory({
  staffList,
  filteredStaffList,
  searchQuery,
  selectedDeptId,
  selectedStaffId,
  staffPendingHR,
  loadingStaff,
  departmentList,
  onSearchChange,
  onDeptFilterChange,
  onStaffSelect
}) {
  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{ margin: '0 0 4px 0', color: '#111827', fontSize: '18px', fontWeight: '700' }}>👥 Staff Directory</h3>
      <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 16px 0' }}>Search and select staff to manage leaves</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="🔍 Search name, position..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ ...inputStyle, padding: '8px 12px', fontSize: '13px' }}
        />
        <select
          value={selectedDeptId}
          onChange={(e) => onDeptFilterChange(e.target.value)}
          style={{ ...inputStyle, padding: '8px 12px', fontSize: '13px', backgroundColor: 'white' }}
        >
          <option value="All">All Departments</option>
          {departmentList.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
        {loadingStaff ? (
          <LoadingState message="Loading staff..." />
        ) : filteredStaffList.length === 0 ? (
          <EmptyState message="No staff found" />
        ) : (
          filteredStaffList.map(staff => (
            <StaffListItem
              key={staff.id}
              staff={staff}
              isSelected={selectedStaffId === staff.id}
              pendingHRCount={staffPendingHR[staff.id] || 0}
              onSelect={onStaffSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}

function StaffListItem({ staff, isSelected, pendingHRCount, onSelect }) {
  return (
    <div
      onClick={() => onSelect(staff.id)}
      style={{
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid',
        borderColor: isSelected ? '#4f46e5' : '#e5e7eb',
        backgroundColor: isSelected ? '#f5f3ff' : 'white',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = '#f9fafb'
          e.currentTarget.style.borderColor = '#d1d5db'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'white'
          e.currentTarget.style.borderColor = '#e5e7eb'
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>{toTitleCase(staff.full_name)}</span>
        {pendingHRCount > 0 && (
          <span style={{
            fontSize: '10px', padding: '2px 7px', borderRadius: '10px', fontWeight: '800',
            backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a'
          }}>
            ⚠️ {pendingHRCount}
          </span>
        )}
      </div>
      <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>{staff.position || '—'}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{staff.departments?.name || 'No Dept'}</span>
        <span style={{
          fontSize: '9px', padding: '2px 6px', borderRadius: '10px', fontWeight: '700',
          backgroundColor: staff.staff_status === 'Resigned' ? '#fee2e2' : '#ecfdf5',
          color: staff.staff_status === 'Resigned' ? '#dc2626' : '#059669'
        }}>
          {staff.staff_status || 'Active'}
        </span>
      </div>
    </div>
  )
}
