import { useState } from 'react';

const emptyForm = {
  name: '',
  department: '',
  role: '',
  default_shift_start: '',
  default_shift_end: '',
  employment_status: 'active',
  email: '',
  project_name: '',
  employee_code: '',
};

export default function EmployeeForm({ initial, onSave, onCancel }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(
    initial
      ? { ...emptyForm, ...initial, email: initial.email ?? '', project_name: initial.project_name ?? '', employee_code: initial.employee_code ?? '' }
      : emptyForm
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.department || !form.role) {
      setError('Name, department, and role are required.');
      return;
    }
    if (!isEdit && (!form.email || !form.project_name)) {
      setError('Email ID and Project Name are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>Name</label>
        <input value={form.name} onChange={(e) => update('name', e.target.value)} />
      </div>
      <div className="field">
        <label>Employee ID</label>
        <input value={form.employee_code} onChange={(e) => update('employee_code', e.target.value)} />
      </div>
      <div className="field">
        <label>Department</label>
        <input value={form.department} onChange={(e) => update('department', e.target.value)} />
      </div>
      <div className="field">
        <label>Role</label>
        <input value={form.role} onChange={(e) => update('role', e.target.value)} />
      </div>
      <div className="form-row">
        <div className="field">
          <label>Default shift start</label>
          <input
            type="time"
            value={form.default_shift_start || ''}
            onChange={(e) => update('default_shift_start', e.target.value)}
          />
        </div>
        <div className="field">
          <label>Default shift end</label>
          <input
            type="time"
            value={form.default_shift_end || ''}
            onChange={(e) => update('default_shift_end', e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label>Email ID{!isEdit && ' *'}</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          required={!isEdit}
        />
      </div>
      <div className="field">
        <label>Project Name{!isEdit && ' *'}</label>
        <input
          value={form.project_name}
          onChange={(e) => update('project_name', e.target.value)}
        />
      </div>
      <div className="field">
        <label>Employment status</label>
        <select
          value={form.employment_status}
          onChange={(e) => update('employment_status', e.target.value)}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
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
