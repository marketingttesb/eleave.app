import Flatpickr from "react-flatpickr"
import { format } from "date-fns"
import { inputStyle, labelStyle } from '../lib/styles'

export default function DateRangeInput({
  tempRangeStart,
  tempRangeEnd,
  rangeDurationId,
  durations,
  isWeekend,
  publicHolidays,
  onStartChange,
  onEndChange,
  onDurationChange,
  onAdd
}) {
  const pickerOptions = {
    dateFormat: "Y-m-d",
    disable: [(date) => isWeekend(date), ...publicHolidays]
  }

  return (
    <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
        <div>
          <label style={labelStyle}>From Date</label>
          <Flatpickr
            value={tempRangeStart}
            onChange={([date]) => {
              const formatted = date ? format(date, "yyyy-MM-dd") : ''
              onStartChange(formatted)
            }}
            options={pickerOptions}
            style={inputStyle}
            placeholder="From"
          />
        </div>
        <div>
          <label style={labelStyle}>To Date</label>
          <Flatpickr
            value={tempRangeEnd}
            onChange={([date]) => {
              const formatted = date ? format(date, "yyyy-MM-dd") : ''
              onEndChange(formatted)
            }}
            options={pickerOptions}
            style={inputStyle}
            placeholder="To"
          />
        </div>
        <div>
          <label style={labelStyle}>Duration</label>
          <select value={rangeDurationId} onChange={(e) => onDurationChange(e.target.value)} style={inputStyle}>
            {durations.map(d => <option key={d.id} value={d.id}>{d.duration_name}</option>)}
          </select>
        </div>
        <button
          type="button"
          onClick={onAdd}
          style={{
            padding: '10px 20px', backgroundColor: '#059669', color: 'white', border: 'none',
            borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '6px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Add
        </button>
      </div>
    </div>
  )
}
