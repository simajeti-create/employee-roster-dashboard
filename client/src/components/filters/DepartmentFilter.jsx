export default function DepartmentFilter({ departments, value, onChange }) {
  return (
    <select
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 w-auto"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">All departments</option>
      {departments.map((dept) => (
        <option key={dept} value={dept}>{dept}</option>
      ))}
    </select>
  );
}
