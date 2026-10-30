import { BRAND } from "../constants/branding";

/**
 * NUCLICK brand mark — logo image only (artwork includes title + caption).
 * variant: "full" | "compact" | "stack"
 */
export default function BrandMark({
  variant = "full",
  className = "",
  title = BRAND.name,
  inverted = false,
}) {
  const heights = {
    full: "h-24",
    compact: "h-14",
    stack: "h-28",
  };

  return (
    <div className={`flex items-center ${className}`} title={title} aria-label={title}>
      <div className={`rounded-md ${inverted ? "bg-white px-2 py-1.5 shadow-sm" : ""}`}>
        <img
          src={BRAND.logoSrc}
          alt={BRAND.name}
          className={`${heights[variant] || heights.full} w-auto max-w-full object-contain`}
        />
      </div>
    </div>
  );
}
