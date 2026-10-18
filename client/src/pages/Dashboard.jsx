import { useEffect, useMemo, useRef, useState } from 'react';
import DepartmentFilter from '../components/filters/DepartmentFilter.jsx';
import CurrentlyActiveWidget from '../components/active/CurrentlyActiveWidget.jsx';
import EmployeeDetailModal from '../components/active/EmployeeDetailModal.jsx';
import * as employeesApi from '../api/employees.js';
import * as activeApi from '../api/active.js';
import * as shiftsApi from '../api/shifts.js';
import * as leavesApi from '../api/leaves.js';
import { startOfWeek, todayStr, addDays } from '../utils/dateUtils.js';

const ACTIVE_REFRESH_MS = 60000;

// ── Helpers ────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  });
}

// Parse "simajeti" → first name "Sima"
function parseFirstName(email) {
  const prefix = email.split('@')[0];
  if (prefix.length >= 6) {
    return prefix.slice(0, 4).replace(/^./, (c) => c.toUpperCase());
  }
  return prefix.replace(/^./, (c) => c.toUpperCase());
}
const USER_FIRST = parseFirstName('TEAM'); // → "Sima"

// ── Stat card SVG icons ────────────────────────────────────────────
function IcoBarChart({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 17V11M7.5 17V7M12 17V10M16.5 17V4"/>
    </svg>
  );
}
function IcoClock({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="10" cy="10" r="7.5"/>
      <path d="M10 6v4.5l3 2"/>
    </svg>
  );
}
function IcoCalendar({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="3.5" width="15" height="14" rx="2"/>
      <path d="M6.5 2v3M13.5 2v3M2.5 9h15"/>
    </svg>
  );
}
function IcoMoon({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 11.5A7 7 0 1 1 8.5 3.5a5.5 5.5 0 0 0 8 8z"/>
    </svg>
  );
}
const STAT_CARDS = [
  { key: 'On Shift', label: 'On shift now',  iconBg: '#EEEAFD', iconColor: '#6C4CF1', IcoComp: IcoBarChart },
  { key: 'On Break', label: 'On break',       iconBg: '#FBF1DD', iconColor: '#D79A2C', IcoComp: IcoClock    },
  { key: 'On Leave', label: 'On leave today', iconBg: '#FCE8E5', iconColor: '#DC5346', IcoComp: IcoCalendar },
  { key: 'Off',      label: 'Off today',      iconBg: '#F3F4F6', iconColor: '#6B7280', IcoComp: IcoMoon     },
];

const STATUS_CHIPS = [
  { key: '',         label: 'All'      },
  { key: 'On Shift', label: 'On shift' },
  { key: 'On Break', label: 'On break' },
  { key: 'On Leave', label: 'On leave' },
  { key: 'Off',      label: 'Off'      },
];

const MIX_SEGMENTS = [
  { key: 'On Shift', label: 'On shift', color: '#FFFFFF' },
  { key: 'On Break', label: 'On break', color: '#FBD38D' },
  { key: 'On Leave', label: 'On leave', color: '#FCA5A5' },
  { key: 'Off',      label: 'Off',      color: 'rgba(255,255,255,0.28)' },
];

