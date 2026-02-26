import { useState, useEffect, useMemo, useRef } from 'react';
import { apiGet, apiPostForm, apiPutForm, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCards, SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';

const PAGE_SIZE = 10;
const emptyForm = { name: '', role: '', phone: '', email: '', status: 'Active', show_on_website: false };

const avatarStyle = {
  width: 40, height: 40, borderRadius: '50%', objectFit: 'cover',
  border: '2px solid var(--color-border)',
};
const avatarPlaceholder = {
  ...avatarStyle,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)',
  fontSize: '1rem', fontWeight: 600,
};

function Avatar({ src, name }) {
  if (src) return <img src={src} alt={name} style={avatarStyle} />;
  return <div style={avatarPlaceholder}>{(name || '?').charAt(0).toUpperCase()}</div>;
}

function PhotoPicker({ file, preview, onPick }) {
  const ref = useRef();
  const handleChange = (e) => {
    const f = e.target.files[0];
    if (f) onPick(f);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {preview
        ? <img src={preview} alt="preview" style={avatarStyle} />
        : <div style={avatarPlaceholder}>?</div>
      }
      <button type="button" className="btn btn-outline btn-sm" onClick={() => ref.current.click()}>
        {file ? 'Change' : 'Upload'}
      </button>
      <input ref={ref} type="file" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
    </div>
  );
}

export default function ManageEmployees() {
  const { addToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
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

  const pickImage = (file) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const startEdit = (emp) => {
    setAdding(false);
    setEditing(emp.id);
    setForm({ name: emp.name, role: emp.role, phone: emp.phone || '', email: emp.email || '', status: emp.status, show_on_website: !!emp.show_on_website });
    setImageFile(null);
    setImagePreview(emp.image || null);
  };

  const startAdd = () => {
    setEditing(null);
    setAdding(true);
    setForm(emptyForm);
    clearImage();
  };

  const cancel = () => {
    setEditing(null);
    setAdding(false);
    setForm({});
    clearImage();
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('role', form.role);
    fd.append('phone', form.phone);
    fd.append('email', form.email);
    fd.append('status', form.status);
    fd.append('show_on_website', form.show_on_website ? '1' : '0');
    if (imageFile) fd.append('image', imageFile);
    return fd;
  };

  const saveEdit = async (empId) => {
    if (!form.name.trim() || !form.role.trim()) return;
    setSaving(true);
    try {
      const result = await apiPutForm(`/employees/${empId}`, buildFormData());
      setEmployees(prev => prev.map(e =>
        e.id === empId ? { ...e, ...form, image: result.image ?? e.image, show_on_website: result.show_on_website ?? e.show_on_website } : e
      ));
      setEditing(null);
      clearImage();
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
      const created = await apiPostForm('/employees', buildFormData());
      setEmployees(prev => [...prev, { id: created.id, image: created.image, ...form }]);
      setAdding(false);
      setForm({});
      clearImage();
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
                <th style={{ width: '60px' }}>Photo</th>
                <SortableHeader label="ID" field="id" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Role" field="role" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Website</th>
                <th style={{ width: '160px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={8} />
              ) : paginated.length === 0 && !adding ? (
                <tr>
                  <td colSpan="9">
                    <EmptyState icon="&#128101;" title="No employees found" message="Add your first employee to get started." />
                  </td>
                </tr>
              ) : (
                <>
                  {paginated.map((emp) => (
                    <tr key={emp.id}>
                      {editing === emp.id ? (
                        <>
                          <td><PhotoPicker file={imageFile} preview={imagePreview} onPick={pickImage} /></td>
                          <td style={{ fontWeight: 500 }}>{emp.id}</td>
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
                          <td style={{ textAlign: 'center' }}>
                            <input type="checkbox" checked={form.show_on_website} onChange={e => setForm(f => ({ ...f, show_on_website: e.target.checked }))} />
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
                          <td><Avatar src={emp.image} name={emp.name} /></td>
                          <td style={{ fontWeight: 500 }}>{emp.id}</td>
                          <td>{emp.name}</td>
                          <td>{emp.role}</td>
                          <td>{emp.phone}</td>
                          <td>{emp.email}</td>
                          <td>
                            <span className={`badge ${emp.status === 'Active' ? 'badge-green' : 'badge-yellow'}`}>
                              {emp.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {emp.show_on_website ? <span style={{ color: '#16a34a', fontWeight: 600 }}>Yes</span> : <span style={{ color: 'var(--color-text-muted)' }}>No</span>}
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
                      <td><PhotoPicker file={imageFile} preview={imagePreview} onPick={pickImage} /></td>
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
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={form.show_on_website} onChange={e => setForm(f => ({ ...f, show_on_website: e.target.checked }))} />
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
