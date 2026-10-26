import { useEffect, useState } from 'react';
import * as shiftsApi from '../../api/shifts.js';
import * as leavesApi from '../../api/leaves.js';
import * as undoApi from '../../api/undo.js';
import ShiftEditor from './ShiftEditor.jsx';
import BulkShiftModal from './BulkShiftModal.jsx';
import { useCanEdit, VIEW_ONLY_TITLE } from '../../context/auth.js';
import ImportRosterModal from './ImportRosterModal.jsx';
import { weekDates, addDays, startOfWeek, todayStr } from '../../utils/dateUtils.js';

// Shifts are labelled by start time: S2 when the shift starts at 17:30 or later, otherwise S1.
const PERIODS = {
  s1: { label: 'S1', hint: 'starts before 17:30',   bg: '#EEEAFD', fg: '#4A2FC4', accent: '#6C4CF1' },
  s2: { label: 'S2', hint: 'starts 17:30 or later', bg: '#E3E8FB', fg: '#2F3C9E', accent: '#3B4BB5' },
};

const LEAVE_COLORS = {
  sick:   { bg: '#FCE8E5', fg: '#B83A2E' },
  casual: { bg: '#E2F6EC', fg: '#13734F' },
  paid:   { bg: '#E6F0FD', fg: '#1D5BB8' },
  unpaid: { bg: '#F3F4F6', fg: '#4B5563' },
};

function periodFor(startTime) {
  const minutes = Number(startTime.slice(-5, -3)) * 60 + Number(startTime.slice(-2));
  return minutes >= 17 * 60 + 30 ? PERIODS.s2 : PERIODS.s1;
}

function initials(name) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function dayHeader(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
    day: d.getDate(),
    month: d.toLocaleDateString(undefined, { month: 'short' }),
  };
}

