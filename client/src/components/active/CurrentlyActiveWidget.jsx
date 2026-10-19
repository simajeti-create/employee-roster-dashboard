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

const GRID = 'minmax(190px, 2fr) minmax(90px, 1fr) minmax(130px, 1.1fr) minmax(130px, 1.4fr) 120px';

const STATUS_STYLES = {
  'On Shift': { bg: '#E7F6EE', fg: '#13734F', dot: '#1C9A6C', label: 'On shift' },
  'On Break': { bg: '#FBF1DD', fg: '#8A5E0F', dot: '#D79A2C', label: 'On break' },
  'On Leave': { bg: '#FCE8E5', fg: '#B83A2E', dot: '#DC5346', label: 'On leave' },
  Off:        { bg: '#F3F4F6', fg: '#4B5563', dot: '#9CA3AF', label: 'Off today' },
};

export function initials(name) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function avatarGradient(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  const [a, b] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function dateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// S2 when the shift starts at 17:30 or later, otherwise S1 (same rule as the roster grid).
export function shiftCode(startHHMM) {
  const minutes = Number(startHHMM.slice(0, 2)) * 60 + Number(startHHMM.slice(3, 5));
  return minutes >= 17 * 60 + 30 ? 'S2' : 'S1';
}

// Today's shift window for an employee: the saved shift if there is one, otherwise the
// default shift (checking yesterday's start too, so a night shift still counts after midnight).
export function shiftWindow(employee, shift) {
  if (shift?.start_time && shift?.end_time) {
    return {
      start: new Date(shift.start_time.replace(' ', 'T')),
      end: new Date(shift.end_time.replace(' ', 'T')),
      startLabel: shift.start_time.slice(-5),
      endLabel: shift.end_time.slice(-5),
    };
  }
  const { default_shift_start: ds, default_shift_end: de } = employee;
  if (!ds || !de) return null;
  const now = new Date();
  for (const offset of [0, -1]) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    const start = new Date(`${dateStr(day)}T${ds}`);
    const end = new Date(`${dateStr(day)}T${de}`);
    if (end <= start) end.setDate(end.getDate() + 1);
    if (now >= start && now < end) return { start, end, startLabel: ds, endLabel: de };
  }
  const start = new Date(`${dateStr(now)}T${ds}`);
  const end = new Date(`${dateStr(now)}T${de}`);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { start, end, startLabel: ds, endLabel: de };
}

function progressOf(win) {
  if (!win) return null;
  const total = win.end - win.start;
  if (!(total > 0)) return null;
  return Math.max(0, Math.min(1, (Date.now() - win.start) / total));
}

export function StatusPill({ status, leaveType }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.Off;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full"
      style={{ background: s.bg, color: s.fg, padding: '4px 10px', whiteSpace: 'nowrap' }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {status === 'On Leave' && leaveType ? `Leave · ${leaveType}` : s.label}
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

  const headStyle = {
    display: 'grid', gridTemplateColumns: GRID, gap: 16, padding: '0 12px 10px',
    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9ca3af',
    borderBottom: '1px solid #EEECF5',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 760 }}>
        <div style={headStyle}>
          <span>Employee</span>
          <span>Project</span>
          <span>Shift</span>
          <span>Progress</span>
          <span>Status</span>
        </div>

        <ul className="active-list m-0 p-0" style={{ listStyle: 'none' }}>
          {entries.map(({ employee, status }) => {
            const isActive  = status === 'On Shift';
            const shift     = shiftsByEmployeeId?.get(employee.id);
            const leaveType = leavesByEmployeeId?.get(employee.id);
            const win       = status === 'On Leave' || status === 'Off' ? null : shiftWindow(employee, shift);
            const progress  = isActive ? progressOf(win) : null;
            const code      = win ? shiftCode(win.startLabel) : null;

            return (
              <li
                key={employee.id}
                className="active-list-row"
                style={{
                  display: 'grid', gridTemplateColumns: GRID, gap: 16, alignItems: 'center',
                  padding: '12px', borderBottom: '1px solid #F3F1F9',
                }}
                onClick={() => onEmployeeClick?.({ employee, status, shift, leaveType })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEmployeeClick?.({ employee, status, shift, leaveType }); }}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span
                    className={`avatar${isActive ? ' is-active' : ''}`}
                    style={{ background: avatarGradient(employee.name), width: 38, height: 38 }}
                  >
                    {initials(employee.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate" style={{ color: '#1a1a2e' }}>{employee.name}</span>
                    <span className="block text-xs text-gray-400 truncate">{employee.department}</span>
                  </span>
                </span>

                <span className="text-sm text-gray-600 truncate">{employee.project_name || '—'}</span>

                <span>
                  {win ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="font-grotesk text-xs font-bold rounded-md"
                        style={{
                          padding: '2px 7px',
                          background: code === 'S2' ? '#E3E8FB' : '#EEEAFD',
                          color: code === 'S2' ? '#2F3C9E' : '#4A2FC4',
                        }}
                      >
                        {code}
                      </span>
                      <span className="font-mono-data text-xs text-gray-500">{win.startLabel}–{win.endLabel}</span>
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </span>

                <span>
                  {progress !== null ? (
                    <span className="flex items-center gap-2">
                      <span className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: '#F1EFF8' }}>
                        <span className="block h-full rounded-full" style={{ width: `${progress * 100}%`, background: 'linear-gradient(90deg, #6C4CF1, #9B7CFB)' }} />
                      </span>
                      <span className="font-mono-data text-gray-500" style={{ fontSize: 11, width: 32, textAlign: 'right' }}>
                        {Math.round(progress * 100)}%
                      </span>
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </span>

                <span><StatusPill status={status} leaveType={leaveType} /></span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
