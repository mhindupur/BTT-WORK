/**
 * Official BTT wordmark from btttravels.com.
 * variant: "full" | "compact" | "stack"
 */
export default function BrandMark({
  variant = "full",
  className = "",
  title = "Basaveshwara Tours & Travels",
  showTagline = false,
  inverted = false,
}) {
  const heights = {
    full: "h-10",
    compact: "h-8",
    stack: "h-12",
  };
  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <img
        src="/btt-logo.png"
        alt={title}
        className={`${heights[variant] || heights.full} w-auto max-w-full object-contain object-left ${
          inverted ? "brightness-0 invert" : ""
        }`}
      />
      {showTagline ? (
        <div className={`text-[10px] uppercase tracking-[0.14em] font-semibold ${inverted ? "text-white/70" : "text-btt-blue"}`}>
          Fleet &amp; Fuel
        </div>
      ) : null}
    </div>
  );
}
