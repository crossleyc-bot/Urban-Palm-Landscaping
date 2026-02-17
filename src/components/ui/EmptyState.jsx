export default function EmptyState({ icon = '📋', title = 'No data yet', message = '' }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {message && <p className="empty-state-message">{message}</p>}
    </div>
  );
}
