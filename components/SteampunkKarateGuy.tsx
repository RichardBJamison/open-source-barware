"use client";

export default function SteampunkKarateGuy({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 220"
      className={`dojo-karate-guy ${className}`}
      aria-hidden="true"
      fill="none"
    >
      <defs>
        <linearGradient id="dojo-brass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d7c191" />
          <stop offset="100%" stopColor="#a8784f" />
        </linearGradient>
        <linearGradient id="dojo-copper" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#b88958" />
          <stop offset="100%" stopColor="#6f4b32" />
        </linearGradient>
      </defs>

      {/* Steam puffs — wrong sport, right vibe */}
      <circle cx="148" cy="42" r="8" fill="#f5e6c8" opacity="0.12" />
      <circle cx="162" cy="34" r="5" fill="#f5e6c8" opacity="0.08" />
      <circle cx="36" cy="48" r="6" fill="#f5e6c8" opacity="0.1" />

      {/* Top hat */}
      <rect x="72" y="18" width="56" height="8" rx="2" fill="url(#dojo-copper)" />
      <rect x="82" y="8" width="36" height="14" rx="2" fill="#231f1b" stroke="#a8784f" strokeWidth="1.5" />
      <circle cx="100" cy="14" r="3" fill="#c7a76b" opacity="0.6" />

      {/* Goggles on forehead */}
      <ellipse cx="88" cy="36" rx="10" ry="7" stroke="#a8784f" strokeWidth="2" />
      <ellipse cx="112" cy="36" rx="10" ry="7" stroke="#a8784f" strokeWidth="2" />
      <line x1="98" y1="36" x2="102" y2="36" stroke="#c7a76b" strokeWidth="2" />
      <circle cx="88" cy="36" r="4" fill="#4a7c6f" opacity="0.5" />
      <circle cx="112" cy="36" r="4" fill="#4a7c6f" opacity="0.5" />

      {/* Head */}
      <circle cx="100" cy="52" r="18" fill="url(#dojo-brass)" stroke="#6f4b32" strokeWidth="1.5" />
      <circle cx="94" cy="50" r="2" fill="#141110" />
      <circle cx="106" cy="50" r="2" fill="#141110" />
      <path d="M94 58 Q100 62 106 58" stroke="#6f4b32" strokeWidth="1.5" strokeLinecap="round" />

      {/* Mustache + pipe */}
      <path
        d="M92 56 C94 59 98 59 100 57 C102 59 106 59 108 56"
        stroke="#6f4b32"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="108" y="54" width="14" height="3" rx="1" fill="#6f4b32" />
      <circle cx="123" cy="55" r="2" fill="#a8784f" opacity="0.5" />

      {/* Torso — riveted waistcoat */}
      <rect x="78" y="70" width="44" height="52" rx="6" fill="#1c1815" stroke="#a8784f" strokeWidth="1.5" />
      {[82, 92, 102, 112].map((x) => (
        <circle key={x} cx={x} cy="78" r="1.5" fill="#766553" />
      ))}
      <circle cx="100" cy="92" r="10" fill="none" stroke="#a8784f" strokeWidth="1" opacity="0.4" />
      <circle cx="100" cy="92" r="4" fill="#a8784f" opacity="0.25" />

      {/* Arms — awkward karate block */}
      <g className="dojo-karate-arm-left">
        <rect x="52" y="78" width="28" height="10" rx="5" fill="url(#dojo-brass)" stroke="#6f4b32" strokeWidth="1" />
        <circle cx="48" cy="83" r="7" fill="url(#dojo-brass)" stroke="#6f4b32" strokeWidth="1" />
      </g>
      <g className="dojo-karate-arm-right">
        <rect x="120" y="74" width="30" height="10" rx="5" fill="url(#dojo-brass)" stroke="#6f4b32" strokeWidth="1" />
        <circle cx="154" cy="79" r="7" fill="url(#dojo-brass)" stroke="#6f4b32" strokeWidth="1" />
      </g>

      {/* Belt */}
      <rect x="76" y="118" width="48" height="6" rx="2" fill="#a8784f" />
      <path d="M124 121 L136 128 L124 131 Z" fill="#c7a76b" />

      {/* Legs — one dramatic kick */}
      <rect x="82" y="124" width="14" height="42" rx="6" fill="#231f1b" stroke="#6f4b32" strokeWidth="1" />
      <rect x="104" y="124" width="14" height="36" rx="6" fill="#231f1b" stroke="#6f4b32" strokeWidth="1" />
      <g className="dojo-karate-kick">
        <rect x="118" y="108" width="46" height="12" rx="6" fill="#1c1815" stroke="#a8784f" strokeWidth="1.5" transform="rotate(-18 118 114)" />
        <ellipse cx="168" cy="96" rx="12" ry="8" fill="url(#dojo-brass)" stroke="#6f4b32" strokeWidth="1" transform="rotate(-18 168 96)" />
        <text x="164" y="100" fontSize="8" fill="#141110" fontWeight="bold" transform="rotate(-18 164 100)">
          HI-YA
        </text>
      </g>

      {/* Standing foot */}
      <ellipse cx="89" cy="168" rx="14" ry="6" fill="#6f4b32" />

      {/* Gear flying off — does not fit */}
      <g className="dojo-karate-gear gear-spin-slow" style={{ transformOrigin: "40px 130px" }}>
        <circle cx="40" cy="130" r="10" stroke="#a8784f" strokeWidth="1.5" opacity="0.5" />
        <circle cx="40" cy="130" r="4" fill="#a8784f" opacity="0.3" />
      </g>
    </svg>
  );
}