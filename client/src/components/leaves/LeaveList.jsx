function LeaveStatusStepper({ status }) {
  const isApproved = status === 'approved';
  const isPending  = status === 'pending';
  const isRejected = status === 'rejected';

  const step1Color  = isApproved ? '#1C9A6C' : isRejected ? '#DC5346' : '#D79A2C';
  const step2Filled = isApproved;
  const step2Color  = isApproved ? '#1C9A6C' : isRejected ? '#DC5346' : '#D79A2C';
  const labelColor  = step1Color;

  const lineStyle = isApproved
    ? { background: '#1C9A6C' }
    : isRejected
      ? { background: '#DC5346' }
      : {
          background: 'repeating-linear-gradient(90deg, #D79A2C 0, #D79A2C 4px, transparent 4px, transparent 8px)',
        };

  return (
    <div className="leave-stepper">
      {/* Step 1 — always filled (request submitted) */}
      <div
        className="stepper-dot"
        style={{ background: step1Color, color: '#fff' }}
      >
        {isRejected ? '✕' : '✓'}
      </div>

      <div className="stepper-line" style={lineStyle} />

      {/* Step 2 — approval decision */}
      <div
        className="stepper-dot"
        style={
          step2Filled
            ? { background: step2Color, color: '#fff' }
            : {
                border: `2px dashed ${step2Color}`,
                background: 'transparent',
                color: step2Color,
              }
        }
      >
        {isApproved ? '✓' : isRejected ? '✕' : '?'}
      </div>

      <span className="stepper-label" style={{ color: labelColor }}>
        {status}
      </span>
    </div>
  );
}

export default function LeaveList({ leaves, employeesById, onEdit, onDelete, readOnly }) {
  if (leaves.length === 0) {
    return <p className="empty-state">No leave records match the current filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="soft-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Type</th>
            <th>Dates</th>
            <th>Status</th>
            <th>Reason</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {leaves.map((leave) => (
            <tr key={leave.id}>
              <td className="font-medium text-sm" style={{ color: '#1a1a2e' }}>
                {employeesById.get(leave.employee_id)?.name ?? `#${leave.employee_id}`}
              </td>
              <td className="text-gray-500 text-sm">{leave.leave_type}</td>
              <td className="text-sm">
                <span className="font-mono-data text-gray-500">
                  {leave.start_date === leave.end_date
                    ? leave.start_date
                    : `${leave.start_date} → ${leave.end_date}`}
                </span>
              </td>
              <td>
                <LeaveStatusStepper status={leave.status} />
              </td>
              <td className="text-gray-500 text-sm">{leave.reason || '—'}</td>
              <td>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(leave)}
                    disabled={readOnly}
                    className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-1 rounded-lg text-xs font-medium border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                    onClick={() => onDelete(leave)}
                    disabled={readOnly}
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
