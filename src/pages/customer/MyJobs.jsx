import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../api';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';

const statusBadge = (status) => {
  const map = {
    'Completed': 'badge badge-green',
    'In Progress': 'badge badge-blue',
    'Scheduled': 'badge badge-yellow',
  };
  return map[status] || 'badge badge-gray';
};

const PAGE_SIZE = 10;

export default function MyJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    if (user) {
      apiGet(`/jobs?user_id=${user.id}`)
        .then(setJobs)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const sorted = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [jobs, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <h1>My Jobs</h1>
        <p>Track the progress of your landscaping jobs.</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <SortableHeader label="Job ID" field="id" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Service" field="service" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Date" field="date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Assignee</th>
                <th>Status</th>
                <SortableHeader label="Amount" field="amount" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={6} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <EmptyState icon="&#128188;" title="No jobs yet" message="Jobs will appear here once your quote is approved and converted." />
                  </td>
                </tr>
              ) : (
                paginated.map((job) => (
                  <tr key={job.id}>
                    <td style={{ fontWeight: 500 }}>{job.id}</td>
                    <td>{job.service}</td>
                    <td>{job.date}</td>
                    <td>{job.assignee}</td>
                    <td><span className={statusBadge(job.status)}>{job.status}</span></td>
                    <td>{job.amount ? `$${Number(job.amount).toLocaleString()}` : '\u2014'}</td>
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
