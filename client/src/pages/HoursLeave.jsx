import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import * as reportsApi from '../api/reports.js';
import PeriodSelector, { usePeriod } from '../components/common/PeriodSelector.jsx';
import { PageHeader, StatTile } from '../components/common/InsightBits.jsx';
import { avatarGradient, initials } from '../components/active/CurrentlyActiveWidget.jsx';

const LEAVE_COLORS = {
  sick:   { bg: '#FCE8E5', fg: '#B83A2E' },
  casual: { bg: '#E2F6EC', fg: '#13734F' },
  paid:   { bg: '#E6F0FD', fg: '#1D5BB8' },
  unpaid: { bg: '#F3F4F6', fg: '#4B5563' },
};

const SORTS = [
  { key: 'name',  label: 'Name' },
  { key: 'hours', label: 'Most hours' },
  { key: 'leave', label: 'Most leave' },
];

const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 });

export default function HoursLeave() {
  const period = usePeriod();
  const { start, end, rangeValid } = period;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [sort, setSort] = useState('name');
  const [onlyLeave, setOnlyLeave] = useState(false);

  useEffect(() => {
    if (!rangeValid) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    reportsApi.getRangeSummary({ start, end })
      .then((r) => { if (!cancelled) setData(r); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [start, end, rangeValid]);

  const rows = useMemo(() => data?.summary ?? [], [data]);
  const departments = useMemo(() => [...new Set(rows.map((r) => r.department))].sort(), [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) =>
      (!q || r.name.toLowerCase().includes(q)) &&
      (!department || r.department === department) &&
      (!onlyLeave || r.leave_days > 0)
    );
    const by = {
      name:  (a, b) => a.name.localeCompare(b.name),
      hours: (a, b) => b.hours_worked - a.hours_worked || a.name.localeCompare(b.name),
      leave: (a, b) => b.leave_days - a.leave_days || a.name.localeCompare(b.name),
    }[sort];
    return [...list].sort(by);
  }, [rows, query, department, sort, onlyLeave]);

  const totalHours = visible.reduce((s, r) => s + r.hours_worked, 0);
  const totalLeave = visible.reduce((s, r) => s + r.leave_days, 0);
  const onLeaveCount = visible.filter((r) => r.leave_days > 0).length;
  const maxHours = Math.max(...visible.map((r) => r.hours_worked), 1);

  function exportToExcel() {
    const sheet = XLSX.utils.json_to_sheet(visible.map((r) => ({
      'Employee':        r.name,
      'Department':      r.department,
      'Hours worked':    r.hours_worked,
      'Leave days':      r.leave_days,
      'Leave breakdown': Object.entries(r.leave_breakdown).map(([t, d]) => `${t}: ${d}`).join(', '),
    })));
    sheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Hours & leave');
    XLSX.writeFile(wb, `Hours_Leave_${start}_to_${end}.xlsx`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Hours & leave" subtitle="Hours worked and leave taken by each person for the period you choose." />

      <PeriodSelector period={period} />

      {error && <p className="error-text m-0">{error}</p>}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <StatTile label="People shown" value={visible.length} />
        <StatTile label="Total hours worked" value={fmt(totalHours)} />
        <StatTile label="Total leave days" value={fmt(totalLeave)} />
        <StatTile label="People with leave" value={onLeaveCount} />
      </div>

      <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E6E4EF' }}>
        <div className="flex items-center gap-3 flex-wrap mb-5">
          <input
            type="search"
            placeholder="Search by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 220 }}
          />
          <select value={department} onChange={(e) => setDepartment(e.target.value)} style={{ width: 'auto' }}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 'auto' }} aria-label="Sort by">
            {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600" style={{ margin: 0 }}>
            <input type="checkbox" checked={onlyLeave} onChange={(e) => setOnlyLeave(e.target.checked)} style={{ width: 'auto' }} />
            Only people with leave
          </label>
          <button
            onClick={exportToExcel}
            disabled={visible.length === 0}
            className="ml-auto px-4 py-1.5 rounded-full text-sm font-medium text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #059669, #34d399)', border: 'none' }}
          >
            Export to Excel
          </button>
        </div>

        {!rangeValid ? (
          <p className="text-gray-400 italic text-sm m-0">Choose a valid date range to see the summary.</p>
        ) : loading ? (
          <p className="text-gray-400 text-sm m-0">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-gray-400 italic text-sm m-0">No one matches these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="soft-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th style={{ minWidth: 200 }}>Hours worked</th>
                  <th>Leave days</th>
                  <th>Leave breakdown</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.employee_id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="avatar" style={{ background: avatarGradient(r.name) }}>{initials(r.name)}</span>
                        <span className="text-sm font-medium" style={{ color: '#1a1a2e' }}>{r.name}</span>
                      </div>
                    </td>
                    <td className="text-gray-500 text-sm">{r.department}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: '#F1EFF8' }}>
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${(r.hours_worked / maxHours) * 100}%`, background: 'linear-gradient(90deg, #6C4CF1, #9B7CFB)' }}
                          />
                        </span>
                        <span className="font-mono-data text-sm" style={{ color: '#1a1a2e', width: 52, textAlign: 'right' }}>{fmt(r.hours_worked)}</span>
                      </div>
                    </td>
                    <td className="font-mono-data text-sm" style={{ color: r.leave_days ? '#1a1a2e' : '#9ca3af' }}>{r.leave_days}</td>
                    <td>
                      {Object.keys(r.leave_breakdown).length === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(r.leave_breakdown).map(([type, days]) => {
                            const c = LEAVE_COLORS[type] ?? LEAVE_COLORS.unpaid;
                            return (
                              <span
                                key={type}
                                className="rounded-full text-xs font-semibold"
                                style={{ padding: '3px 10px', background: c.bg, color: c.fg, textTransform: 'capitalize' }}
                              >
                                {type} · {days}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
