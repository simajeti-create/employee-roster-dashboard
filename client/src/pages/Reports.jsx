import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import * as reportsApi from '../api/reports.js';
import { todayStr, addDays } from '../utils/dateUtils.js';

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

export default function Reports() {
  const [anchorDate, setAnchorDate] = useState(todayStr());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [nsaRows, setNsaRows] = useState(null);
  const [nsaLoading, setNsaLoading] = useState(true);
  const [nsaStart, setNsaStart] = useState('');
  const [nsaEnd, setNsaEnd] = useState('');

  async function load(date) {
    setLoading(true);
    setData(await reportsApi.getWeeklySummary(date));
    setLoading(false);
  }

  async function loadNsa(start, end) {
    setNsaLoading(true);
    setNsaRows(await reportsApi.getNsaReport({ start, end }));
    setNsaLoading(false);
  }

  useEffect(() => {
    load(anchorDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorDate]);

  useEffect(() => {
    loadNsa(nsaStart, nsaEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nsaStart, nsaEnd]);

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
    XLSX.writeFile(wb, 'NSA_Report.xlsx');
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-grotesk text-xl font-bold m-0" style={{ color: '#1a1a2e' }}>
        Weekly Summary
      </h2>

      {/* Week navigation */}
      <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E6E4EF' }}>
        <div className="flex items-center gap-3 flex-wrap mb-6">
          <button
            onClick={() => setAnchorDate((d) => addDays(d, -7))}
            className="px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Previous week
          </button>
          <span className="font-mono-data text-sm text-gray-500 font-medium">
            {data ? `${data.week_start} – ${data.week_end}` : ''}
          </span>
          <button
            onClick={() => setAnchorDate((d) => addDays(d, 7))}
            className="px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Next week →
          </button>
          <button
            onClick={() => setAnchorDate(todayStr())}
            className="px-4 py-1.5 rounded-full text-sm font-medium text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #6C4CF1, #9B7CFB)', border: 'none' }}
          >
            This week
          </button>
        </div>

        {loading || !data ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : data.summary.length === 0 ? (
          <p className="text-gray-400 italic text-sm">No employees to report on yet.</p>
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
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <p className="text-sm text-gray-500 m-0">
            Shifts starting at or after 5:30 PM — ₹900 per qualifying day.
          </p>
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

        <div className="flex items-center gap-3 flex-wrap mb-6">
          <span className="text-sm text-gray-500">From</span>
          <input
            type="date"
            value={nsaStart}
            onChange={(e) => setNsaStart(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600"
          />
          <span className="text-sm text-gray-500">To</span>
          <input
            type="date"
            value={nsaEnd}
            onChange={(e) => setNsaEnd(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600"
          />
          {(nsaStart || nsaEnd) && (
            <button
              onClick={() => { setNsaStart(''); setNsaEnd(''); }}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {nsaLoading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : !nsaRows || nsaRows.length === 0 ? (
          <p className="text-gray-400 italic text-sm">
            No qualifying night shifts found. Make sure employees have Email ID and Project Name set.
          </p>
        ) : (
          <>
            {/* Bar chart — key on nsaRows so animation re-runs on data change */}
            <div key={nsaRows.length + (nsaStart || '') + (nsaEnd || '')}>
              <NsaBarChart rows={nsaRows} />
            </div>

            <div className="overflow-x-auto">
              <table className="soft-table">
                <thead>
                  <tr>
                    <th>Email ID</th>
                    <th>Name</th>
                    <th>Project Name</th>
                    <th>Type of Allowance</th>
                    <th>Total Amount (INR)</th>
                    <th>Date Worked</th>
                  </tr>
                </thead>
                <tbody>
                  {nsaRows.map((row, i) => (
                    <tr key={i}>
                      <td className="text-gray-600">{row.email_id}</td>
                      <td className="font-medium" style={{ color: '#1a1a2e' }}>{row.name}</td>
                      <td className="text-gray-600">{row.project_name}</td>
                      <td style={{ color: '#1a1a2e' }}>{row.type_of_allowance}</td>
                      <td className="font-mono-data" style={{ color: '#1a1a2e' }}>₹{row.total_amount}</td>
                      <td className="font-mono-data text-gray-600">{row.date_worked}</td>
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
