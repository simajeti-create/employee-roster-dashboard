import { useMemo, useState } from 'react';
import { todayStr, addDays, startOfWeek, formatDate } from '../../utils/dateUtils.js';

const MODES = [
  { key: 'week',   label: 'Week'  },
  { key: 'month',  label: 'Month' },
  { key: 'custom', label: 'From – To' },
];

export function prettyDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Week / Month / From–To selection shared by the report pages.
export function usePeriod() {
  const [mode, setMode] = useState('month');
  const [anchor, setAnchor] = useState(todayStr());
  const [customStart, setCustomStart] = useState(startOfWeek(todayStr()));
  const [customEnd, setCustomEnd] = useState(addDays(startOfWeek(todayStr()), 6));

  const { start, end } = useMemo(() => {
    if (mode === 'week') {
      const s = startOfWeek(anchor);
      return { start: s, end: addDays(s, 6) };
    }
    if (mode === 'month') {
      const d = new Date(`${anchor}T00:00:00`);
      return {
        start: formatDate(new Date(d.getFullYear(), d.getMonth(), 1)),
        end: formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
      };
    }
    return { start: customStart, end: customEnd };
  }, [mode, anchor, customStart, customEnd]);

  const rangeValid = Boolean(start && end && start <= end);

  function step(direction) {
    if (mode === 'week') {
      setAnchor((d) => addDays(d, 7 * direction));
    } else {
      setAnchor((d) => {
        const x = new Date(`${d}T00:00:00`);
        return formatDate(new Date(x.getFullYear(), x.getMonth() + direction, 1));
      });
    }
  }

  const label = mode === 'month'
    ? new Date(`${start}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : rangeValid ? `${prettyDate(start)} – ${prettyDate(end)}` : 'Pick a valid range';

  return {
    mode, setMode, setAnchor, customStart, setCustomStart, customEnd, setCustomEnd,
    start, end, rangeValid, step, label,
  };
}

export default function PeriodSelector({ period }) {
  const { mode, setMode, setAnchor, customStart, setCustomStart, customEnd, setCustomEnd, rangeValid, step, label } = period;
  return (
    <div className="bg-white rounded-2xl p-5 flex items-center gap-4 flex-wrap" style={{ border: '1px solid #E6E4EF' }}>
      <div className="flex rounded-full p-1" style={{ background: '#F5F4FA' }} role="tablist" aria-label="Report period">
        {MODES.map(({ key, label: l }) => (
          <button
            key={key}
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className="rounded-full text-sm font-semibold"
            style={{
              border: 'none',
              padding: '6px 18px',
              background: mode === key ? 'linear-gradient(135deg, #6C4CF1, #9B7CFB)' : 'transparent',
              color: mode === key ? '#fff' : '#6b7280',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {mode !== 'custom' ? (
        <div className="flex items-center gap-2">
          <button onClick={() => step(-1)} aria-label={`Previous ${mode}`} className="rounded-full" style={{ padding: '6px 14px' }}>←</button>
          <span className="font-grotesk text-sm font-semibold" style={{ color: '#1a1a2e', minWidth: 210, textAlign: 'center' }}>{label}</span>
          <button onClick={() => step(1)} aria-label={`Next ${mode}`} className="rounded-full" style={{ padding: '6px 14px' }}>→</button>
          <button
            onClick={() => setAnchor(todayStr())}
            className="rounded-full text-sm font-medium"
            style={{ color: '#6C4CF1', borderColor: '#D5CBFB', background: '#EEEAFD' }}
          >
            {mode === 'week' ? 'This week' : 'This month'}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">From</span>
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ width: 'auto' }} />
          <span className="text-sm text-gray-500">To</span>
          <input type="date" value={customEnd} min={customStart} onChange={(e) => setCustomEnd(e.target.value)} style={{ width: 'auto' }} />
          {!rangeValid && <span className="text-sm" style={{ color: '#DC5346' }}>From date must be on or before the to date.</span>}
        </div>
      )}
    </div>
  );
}
