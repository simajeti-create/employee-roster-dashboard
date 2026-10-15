import { useEffect, useState } from 'react';
import * as shiftsApi from '../../api/shifts.js';
import * as leavesApi from '../../api/leaves.js';
import ShiftEditor from './ShiftEditor.jsx';
import { weekDates, formatDayLabel, addDays } from '../../utils/dateUtils.js';

export default function RosterGrid({ employees, weekStart, onWeekChange }) {
  const [shifts, setShifts] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedBreaks, setSelectedBreaks] = useState([]);

  const dates = weekDates(weekStart);
  const weekEnd = dates[6];

  async function load() {
    setLoading(true);
    const [shiftsData, leavesData] = await Promise.all([
      shiftsApi.listShifts({ start: weekStart, end: weekEnd }),
      leavesApi.listLeaves({ start: weekStart, end: weekEnd }),
    ]);
    setShifts(shiftsData);
    setLeaves(leavesData);
    setLoading(false);
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

  async function openCell(employee, date) {
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
  }

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => onWeekChange(addDays(weekStart, -7))}
          className="px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ← Previous
        </button>
        <span className="text-sm text-gray-500 font-medium">
          {weekStart} – {weekEnd}
        </span>
        <button
          onClick={() => onWeekChange(addDays(weekStart, 7))}
          className="px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Next →
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : employees.length === 0 ? (
        <p className="text-gray-400 italic text-sm">No employees match the current filters.</p>
      ) : (
        <div className="roster-scroll">
          <table className="soft-table">
            <thead>
              <tr>
                <th>Employee</th>
                {dates.map((d) => (
                  <th key={d}>{formatDayLabel(d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="min-w-36">
                    <span className="block text-sm font-medium text-gray-800">
                      {employee.name}
                    </span>
                    <span className="block text-xs text-gray-400">{employee.department}</span>
                  </td>
                  {dates.map((date) => {
                    const shift = findShift(employee.id, date);
                    const leave = findLeave(employee.id, date);
                    const hasDefault = employee.default_shift_start && employee.default_shift_end;
                    const dow = new Date(`${date}T00:00:00`).getDay();
                    const isWeekend = dow === 0 || dow === 6;
                    return (
                      <td
                        key={date}
                        className="roster-cell min-w-28 text-center"
                        onClick={() => openCell(employee, date)}
                      >
                        {leave && (
                          <div className="leave-tag">
                            Leave ({leave.leave_type})
                          </div>
                        )}
                        {shift && (
                          <div className="shift-time">
                            {shift.start_time.slice(11, 16)}–{shift.end_time.slice(11, 16)}
                          </div>
                        )}
                        {!shift && !leave && hasDefault && !isWeekend && (
                          <div className="shift-time">
                            {employee.default_shift_start}–{employee.default_shift_end}
                          </div>
                        )}
                        {!shift && !leave && (!hasDefault || isWeekend) && (
                          <span className="text-gray-300 text-lg leading-none">+</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
