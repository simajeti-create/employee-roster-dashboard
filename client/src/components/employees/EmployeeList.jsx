const AVATAR_GRADIENTS = [
  ['#6C4CF1', '#9B7CFB'],
  ['#2563eb', '#60a5fa'],
  ['#059669', '#34d399'],
  ['#d97706', '#fbbf24'],
  ['#DC5346', '#f87171'],
  ['#0891b2', '#22d3ee'],
  ['#9333ea', '#c084fc'],
  ['#b45309', '#d97706'],
];

function initials(name) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function avatarGradient(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  const [a, b] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

export default function EmployeeList({ employees, onEdit, onDelete, readOnly }) {
  if (employees.length === 0) {
    return (
      <p className="text-gray-400 italic text-sm">
        No employees yet. Add your first one above.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="soft-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Employee ID</th>
            <th>Department</th>
            <th>Role</th>
            <th>Default shift</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>
              <td>
                <div className="flex items-center gap-3">
                  <span
                    className="avatar"
                    style={{ background: avatarGradient(emp.name) }}
                  >
                    {initials(emp.name)}
                  </span>
                  <span className="text-sm font-medium" style={{ color: '#1a1a2e' }}>
                    {emp.name}
                  </span>
                </div>
              </td>
              <td className="text-gray-500 text-sm font-mono-data">{emp.employee_code || '—'}</td>
              <td className="text-gray-500 text-sm">{emp.department}</td>
              <td className="text-gray-500 text-sm">{emp.role}</td>
              <td className="text-sm">
                {emp.default_shift_start && emp.default_shift_end ? (
                  <span className="font-mono-data" style={{ color: '#374151' }}>
                    {emp.default_shift_start}–{emp.default_shift_end}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td>
                <span className={`badge ${emp.employment_status === 'active' ? 'active' : 'inactive'}`}>
                  {emp.employment_status}
                </span>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(emp)}
                    disabled={readOnly}
                    className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(emp)}
                    disabled={readOnly}
                    className="px-3 py-1 rounded-lg text-xs font-medium border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