// ── Count-up animation hook ────────────────────────────────────────
function useCountUp(target) {
  const [display, setDisplay] = useState(0);
  const rafRef  = useRef(null);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to   = target;
    if (from === to) return;

    const duration  = 600;
    const startTime = performance.now();

    // prevRef only advances once the animation finishes, so a cancelled run (StrictMode
    // re-mount in dev) restarts from the old value instead of leaving the card stuck at 0.
    function tick(now) {
      const p     = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else prevRef.current = to;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  return display;
}

function StatCard({ label, iconBg, iconColor, IcoComp, count, total = 0, prefix = '', formatFn }) {
  const display = useCountUp(count);
  const formatted = formatFn ? formatFn(display) : String(display);
  const share = total > 0 ? count / total : 0;
  const circumference = 2 * Math.PI * 26;
  return (
    <div
      className="stat-card bg-white rounded-2xl p-5 flex items-center justify-between gap-3"
      style={{ border: '1px solid #ECEAF4', boxShadow: '0 1px 2px rgba(26,26,46,0.04), 0 8px 24px -12px rgba(108,76,241,0.14)' }}
    >
      <div className="min-w-0">
        <div className="text-xs font-medium text-gray-400" style={{ letterSpacing: '0.02em' }}>{label}</div>
        <div className="font-grotesk font-bold leading-none mt-2" style={{ color: '#1a1a2e', fontSize: 36 }}>
          {prefix}{formatted}
        </div>
        <div className="text-xs mt-2" style={{ color: iconColor, fontWeight: 600 }}>
          {total > 0 ? `${Math.round(share * 100)}% of team` : '—'}
        </div>
      </div>
      <div className="stat-icon relative shrink-0" style={{ width: 64, height: 64 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="26" fill="none" stroke={iconBg} strokeWidth="6" />
          <circle
            cx="32" cy="32" r="26" fill="none" stroke={iconColor} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - share)}
            transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <IcoComp color={iconColor} />
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export default function Dashboard() {
  const [employees,       setEmployees]       = useState([]);
  const [activeEntries,   setActiveEntries]   = useState([]);
  const [todayShifts,     setTodayShifts]     = useState([]);
  const [weekLeaves,      setWeekLeaves]       = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter,    setStatusFilter]     = useState('');
  const [loading,         setLoading]          = useState(true);
  const [selectedEntry,   setSelectedEntry]   = useState(null);
  const [now,             setNow]             = useState(() => new Date());

  const weekStart = startOfWeek(todayStr());

  async function loadEmployees() {
    setEmployees(await employeesApi.listEmployees({ employment_status: 'active' }));
  }
  async function loadActive() {
    setActiveEntries(await activeApi.getCurrentlyActive());
  }
  async function loadTodayShifts() {
    const today = todayStr();
    setTodayShifts(await shiftsApi.listShifts({ start: today, end: today }));
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadEmployees(), loadActive(), loadTodayShifts()]);
      setLoading(false);
    })();
    const interval = setInterval(loadActive, ACTIVE_REFRESH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const wEnd = addDays(weekStart, 6);
    leavesApi.listLeaves({ start: weekStart, end: wEnd }).then(setWeekLeaves);
  }, [weekStart]);

  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department))].sort(),
    [employees]
  );

  const filteredActiveEntries = useMemo(
    () => activeEntries.filter((e) => {
      if (departmentFilter && e.employee.department !== departmentFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      return true;
    }),
    [activeEntries, departmentFilter, statusFilter]
  );

  const counts = useMemo(
    () => activeEntries.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {}),
    [activeEntries]
  );

  const shiftsByEmployeeId = useMemo(
    () => new Map(todayShifts.map((s) => [s.employee_id, s])),
    [todayShifts]
  );

  const leavesByEmployeeId = useMemo(() => {
    const today = todayStr();
    const map = new Map();
    weekLeaves.forEach((l) => {
      if (l.start_date <= today && l.end_date >= today && l.status !== 'rejected') {
        map.set(l.employee_id, l.leave_type);
      }
    });
    return map;
  }, [weekLeaves]);

  if (loading) return <p className="text-gray-400 p-2">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Hero banner ─────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #3B2A9E 0%, #5B3DE0 45%, #8B6BF5 100%)', boxShadow: '0 12px 32px -10px rgba(91,61,224,0.45)' }}
      >
        <div aria-hidden="true" style={{ position: 'absolute', right: -60, top: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', right: 120, bottom: -110, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div className="relative">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-grotesk text-2xl font-bold m-0">{greeting()}, {USER_FIRST}</h1>
            <p className="text-sm mt-1 m-0" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {todayLabel()} — here&apos;s where the pod stands right now.
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono-data text-3xl font-bold leading-none">
              {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {activeEntries.length} active employees
            </div>
          </div>
        </div>

        {activeEntries.length > 0 && (
          <div className="mt-5">
            <div className="flex overflow-hidden rounded-full" style={{ height: 8, gap: 2 }}>
              {MIX_SEGMENTS.map(({ key, color }) => (
                counts[key] ? (
                  <div key={key} style={{ width: `${(counts[key] / activeEntries.length) * 100}%`, background: color, transition: 'width 0.6s ease' }} />
                ) : null
              ))}
            </div>
            <div className="flex gap-4 flex-wrap mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {MIX_SEGMENTS.map(({ key, label, color }) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
                  {label} {counts[key] ?? 0}
                </span>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        {STAT_CARDS.map(({ key, label, iconBg, iconColor, IcoComp }) => (
          <StatCard
            key={key}
            label={label}
            iconBg={iconBg}
            iconColor={iconColor}
            IcoComp={IcoComp}
            count={counts[key] ?? 0}
            total={activeEntries.length}
          />
        ))}
      </div>

      {/* ── Currently Active ────────────────────────────────── */}
      <div
        className="bg-white rounded-2xl p-6"
        style={{ border: '1px solid #ECEAF4', boxShadow: '0 1px 2px rgba(26,26,46,0.04), 0 8px 24px -12px rgba(108,76,241,0.14)' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h2 className="font-grotesk text-lg font-semibold m-0" style={{ color: '#1a1a2e' }}>
              Currently active
            </h2>
            <p className="text-xs text-gray-400 mt-1 m-0 flex items-center gap-1.5">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1C9A6C', display: 'inline-block' }} />
              Live · refreshes every minute
            </p>
          </div>
          <DepartmentFilter departments={departments} value={departmentFilter} onChange={setDepartmentFilter} />
        </div>

        <div className="flex gap-2 flex-wrap mb-4" role="tablist" aria-label="Filter by status">
          {STATUS_CHIPS.map(({ key, label }) => {
            const active = statusFilter === key;
            const n = key ? (counts[key] ?? 0) : activeEntries.length;
            return (
              <button
                key={label}
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(key)}
                className="rounded-full text-xs font-semibold"
                style={{
                  padding: '5px 14px',
                  background: active ? '#1a1a2e' : '#fff',
                  color: active ? '#fff' : '#6b7280',
                  borderColor: active ? '#1a1a2e' : '#E6E4EF',
                }}
              >
                {label} <span style={{ opacity: 0.6, marginLeft: 4 }}>{n}</span>
              </button>
            );
          })}
        </div>
        <CurrentlyActiveWidget
          entries={filteredActiveEntries}
          shiftsByEmployeeId={shiftsByEmployeeId}
          leavesByEmployeeId={leavesByEmployeeId}
          onEmployeeClick={setSelectedEntry}
        />
      </div>

      {selectedEntry && (
        <EmployeeDetailModal
          employee={selectedEntry.employee}
          status={selectedEntry.status}
          shift={selectedEntry.shift}
          leaveType={selectedEntry.leaveType}
          weekLeaves={weekLeaves}
          onClose={() => setSelectedEntry(null)}
        />
      )}

    </div>
  );
}
