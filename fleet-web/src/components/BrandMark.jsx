import { BRAND } from "../constants/branding";

/**
 * NUCLICK brand mark.
 * - Logo artwork: official mark (green swooshes + logo color theme)
 * - Application name: NUCLICK
 * - Caption: The Nucleus of Operational Intelligence
 *
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
    full: "h-12",
    compact: "h-9",
    stack: "h-14",
  };
  const nameSize = variant === "compact" ? "text-sm" : variant === "stack" ? "text-xl" : "text-base";
  const nameCls = inverted ? "text-white" : "text-btt-blue";
  const captionCls = inverted ? "text-white/75" : "text-slate-600";

  return (
    <div
      className={`flex flex-col ${variant === "stack" ? "items-center text-center" : "items-start"} gap-1 ${className}`}
      title={`${BRAND.name} — ${BRAND.caption}`}
      aria-label={title}
    >
      <div className={`rounded-md ${inverted ? "bg-white px-2 py-1.5 shadow-sm" : ""}`}>
        <img
          src={BRAND.logoSrc}
          alt={BRAND.name}
          className={`${heights[variant] || heights.full} w-auto max-w-full object-contain object-left`}
        />
      </div>
      <div>
        <div className={`${nameSize} font-extrabold tracking-tight leading-none ${nameCls}`}>
          {BRAND.name}
        </div>
        {showCaption ? (
          <div className={`mt-0.5 text-[10px] font-medium leading-snug max-w-[15rem] ${captionCls}`}>
            {BRAND.caption}
          </div>
        ) : null}
      </div>
    </div>
  );
}
