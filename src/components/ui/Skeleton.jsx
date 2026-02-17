export function SkeletonRow({ cols = 5 }) {
  return (
    <tr className="skeleton-row">
      {Array.from({ length: cols }, (_, i) => (
        <td key={i}>
          <div className="skeleton-bar" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-bar" style={{ width: '40%', height: 12, marginBottom: 8 }} />
      <div className="skeleton-bar" style={{ width: '60%', height: 28 }} />
    </div>
  );
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="stats-grid">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
