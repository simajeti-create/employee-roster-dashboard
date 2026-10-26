import db from '../db/connection.js';
import { startOfWeek, addDays, diffHours, todayDate } from '../utils/dateUtils.js';
import { listLeavesForDateRange } from './leaveService.js';

function weekdaysInRange(start, end) {
  const days = [];
  let d = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (d <= last) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(todayDate(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function getWeeklySummary(weekStartInput) {
  const weekStart = startOfWeek(weekStartInput || new Date().toISOString().slice(0, 10));
  return buildSummary(weekStart, addDays(weekStart, 6));
}

// Same per-employee summary for any inclusive date range (week, month or custom).
export function getRangeSummary({ start, end }) {
  return buildSummary(start, end);
}

function buildSummary(weekStart, weekEnd) {
  const employees = db.prepare('SELECT * FROM employees ORDER BY name').all();
  const shifts = db
    .prepare('SELECT * FROM shifts WHERE work_date BETWEEN ? AND ?')
    .all(weekStart, weekEnd);

  const shiftIds = shifts.map((s) => s.id);
  let breaksByShift = new Map();
  if (shiftIds.length > 0) {
    const placeholders = shiftIds.map(() => '?').join(',');
    const breaks = db.prepare(`SELECT * FROM breaks WHERE shift_id IN (${placeholders})`).all(...shiftIds);
    breaksByShift = breaks.reduce((map, b) => {
      if (!map.has(b.shift_id)) map.set(b.shift_id, []);
      map.get(b.shift_id).push(b);
      return map;
    }, new Map());
  }

  const leaves = listLeavesForDateRange(weekStart, weekEnd);
  const weekdays = weekdaysInRange(weekStart, weekEnd);

  const summary = employees.map((employee) => {
    const employeeShifts = shifts.filter((s) => s.employee_id === employee.id);

    let hoursWorked = 0;
    for (const shift of employeeShifts) {
      let shiftHours = diffHours(shift.start_time, shift.end_time);
      const shiftBreaks = breaksByShift.get(shift.id) || [];
      for (const b of shiftBreaks) {
        if (b.end_time) {
          shiftHours -= diffHours(b.start_time, b.end_time);
        }
      }
      hoursWorked += Math.max(0, shiftHours);
    }

    const employeeLeaves = leaves.filter((l) => l.employee_id === employee.id);

    // Augment with default shift hours for weekdays with no explicit shift and no approved leave
    if (employee.default_shift_start && employee.default_shift_end) {
      const shiftDates = new Set(employeeShifts.map((s) => s.work_date));
      for (const date of weekdays) {
        if (shiftDates.has(date)) continue;
        const onLeave = employeeLeaves.some(
          (l) => l.start_date <= date && l.end_date >= date
        );
        if (onLeave) continue;
        hoursWorked += Math.max(0, diffHours(
          `${date} ${employee.default_shift_start}`,
          `${date} ${employee.default_shift_end}`
        ));
      }
    }
    let leaveDays = 0;
    const leaveBreakdown = {};
    for (const leave of employeeLeaves) {
      const clippedStart = leave.start_date < weekStart ? weekStart : leave.start_date;
      const clippedEnd = leave.end_date > weekEnd ? weekEnd : leave.end_date;
      const days = Math.round(
        (new Date(`${clippedEnd}T00:00:00`) - new Date(`${clippedStart}T00:00:00`)) / (1000 * 60 * 60 * 24)
      ) + 1;
      leaveDays += days;
      leaveBreakdown[leave.leave_type] = (leaveBreakdown[leave.leave_type] || 0) + days;
    }

    return {
      employee_id: employee.id,
      name: employee.name,
      department: employee.department,
      hours_worked: Math.round(hoursWorked * 100) / 100,
      leave_days: leaveDays,
      leave_breakdown: leaveBreakdown,
    };
  });

  return { week_start: weekStart, week_end: weekEnd, summary };
}

export function getNsaReport({ start, end } = {}) {
  // Explicit qualifying shifts
  let sql = `
    SELECT e.id AS employee_id, e.email, e.name, e.project_name, s.work_date
    FROM shifts s
    JOIN employees e ON e.id = s.employee_id
    WHERE e.email IS NOT NULL AND e.email != ''
      AND substr(s.start_time, 12, 5) >= '17:30'
  `;
  const params = [];
  if (start) { sql += ' AND s.work_date >= ?'; params.push(start); }
  if (end)   { sql += ' AND s.work_date <= ?'; params.push(end); }
  sql += ' ORDER BY e.name, s.work_date';

  const explicitRows = db.prepare(sql).all(...params);

  // Group by email; store raw ISO dates in a Set for dedup and easy count
  const byEmployee = new Map();
  for (const row of explicitRows) {
    if (!byEmployee.has(row.email)) {
      byEmployee.set(row.email, {
        employee_id: row.employee_id,
        email: row.email,
        name: row.name,
        project_name: row.project_name ?? '',
        dates: new Set(),
      });
    }
    byEmployee.get(row.email).dates.add(row.work_date);
  }

  // Default-shift augmentation — covers all weekdays in the requested range,
  // falling back to a wide historical window when no start date is specified so
  // that default-shift employees appear even without an explicit date filter.
  {
    const effectiveStart = start || '2020-01-01';
    const effectiveEnd = end || todayDate();
    const weekdays = weekdaysInRange(effectiveStart, effectiveEnd);
    const explicitShiftDays = new Set(
      db.prepare('SELECT employee_id, work_date FROM shifts WHERE work_date >= ? AND work_date <= ?')
        .all(effectiveStart, effectiveEnd)
        .map((r) => `${r.employee_id}|${r.work_date}`)
    );

    const defaultNsaEmployees = db.prepare(`
      SELECT * FROM employees
      WHERE email IS NOT NULL AND email != ''
        AND default_shift_start IS NOT NULL
        AND default_shift_start >= '17:30'
    `).all();

    if (defaultNsaEmployees.length > 0) {
      const approvedLeaves = db.prepare(`
        SELECT * FROM leaves
        WHERE status = 'approved' AND start_date <= ? AND end_date >= ?
      `).all(effectiveEnd, effectiveStart);

      const leavesByEmpId = new Map();
      for (const leave of approvedLeaves) {
        if (!leavesByEmpId.has(leave.employee_id)) leavesByEmpId.set(leave.employee_id, []);
        leavesByEmpId.get(leave.employee_id).push(leave);
      }

      for (const employee of defaultNsaEmployees) {
        const empLeaves = leavesByEmpId.get(employee.id) || [];
        let entry = byEmployee.get(employee.email);

        for (const date of weekdays) {
          if (entry?.dates.has(date) || explicitShiftDays.has(`${employee.id}|${date}`)) continue;
          const onLeave = empLeaves.some((l) => l.start_date <= date && l.end_date >= date);
          if (onLeave) continue;

          if (!entry) {
            entry = {
              employee_id: employee.id,
              email: employee.email,
              name: employee.name,
              project_name: employee.project_name ?? '',
              dates: new Set(),
            };
            byEmployee.set(employee.email, entry);
          }
          entry.dates.add(date);
        }
      }
    }
  }

  return Array.from(byEmployee.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((emp) => {
      const sortedDates = Array.from(emp.dates).sort();
      const formattedDates = sortedDates.map((d) => {
        const [y, m, day] = d.split('-');
        return `${m}/${day}/${y}`;
      });
      return {
        email_id: emp.email,
        name: emp.name,
        project_name: emp.project_name,
        type_of_allowance: 'NSA',
        total_amount: emp.dates.size * 900,
        date_worked: formattedDates.join(', '),
      };
    });
}
