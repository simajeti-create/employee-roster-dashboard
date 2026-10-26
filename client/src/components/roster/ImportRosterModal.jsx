import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Modal from '../common/Modal.jsx';
import * as shiftsApi from '../../api/shifts.js';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const norm = (h) => String(h).toLowerCase().replace(/[^a-z]/g, '');

// "1-Oct" / "1 Oct" -> {day, month}; also copes with a header Excel turned into "10/1/26".
function parseDayHeader(h) {
  const text = String(h).trim();
  let m = text.match(/^(\d{1,2})[-\s]([A-Za-z]{3})/);
  if (m) {
    const month = MONTHS.indexOf(m[2].toLowerCase());
    if (month >= 0) return { day: Number(m[1]), month: month + 1 };
  }
  m = text.match(/^(\d{1,2})\/(\d{1,2})\/\d{2,4}$/);
  if (m) return { day: Number(m[2]), month: Number(m[1]) };
  return null;
}

export default function ImportRosterModal({ defaultYear, onClose, onImported }) {
  const fileRef = useRef(null);
  const [parsed, setParsed] = useState(null);
  const [year, setYear] = useState(defaultYear);
  const [s1, setS1] = useState({ start: '09:00', end: '18:00' });
  const [s2, setS2] = useState({ start: '17:30', end: '02:30' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setParsed(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
        const headers = (raw[0] ?? []).map(String);

        const emailCol = headers.findIndex((h) => norm(h).includes('email'));
        const codeCol = headers.findIndex((h) => norm(h).includes('employeeid') || norm(h).includes('empid'));
        if (emailCol < 0 && codeCol < 0) {
          setError('Could not find "Deloitte Email ID" or "Employee ID" columns in the first row.');
          return;
        }

        const dayCols = [];
        headers.forEach((h, i) => {
          const d = parseDayHeader(h);
          if (d) dayCols.push({ index: i, ...d });
        });
        if (dayCols.length === 0) {
          setError('No date columns found. Headers should look like 1-Oct, 2-Oct, ...');
          return;
        }
        const months = [...new Set(dayCols.map((c) => c.month))];
        if (months.length > 1) {
          setError('The file has dates from more than one month. Import one month at a time.');
          return;
        }

        const rows = raw
          .slice(1)
          .map((r) => {
            const days = {};
            for (const c of dayCols) {
              const v = String(r[c.index] ?? '').trim();
              if (v) days[c.day] = v;
            }
            return {
              email: emailCol >= 0 ? String(r[emailCol] ?? '').trim() : '',
              employee_code: codeCol >= 0 ? String(r[codeCol] ?? '').trim() : '',
              days,
            };
          })
          .filter((r) => r.email || r.employee_code);

        const counts = { S1: 0, S2: 0, PTO: 0, X: 0 };
        for (const r of rows) {
          for (const v of Object.values(r.days)) {
            const k = v.toUpperCase();
            if (k in counts) counts[k]++;
          }
        }
        setParsed({ rows, month: months[0], counts });
      } catch {
        setError('Could not read the file. Make sure it is a valid .xlsx file.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  async function handleImport() {
    if (!parsed) return;
    setImporting(true);
    setError('');
    try {
      const data = await shiftsApi.importRoster({
        year: Number(year),
        month: parsed.month,
        s1,
        s2,
        rows: parsed.rows,
      });
      setResult(data);
      onImported(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  const timeInput = (value, onChange) => (
    <input type="time" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 'auto' }} />
  );

  return (
    <Modal title="Import roster from Excel" onClose={onClose} width={480}>
      {!result ? (
        <>
          <p className="text-sm text-gray-500 mb-4 mt-0">
            Columns: <strong>Deloitte Email ID</strong>, <strong>Employee ID</strong>, then one column per day
            (1-Oct, 2-Oct, ...). Cell codes: <strong>S1</strong> / <strong>S2</strong> shift, <strong>PTO</strong> holiday,{' '}
            <strong>X</strong> terminated. Blank cells are left unchanged. Only S2 counts towards NSA.
          </p>

          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          <button
            type="button"
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 text-sm text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            Click to select an .xlsx file
          </button>

          {parsed && (
            <div className="mt-4 p-3 bg-violet-50 rounded-xl text-sm text-violet-800">
              <strong>{MONTH_NAMES[parsed.month - 1]}</strong> · {parsed.rows.length} employee
              {parsed.rows.length !== 1 ? 's' : ''} · S1 {parsed.counts.S1} · S2 {parsed.counts.S2} · PTO {parsed.counts.PTO} · X {parsed.counts.X}
            </div>
          )}

          <div className="grid gap-3 mt-4 text-sm text-gray-600" style={{ gridTemplateColumns: 'auto 1fr' }}>
            <label className="self-center">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} style={{ width: 90 }} />
            <label className="self-center">S1 times</label>
            <span className="flex items-center gap-2">{timeInput(s1.start, (v) => setS1({ ...s1, start: v }))} to {timeInput(s1.end, (v) => setS1({ ...s1, end: v }))}</span>
            <label className="self-center">S2 times</label>
            <span className="flex items-center gap-2">{timeInput(s2.start, (v) => setS2({ ...s2, start: v }))} to {timeInput(s2.end, (v) => setS2({ ...s2, end: v }))}</span>
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!parsed || parsed.rows.length === 0 || importing}
              onClick={handleImport}
            >
              {importing ? 'Importing…' : 'Import'}
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2 bg-green-50 text-green-800 rounded-xl px-4 py-3">
              <span className="mt-0.5">✓</span>
              <span>
                <strong>{result.shifts}</strong> shift{result.shifts !== 1 ? 's' : ''} saved, <strong>{result.pto}</strong> PTO day
                {result.pto !== 1 ? 's' : ''} saved
                {result.terminated.length > 0 && <>, <strong>{result.terminated.length}</strong> marked terminated</>}.
              </span>
            </div>
            {result.unmatched.length > 0 && (
              <div className="bg-amber-50 rounded-xl px-4 py-3 text-amber-800" style={{ maxHeight: 140, overflowY: 'auto' }}>
                <p className="font-medium mb-1.5 mt-0">
                  {result.unmatched.length} not found in Employees (skipped):
                </p>
                <p className="text-xs m-0">{result.unmatched.join(', ')}</p>
              </div>
            )}
            {result.skipped.length > 0 && (
              <div className="bg-amber-50 rounded-xl px-4 py-3 text-amber-800" style={{ maxHeight: 140, overflowY: 'auto' }}>
                <p className="font-medium mb-1.5 mt-0">{result.skipped.length} cell{result.skipped.length !== 1 ? 's' : ''} skipped:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs m-0">
                  {result.skipped.map((s, i) => (
                    <li key={i}>{s.name} · {s.date}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            type="button"
            className="mt-5 w-full px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
            onClick={onClose}
          >
            Done
          </button>
        </>
      )}
    </Modal>
  );
}
