import db from '../db/connection.js';
import { todayDate, nowDateTime } from '../utils/dateUtils.js';
import { listApprovedLeavesCoveringDate } from './leaveService.js';

// Returns true if the bare HH:MM time `t` falls within the [start, end) window.
// Handles overnight windows (end <= start) by wrapping midnight.
function withinDefaultShiftWindow(nowTime, start, end) {
  if (!start || !end) return false;
  if (end <= start) {
    // overnight: on shift if at/after start OR before end
    return nowTime >= start || nowTime < end;
  }
  return nowTime >= start && nowTime <= end;
}

export function getCurrentlyActive() {
  const today = todayDate();
  const now = nowDateTime(); // "YYYY-MM-DD HH:MM"
  const nowTime = now.slice(11); // "HH:MM" for default-shift comparisons

  const employees = db.prepare("SELECT * FROM employees WHERE employment_status = 'active'").all();
  const todaysShifts = db.prepare('SELECT * FROM shifts WHERE work_date = ?').all(today);
  const shiftsByEmployee = new Map(todaysShifts.map((s) => [s.employee_id, s]));

  const shiftIds = todaysShifts.map((s) => s.id);
  const openBreaksByShift = new Map();
  if (shiftIds.length > 0) {
    const placeholders = shiftIds.map(() => '?').join(',');
    const breaks = db
      .prepare(`SELECT * FROM breaks WHERE shift_id IN (${placeholders}) AND start_time <= ? AND (end_time IS NULL OR end_time >= ?)`)
      .all(...shiftIds, now, now);
    for (const b of breaks) {
      openBreaksByShift.set(b.shift_id, b);
    }
  }

  const leavesToday = listApprovedLeavesCoveringDate(today);
  const leaveByEmployee = new Map(leavesToday.map((l) => [l.employee_id, l]));

  const result = employees.map((employee) => {
    const leave = leaveByEmployee.get(employee.id);
    if (leave) {
      return { employee, status: 'On Leave', detail: leave };
    }

    // Explicit shift record for today — start/end are full "YYYY-MM-DD HH:MM" datetimes
    // (written by resolveShiftDateTimes, so overnight end_time carries next-day date already)
    const shift = shiftsByEmployee.get(employee.id);
    if (shift && shift.start_time <= now && shift.end_time >= now) {
      const onBreak = openBreaksByShift.get(shift.id);
      if (onBreak) {
        return { employee, status: 'On Break', detail: { shift, break: onBreak } };
      }
      return { employee, status: 'On Shift', detail: { shift } };
    }

    // No explicit shift — fall back to employee's default shift window.
    // Default times are bare "HH:MM", so use time-only comparison with overnight handling.
    if (!shift && withinDefaultShiftWindow(nowTime, employee.default_shift_start, employee.default_shift_end)) {
      return { employee, status: 'On Shift', detail: null };
    }

    return { employee, status: 'Off', detail: null };
  });

  return result;
}
