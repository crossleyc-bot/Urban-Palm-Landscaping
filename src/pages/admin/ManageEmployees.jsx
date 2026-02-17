import { useState, useEffect } from 'react';
import { apiGet } from '../../api';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCards, SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';
import { useMemo } from 'react';

const PAGE_SIZE = 10;

export default function ManageEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');

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

  return (
    <div>
      <div className="page-header">
        <h1>Employees</h1>
        <p>Manage your team members and their information.</p>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={6} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <EmptyState icon="&#128101;" title="No employees found" />
                  </td>
                </tr>
              ) : (
                paginated.map((emp) => (
                  <tr key={emp.id}>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
