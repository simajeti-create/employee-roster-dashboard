import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import * as employeesApi from '../../api/employees.js';

const norm = (h) => String(h).toLowerCase().replace(/[^a-z]/g, '');

// Sheet header (ignoring case and punctuation) -> employee field.
const COLUMNS = [
  { field: 'employee_code',      label: 'Emp No.',             aliases: ['empno', 'employeeno', 'employeeid', 'empid', 'employeenumber'] },
  { field: 'email',              label: 'Email ID',            aliases: ['emailid', 'email', 'deloitteemailid'] },
  { field: 'name',               label: 'Name',                aliases: ['name', 'employeename'] },
  { field: 'business',           label: 'Business',            aliases: ['business'] },
  { field: 'offering_portfolio', label: 'Offering Portfolio',  aliases: ['offeringportfolio'] },
  { field: 'service_offering',   label: 'Service Offering',    aliases: ['serviceoffering'] },
  { field: 'project_name',       label: 'Project Name',        aliases: ['projectname'] },
  { field: 'project_wbs',        label: 'Project/ Client WBS', aliases: ['projectclientwbs', 'projectwbs', 'clientwbs', 'wbs'] },
];

export default function ImportEmployeesModal({ onClose, onImported }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setPreview(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
        const headers = (raw[0] ?? []).map(norm);

        // Only columns found in the sheet are sent, so a missing column leaves that field untouched.
        const cols = COLUMNS
          .map((c) => ({ ...c, index: headers.findIndex((h) => c.aliases.includes(h)) }))
          .filter((c) => c.index >= 0);
        if (!cols.some((c) => c.field === 'name') || !cols.some((c) => c.field === 'employee_code' || c.field === 'email')) {
          setError('The first row needs a Name column and an Emp No. or Email ID column.');
          return;
        }

        const rows = raw
          .slice(1)
          .map((r) => Object.fromEntries(cols.map((c) => [c.field, String(r[c.index] ?? '').trim()])))
          .filter((r) => Object.values(r).some(Boolean));
        setPreview({ rows, columns: cols.map((c) => c.label) });
      } catch {
        setError('Could not read the file. Make sure it is a valid .xlsx file.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  async function handleImport() {
    if (!preview || preview.rows.length === 0) return;
    setImporting(true);
    setError('');
    try {
      setResult(await employeesApi.importEmployees(preview.rows));
      onImported();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Import employees</h3>

        {!result ? (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Columns: <strong>Emp No.</strong>, <strong>Email ID</strong>, <strong>Name</strong>, <strong>Business</strong>,{' '}
              <strong>Offering Portfolio</strong>, <strong>Service Offering</strong>, <strong>Project Name</strong>,{' '}
              <strong>Project/ Client WBS</strong>. Empty cells are left blank. Employees already in the system
              (matched by Emp No., then Email ID) are updated to match the sheet; new ones are added. Anyone missing
              from the sheet is kept as is.
            </p>

            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 text-sm text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              Click to select an .xlsx file
            </button>

            {preview && preview.rows.length > 0 && (
              <div className="mt-4 p-3 bg-violet-50 rounded-xl text-sm text-violet-800">
                Found <strong>{preview.rows.length}</strong> employee row{preview.rows.length !== 1 ? 's' : ''}.
                <div className="mt-1 text-xs text-violet-700">Columns read: {preview.columns.join(', ')}</div>
                <div className="mt-2 text-xs text-violet-700">
                  {preview.rows.slice(0, 3).map((r, i) => (
                    <div key={i} className="truncate">{[r.name, r.email, r.employee_code].filter(Boolean).join(' · ')}</div>
                  ))}
                  {preview.rows.length > 3 && <div>+ {preview.rows.length - 3} more</div>}
                </div>
              </div>
            )}
            {preview && preview.rows.length === 0 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl text-sm text-amber-800">No employee rows found in the file.</div>
            )}

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!preview || preview.rows.length === 0 || importing}
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
                  <strong>{result.created}</strong> added, <strong>{result.updated}</strong> updated,{' '}
                  <strong>{result.unchanged}</strong> already up to date.
                </span>
              </div>
              {result.changes.length > 0 && (
                <div className="bg-violet-50 rounded-xl px-4 py-3 text-violet-800" style={{ maxHeight: 160, overflowY: 'auto' }}>
                  <p className="font-medium mb-1.5 mt-0">What changed:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs m-0">
                    {result.changes.map((c, i) => (
                      <li key={i}>{c.name}: {c.fields.map((f) => COLUMNS.find((x) => x.field === f)?.label ?? f).join(', ')}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.skipped.length > 0 && (
                <div className="bg-amber-50 rounded-xl px-4 py-3 text-amber-800" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  <p className="font-medium mb-1.5">{result.skipped.length} row{result.skipped.length !== 1 ? 's' : ''} skipped:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    {result.skipped.map((s) => (
                      <li key={s.line}>Row {s.line} ({s.name}): {s.reason}</li>
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
      </div>
    </div>
  );
}
