import { useState, useEffect } from 'react';
import { apiGet } from '../../api';
import { SkeletonTable } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';

const days = ['Mon 2/16', 'Tue 2/17', 'Wed 2/18', 'Thu 2/19', 'Fri 2/20'];
const dateMap = {
  '2026-02-16': 'Mon 2/16',
  '2026-02-17': 'Tue 2/17',
  '2026-02-18': 'Wed 2/18',
  '2026-02-19': 'Thu 2/19',
  '2026-02-20': 'Fri 2/20',
};

const statusColor = {
  'Completed': '#dcfce7',
  'In Progress': '#dbeafe',
  'Scheduled': '#fef3c7',
};

export default function AdminSchedule() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/jobs').then(setJobs).finally(() => setLoading(false));
  }, []);

  const scheduledJobs = jobs.filter(j => dateMap[j.date]);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>Weekly Schedule</h1>
          <p>Overview of jobs scheduled for this week.</p>
        </div>
        <div className="page-loading">
          <Spinner size={24} /> Loading schedule...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Weekly Schedule</h1>
        <p>Overview of jobs scheduled for this week.</p>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`, gap: '0.75rem', overflowX: 'auto' }}>
          {days.map(day => {
            const dayJobs = scheduledJobs.filter(j => dateMap[j.date] === day);
            return (
              <div key={day}>
                <div style={{
                  textAlign: 'center',
                  padding: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: 'var(--color-text)',
                  borderBottom: '2px solid var(--color-border)',
                  marginBottom: '0.5rem',
                }}>
                  {day}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {dayJobs.length > 0 ? dayJobs.map(job => (
                    <div
                      key={job.id}
                      style={{
                        background: statusColor[job.status] || 'var(--color-bg-tertiary)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        fontSize: '0.8rem',
                        transition: 'transform 0.15s',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{job.service}</div>
                      <div style={{ color: 'var(--color-text-secondary)' }}>{job.client}</div>
                      <div style={{ color: 'var(--color-text-faint)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {job.assignee}
                      </div>
                    </div>
                  )) : (
                    <div style={{
                      textAlign: 'center',
                      color: 'var(--color-text-faint)',
                      fontSize: '0.8rem',
                      padding: '1rem 0.5rem',
                    }}>
                      No jobs
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>All Scheduled Jobs</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Client</th>
                <th>Service</th>
                <th>Assignee</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <EmptyState icon="&#128197;" title="No jobs scheduled" />
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id}>
                    <td style={{ fontWeight: 500 }}>{job.id}</td>
                    <td>{job.client}</td>
                    <td>{job.service}</td>
                    <td>{job.assignee}</td>
                    <td>{job.date}</td>
                    <td>
                      <span className={`badge ${job.status === 'Completed' ? 'badge-green' : job.status === 'In Progress' ? 'badge-blue' : 'badge-yellow'}`}>
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
