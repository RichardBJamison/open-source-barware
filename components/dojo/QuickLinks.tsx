import Link from "next/link";

const LINKS = [
  {
    href: "/inventory/inhouse",
    title: "In-house inventory",
    body: "What is still on hand after the last count",
  },
  {
    href: "/inventory/spreadsheets",
    title: "Spreadsheets",
    body: "Full workbook — numbers, variance, costs",
  },
  {
    href: "/inventory/analytics",
    title: "Analytics",
    body: "Program health — cost %, trends, movers",
  },
  {
    href: "/inventory/inputs",
    title: "Weekly inputs",
    body: "Count, invoices, POS for this cycle",
  },
  {
    href: "/inventory/settings",
    title: "Settings",
    body: "Customizations and API management",
  },
];

export default function QuickLinks() {
  return (
    <div className="dojo-nav-grid">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="dojo-nav-card">
          <strong>{link.title}</strong>
          <span>{link.body}</span>
        </Link>
      ))}
    </div>
  );
}