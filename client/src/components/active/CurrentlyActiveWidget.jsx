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

function StatusPill({ status, shift, leaveType }) {
  if (status === 'On Shift') {
    const timeRange = shift?.start_time && shift?.end_time
      ? <span className="font-mono-data"> · {shift.start_time}–{shift.end_time}</span>
      : null;
    return (
      <span
        className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
        style={{ background: '#E2F6EC', color: '#1C9A6C', whiteSpace: 'nowrap' }}
      >
        On shift{timeRange}
      </span>
    );
  }
  if (status === 'On Break') {
    return (
      <span
        className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
        style={{ background: '#FBF1DD', color: '#D79A2C', whiteSpace: 'nowrap' }}
      >
        On break
      </span>
    );
  }
  if (status === 'On Leave') {
    return (
      <span
        className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
        style={{ background: '#FCE8E5', color: '#DC5346', whiteSpace: 'nowrap' }}
      >
        Leave{leaveType ? ` · ${leaveType}` : ''}
      </span>
    );
  }
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
      style={{ background: '#f3f4f6', color: '#6b7280', whiteSpace: 'nowrap' }}
    >
      Off today
    </span>
  );
}

export default function CurrentlyActiveWidget({ entries, shiftsByEmployeeId, leavesByEmployeeId, onEmployeeClick }) {
  if (entries.length === 0) {
    return (
      <p className="text-gray-400 italic text-sm py-2">
        No employees match the current filters.
      </p>
    );
  }

  return (
    <ul className="active-list divide-y -mx-1" style={{ borderColor: '#F5F4FA' }}>
      {entries.map(({ employee, status }) => {
        const isActive  = status === 'On Shift';
        const shift     = shiftsByEmployeeId?.get(employee.id);
        const leaveType = leavesByEmployeeId?.get(employee.id);

        return (
          <li
            key={employee.id}
            className="active-list-row flex items-center gap-3 px-1 py-3"
            onClick={() => onEmployeeClick?.({ employee, status, shift, leaveType })}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEmployeeClick?.({ employee, status, shift, leaveType }); }}
          >
            <span
              className={`avatar${isActive ? ' is-active' : ''}`}
              style={{ background: avatarGradient(employee.name), width: 36, height: 36, borderRadius: 9 }}
            >
              {initials(employee.name)}
            </span>

            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold truncate" style={{ color: '#1a1a2e' }}>
                {employee.name}
              </span>
              <span className="block text-xs text-gray-400 truncate">
                {employee.department}
                {employee.project_name ? ` · ${employee.project_name}` : ''}
              </span>
            </span>

            <StatusPill status={status} shift={shift} leaveType={leaveType} />
          </li>
        );
      })}
    </ul>
  );
}
