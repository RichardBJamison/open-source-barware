export function Gear({
  size = 80,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const teeth = 12;
  const outerR = size / 2;
  const innerR = outerR * 0.7;
  const holeR = outerR * 0.3;
  const toothDepth = outerR * 0.15;
  const cx = outerR;
  const cy = outerR;

  let path = "";
  for (let i = 0; i < teeth; i++) {
    const angle1 = (i / teeth) * Math.PI * 2;
    const angle2 = ((i + 0.3) / teeth) * Math.PI * 2;
    const angle3 = ((i + 0.5) / teeth) * Math.PI * 2;
    const angle4 = ((i + 0.8) / teeth) * Math.PI * 2;

    const r1 = innerR;
    const r2 = outerR + toothDepth;

    const x1 = cx + r1 * Math.cos(angle1);
    const y1 = cy + r1 * Math.sin(angle1);
    const x2 = cx + r2 * Math.cos(angle2);
    const y2 = cy + r2 * Math.sin(angle2);
    const x3 = cx + r2 * Math.cos(angle3);
    const y3 = cy + r2 * Math.sin(angle3);
    const x4 = cx + r1 * Math.cos(angle4);
    const y4 = cy + r1 * Math.sin(angle4);

    if (i === 0) path += `M ${x1} ${y1} `;
    path += `L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} `;
  }
  path += "Z";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      fill="none"
    >
      <path d={path} fill="currentColor" opacity="0.15" />
      <circle
        cx={cx}
        cy={cy}
        r={holeR}
        fill="var(--bg, #0d0b09)"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.2"
      />
      <circle
        cx={cx}
        cy={cy}
        r={holeR * 0.4}
        fill="currentColor"
        opacity="0.1"
      />
    </svg>
  );
}

export function GearDivider() {
  return (
    <div className="gear-divider">
      <svg width="20" height="20" viewBox="0 0 20 20" className="gear-spin-slow">
        <circle cx="10" cy="10" r="7" fill="none" stroke="var(--copper)" strokeWidth="1" opacity="0.4" />
        <circle cx="10" cy="10" r="3" fill="var(--copper)" opacity="0.3" />
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <line
            key={angle}
            x1={10 + 5 * Math.cos((angle * Math.PI) / 180)}
            y1={10 + 5 * Math.sin((angle * Math.PI) / 180)}
            x2={10 + 9 * Math.cos((angle * Math.PI) / 180)}
            y2={10 + 9 * Math.sin((angle * Math.PI) / 180)}
            stroke="var(--copper)"
            strokeWidth="2"
            opacity="0.3"
          />
        ))}
      </svg>
    </div>
  );
}

export function SteamPuffs({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <div className="steam-puff absolute w-3 h-3 rounded-full bg-cream/10 blur-sm" />
      <div className="steam-puff-delay absolute w-4 h-4 rounded-full bg-cream/8 blur-md left-3" />
      <div className="steam-puff-slow absolute w-2 h-2 rounded-full bg-cream/6 blur-sm left-6" />
    </div>
  );
}

export function Rivet() {
  return (
    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[var(--rivet)] to-[var(--copper-dark)] shadow-inner border border-[var(--copper-dark)]/30" />
  );
}

export function PipeLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative pl-10">
      <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-copper/30 via-copper/15 to-transparent" />
      {children}
    </div>
  );
}

export function PipeNode({
  active = false,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative mb-8 last:mb-0">
      <div className="absolute -left-10 top-1.5">
        {active ? (
          <div className="glow-dot" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-copper/30 border border-copper/20" />
        )}
      </div>
      {children}
    </div>
  );
}

export function CocktailIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="44" height="52" viewBox="0 0 44 52" fill="none" className={className}>
      {/* Liquid fill */}
      <path d="M 1,7 L 22,33 L 43,7 Z" fill="var(--copper)" opacity="0.08" />

      {/* Rim */}
      <line x1="1" y1="7" x2="43" y2="7" stroke="var(--copper)" strokeWidth="1.2" strokeLinecap="round" />
      {/* Bowl — left side */}
      <line x1="1" y1="7" x2="22" y2="33" stroke="var(--copper)" strokeWidth="1.2" strokeLinecap="round" />
      {/* Bowl — right side */}
      <line x1="43" y1="7" x2="22" y2="33" stroke="var(--copper)" strokeWidth="1.2" strokeLinecap="round" />

      {/* Inner bowl depth lines */}
      <line x1="7" y1="7" x2="22" y2="31.5" stroke="var(--copper)" strokeWidth="0.5" strokeLinecap="round" opacity="0.4" />
      <line x1="37" y1="7" x2="22" y2="31.5" stroke="var(--copper)" strokeWidth="0.5" strokeLinecap="round" opacity="0.4" />

      {/* Stem */}
      <line x1="22" y1="33" x2="22" y2="44" stroke="var(--copper)" strokeWidth="1.2" strokeLinecap="round" />
      {/* Base */}
      <line x1="12" y1="44" x2="32" y2="44" stroke="var(--copper)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Cocktail pick — extends from lower-left (past rim) through bowl to upper-right */}
      {/* Line equation: y = 27 - (23/40)*(x-1), crossing left rim ~(14,20), right rim ~(36,7) */}
      <line x1="1" y1="27" x2="41" y2="4" stroke="var(--copper)" strokeWidth="1" strokeLinecap="round" opacity="0.9" />

      {/* Decorative loop at upper-right end of pick */}
      <circle cx="41" cy="4" r="2.2" stroke="var(--copper)" strokeWidth="0.9" fill="none" opacity="0.9" />

      {/* Olive 1 — on pick, just outside left rim of bowl */}
      {/* pick at x=8: y≈23 */}
      <circle cx="8" cy="23" r="3" stroke="var(--copper)" strokeWidth="1" fill="none" />
      <circle cx="8" cy="23" r="1.1" fill="var(--copper)" opacity="0.65" />

      {/* Olive 2 — on pick, inside bowl left quadrant */}
      {/* pick at x=14: y≈19.5 */}
      <circle cx="14" cy="19.5" r="3" stroke="var(--copper)" strokeWidth="1" fill="none" />
      <circle cx="14" cy="19.5" r="1.1" fill="var(--copper)" opacity="0.65" />
    </svg>
  );
}

export function BottleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="32"
      height="48"
      viewBox="0 0 32 48"
      fill="none"
      className={className}
    >
      <rect x="12" y="2" width="8" height="6" rx="1" stroke="var(--copper)" strokeWidth="1" fill="none" />
      <path d="M13 8L10 16v26a2 2 0 002 2h8a2 2 0 002-2V16l-3-8H13z" stroke="var(--copper)" strokeWidth="1.5" fill="none" />
      <rect x="11" y="24" width="10" height="16" rx="1" fill="var(--copper)" opacity="0.08" />
      {/* Label */}
      <rect x="13" y="26" width="6" height="4" rx="0.5" stroke="var(--brass)" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}
