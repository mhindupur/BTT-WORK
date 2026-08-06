const COLORS = [
  "#16a34a",
  "#ea580c",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#ca8a04",
  "#64748b",
  "#0f2744",
  "#1e5a8e",
];

/** Simple SVG donut chart — no chart library required. */
export default function DonutChart({ title, segments = [], size = 180, centerLabel }) {
  const total = segments.reduce((s, x) => s + Number(x.value || 0), 0);
  const r = 56;
  const c = 2 * Math.PI * r;
  let offset = 0;

  const slices =
    total > 0
      ? segments.map((seg, i) => {
          const value = Number(seg.value || 0);
          const len = (value / total) * c;
          const item = {
            ...seg,
            color: seg.color || COLORS[i % COLORS.length],
            dash: `${len} ${c - len}`,
            offset: -offset,
          };
          offset += len;
          return item;
        })
      : [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-bold text-btt-navy mb-3 text-center leading-snug">{title}</h3>
      <div className="flex flex-col items-center gap-3 flex-1">
        <svg width={size} height={size} viewBox="0 0 140 140" className="shrink-0">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="18" />
          {slices.map((s, i) => (
            <circle
              key={`${s.label}-${i}`}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="18"
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
              transform="rotate(-90 70 70)"
            />
          ))}
          <text x="70" y="66" textAnchor="middle" className="fill-slate-800" fontSize="16" fontWeight="700">
            {centerLabel != null ? centerLabel : total}
          </text>
          <text x="70" y="82" textAnchor="middle" className="fill-slate-500" fontSize="9">
            Total
          </text>
        </svg>
        <ul className="w-full text-xs space-y-1 max-h-36 overflow-auto">
          {segments.length === 0 && <li className="text-slate-500 text-center">No data</li>}
          {segments.map((s, i) => (
            <li key={`${s.label}-${i}`} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: s.color || COLORS[i % COLORS.length] }}
                />
                <span className="truncate text-slate-700">{s.label}</span>
              </span>
              <span className="font-semibold text-slate-900 tabular-nums">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
