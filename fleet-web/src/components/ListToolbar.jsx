/**
 * Shared list header: title/count, search, optional filter selects, Excel export.
 */
export default function ListToolbar({
  title,
  count,
  totalCount,
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters = [],
  onExport,
  exportLabel = "Export Excel",
  exportDisabled = false,
  className = "",
}) {
  const shown =
    typeof count === "number"
      ? typeof totalCount === "number" && totalCount !== count
        ? `${count} of ${totalCount}`
        : String(count)
      : null;

  return (
    <div className={`px-4 py-3 border-b bg-slate-50 space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-700">
          {title}
          {shown != null ? ` (${shown})` : null}
        </div>
        {onExport ? (
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
            {exportLabel}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {onSearchChange ? (
          <input
            className="flex-1 min-w-[180px] border rounded-lg px-3 py-2 text-sm bg-white"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        ) : null}
        {filters.map((f) => (
          <select
            key={f.key || f.label}
            className="border rounded-lg px-3 py-2 text-sm bg-white min-w-[140px]"
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            aria-label={f.label}
            title={f.label}
          >
            {(f.options || []).map((o) => (
              <option key={`${f.key || f.label}-${o.value}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}
