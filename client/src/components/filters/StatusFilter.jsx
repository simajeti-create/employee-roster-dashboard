const STATUSES = ['On Shift', 'On Break', 'On Leave', 'Off'];

export default function StatusFilter({ value, onChange }) {
  return (
    <select
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 w-auto"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">All statuses</option>
      {STATUSES.map((status) => (
        <option key={status} value={status}>{status}</option>
      ))}
    </select>
  );
}
