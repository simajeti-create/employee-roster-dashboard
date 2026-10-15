import { useRef, useState } from 'react';
import Modal from '../common/Modal.jsx';
import * as shiftsApi from '../../api/shifts.js';
import * as breaksApi from '../../api/breaks.js';

function timeFromDateTime(dt) {
  return dt ? dt.slice(11, 16) : '';
}

export default function ShiftEditor({ employee, date, shift, breaks, leave, onClose, onSaved }) {
  const [startTime, setStartTime] = useState(timeFromDateTime(shift?.start_time) || employee.default_shift_start || '');
  const [endTime,   setEndTime]   = useState(timeFromDateTime(shift?.end_time)   || employee.default_shift_end   || '');
  const [notes,     setNotes]     = useState(shift?.notes || '');
  const [error,     setError]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd,   setBreakEnd]   = useState('');

  // Track last successfully saved combo to skip redundant API calls
  const lastSavedRef = useRef(
    shift
      ? `${timeFromDateTime(shift.start_time)}|${timeFromDateTime(shift.end_time)}|${shift.notes || ''}`
      : ''
  );
  const flashTimer = useRef(null);

  async function autoSaveShift() {
    if (!startTime || !endTime || saving) return;
    const key = `${startTime}|${endTime}|${notes}`;
    if (key === lastSavedRef.current) return;

    setSaving(true);
    setError('');
    try {
      const payload = {
        employee_id: employee.id,
        work_date:   date,
        start_time:  `${date} ${startTime}`,
        end_time:    `${date} ${endTime}`,
        notes:       notes || null,
      };
      if (shift) {
        await shiftsApi.updateShift(shift.id, payload);
      } else {
        await shiftsApi.createShift(payload);
      }
      lastSavedRef.current = key;
      if (flashTimer.current) clearTimeout(flashTimer.current);
      setSavedFlash(true);
      flashTimer.current = setTimeout(() => setSavedFlash(false), 2000);
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteShift() {
    if (!confirm('Delete this shift? Its breaks will be removed too.')) return;
    await shiftsApi.deleteShift(shift.id);
    await onSaved();
  }

  async function handleAddBreak(e) {
    e.preventDefault();
    if (!breakStart) return;
    await breaksApi.createBreak({
      shift_id:   shift.id,
      start_time: `${date} ${breakStart}`,
      end_time:   breakEnd ? `${date} ${breakEnd}` : null,
    });
    setBreakStart('');
    setBreakEnd('');
    await onSaved();
  }

  async function handleDeleteBreak(id) {
    await breaksApi.deleteBreak(id);
    await onSaved();
  }

  async function handleEndBreakNow(id) {
    const now  = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    await breaksApi.updateBreak(id, { end_time: `${date} ${hhmm}` });
    await onSaved();
  }

  return (
    <Modal title={`${employee.name} — ${date}`} onClose={onClose}>
      {leave && (
        <p className="leave-tag">
          On {leave.leave_type} leave ({leave.status}) covering this date.
        </p>
      )}

      <div>
        <div className="form-row">
          <div className="field">
            <label>Shift start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onBlur={autoSaveShift}
            />
          </div>
          <div className="field">
            <label>Shift end</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              onBlur={autoSaveShift}
            />
          </div>
        </div>
        <div className="field">
          <label>Notes (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={autoSaveShift}
          />
        </div>

        {/* Inline status feedback */}
        <div style={{ minHeight: 22, marginBottom: 8 }}>
          {saving && (
            <span className="text-xs" style={{ color: '#6C4CF1' }}>Saving…</span>
          )}
          {!saving && savedFlash && (
            <span className="text-xs font-semibold" style={{ color: '#1C9A6C' }}>✓ Saved</span>
          )}
          {!saving && !savedFlash && !shift && startTime && endTime && (
            <span className="text-xs text-gray-400">Tab out of a field to save automatically</span>
          )}
          {error && <span className="error-text" style={{ fontSize: 13 }}>{error}</span>}
        </div>

        {shift && (
          <button type="button" className="danger" onClick={handleDeleteShift}>
            Delete shift
          </button>
        )}
      </div>

      {shift && (
        <div style={{ marginTop: 20 }}>
          <h2>Breaks</h2>
          {breaks.length === 0 && <p className="empty-state">No breaks logged.</p>}
          {breaks.map((b) => (
            <div className="break-row" key={b.id}>
              <span>
                {timeFromDateTime(b.start_time)} – {b.end_time ? timeFromDateTime(b.end_time) : 'ongoing'}
              </span>
              {!b.end_time && <button onClick={() => handleEndBreakNow(b.id)}>End now</button>}
              <button className="danger" onClick={() => handleDeleteBreak(b.id)}>Delete</button>
            </div>
          ))}
          <form onSubmit={handleAddBreak} className="form-row" style={{ marginTop: 8 }}>
            <div className="field">
              <label>Break start</label>
              <input type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} />
            </div>
            <div className="field">
              <label>Break end (optional)</label>
              <input type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} />
            </div>
            <div className="form-actions" style={{ alignSelf: 'flex-end' }}>
              <button type="submit">Add break</button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}
