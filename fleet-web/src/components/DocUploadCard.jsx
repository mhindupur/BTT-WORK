import { useRef, useState } from "react";
import { DOC_STATUS_LABEL } from "../constants/vehicleDocs";

/**
 * One document section: date picker + drag/drop or browse upload + manage existing file.
 * Designed for less technical site managers — large targets, plain language.
 */
export default function DocUploadCard({
  section,
  index,
  doc,
  expiryValue,
  onExpiryChange,
  onUpload,
  onRemove,
  canEdit,
  busy,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localErr, setLocalErr] = useState("");

  const statusLabel = doc ? DOC_STATUS_LABEL[doc.status] || doc.status : "Not uploaded yet";
  const hasFile = Boolean(doc?.file_path);
  const done = hasFile && doc?.status !== "rejected";

  function acceptFile(file) {
    setLocalErr("");
    if (!file) return;
    const okType =
      String(file.type || "").startsWith("image/") ||
      String(file.type || "") === "application/pdf" ||
      /\.(jpe?g|png|webp|gif|pdf)$/i.test(file.name || "");
    if (!okType) {
      setLocalErr("Please choose a photo (JPG/PNG) or PDF file.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setLocalErr("File is too big. Max size is 12 MB.");
      return;
    }
    onUpload(file);
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (!canEdit || busy) return;
    const file = e.dataTransfer?.files?.[0];
    acceptFile(file);
  }

  return (
    <section
      className={`rounded-2xl border-2 p-4 sm:p-5 transition-colors ${
        done
          ? "border-green-300 bg-green-50/40"
          : doc?.status === "rejected"
            ? "border-red-300 bg-red-50/40"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
            done ? "bg-green-600 text-white" : "bg-btt-navy text-white"
          }`}
        >
          {done ? "✓" : index}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-bold text-btt-navy leading-tight">
            {section.title}
            {section.optional ? (
              <span className="ml-2 text-xs font-semibold text-slate-500 uppercase">Optional</span>
            ) : null}
          </h3>
          <p className="text-sm text-slate-600 mt-0.5">{section.short}</p>
          <p className="text-xs text-slate-500 mt-1">{section.help}</p>
          {section.recommended && !section.optional && !hasFile && (
            <p className="text-xs font-medium text-amber-800 mt-1">Recommended before submit</p>
          )}
        </div>
      </div>

      {section.needsExpiry && (
        <label className="block mb-3">
          <span className="text-sm font-semibold text-slate-700">Expiry date</span>
          <input
            type="date"
            className="mt-1 w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-base disabled:bg-slate-50"
            value={expiryValue || ""}
            onChange={(e) => onExpiryChange?.(e.target.value)}
            disabled={!canEdit || busy}
          />
          <span className="text-xs text-slate-500 mt-1 block">Tap to open calendar and pick the date</span>
        </label>
      )}

      {hasFile ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">{doc.original_filename}</div>
              <div
                className={`text-xs mt-0.5 font-medium ${
                  doc.status === "approved"
                    ? "text-green-700"
                    : doc.status === "rejected"
                      ? "text-red-700"
                      : "text-amber-800"
                }`}
              >
                {statusLabel}
              </div>
              {doc.expiry_date ? (
                <div className="text-xs text-slate-500 mt-0.5">
                  Expiry on file: {String(doc.expiry_date).slice(0, 10)}
                </div>
              ) : null}
              {doc.rejection_note ? (
                <div className="mt-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-900">
                  <div className="font-bold text-xs uppercase tracking-wide text-red-800 mb-0.5">
                    Admin rejected — reason
                  </div>
                  <div className="leading-snug">{doc.rejection_note}</div>
                </div>
              ) : doc.status === "rejected" ? (
                <div className="mt-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-900 font-medium">
                  Admin rejected this document. Please re-upload a clear file.
                </div>
              ) : null}
            </div>
            <a
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-100 text-btt-navy text-sm font-semibold hover:bg-slate-200"
              href={doc.file_path}
              target="_blank"
              rel="noreferrer"
            >
              View file
            </a>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                className="px-4 py-2.5 rounded-xl border-2 border-btt-navy text-btt-navy text-sm font-semibold disabled:opacity-50"
                onClick={() => inputRef.current?.click()}
              >
                Replace file
              </button>
              <button
                type="button"
                disabled={busy}
                className="px-4 py-2.5 rounded-xl border-2 border-red-300 text-red-700 text-sm font-semibold disabled:opacity-50"
                onClick={() => onRemove?.(doc)}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ) : canEdit ? (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            if (canEdit) setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (canEdit) setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={onDrop}
          onClick={() => !busy && inputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed px-4 py-8 text-center cursor-pointer select-none transition-colors ${
            dragging ? "border-btt-accent bg-amber-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
          } ${busy ? "opacity-60 pointer-events-none" : ""}`}
        >
          <div className="text-sm font-bold tracking-wide text-btt-accent mb-2 uppercase">Upload</div>
          <div className="text-lg font-bold text-btt-navy">Tap here to take / choose photo</div>
          <div className="text-sm text-slate-600 mt-1">Or drag and drop the file into this box</div>
          <div className="text-xs text-slate-500 mt-2">JPG, PNG or PDF · max 12 MB</div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 text-center">
          No file uploaded
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          acceptFile(f);
        }}
      />

      {localErr && <p className="mt-2 text-sm text-red-700 font-medium">{localErr}</p>}
      {busy && <p className="mt-2 text-sm text-slate-600">Uploading… please wait</p>}
    </section>
  );
}
