const COLORS = ["#2563eb", "#ea580c", "#16a34a", "#7c3aed", "#64748b"];

/** Horizontal bar comparison — no chart library required. */
export default function CompareBars({ title, segments = [] }) {
  const total = segments.reduce((s, x) => s + Number(x.value || 0), 0);
  const max = Math.max(...segments.map((s) => Number(s.value || 0)), 1);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-bold text-btt-navy mb-3 text-center leading-snug">{title}</h3>
      <div className="text-center text-2xl font-bold text-btt-navy tabular-nums mb-4">{total}</div>
      <ul className="space-y-3 flex-1">
        {segments.length === 0 && <li className="text-slate-500 text-center text-sm">No data</li>}
        {segments.map((s, i) => {
          const value = Number(s.value || 0);
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          const width = `${Math.max(6, (value / max) * 100)}%`;
          const color = s.color || COLORS[i % COLORS.length];
          return (
            <li key={`${s.label}-${i}`}>
              <div className="flex items-center justify-between gap-2 text-xs mb-1">
                <span className="font-medium text-slate-700 truncate">{s.label}</span>
                <span className="tabular-nums text-slate-900 font-semibold shrink-0">
                  {value} · {pct}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width, background: color }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
