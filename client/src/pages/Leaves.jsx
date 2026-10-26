import { useEffect, useMemo, useState } from 'react';
import LeaveForm from '../components/leaves/LeaveForm.jsx';
import LeaveList from '../components/leaves/LeaveList.jsx';
import { useCanEdit, VIEW_ONLY_TITLE } from '../context/auth.js';
import ImportLeavesModal from '../components/leaves/ImportLeavesModal.jsx';
import * as leavesApi from '../api/leaves.js';
import * as employeesApi from '../api/employees.js';

export default function Leaves() {
  const canEdit = useCanEdit();
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [showImport, setShowImport] = useState(false);

  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  async function load() {
    setLoading(true);
    const [leavesData, employeesData] = await Promise.all([
      leavesApi.listLeaves({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(employeeFilter ? { employee_id: employeeFilter } : {}),
      }),
      employeesApi.listEmployees(),
    ]);
    setLeaves(leavesData);
    setEmployees(employeesData);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, employeeFilter]);

  async function handleSave(form) {
    if (editing) {
      await leavesApi.updateLeave(editing.id, form);
    } else {
      await leavesApi.createLeave(form);
    }
    setShowForm(false);
    setEditing(null);
    await load();
  }

  async function handleDelete(leave) {
    if (!confirm('Delete this leave record?')) return;
    await leavesApi.deleteLeave(leave.id);
    await load();
  }

  function handleEdit(leave) {
    setEditing(leave);
    setShowForm(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="font-grotesk text-xl font-bold m-0" style={{ color: '#1a1a2e' }}>Leaves</h2>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          <select
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 w-auto"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
          >
            <option value="">All employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <select
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          {!showForm && (
            <>
              <button
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white transition-colors shadow-sm"
              style={{ border: '1px solid #9B7CFB', color: '#6C4CF1' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#EEEAFD'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                onClick={() => setShowImport(true)}
              >
                Import Leaves
              </button>
              <button
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors shadow-sm"
              style={{ background: 'linear-gradient(135deg, #6C4CF1, #9B7CFB)', border: 'none' }}
                onClick={() => { setEditing(null); setShowForm(true); }}
                disabled={!canEdit}
                title={canEdit ? undefined : VIEW_ONLY_TITLE}
              >
                + Add leave
              </button>
            </>
          )}
        </div>
      </div>

      {showImport && (
        <ImportLeavesModal
          onClose={() => setShowImport(false)}
          onImported={load}
        />
      )}

      {showForm && (
        <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E6E4EF' }}>
          <LeaveForm
            employees={employees}
            initial={editing}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E6E4EF' }}>
          <LeaveList
            readOnly={!canEdit}
            leaves={leaves}
            employeesById={employeesById}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}
    </div>
  );
}
