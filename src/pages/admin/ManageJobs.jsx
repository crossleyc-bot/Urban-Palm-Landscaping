import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '../../api';

const statusBadge = (status) => {
  const map = {
    'Completed': 'badge badge-green',
    'In Progress': 'badge badge-blue',
    'Scheduled': 'badge badge-yellow',
  };
  return map[status] || 'badge badge-gray';
};

export default function ManageJobs() {
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    apiGet('/jobs').then(setJobs);
  }, []);

  const filtered = filter === 'All' ? jobs : jobs.filter(j => j.status === filter);

  const updateStatus = async (id, newStatus) => {
    await apiPut(`/jobs/${id}/status`, { status: newStatus });
    setJobs(jobs.map(j => j.id === id ? { ...j, status: newStatus } : j));
  };

  return (
    <div>
      <div className="page-header">
        <h1>Manage Jobs</h1>
        <p>View and manage all landscaping jobs.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['All', 'Scheduled', 'In Progress', 'Completed'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(f)}
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
                <th>Job ID</th>
                <th>Client</th>
                <th>Service</th>
                <th>Assignee</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
