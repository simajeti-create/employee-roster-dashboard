import { useEffect, useState } from 'react';
import * as shiftsApi from '../../api/shifts.js';
import { weekDates, startOfWeek, todayStr } from '../../utils/dateUtils.js';

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
      ? ` · ${shift.start_time}–${shift.end_time}`
      : '';
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: '#E2F6EC', color: '#1C9A6C', whiteSpace: 'nowrap' }}>
        On shift{timeRange}
      </span>
    );
  }
  if (status === 'On Break') {
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: '#FBF1DD', color: '#D79A2C', whiteSpace: 'nowrap' }}>
        On break
      </span>
    );
  }
  if (status === 'On Leave') {
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: '#FCE8E5', color: '#DC5346', whiteSpace: 'nowrap' }}>
        Leave{leaveType ? ` · ${leaveType}` : ''}
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: '#f3f4f6', color: '#6b7280', whiteSpace: 'nowrap' }}>
      Off today
    </span>
  );
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function EmployeeDetailModal({ employee, status, shift, leaveType, weekLeaves, onClose }) {
  const [weekShifts, setWeekShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(true);

  const weekStart = startOfWeek(todayStr());
  const dates = weekDates(weekStart);
  const today = todayStr();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingShifts(true);
      const all = await shiftsApi.listShifts({ start: weekStart, end: dates[6] });
      if (!cancelled) {
        setWeekShifts(all.filter((s) => s.employee_id === employee.id));
        setLoadingShifts(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee.id, weekStart]);

  const employeeWeekLeaves = (weekLeaves || []).filter(
    (l) => l.employee_id === employee.id && l.status !== 'rejected'
  );

  function shiftForDate(date) {
    return weekShifts.find((s) => s.work_date === date);
  }

  function leaveForDate(date) {
    return employeeWeekLeaves.find((l) => l.start_date <= date && l.end_date >= date);
  }

  // close on backdrop click
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  // close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-10"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={handleBackdrop}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-full overflow-y-auto"
        style={{ width: 480, maxHeight: '90vh', border: '1px solid #E6E4EF' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ───────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid #F5F4FA' }}>
          <div className="flex items-center gap-3">
            <span
              className="avatar"
              style={{
                background: avatarGradient(employee.name),
                width: 44, height: 44,
                fontSize: 15,
              }}
            >
              {initials(employee.name)}
            </span>
            <div>
              <h2 className="font-grotesk text-base font-bold m-0" style={{ color: '#1a1a2e' }}>
                {employee.name}
              </h2>
              <p className="text-xs text-gray-400 m-0 mt-0.5">
                {employee.department}{employee.project_name ? ` · ${employee.project_name}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-sm"
            style={{ border: 'none', background: 'transparent', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">

          {/* ── Info rows ─────────────────────────────── */}
          <div className="flex flex-col gap-3">
            {employee.email && (
              <InfoRow label="Email">
                <span className="font-mono-data text-xs" style={{ color: '#374151' }}>
                  {employee.email}
                </span>
              </InfoRow>
            )}
            {employee.role && (
              <InfoRow label="Role">
                <span className="text-sm" style={{ color: '#374151' }}>{employee.role}</span>
              </InfoRow>
            )}
            <InfoRow label="Default shift">
              {employee.default_shift_start && employee.default_shift_end ? (
                <span className="font-mono-data text-xs" style={{ color: '#374151' }}>
                  {employee.default_shift_start}–{employee.default_shift_end}
                </span>
              ) : (
                <span className="text-xs text-gray-400">Not set</span>
              )}
            </InfoRow>
            <InfoRow label="Today's status">
              <StatusPill status={status} shift={shift} leaveType={leaveType} />
            </InfoRow>
          </div>

          {/* ── This week's schedule ──────────────────── */}
          <Section title="This week">
            {loadingShifts ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {dates.map((date, i) => {
                  const s = shiftForDate(date);
                  const l = leaveForDate(date);
                  const isToday = date === today;
                  const dow = new Date(`${date}T00:00:00`).getDay();
                  const isWeekend = dow === 0 || dow === 6;

                  return (
                    <div
                      key={date}
                      className="flex flex-col items-center gap-1 rounded-lg py-2"
                      style={{
                        background: isToday ? '#EEEAFD' : '#F5F4FA',
                        border: isToday ? '1px solid #9B7CFB' : '1px solid transparent',
                        minWidth: 0,
                      }}
                    >
                      <span className="text-xs font-semibold"
                        style={{ color: isToday ? '#6C4CF1' : '#9ca3af' }}>
                        {DAY_LABELS[i]}
                      </span>
                      {l ? (
                        <span className="text-center" style={{ fontSize: 9, color: '#DC5346', lineHeight: 1.3, padding: '0 2px' }}>
                          Leave
                        </span>
                      ) : s ? (
                        <span className="font-mono-data text-center"
                          style={{ fontSize: 9, color: '#374151', lineHeight: 1.3 }}>
                          {s.start_time}–{s.end_time}
                        </span>
                      ) : employee.default_shift_start && !isWeekend ? (
                        <span className="font-mono-data text-center"
                          style={{ fontSize: 9, color: '#9ca3af', lineHeight: 1.3 }}>
                          {employee.default_shift_start}–{employee.default_shift_end}
                        </span>
                      ) : (
                        <span style={{ fontSize: 9, color: '#d1d5db' }}>—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* ── Leave history this week ───────────────── */}
          {employeeWeekLeaves.length > 0 && (
            <Section title="Leave this week">
              <div className="flex flex-col gap-2">
                {employeeWeekLeaves.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <span style={{ color: '#374151' }}>
                      {l.leave_type}
                      <span className="text-gray-400 text-xs ml-2">
                        {l.start_date === l.end_date ? l.start_date : `${l.start_date} – ${l.end_date}`}
                      </span>
                    </span>
                    <span className={`badge ${l.status}`}>{l.status}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 font-medium shrink-0" style={{ width: 96 }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-grotesk text-xs font-semibold uppercase tracking-wider m-0 mb-3"
        style={{ color: '#6C4CF1', letterSpacing: '0.07em' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
