import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCards, SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';

const PAGE_SIZE = 10;
const emptyForm = { name: '', role: '', phone: '', email: '', status: 'Active' };

export default function ManageEmployees() {
  const { addToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    apiGet('/employees').then(setEmployees).finally(() => setLoading(false));
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sorted = useMemo(() => {
    return [...employees].sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [employees, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const startEdit = (emp) => {
    setAdding(false);
    setEditing(emp.id);
    setForm({ name: emp.name, role: emp.role, phone: emp.phone || '', email: emp.email || '', status: emp.status });
  };

  const startAdd = () => {
    setEditing(null);
    setAdding(true);
    setForm(emptyForm);
  };

  const cancel = () => {
    setEditing(null);
    setAdding(false);
    setForm({});
  };

  const saveEdit = async (empId) => {
    if (!form.name.trim() || !form.role.trim()) return;
    setSaving(true);
    try {
      await apiPut(`/employees/${empId}`, form);
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, ...form } : e));
      setEditing(null);
      addToast('Employee updated successfully', 'success');
    } catch {
      addToast('Failed to update employee', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveNew = async () => {
    if (!form.name.trim() || !form.role.trim()) return;
    setSaving(true);
    try {
      const created = await apiPost('/employees', form);
      setEmployees(prev => [...prev, { id: created.id, ...form }]);
      setAdding(false);
      setForm({});
      addToast('Employee added successfully', 'success');
    } catch {
      addToast('Failed to add employee', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteEmployee = async (empId) => {
    try {
      await apiDelete(`/employees/${empId}`);
      setEmployees(prev => prev.filter(e => e.id !== empId));
      addToast('Employee deleted', 'success');
    } catch {
      addToast('Failed to delete employee', 'error');
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Employees</h1>
          <p>Manage your team members and their information.</p>
        </div>
        {!adding && (
          <button className="btn btn-primary" onClick={startAdd}>+ Add Employee</button>
        )}
      </div>

      {loading ? (
        <SkeletonCards count={3} />
      ) : (
        <div className="stats-grid stagger-list">
          <div className="stat-card">
            <div className="stat-label">Total Staff</div>
            <div className="stat-value">{employees.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active</div>
            <div className="stat-value">{employees.filter(e => e.status === 'Active').length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">On Leave</div>
            <div className="stat-value">{employees.filter(e => e.status === 'On Leave').length}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <SortableHeader label="ID" field="id" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Role" field="role" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th style={{ width: '160px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={7} />
              ) : paginated.length === 0 && !adding ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState icon="&#128101;" title="No employees found" message="Add your first employee to get started." />
                  </td>
                </tr>
              ) : (
                <>
                  {paginated.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 500 }}>{emp.id}</td>
                      {editing === emp.id ? (
                        <>
                          <td><input className="table-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" /></td>
                          <td><input className="table-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Job title" /></td>
                          <td><input className="table-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" /></td>
                          <td><input className="table-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" /></td>
                          <td>
                            <select className="table-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                              <option>Active</option>
                              <option>On Leave</option>
                            </select>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn btn-primary btn-sm" onClick={() => saveEdit(emp.id)} disabled={saving || !form.name.trim() || !form.role.trim()}>Save</button>
                              <button className="btn btn-outline btn-sm" onClick={cancel}>Cancel</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{emp.name}</td>
                          <td>{emp.role}</td>
                          <td>{emp.phone}</td>
                          <td>{emp.email}</td>
                          <td>
                            <span className={`badge ${emp.status === 'Active' ? 'badge-green' : 'badge-yellow'}`}>
                              {emp.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn btn-outline btn-sm" onClick={() => startEdit(emp)}>Edit</button>
                              <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => deleteEmployee(emp.id)}>Delete</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}

                  {adding && (
                    <tr>
                      <td style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Auto</td>
                      <td><input className="table-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" /></td>
                      <td><input className="table-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Job title" /></td>
                      <td><input className="table-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" /></td>
                      <td><input className="table-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" /></td>
                      <td>
                        <select className="table-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                          <option>Active</option>
                          <option>On Leave</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-primary btn-sm" onClick={saveNew} disabled={saving || !form.name.trim() || !form.role.trim()}>Add</button>
                          <button className="btn btn-outline btn-sm" onClick={cancel}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
