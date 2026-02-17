import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPut } from '../../api';
import { useToast } from '../../components/ui/Toast';
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

export default function ManageJobs() {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    apiGet('/jobs').then(setJobs).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? jobs : jobs.filter(j => j.status === filter);

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
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateStatus = async (id, newStatus) => {
    try {
      await apiPut(`/jobs/${id}/status`, { status: newStatus });
      setJobs(jobs.map(j => j.id === id ? { ...j, status: newStatus } : j));
      addToast(`Job marked as ${newStatus}`, 'success');
    } catch {
      addToast('Failed to update job status', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Manage Jobs</h1>
        <p>View and manage all landscaping jobs.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['All', 'Scheduled', 'In Progress', 'Completed'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setFilter(f); setPage(1); }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <SortableHeader label="Job ID" field="id" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Client" field="client" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Service" field="service" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Assignee" field="assignee" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Date" field="date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={7} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState icon="&#128188;" title="No jobs found" message={filter !== 'All' ? `No ${filter.toLowerCase()} jobs.` : 'Jobs will appear here once created.'} />
                  </td>
                </tr>
              ) : (
                paginated.map((job) => (
                  <tr key={job.id}>
                    <td style={{ fontWeight: 500 }}>{job.id}</td>
                    <td>{job.client}</td>
                    <td>{job.service}</td>
                    <td>{job.assignee}</td>
                    <td>{job.date}</td>
                    <td><span className={statusBadge(job.status)}>{job.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {job.status === 'Scheduled' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(job.id, 'In Progress')}>
                            Start
                          </button>
                        )}
                        {job.status === 'In Progress' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(job.id, 'Completed')}>
                            Complete
                          </button>
                        )}
                      </div>
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
