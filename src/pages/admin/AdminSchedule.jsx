import { mockJobs } from '../../data/mockData';

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
  const scheduledJobs = mockJobs.filter(j => dateMap[j.date]);

  return (
    <div>
      <div className="page-header">
        <h1>Weekly Schedule</h1>
        <p>Overview of jobs scheduled for this week.</p>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`, gap: '0.75rem' }}>
          {days.map(day => {
            const dayJobs = scheduledJobs.filter(j => dateMap[j.date] === day);
            return (
              <div key={day}>
                <div style={{
                  textAlign: 'center',
                  padding: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#1a202c',
                  borderBottom: '2px solid #e2e8f0',
                  marginBottom: '0.5rem',
                }}>
                  {day}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {dayJobs.length > 0 ? dayJobs.map(job => (
                    <div
                      key={job.id}
                      style={{
                        background: statusColor[job.status] || '#f1f5f9',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{job.service}</div>
                      <div style={{ color: '#4a5568' }}>{job.client}</div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {job.assignee}
                      </div>
                    </div>
                  )) : (
                    <div style={{
                      textAlign: 'center',
                      color: '#94a3b8',
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
              {mockJobs.map((job) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
