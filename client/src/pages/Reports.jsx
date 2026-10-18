import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import * as reportsApi from '../api/reports.js';
import { todayStr, addDays, startOfWeek, formatDate } from '../utils/dateUtils.js';

const MODES = [
  { key: 'week',   label: 'Week'  },
  { key: 'month',  label: 'Month' },
  { key: 'custom', label: 'From – To' },
];

function NsaBarChart({ rows }) {
  const totals = {};
  rows.forEach((r) => {
    totals[r.name] = (totals[r.name] || 0) + (Number(r.total_amount) || 0);
  });
  const entries = Object.entries(totals).sort(([, a], [, b]) => b - a);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="mb-6">
      <h3 className="font-grotesk text-sm font-semibold text-gray-700 mb-3">
        Allowance by Employee
      </h3>
      <div className="flex flex-col gap-2">
        {entries.map(([name, amount]) => (
          <div key={name} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 truncate shrink-0" style={{ width: 120 }}>
              {name}
            </span>
            <div
              className="flex-1 rounded-full overflow-hidden"
              style={{ height: 22, background: '#F5F4FA' }}
            >
              <div
                className="nsa-bar h-full rounded-full"
                style={{
                  width: `${(amount / max) * 100}%`,
                  background: 'linear-gradient(90deg, #6C4CF1 0%, #9B7CFB 100%)',
                  transformOrigin: 'left',
                  minWidth: 4,
                }}
              />
            </div>
            <span
              className="font-mono-data text-xs text-gray-700 shrink-0 text-right"
              style={{ width: 72 }}
            >
              ₹{amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function prettyDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// MM/DD/YYYY, MM/DD/YYYY, … → compact chips; long lists collapse behind a count.
function DateChips({ value }) {
  const dates = value ? value.split(', ') : [];
  const shown = dates.slice(0, 6);
  return (
    <div className="flex flex-wrap gap-1.5" style={{ maxWidth: 420 }}>
      {shown.map((d) => (
        <span key={d} className="font-mono-data rounded-md" style={{ fontSize: 11, padding: '2px 6px', background: '#F5F4FA', color: '#4b5563' }}>
          {d.slice(0, 5)}
        </span>
      ))}
      {dates.length > shown.length && (
        <span className="text-xs text-gray-400" title={dates.join(', ')} style={{ alignSelf: 'center' }}>
          +{dates.length - shown.length} more
        </span>
      )}
    </div>
  );
}

export default function Reports() {
  const [mode, setMode] = useState('week');
  const [anchor, setAnchor] = useState(todayStr());
  const [customStart, setCustomStart] = useState(startOfWeek(todayStr()));
  const [customEnd, setCustomEnd] = useState(addDays(startOfWeek(todayStr()), 6));

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nsaRows, setNsaRows] = useState(null);
  const [nsaLoading, setNsaLoading] = useState(true);

  // The one selection that drives both the summary and the NSA report.
  const { start, end } = useMemo(() => {
    if (mode === 'week') {
      const s = startOfWeek(anchor);
      return { start: s, end: addDays(s, 6) };
    }
    if (mode === 'month') {
      const d = new Date(`${anchor}T00:00:00`);
      return {
        start: formatDate(new Date(d.getFullYear(), d.getMonth(), 1)),
        end: formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
      };
    }
    return { start: customStart, end: customEnd };
  }, [mode, anchor, customStart, customEnd]);

  const rangeValid = Boolean(start && end && start <= end);

  useEffect(() => {
    if (!rangeValid) return undefined;
    let cancelled = false;
    setLoading(true);
    setNsaLoading(true);
    Promise.all([
      reportsApi.getRangeSummary({ start, end }),
      reportsApi.getNsaReport({ start, end }),
    ]).then(([summary, nsa]) => {
      if (cancelled) return;
      setData(summary);
      setNsaRows(nsa);
      setLoading(false);
      setNsaLoading(false);
    });
    return () => { cancelled = true; };
  }, [start, end, rangeValid]);

  function step(direction) {
    if (mode === 'week') {
      setAnchor((d) => addDays(d, 7 * direction));
    } else {
      setAnchor((d) => {
        const x = new Date(`${d}T00:00:00`);
        return formatDate(new Date(x.getFullYear(), x.getMonth() + direction, 1));
      });
    }
  }

  function exportToExcel() {
    const sheetData = nsaRows.map((r) => ({
      'Email ID':             r.email_id,
      'Name':                 r.name,
      'Project Name':         r.project_name,
      'Type of Allowance':    r.type_of_allowance,
      'Total Amount (INR)':   r.total_amount,
      'Date Worked':          r.date_worked,
    }));
    const sheet = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'NSA');
    XLSX.writeFile(wb, `NSA_Report_${start}_to_${end}.xlsx`);
  }

  const label = mode === 'month'
    ? new Date(`${start}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : rangeValid ? `${prettyDate(start)} – ${prettyDate(end)}` : 'Pick a valid range';

  const totalAmount = (nsaRows ?? []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-grotesk text-2xl font-bold m-0" style={{ color: '#1a1a2e' }}>Reports</h1>
        <p className="text-sm text-gray-400 mt-1 m-0">Hours, leave and night shift allowance for the period you choose.</p>
      </div>

      {/* Period selector */}
      <div className="bg-white rounded-2xl p-5 flex items-center gap-4 flex-wrap" style={{ border: '1px solid #E6E4EF' }}>
        <div className="flex rounded-full p-1" style={{ background: '#F5F4FA' }} role="tablist" aria-label="Report period">
          {MODES.map(({ key, label: l }) => (
            <button
              key={key}
              role="tab"
              aria-selected={mode === key}
              onClick={() => setMode(key)}
              className="rounded-full text-sm font-semibold"
              style={{
                border: 'none',
                padding: '6px 18px',
                background: mode === key ? 'linear-gradient(135deg, #6C4CF1, #9B7CFB)' : 'transparent',
                color: mode === key ? '#fff' : '#6b7280',
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {mode !== 'custom' ? (
          <div className="flex items-center gap-2">
            <button onClick={() => step(-1)} aria-label={`Previous ${mode}`} className="rounded-full" style={{ padding: '6px 14px' }}>←</button>
            <span className="font-grotesk text-sm font-semibold" style={{ color: '#1a1a2e', minWidth: 210, textAlign: 'center' }}>{label}</span>
            <button onClick={() => step(1)} aria-label={`Next ${mode}`} className="rounded-full" style={{ padding: '6px 14px' }}>→</button>
            <button
              onClick={() => setAnchor(todayStr())}
              className="rounded-full text-sm font-medium"
              style={{ color: '#6C4CF1', borderColor: '#D5CBFB', background: '#EEEAFD' }}
            >
              {mode === 'week' ? 'This week' : 'This month'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">From</span>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ width: 'auto' }} />
            <span className="text-sm text-gray-500">To</span>
            <input type="date" value={customEnd} min={customStart} onChange={(e) => setCustomEnd(e.target.value)} style={{ width: 'auto' }} />
            {!rangeValid && <span className="text-sm" style={{ color: '#DC5346' }}>From date must be on or before the to date.</span>}
          </div>
        )}
      </div>

      {/* Summary */}
      <h2 className="font-grotesk text-xl font-bold m-0" style={{ color: '#1a1a2e' }}>
        Hours &amp; leave summary
      </h2>
      <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E6E4EF' }}>
        {!rangeValid ? (
          <p className="text-gray-400 italic text-sm m-0">Choose a valid date range to see the summary.</p>
        ) : loading || !data ? (
          <p className="text-gray-400 text-sm m-0">Loading…</p>
        ) : data.summary.length === 0 ? (
          <p className="text-gray-400 italic text-sm m-0">No employees to report on yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="soft-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Hours worked</th>
                  <th>Leave days</th>
                  <th>Leave breakdown</th>
                </tr>
              </thead>
              <tbody>
                {data.summary.map((row) => (
                  <tr key={row.employee_id}>
                    <td className="font-medium" style={{ color: '#1a1a2e' }}>{row.name}</td>
                    <td className="text-gray-500">{row.department}</td>
                    <td className="font-mono-data" style={{ color: '#1a1a2e' }}>{row.hours_worked}</td>
                    <td className="font-mono-data" style={{ color: '#1a1a2e' }}>{row.leave_days}</td>
                    <td className="text-gray-500">
                      {Object.entries(row.leave_breakdown).length === 0
                        ? '—'
                        : Object.entries(row.leave_breakdown)
                            .map(([type, days]) => `${type}: ${days}`)
                            .join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NSA section */}
      <h2 className="font-grotesk text-xl font-bold m-0" style={{ color: '#1a1a2e' }}>
        Night Shift Allowance (NSA)
      </h2>
      <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E6E4EF' }}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <p className="text-sm text-gray-500 m-0">
              Shifts starting at or after 5:30 PM — ₹900 per qualifying day.
            </p>
            {rangeValid && nsaRows && nsaRows.length > 0 && (
              <p className="text-sm m-0 mt-1" style={{ color: '#1a1a2e' }}>
                <strong>₹{totalAmount.toLocaleString()}</strong>
                <span className="text-gray-400"> across {nsaRows.length} employee{nsaRows.length === 1 ? '' : 's'} · {label}</span>
              </p>
            )}
          </div>
          {nsaRows && nsaRows.length > 0 && (
            <button
              onClick={exportToExcel}
              className="px-4 py-1.5 rounded-full text-sm font-medium text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #059669, #34d399)', border: 'none' }}
            >
              Export to Excel
            </button>
          )}
        </div>

        {!rangeValid ? (
          <p className="text-gray-400 italic text-sm m-0">Choose a valid date range to see the allowance.</p>
        ) : nsaLoading ? (
          <p className="text-gray-400 text-sm m-0">Loading…</p>
        ) : !nsaRows || nsaRows.length === 0 ? (
          <p className="text-gray-400 italic text-sm m-0">
            No qualifying night shifts in this period. Make sure employees have Email ID and Project Name set.
          </p>
        ) : (
          <>
            <div key={`${nsaRows.length}-${start}-${end}`}>
              <NsaBarChart rows={nsaRows} />
            </div>

            <div className="overflow-x-auto">
              <table className="soft-table">
                <thead>
                  <tr>
                    <th>Email ID</th>
                    <th>Name</th>
                    <th>Project Name</th>
                    <th>Type</th>
                    <th>Days</th>
                    <th>Total amount (INR)</th>
                    <th>Dates worked</th>
                  </tr>
                </thead>
                <tbody>
                  {nsaRows.map((row, i) => (
                    <tr key={i}>
                      <td className="text-gray-600">{row.email_id}</td>
                      <td className="font-medium" style={{ color: '#1a1a2e' }}>{row.name}</td>
                      <td className="text-gray-600">{row.project_name}</td>
                      <td style={{ color: '#1a1a2e' }}>{row.type_of_allowance}</td>
                      <td className="font-mono-data" style={{ color: '#1a1a2e' }}>{row.total_amount / 900}</td>
                      <td className="font-mono-data" style={{ color: '#1a1a2e' }}>₹{row.total_amount.toLocaleString()}</td>
                      <td><DateChips value={row.date_worked} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
