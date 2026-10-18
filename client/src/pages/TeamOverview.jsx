import { useEffect, useMemo, useState } from 'react';
import { Card, Legend, PageHeader, StatTile } from '../components/common/InsightBits.jsx';
import * as employeesApi from '../api/employees.js';
import * as leavesApi from '../api/leaves.js';
import { formatDate, todayStr } from '../utils/dateUtils.js';
import { overlapDays } from '../utils/insights.js';

const TYPE_COLORS = { paid: '#6C4CF1', sick: '#DC5346', casual: '#1C9A6C', unpaid: '#D79A2C' };

export default function TeamOverview() {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const qStart = formatDate(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1));
  const qEnd = formatDate(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0));
  const today = todayStr();

  useEffect(() => {
    Promise.all([employeesApi.listEmployees(), leavesApi.listLeaves({ start: qStart, end: qEnd })])
      .then(([e, l]) => { setEmployees(e); setLeaves(l); })
      .finally(() => setLoading(false));
  }, [qStart, qEnd]);

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.employment_status === 'active');
    const onLeaveToday = new Set(
      leaves.filter((l) => l.status === 'approved' && l.start_date <= today && l.end_date >= today).map((l) => l.employee_id)
    ).size;
    const pending = leaves.filter((l) => l.status === 'pending').length;

    const depts = {};
    for (const e of employees) {
      depts[e.department] ??= { active: 0, inactive: 0 };
      depts[e.department][e.employment_status === 'active' ? 'active' : 'inactive'] += 1;
    }

    const types = {};
    for (const l of leaves.filter((x) => x.status === 'approved')) {
      types[l.leave_type] = (types[l.leave_type] || 0) + overlapDays(l.start_date, l.end_date, qStart, qEnd);
    }

    const shifts = {};
    for (const e of active) {
      const key = e.default_shift_start && e.default_shift_end ? `${e.default_shift_start} to ${e.default_shift_end}` : 'No default shift';
      shifts[key] = (shifts[key] || 0) + 1;
    }

    return { active: active.length, onLeaveToday, pending, depts, types, shifts };
  }, [employees, leaves, today, qStart, qEnd]);

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  const deptRows = Object.entries(stats.depts).sort(([, a], [, b]) => b.active + b.inactive - (a.active + a.inactive));
  const deptMax = Math.max(1, ...deptRows.map(([, v]) => v.active + v.inactive));
  const typeRows = Object.entries(stats.types).sort(([, a], [, b]) => b - a);
  const typeTotal = typeRows.reduce((s, [, v]) => s + v, 0);
  const shiftRows = Object.entries(stats.shifts).sort(([, a], [, b]) => b - a);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Team overview" subtitle="Headcount, leave mix and shift patterns at a glance." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <StatTile label="Total employees" value={employees.length} />
        <StatTile label="Active" value={stats.active} />
        <StatTile label="On leave today" value={stats.onLeaveToday} />
        <StatTile label="Pending requests" value={stats.pending} />
      </div>

      <Card title="Headcount by department">
        <div className="mb-3"><Legend items={[{ label: 'Active', color: '#6C4CF1' }, { label: 'Inactive', color: '#D1D5DB' }]} /></div>
        <div className="flex flex-col gap-2">
          {deptRows.map(([name, v]) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 truncate shrink-0" style={{ width: 130 }}>{name}</span>
              <div className="flex-1 flex" style={{ height: 20, gap: 2 }}>
                <div style={{ width: `${(v.active / deptMax) * 100}%`, background: '#6C4CF1', borderRadius: v.inactive ? '999px 0 0 999px' : 999 }} />
                {v.inactive > 0 && <div style={{ width: `${(v.inactive / deptMax) * 100}%`, background: '#D1D5DB', borderRadius: '0 999px 999px 0' }} />}
              </div>
              <span className="font-mono-data text-xs text-gray-700 shrink-0 text-right" style={{ width: 30 }}>{v.active + v.inactive}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title={`Approved leave days by type, ${qStart} to ${qEnd}`}>
        {typeTotal === 0 ? (
          <p className="text-sm text-gray-400 m-0">No approved leave this quarter.</p>
        ) : (
          <>
            <div className="flex" style={{ height: 22, gap: 2 }}>
              {typeRows.map(([t, v]) => (
                <div key={t} title={`${t}: ${v} days`} style={{ width: `${(v / typeTotal) * 100}%`, background: TYPE_COLORS[t] ?? '#9ca3af', borderRadius: 6 }} />
              ))}
            </div>
            <div className="mt-3">
              <Legend items={typeRows.map(([t, v]) => ({ label: `${t} ${v}d (${Math.round((v / typeTotal) * 100)}%)`, color: TYPE_COLORS[t] ?? '#9ca3af' }))} />
            </div>
          </>
        )}
      </Card>

      <Card title="Default shift pattern (active employees)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          {shiftRows.map(([label, n]) => (
            <div key={label} className="rounded-xl p-3" style={{ border: '1px solid #E6E4EF' }}>
              <div className="text-xs text-gray-400">{label}</div>
              <div className="font-grotesk text-lg font-bold" style={{ color: '#1a1a2e' }}>{n}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
