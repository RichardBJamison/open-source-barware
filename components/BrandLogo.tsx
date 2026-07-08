const LOGO_COPPER = "#b88958";

function MartiniGlass({ size = "md" }: { size?: "md" | "sm" }) {
  const w = size === "sm" ? 48 : 58;
  const h = size === "sm" ? 56 : 68;
  return (
    <svg width={w} height={h} viewBox="0 0 52 62" fill="none" aria-hidden="true">
      <path
        d="M4 6 L48 6 L26 38 Z"
        stroke={LOGO_COPPER}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="26" y1="38" x2="26" y2="54" stroke={LOGO_COPPER} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="54" x2="40" y2="54" stroke={LOGO_COPPER} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="15" x2="20" y2="26" stroke={LOGO_COPPER} strokeWidth="1" strokeLinecap="round" />
      <circle cx="6" cy="14" r="4" stroke={LOGO_COPPER} strokeWidth="1.2" fill="none" />
      <circle cx="6" cy="14" r="1.5" fill={LOGO_COPPER} />
    </svg>
  );
}

/** Shared wordmark — same as header, used in footer too. */
export default function BrandLogo({ size = "md" }: { size?: "md" | "sm" }) {
  const titleSize = size === "sm" ? "1rem" : "1.15rem";
  const tagSize = size === "sm" ? "0.62rem" : "0.7rem";

  return (
    <div className="flex items-center gap-3.5 py-1.5 px-2">
      <MartiniGlass size={size} />
      <div className="flex flex-col gap-1">
        <div
          className="flex items-center gap-1.5"
          style={{
            fontFamily: "var(--font-inter)",
            fontWeight: 700,
            fontSize: titleSize,
            letterSpacing: "0.1em",
            color: LOGO_COPPER,
          }}
        >
          <span>OPEN S</span>
          <span style={{ fontSize: "0.9em", opacity: 0.85, fontWeight: 400 }}>{"<>"}</span>
          <span>BARWARE</span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-inter)",
            fontSize: tagSize,
            letterSpacing: "0.18em",
            color: "#f5e6c8",
            fontWeight: 400,
            textTransform: "lowercase",
          }}
        >
          free, open-source program for the trade
        </span>
      </div>
    </div>
  );
}
