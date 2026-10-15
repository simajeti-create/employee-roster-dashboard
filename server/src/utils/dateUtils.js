function pad(n) {
  return String(n).padStart(2, '0');
}

export function todayDate(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function nowDateTime(now = new Date()) {
  return `${todayDate(now)} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function startOfWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return todayDate(d);
}

export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return todayDate(d);
}

export function diffHours(startDateTime, endDateTime) {
  const start = new Date(startDateTime.replace(' ', 'T'));
  const end = new Date(endDateTime.replace(' ', 'T'));
  let ms = end.getTime() - start.getTime();
  // Shift crosses midnight — end time is numerically before start time on the same date
  if (ms < 0) ms += 24 * 60 * 60 * 1000;
  return ms / (1000 * 60 * 60);
}

function timeOfDay(value) {
  return value.length > 5 ? value.slice(-5) : value;
}

// Given a work_date and start/end times (either "HH:MM" or a full "YYYY-MM-DD HH:MM"
// datetime), returns correctly-dated "YYYY-MM-DD HH:MM" datetimes for both. When the
// shift crosses midnight (end time is not after start time), the end datetime is
// rolled onto the following calendar day so that downstream comparisons against
// "now" (and duration math) are chronologically correct.
export function resolveShiftDateTimes(work_date, start_time, end_time) {
  const startTod = timeOfDay(start_time);
  const endTod = timeOfDay(end_time);
  const endDate = endTod <= startTod ? addDays(work_date, 1) : work_date;
  return {
    start_time: `${work_date} ${startTod}`,
    end_time: `${endDate} ${endTod}`,
  };
}
