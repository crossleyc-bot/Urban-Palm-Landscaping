import { mockEmployees } from '../../data/mockData';

export default function ManageEmployees() {
  return (
    <div>
      <div className="page-header">
        <h1>Employees</h1>
        <p>Manage your team members and their information.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Staff</div>
          <div className="stat-value">{mockEmployees.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value">{mockEmployees.filter(e => e.status === 'Active').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">On Leave</div>
          <div className="stat-value">{mockEmployees.filter(e => e.status === 'On Leave').length}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockEmployees.map((emp) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
