import { useEffect, useMemo, useState } from 'react';
import { Card, Legend, PageHeader } from '../components/common/InsightBits.jsx';
import DepartmentFilter from '../components/filters/DepartmentFilter.jsx';
import * as employeesApi from '../api/employees.js';
import * as leavesApi from '../api/leaves.js';
import { formatDate, todayStr } from '../utils/dateUtils.js';
import { monthRange } from '../utils/insights.js';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function LeaveCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [department, setDepartment] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => { employeesApi.listEmployees().then(setEmployees); }, []);
  useEffect(() => {
    const { first, last } = monthRange(year, month);
    leavesApi.listLeaves({ start: first, end: last }).then(setLeaves);
    setSelected(null);
  }, [year, month]);

  const byId = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const departments = useMemo(() => [...new Set(employees.map((e) => e.department))].sort(), [employees]);

  const visible = useMemo(
    () => leaves
      .filter((l) => l.status !== 'rejected')
      .map((l) => ({ ...l, employee: byId.get(l.employee_id) }))
      .filter((l) => l.employee && (!department || l.employee.department === department)),
    [leaves, byId, department]
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const today = todayStr();

  function leavesOn(dateStr) {
    return visible.filter((l) => l.start_date <= dateStr && l.end_date >= dateStr);
  }

  function hasOverlap(list) {
    const counts = {};
    for (const l of list) counts[l.employee.department] = (counts[l.employee.department] || 0) + 1;
    return Object.values(counts).some((n) => n >= 2);
  }

  function shiftMonth(delta) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const selectedLeaves = selected ? leavesOn(selected) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leave calendar"
        subtitle="Approved and pending leave by day. A warning marks days when two or more people from one department are out."
      />

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => shiftMonth(-1)} aria-label="Previous month">&larr;</button>
        <span className="font-grotesk text-sm font-semibold text-gray-700" style={{ minWidth: 140, textAlign: 'center' }}>
          {new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => shiftMonth(1)} aria-label="Next month">&rarr;</button>
        <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}>Today</button>
        <DepartmentFilter departments={departments} value={department} onChange={setDepartment} />
        <div className="ml-auto">
          <Legend items={[{ label: 'Approved', color: '#6C4CF1' }, { label: 'Pending', color: '#D79A2C', dashed: true }, { label: '2+ from one department', color: '#DC5346' }]} />
        </div>
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, fontSize: 11 }}>
          {DOW.map((d) => <div key={d} className="text-center text-gray-500 pb-1">{d}</div>)}
          {Array.from({ length: offset }, (_, i) => <div key={`o${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = formatDate(new Date(year, month, day));
            const list = leavesOn(dateStr);
            const weekend = ((offset + i) % 7) >= 5;
            return (
              <div
                key={day}
                onClick={() => setSelected(dateStr)}
                style={{
                  minHeight: 78, padding: 4, borderRadius: 8, cursor: 'pointer', overflow: 'hidden',
                  background: weekend ? '#FAF9FD' : '#fff',
                  border: selected === dateStr ? '2px solid #6C4CF1' : dateStr === today ? '1.5px solid #9B7CFB' : '1px solid #E6E4EF',
                }}
              >
                <div className="flex justify-between text-gray-500">
                  <span>{day}</span>
                  {hasOverlap(list) && <span title="2+ people from one department are out" style={{ color: '#DC5346', fontWeight: 700 }}>!</span>}
                </div>
                {list.slice(0, 3).map((l) => (
                  <div
                    key={l.id}
                    style={{
                      marginTop: 2, padding: '0 4px', borderRadius: 4, fontSize: 10, lineHeight: '15px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      ...(l.status === 'approved'
                        ? { background: '#6C4CF1', color: '#fff' }
                        : { border: '1px dashed #D79A2C', color: '#8A5E0F', background: '#FBF1DD' }),
                    }}
                  >
                    {l.employee.name}
                  </div>
                ))}
                {list.length > 3 && <div className="text-gray-400" style={{ fontSize: 10 }}>+{list.length - 3} more</div>}
              </div>
            );
          })}
        </div>
      </Card>

      {selected && (
        <Card title={`Out on ${selected}`}>
          {selectedLeaves.length === 0 ? (
            <p className="text-sm text-gray-400 m-0">Nobody is on leave.</p>
          ) : (
            <ul className="m-0 p-0 text-sm text-gray-600" style={{ listStyle: 'none' }}>
              {selectedLeaves.map((l) => (
                <li key={l.id} className="py-1">
                  <strong>{l.employee.name}</strong> · {l.employee.department} · {l.leave_type} · {l.status}
                  {l.reason ? ` · ${l.reason}` : ''}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
