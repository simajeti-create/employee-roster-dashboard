import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import * as leavesApi from '../../api/leaves.js';

export default function ImportLeavesModal({ onClose, onImported }) {
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
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Skip header row (row 0), filter out empty rows
        const dataRows = rawRows.slice(1).filter((row) => String(row[0] || '').trim());

        const approvedRows = [];
        for (const row of dataRows) {
          const name = String(row[0] || '').trim();
          const datesRaw = String(row[1] || '').trim();
          const l1 = String(row[2] || '').trim().toLowerCase();
          const l2 = String(row[3] || '').trim().toLowerCase();

          if (!name || !datesRaw) continue;
          if (l1 !== 'approved' || l2 !== 'approved') continue;

          const dates = datesRaw.split(',').map((d) => d.trim()).filter(Boolean);
          if (dates.length === 0) continue;

          approvedRows.push({ name, dates });
        }

        const totalDays = approvedRows.reduce((sum, r) => sum + r.dates.length, 0);
        setPreview({ rows: approvedRows, totalDays });
      } catch {
        setError('Could not parse the file. Make sure it is a valid .xlsx file.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (!preview || preview.rows.length === 0) return;
    setImporting(true);
    setError('');
    try {
      const data = await leavesApi.importLeaves(preview.rows);
      setResult(data);
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
        <h3 className="text-base font-semibold text-gray-900 mb-4">Import Leaves</h3>

        {!result ? (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Upload an .xlsx file with columns: Employee, Planned Leave Dates (comma-separated YYYY-MM-DD),
              Level 1 Approved, Level 2 Approved.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 text-sm text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              Click to select an .xlsx file
            </button>

            {preview && preview.rows.length > 0 && (
              <div className="mt-4 p-3 bg-violet-50 rounded-xl text-sm text-violet-800">
                Found <strong>{preview.rows.length}</strong> approved row{preview.rows.length !== 1 ? 's' : ''}{' '}
                covering <strong>{preview.totalDays}</strong> leave day{preview.totalDays !== 1 ? 's' : ''}.
              </div>
            )}

            {preview && preview.rows.length === 0 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl text-sm text-amber-800">
                No rows found where both approval levels are "Approved".
              </div>
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
                  <strong>{result.created}</strong> leave record{result.created !== 1 ? 's' : ''} created,{' '}
                  <strong>{result.updated}</strong> updated.
                </span>
              </div>
              {result.unmatched.length > 0 && (
                <div className="bg-amber-50 rounded-xl px-4 py-3 text-amber-800">
                  <p className="font-medium mb-1.5">
                    {result.unmatched.length} unmatched employee{result.unmatched.length !== 1 ? 's' : ''} (rows skipped):
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    {result.unmatched.map((name) => (
                      <li key={name}>{name}</li>
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
