type IconName =
  | "dashboard"
  | "spreadsheets"
  | "analytics"
  | "inhouse"
  | "inputs"
  | "settings";

export default function SidebarNavIcon({
  name,
  className = "sidebar-icon",
}: {
  name: IconName;
  className?: string;
}) {
  const props = {
    className,
    viewBox: "0 0 20 20",
    fill: "none",
    "aria-hidden": true as const,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...props}>
          <rect x="2" y="2" width="7" height="7" rx="1" fill="currentColor" />
          <rect x="11" y="2" width="7" height="4" rx="1" fill="currentColor" opacity="0.55" />
          <rect x="11" y="8" width="7" height="10" rx="1" fill="currentColor" opacity="0.35" />
          <rect x="2" y="11" width="7" height="7" rx="1" fill="currentColor" opacity="0.55" />
        </svg>
      );
    case "spreadsheets":
      return (
        <svg {...props}>
          <rect x="2" y="3" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2 8h16M7 8v9M12 8v9" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case "analytics":
      return (
        <svg {...props}>
          <path d="M3 16V8l4-3 4 6 3-4 3 9H3z" fill="currentColor" opacity="0.85" />
        </svg>
      );
    case "inhouse":
      return (
        <svg {...props}>
          <path d="M7 3h6v3H7V3zm-2 5h10v9H5V8z" fill="currentColor" opacity="0.5" />
          <path d="M8 11h4v2H8v-2z" fill="currentColor" />
        </svg>
      );
    case "inputs":
      return (
        <svg {...props}>
          <path
            d="M10 2v11M6 9l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path d="M3 15h14v3H3v-3z" fill="currentColor" opacity="0.6" />
        </svg>
      );
    case "settings":
      return (
        <svg {...props}>
          <circle cx="10" cy="10" r="3" fill="currentColor" />
          <path
            d="M10 1v2M10 17v2M1 10h2M17 10h2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
}