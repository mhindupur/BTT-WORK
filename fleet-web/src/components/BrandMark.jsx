import { BRAND } from "../constants/branding";

/**
 * NUCLICK brand mark: logo icon + title + caption.
 * variant: "full" | "compact" | "stack"
 */
export default function BrandMark({
  variant = "full",
  className = "",
  title = BRAND.name,
  showCaption = true,
  inverted = false,
}) {
  const heights = {
    full: "h-14",
    compact: "h-10",
    stack: "h-16",
  };
  const nameSize = variant === "compact" ? "text-base" : variant === "stack" ? "text-2xl" : "text-xl";
  const nameCls = inverted ? "text-white" : "text-btt-blue";
  const captionCls = inverted ? "text-white/80" : "text-slate-600";
  const isStack = variant === "stack";

  return (
    <div
      className={`flex ${isStack ? "flex-col items-center text-center gap-2" : "items-center gap-3"} ${className}`}
      title={`${BRAND.name} — ${BRAND.caption}`}
      aria-label={title}
    >
      <div className={`rounded-md shrink-0 ${inverted ? "bg-white px-1.5 py-1 shadow-sm" : ""}`}>
        <img
          src={BRAND.logoSrc}
          alt=""
          className={`${heights[variant] || heights.full} w-auto object-contain object-left`}
        />
      </div>
      <div className={isStack ? "" : "min-w-0"}>
        <div className={`${nameSize} font-extrabold tracking-tight leading-none ${nameCls}`}>
          {BRAND.name}
        </div>
        {showCaption ? (
          <div className={`mt-1 text-[11px] font-medium leading-snug max-w-[14rem] ${captionCls}`}>
            {BRAND.caption}
          </div>
        ) : null}
      </div>
    </div>
  );
}
