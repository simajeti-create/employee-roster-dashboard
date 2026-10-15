import { useState } from 'react';

const emptyForm = {
  employee_id: '',
  leave_type: 'sick',
  start_date: '',
  end_date: '',
  status: 'pending',
  reason: '',
};

export default function LeaveForm({ employees, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? { ...emptyForm, ...initial } : emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.employee_id || !form.start_date || !form.end_date) {
      setError('Employee, start date, and end date are required.');
      return;
    }
    if (form.end_date < form.start_date) {
      setError('End date cannot be before start date.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, employee_id: Number(form.employee_id) });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>Employee</label>
        <select value={form.employee_id} onChange={(e) => update('employee_id', e.target.value)}>
          <option value="">Select employee…</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Leave type</label>
        <select value={form.leave_type} onChange={(e) => update('leave_type', e.target.value)}>
          <option value="sick">Sick</option>
          <option value="casual">Casual</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Start date</label>
          <input type="date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} />
        </div>
        <div className="field">
          <label>End date</label>
          <input type="date" value={form.end_date} onChange={(e) => update('end_date', e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Status</label>
        <select value={form.status} onChange={(e) => update('status', e.target.value)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div className="field">
        <label>Reason (optional)</label>
        <textarea rows={2} value={form.reason || ''} onChange={(e) => update('reason', e.target.value)} />
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
