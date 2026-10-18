import { addDays, formatDayLabel, startOfWeek, todayStr } from '../../utils/dateUtils.js';

export function PageHeader({ title, subtitle }) {
  return (
    <div>
      <h1 className="font-grotesk text-2xl font-bold m-0" style={{ color: '#1a1a2e' }}>{title}</h1>
      <p className="text-sm text-gray-400 mt-1 m-0">{subtitle}</p>
    </div>
  );
}

export function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E6E4EF' }}>
      {title && <h3 className="font-grotesk text-sm font-semibold text-gray-700 mb-4 mt-0">{title}</h3>}
      {children}
    </div>
  );
}

export function StatTile({ label, value }) {
  return (
    <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #E6E4EF' }}>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="font-grotesk text-2xl font-bold" style={{ color: '#1a1a2e' }}>{value}</div>
    </div>
  );
}

export function WeekNav({ weekStart, onChange }) {
  const end = addDays(weekStart, 6);
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(addDays(weekStart, -7))} aria-label="Previous week">&larr;</button>
      <span className="text-sm text-gray-600" style={{ minWidth: 200, textAlign: 'center' }}>
        {formatDayLabel(weekStart)} to {formatDayLabel(end)}
      </span>
      <button onClick={() => onChange(addDays(weekStart, 7))} aria-label="Next week">&rarr;</button>
      <button onClick={() => onChange(startOfWeek(todayStr()))}>This week</button>
    </div>
  );
}

export function Legend({ items }) {
  return (
    <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
      {items.map(({ label, color, dashed }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span
            style={{
              width: 10, height: 10, borderRadius: 2, display: 'inline-block',
              background: dashed ? 'transparent' : color,
              border: dashed ? `1.5px dashed ${color}` : 'none',
            }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