export default function RosterGrid({ employees, weekStart, onWeekChange }) {
  const canEdit = useCanEdit();
  const [shifts, setShifts] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedBreaks, setSelectedBreaks] = useState([]);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [notice, setNotice] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [undoInfo, setUndoInfo] = useState({ available: false, redo: { available: false } });
  const [reverting, setReverting] = useState(false);

  const dates = weekDates(weekStart);
  const weekEnd = dates[6];
  const today = todayStr();

  async function load() {
    setLoading(true);
    const [shiftsData, leavesData] = await Promise.all([
      shiftsApi.listShifts({ start: weekStart, end: weekEnd }),
      leavesApi.listLeaves({ start: weekStart, end: weekEnd }),
    ]);
    setShifts(shiftsData);
    setLeaves(leavesData);
    setLoading(false);
    refreshUndo();
  }

  async function refreshUndo() {
    try {
      setUndoInfo(await undoApi.getUndoStatus());
    } catch {
      setUndoInfo({ available: false, redo: { available: false } });
    }
  }

  async function revertLast(redo = false) {
    setReverting(true);
    try {
      const { label } = redo ? await undoApi.redoLastChange() : await undoApi.undoLastChange();
      setNotice(`${redo ? 'Redone' : 'Reverted'}: ${label}.`);
      setSelectedCell(null);
      setSelectedBreaks([]);
      await load();
    } catch (err) {
      setNotice(err.message);
      await refreshUndo();
    } finally {
      setReverting(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  function findShift(employeeId, date) {
    return shifts.find((s) => s.employee_id === employeeId && s.work_date === date);
  }

  function findLeave(employeeId, date) {
    return leaves.find(
      (l) =>
        l.employee_id === employeeId &&
        l.start_date <= date &&
        l.end_date >= date &&
        l.status === 'approved'
    );
  }

  function isWeekend(date) {
    const dow = new Date(`${date}T00:00:00`).getDay();
    return dow === 0 || dow === 6;
  }

  // Headcount for a date: explicit shift, or default shift on a weekday, minus approved leave.
  function headcount(date) {
    return employees.filter((e) => {
      if (findLeave(e.id, date)) return false;
      if (findShift(e.id, date)) return true;
      return !isWeekend(date) && e.default_shift_start && e.default_shift_end;
    }).length;
  }

  async function saveDefaults() {
    const ok = window.confirm(
      `Save each employee's default shift for every empty weekday this week (${weekStart} to ${weekEnd})? ` +
      'Existing shifts and approved leave days are left as they are.'
    );
    if (!ok) return;
    setSavingDefaults(true);
    try {
      const { created } = await shiftsApi.applyDefaultShifts({
        start: weekStart,
        end: weekEnd,
        employee_ids: employees.map((e) => e.id),
      });
      setNotice(created ? `Saved ${created} shift${created === 1 ? '' : 's'} from defaults.` : 'Nothing to save: every weekday already has a shift or leave.');
      await load();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSavingDefaults(false);
    }
  }

  async function openCell(employee, date) {
    if (!canEdit) return;
    const shift = findShift(employee.id, date);
    const leave = findLeave(employee.id, date);
    const breaks = shift ? await shiftsApi.listBreaksForShift(shift.id) : [];
    setSelectedBreaks(breaks);
    setSelectedCell({ employee, date, shift, leave });
  }

  async function handleSaved() {
    if (!selectedCell) {
      await load();
      return;
    }
    const { employee, date } = selectedCell;
    const [shiftsData, leavesData] = await Promise.all([
      shiftsApi.listShifts({ start: weekStart, end: weekEnd }),
      leavesApi.listLeaves({ start: weekStart, end: weekEnd }),
    ]);
    setShifts(shiftsData);
    setLeaves(leavesData);
    const refreshedShift = shiftsData.find(
      (s) => s.employee_id === employee.id && s.work_date === date
    );
    const refreshedLeave = leavesData.find(
      (l) => l.employee_id === employee.id && l.start_date <= date && l.end_date >= date
    );
    const breaks = refreshedShift ? await shiftsApi.listBreaksForShift(refreshedShift.id) : [];
    setSelectedBreaks(breaks);
    setSelectedCell({ employee, date, shift: refreshedShift, leave: refreshedLeave });
    refreshUndo();
  }

  const stickyCell = { position: 'sticky', left: 0, zIndex: 1, background: '#fff' };

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center rounded-full overflow-hidden" style={{ border: '1px solid #E6E4EF' }}>
          <button
            onClick={() => onWeekChange(addDays(weekStart, -7))}
            aria-label="Previous week"
            style={{ border: 'none', borderRadius: 0, padding: '6px 14px' }}
          >
            ←
          </button>
          <span className="text-sm font-medium px-3" style={{ color: '#1a1a2e', minWidth: 190, textAlign: 'center' }}>
            {dayHeader(weekStart).month} {dayHeader(weekStart).day} – {dayHeader(weekEnd).month} {dayHeader(weekEnd).day}, {weekEnd.slice(0, 4)}
          </span>
          <button
            onClick={() => onWeekChange(addDays(weekStart, 7))}
            aria-label="Next week"
            style={{ border: 'none', borderRadius: 0, padding: '6px 14px' }}
          >
            →
          </button>
        </div>
        <button
          onClick={() => onWeekChange(startOfWeek(today))}
          className="rounded-full text-sm font-medium"
          style={{ color: '#6C4CF1', borderColor: '#D5CBFB', background: '#EEEAFD' }}
        >
          Today
        </button>
        <button
          onClick={saveDefaults}
          disabled={savingDefaults || !canEdit}
          className="primary rounded-full text-sm"
          title={canEdit ? 'Turn the dashed default shifts into saved shifts for this week' : VIEW_ONLY_TITLE}
        >
          {savingDefaults ? 'Saving…' : 'Save default shifts for this week'}
        </button>
        <button
          onClick={() => setBulkOpen(true)}
          disabled={employees.length === 0 || !canEdit}
          title={canEdit ? undefined : VIEW_ONLY_TITLE}
          className="rounded-full text-sm font-medium"
          style={{ color: '#6C4CF1', borderColor: '#D5CBFB' }}
        >
          Change shift by date range
        </button>
        <button
          onClick={() => setImportOpen(true)}
          className="rounded-full text-sm font-medium"
          style={{ color: '#6C4CF1', borderColor: '#D5CBFB' }}
        >
          Import from Excel
        </button>
        <button
          onClick={() => revertLast(false)}
          disabled={!canEdit || !undoInfo.available || reverting}
          className="rounded-full text-sm font-medium"
          style={{ color: '#B83A2E', borderColor: '#F5C4BE', opacity: undoInfo.available ? 1 : 0.5 }}
          title={!canEdit ? VIEW_ONLY_TITLE : undoInfo.available ? `Undo: ${undoInfo.label}` : 'No changes to revert'}
        >
          {reverting ? 'Working…' : '↶ Revert last change'}
        </button>
        <button
          onClick={() => revertLast(true)}
          disabled={!canEdit || !undoInfo.redo?.available || reverting}
          className="rounded-full text-sm font-medium"
          style={{ color: '#13734F', borderColor: '#BFE3D2', opacity: undoInfo.redo?.available ? 1 : 0.5 }}
          title={!canEdit ? VIEW_ONLY_TITLE : undoInfo.redo?.available ? `Redo: ${undoInfo.redo.label}` : 'Nothing to redo'}
        >
          ↷ Redo change
        </button>

        <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 ml-auto">
          {Object.values(PERIODS).map((p) => (
            <span key={p.label} className="flex items-center gap-1.5">
              <span style={{ width: 10, height: 10, borderRadius: 3, background: p.bg, border: `1.5px solid ${p.accent}` }} />
              {p.label} · {p.hint}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: 3, border: '1.5px dashed #9ca3af' }} />
            Default shift
          </span>
        </div>
      </div>

      {notice && (
        <p className="text-sm mb-3 m-0" style={{ color: '#13734F' }} role="status">{notice}</p>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : employees.length === 0 ? (
        <p className="text-gray-400 italic text-sm">No employees match the current filters.</p>
      ) : (
        <div className="roster-scroll">
          <table className="soft-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ ...stickyCell, zIndex: 2 }}>Employee</th>
                {dates.map((d) => {
                  const h = dayHeader(d);
                  const isToday = d === today;
                  return (
                    <th
                      key={d}
                      style={{
                        textAlign: 'center',
                        background: isToday ? '#6C4CF1' : isWeekend(d) ? '#FAF9FD' : undefined,
                        color: isToday ? '#fff' : undefined,
                        borderTopLeftRadius: isToday ? 10 : 0,
                        borderTopRightRadius: isToday ? 10 : 0,
                      }}
                    >
                      <div>{h.weekday}</div>
                      <div className="font-grotesk" style={{ fontSize: 16, letterSpacing: 0, color: isToday ? '#fff' : '#1a1a2e' }}>{h.day}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="min-w-36" style={stickyCell}>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="avatar"
                        style={{ background: 'linear-gradient(135deg, #6C4CF1 0%, #9B7CFB 100%)', width: 30, height: 30, fontSize: 11 }}
                      >
                        {initials(employee.name)}
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-gray-800">{employee.name}</span>
                        <span className="block text-xs text-gray-400">{employee.department}</span>
                      </span>
                    </div>
                  </td>
                  {dates.map((date) => {
                    const shift = findShift(employee.id, date);
                    const leave = findLeave(employee.id, date);
                    const hasDefault = employee.default_shift_start && employee.default_shift_end;
                    const weekend = isWeekend(date);
                    const showDefault = !shift && !leave && hasDefault && !weekend;
                    const lc = leave ? LEAVE_COLORS[leave.leave_type] ?? LEAVE_COLORS.unpaid : null;

                    let pill = null;
                    if (leave) {
                      pill = (
                        <div className="rounded-lg px-2 py-1.5 text-xs font-semibold" style={{ background: lc.bg, color: lc.fg }}>
                          Leave · {leave.leave_type}
                        </div>
                      );
                    } else if (shift) {
                      const p = periodFor(shift.start_time);
                      pill = (
                        <div
                          className="rounded-lg px-2 py-1.5 font-mono-data"
                          title={`${shift.start_time.slice(11, 16)}–${shift.end_time.slice(11, 16)}`}
                          style={{ background: p.bg, color: p.fg, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', borderLeft: `3px solid ${p.accent}` }}
                        >
                          {p.label}
                        </div>
                      );
                    } else if (showDefault) {
                      const p = periodFor(employee.default_shift_start);
                      pill = (
                        <div
                          className="rounded-lg px-2 py-1.5 font-mono-data"
                          title={`Default shift ${employee.default_shift_start}–${employee.default_shift_end}`}
                          style={{ color: p.fg, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', border: `1.5px dashed ${p.accent}`, background: '#fff', opacity: 0.85 }}
                        >
                          {p.label}
                        </div>
                      );
                    } else {
                      pill = <span className="text-gray-300 text-lg leading-none">+</span>;
                    }

                    return (
                      <td
                        key={date}
                        className="roster-cell min-w-28 text-center"
                        style={{ background: date === today ? '#F7F5FF' : weekend ? '#FCFBFE' : undefined }}
                        onClick={() => openCell(employee, date)}
                      >
                        {pill}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...stickyCell, fontSize: 12, fontWeight: 600, color: '#6b7280', borderTop: '1px solid #E6E4EF' }}>
                  On duty
                </td>
                {dates.map((date) => {
                  const n = headcount(date);
                  return (
                    <td key={date} className="text-center" style={{ borderTop: '1px solid #E6E4EF' }}>
                      <span
                        className="font-mono-data text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: n ? '#EEEAFD' : '#F3F4F6', color: n ? '#6C4CF1' : '#9ca3af' }}
                      >
                        {n} / {employees.length}
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {importOpen && (
        <ImportRosterModal
          defaultYear={Number(weekStart.slice(0, 4))}
          onClose={() => setImportOpen(false)}
          onImported={async ({ shifts, pto }) => {
            setNotice(`Roster imported: ${shifts} shifts, ${pto} PTO days.`);
            await load();
          }}
        />
      )}

      {bulkOpen && (
        <BulkShiftModal
          employees={employees}
          defaultStart={weekStart}
          defaultEnd={weekEnd}
          onClose={() => setBulkOpen(false)}
          onSaved={async ({ created, updated, skipped }) => {
            setNotice(`Shift change applied: ${updated} updated, ${created} created, ${skipped} skipped.`);
            await load();
          }}
        />
      )}

      {selectedCell && (
        <ShiftEditor
          employee={selectedCell.employee}
          date={selectedCell.date}
          shift={selectedCell.shift}
          leave={selectedCell.leave}
          breaks={selectedBreaks}
          onClose={() => {
            setSelectedCell(null);
            setSelectedBreaks([]);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
