export default function SortableHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <th
      className="sortable-th"
      onClick={() => onSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      {label}
      <span className="sort-indicator">
        {active ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : ' \u25B4\u25BE'}
      </span>
    </th>
  );
}
