import * as employeeService from '../services/employeeService.js';

export function list(req, res) {
  const { department, employment_status } = req.query;
  res.json(employeeService.listEmployees({ department, employment_status }));
}

export function get(req, res) {
  const employee = employeeService.getEmployee(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  res.json(employee);
}

export function create(req, res) {
  const { name, department, role, email, project_name } = req.body;
  if (!name || !department || !role || !email || !project_name) {
    return res.status(400).json({ error: 'name, department, role, email, and project_name are required' });
  }
  res.status(201).json(employeeService.createEmployee(req.body));
}

export function update(req, res) {
  const employee = employeeService.updateEmployee(req.params.id, req.body);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  res.json(employee);
}

export function remove(req, res) {
  const deleted = employeeService.deleteEmployee(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Employee not found' });
  res.status(204).end();
}
