import { useEffect, useState } from 'react';
import EmployeeForm from '../components/employees/EmployeeForm.jsx';
import ImportEmployeesModal from '../components/employees/ImportEmployeesModal.jsx';
import EmployeeList from '../components/employees/EmployeeList.jsx';
import { useCanEdit, VIEW_ONLY_TITLE } from '../context/auth.js';
import * as employeesApi from '../api/employees.js';

export default function Employees() {
  const canEdit = useCanEdit();
  const [employees, setEmployees] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  async function load() {
    setLoading(true);
    setEmployees(await employeesApi.listEmployees());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(form) {
    if (editing) {
      await employeesApi.updateEmployee(editing.id, form);
    } else {
      await employeesApi.createEmployee(form);
    }
    setShowForm(false);
    setEditing(null);
    await load();
  }

  async function handleDelete(employee) {
    if (!confirm(`Delete ${employee.name}? This also removes their shifts, breaks, and leave records.`)) return;
    await employeesApi.deleteEmployee(employee.id);
    await load();
  }

  function handleEdit(employee) {
    setEditing(employee);
    setShowForm(true);
  }

  function handleAddNew() {
    setEditing(null);
    setShowForm(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <h2 className="font-grotesk text-xl font-bold m-0" style={{ color: '#1a1a2e' }}>Employees</h2>
        {!showForm && (
          <button
            className="ml-auto px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{ color: '#6C4CF1', background: '#fff', border: '1px solid #D5CBFB' }}
            onClick={() => setShowImport(true)}
          >
            Import from Excel
          </button>
        )}
        {!showForm && (
          <button
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors shadow-sm"
            style={{ background: 'linear-gradient(135deg, #6C4CF1, #9B7CFB)', border: 'none' }}
            onClick={handleAddNew}
            disabled={!canEdit}
            title={canEdit ? undefined : VIEW_ONLY_TITLE}
          >
            + Add employee
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E6E4EF' }}>
          <EmployeeForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {showImport && <ImportEmployeesModal onClose={() => setShowImport(false)} onImported={load} />}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E6E4EF' }}>
          <EmployeeList employees={employees} onEdit={handleEdit} onDelete={handleDelete} readOnly={!canEdit} />
        </div>
      )}
    </div>
  );
}
