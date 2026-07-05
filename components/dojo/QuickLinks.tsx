import Link from "next/link";

const LINKS = [
  {
    href: "/inventory/inhouse",
    title: "In-house inventory",
    body: "Live shelf levels by category",
    accent: "inhouse",
  },
  {
    href: "/inventory/spreadsheets",
    title: "Inventory / Spreadsheets",
    body: "Set PARs · variance · order list",
    accent: "sheets",
  },
  {
    href: "/inventory/analytics",
    title: "Analytics",
    body: "Cost %, trends, movers",
    accent: "analytics",
  },
  {
    href: "/inventory/inputs",
    title: "All inputs",
    body: "POS · invoices · next count",
    accent: "inputs",
  },
  {
    href: "/inventory/settings",
    title: "Settings",
    body: "Your business, bars, optional AI",
    accent: "settings",
  },
];

export default function QuickLinks() {
  return (
    <div className="dojo-nav-grid dojo-nav-grid--bento">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`dojo-nav-card dojo-nav-card--${link.accent}`}
        >
          <strong>{link.title}</strong>
          <span>{link.body}</span>
        </Link>
      ))}
    </div>
  );
}