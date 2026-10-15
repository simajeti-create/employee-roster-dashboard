import { useEffect, useMemo, useState } from 'react';
import RosterGrid from '../components/roster/RosterGrid.jsx';
import DepartmentFilter from '../components/filters/DepartmentFilter.jsx';
import * as employeesApi from '../api/employees.js';
import { startOfWeek, todayStr } from '../utils/dateUtils.js';

export default function Roster() {
  const [employees,        setEmployees]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [weekStart,        setWeekStart]        = useState(startOfWeek(todayStr()));

  useEffect(() => {
    employeesApi
      .listEmployees({ employment_status: 'active' })
      .then(setEmployees)
      .finally(() => setLoading(false));
  }, []);

  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department))].sort(),
    [employees]
  );

  const filteredEmployees = useMemo(
    () => (departmentFilter ? employees.filter((e) => e.department === departmentFilter) : employees),
    [employees, departmentFilter]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-grotesk text-2xl font-bold m-0" style={{ color: '#1a1a2e' }}>
          Roster
        </h1>
        <p className="text-sm text-gray-400 mt-1 m-0">
          Weekly shift schedule for all active employees.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <DepartmentFilter departments={departments} value={departmentFilter} onChange={setDepartmentFilter} />
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E6E4EF' }}>
          <RosterGrid
            employees={filteredEmployees}
            weekStart={weekStart}
            onWeekChange={setWeekStart}
          />
        </div>
      )}
    </div>
  );
}
