import { useEffect, useState } from 'react';
import { downloadNsaWorkbook } from '../utils/nsaExport.js';
import * as reportsApi from '../api/reports.js';
import PeriodSelector, { usePeriod } from '../components/common/PeriodSelector.jsx';

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
  const period = usePeriod();
  const { start, end, rangeValid, label } = period;

  const [nsaRows, setNsaRows] = useState(null);
  const [nsaLoading, setNsaLoading] = useState(true);

  useEffect(() => {
    if (!rangeValid) return undefined;
    let cancelled = false;
    setNsaLoading(true);
    reportsApi.getNsaReport({ start, end }).then((nsa) => {
      if (cancelled) return;
      setNsaRows(nsa);
      setNsaLoading(false);
    });
    return () => { cancelled = true; };
  }, [start, end, rangeValid]);

  function exportToExcel() {
    downloadNsaWorkbook(nsaRows, `NSA_Report_${start}_to_${end}.xlsx`);
  }

  const totalAmount = (nsaRows ?? []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-grotesk text-2xl font-bold m-0" style={{ color: '#1a1a2e' }}>Reports</h1>
        <p className="text-sm text-gray-400 mt-1 m-0">Night shift allowance for the period you choose.</p>
      </div>

      <PeriodSelector period={period} />

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
            No qualifying night shifts in this period. Only S2 shifts (starting 5:30 PM or later) count, and employees need an Email ID.
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
