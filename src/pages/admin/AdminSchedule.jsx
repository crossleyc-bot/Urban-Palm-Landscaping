import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '../../api';
import { useToast } from '../../components/ui/Toast';
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

const JOB_STATUSES = ['Scheduled', 'In Progress', 'Completed'];

export default function AdminSchedule() {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/jobs').then(setJobs).finally(() => setLoading(false));
  }, []);

  const scheduledJobs = jobs.filter(j => dateMap[j.date]);

  const startEdit = (job) => {
    setEditing(job.id);
    setForm({ client: job.client, service: job.service, assignee: job.assignee, date: job.date, status: job.status });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({});
  };

  const saveEdit = async (jobId) => {
    setSaving(true);
    try {
      await apiPut(`/jobs/${jobId}`, form);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...form } : j));
      setEditing(null);
      addToast('Job updated successfully', 'success');
    } catch {
      addToast('Failed to update job', 'error');
    } finally {
      setSaving(false);
    }
  };

  const quickStatusChange = async (jobId, newStatus) => {
    try {
      await apiPut(`/jobs/${jobId}/status`, { status: newStatus });
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
      addToast(`Job marked as ${newStatus}`, 'success');
    } catch {
      addToast('Failed to update status', 'error');
    }
  };

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
                      <select
                        style={{
                          marginTop: '0.5rem',
                          fontSize: '0.7rem',
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          border: '1px solid var(--color-border)',
                          background: 'rgba(255,255,255,0.7)',
                          width: '100%',
                          cursor: 'pointer',
                        }}
                        value={job.status}
                        onChange={(e) => quickStatusChange(job.id, e.target.value)}
                      >
                        {JOB_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState icon="&#128197;" title="No jobs scheduled" />
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id}>
                    <td style={{ fontWeight: 500 }}>{job.id}</td>
                    {editing === job.id ? (
                      <>
                        <td><input className="table-input" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} /></td>
                        <td><input className="table-input" value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))} /></td>
                        <td><input className="table-input" value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} /></td>
                        <td><input className="table-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></td>
                        <td>
                          <select className="table-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                            {JOB_STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(job.id)} disabled={saving}>Save</button>
                            <button className="btn btn-outline btn-sm" onClick={cancelEdit}>Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{job.client}</td>
                        <td>{job.service}</td>
                        <td>{job.assignee}</td>
                        <td>{job.date}</td>
                        <td>
                          <span className={`badge ${job.status === 'Completed' ? 'badge-green' : job.status === 'In Progress' ? 'badge-blue' : 'badge-yellow'}`}>
                            {job.status}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => startEdit(job)}>Edit</button>
                        </td>
                      </>
                    )}
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
