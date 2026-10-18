import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import * as shiftsApi from '../../api/shifts.js';

export default function BulkShiftModal({ employees, defaultStart, defaultEnd, onClose, onSaved }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '');
  const [from, setFrom] = useState(defaultStart);
  const [to, setTo] = useState(defaultEnd);
  const [startTime, setStartTime] = useState(employees[0]?.default_shift_start || '');
  const [endTime, setEndTime] = useState(employees[0]?.default_shift_end || '');
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function pickEmployee(id) {
    setEmployeeId(id);
    const e = employees.find((x) => x.id === Number(id));
    setStartTime(e?.default_shift_start || '');
    setEndTime(e?.default_shift_end || '');
  }

  async function submit(e) {
    e.preventDefault();
    if (!employeeId || !from || !to || !startTime || !endTime) {
      setError('Choose an employee, both dates, and both times.');
      return;
    }
    if (from > to) {
      setError('From date must not be after to date.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await shiftsApi.bulkSetShifts({
        employee_id: Number(employeeId),
        start: from,
        end: to,
        start_time: startTime,
        end_time: endTime,
        include_weekends: includeWeekends,
      });
      await onSaved(result);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="Change shift for a date range" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Employee</label>
          <select value={employeeId} onChange={(e) => pickEmployee(e.target.value)}>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name} · {emp.department}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="field">
            <label>From date</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label>To date</label>
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>New shift start</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="field">
            <label>New shift end</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 mb-3" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={includeWeekends} onChange={(e) => setIncludeWeekends(e.target.checked)} style={{ width: 'auto' }} />
          Include weekends
        </label>
        <p className="text-xs text-gray-400 m-0">
          Days that already have a shift are updated, empty days get a new shift, and approved leave days are skipped.
        </p>
        {error && <p className="error-text">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving…' : 'Apply to range'}</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
