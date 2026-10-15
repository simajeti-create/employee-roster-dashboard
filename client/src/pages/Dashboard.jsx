import { useEffect, useMemo, useRef, useState } from 'react';
import DepartmentFilter from '../components/filters/DepartmentFilter.jsx';
import StatusFilter from '../components/filters/StatusFilter.jsx';
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
const STAT_CARDS = [
  { key: 'On Shift', label: 'On shift now',  iconBg: '#EEEAFD', iconColor: '#6C4CF1', IcoComp: IcoBarChart },
  { key: 'On Break', label: 'On break',       iconBg: '#FBF1DD', iconColor: '#D79A2C', IcoComp: IcoClock    },
  { key: 'On Leave', label: 'On leave today', iconBg: '#FCE8E5', iconColor: '#DC5346', IcoComp: IcoCalendar },
];

// ── Count-up animation hook ────────────────────────────────────────
function useCountUp(target) {
  const [display, setDisplay] = useState(0);
  const rafRef  = useRef(null);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to   = target;
    prevRef.current = to;
    if (from === to) return;

    const duration  = 600;
    const startTime = performance.now();

    function tick(now) {
      const p     = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  return display;
}

function StatCard({ label, iconBg, iconColor, IcoComp, count, prefix = '', formatFn }) {
  const display = useCountUp(count);
  const formatted = formatFn ? formatFn(display) : String(display);
  return (
    <div
      className="stat-card bg-white rounded-2xl p-5 flex flex-col gap-3"
      style={{ border: '1px solid #E6E4EF' }}
    >
      <div
        className="stat-icon w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        <IcoComp color={iconColor} />
      </div>
      <div>
        <div className="font-mono-data text-2xl font-bold leading-none" style={{ color: '#1a1a2e' }}>
          {prefix}{formatted}
        </div>
        <div className="text-xs text-gray-400 mt-1.5 font-medium">{label}</div>
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

      {/* ── Greeting header ─────────────────────────────────── */}
      <div>
        <h1 className="font-grotesk text-2xl font-bold m-0" style={{ color: '#1a1a2e' }}>
          {greeting()}, {USER_FIRST}
        </h1>
        <p className="text-sm text-gray-400 mt-1 m-0">
          {todayLabel()} — here&apos;s where the pod stands right now.
        </p>
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <DepartmentFilter departments={departments} value={departmentFilter} onChange={setDepartmentFilter} />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {STAT_CARDS.map(({ key, label, iconBg, iconColor, IcoComp }) => (
          <StatCard
            key={key}
            label={label}
            iconBg={iconBg}
            iconColor={iconColor}
            IcoComp={IcoComp}
            count={counts[key] ?? 0}
          />
        ))}
      </div>

      {/* ── Currently Active ────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E6E4EF' }}>
        <div className="mb-4">
          <h2 className="font-grotesk text-base font-semibold m-0" style={{ color: '#1a1a2e' }}>
            Currently active
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Live shift status, updates automatically</p>
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
