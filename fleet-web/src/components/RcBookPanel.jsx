/** RC Book upload control + standalone preview pane (outside the vehicle form card). */

export function RcBookUploadField({ value, onChange, className = "" }) {
  function onFile(file) {
    if (!file) {
      onChange({ ...value, rc_preview_url: "", rc_file: null });
      return;
    }
    const url = URL.createObjectURL(file);
    onChange({ ...value, rc_preview_url: url, rc_file: file });
  }

  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-semibold text-slate-700 mb-1">Upload RC Book</span>
      <input
        type="file"
        accept="image/*,application/pdf"
        className="block w-full text-sm"
        onChange={(e) => onFile(e.target.files?.[0] || null)}
      />
      <span className="mt-1 block text-[11px] text-slate-500">
        Preview opens on the right — copy engine / chassis details into the form
      </span>
    </label>
  );
}

export function RcBookPreviewPanel({ value }) {
  const url = value?.rc_preview_url;
  const isPdf = String(value?.rc_file?.type || "").includes("pdf") || /\.pdf($|\?)/i.test(url || "");

  return (
    <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-3 min-h-[320px] xl:sticky xl:top-4 h-fit w-full min-w-0">
      <div className="text-sm font-bold text-btt-navy mb-1">RC Book preview</div>
      <p className="text-xs text-slate-500 mb-3">
        Use this pane to read the RC and fill engine number, chassis number, and other fields.
      </p>
      {url ? (
        isPdf ? (
          <iframe title="RC preview" src={url} className="w-full h-[min(78vh,820px)] rounded-lg bg-white border" />
        ) : (
          <img
            src={url}
            alt="RC Book preview"
            className="w-full max-h-[min(78vh,820px)] object-contain rounded-lg bg-white border"
          />
        )
      ) : (
        <div className="h-64 flex items-center justify-center text-sm text-slate-400 border border-dashed rounded-lg bg-white">
          Upload RC on the left to preview here
        </div>
      )}
    </aside>
  );
}
