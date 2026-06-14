"use client";

import { useEffect } from "react";
import { Gear } from "@/components/SteampunkElements";

export interface ToolPreview {
  number: string;
  title: string;
  format: string;
  href: string;
}

function InventorySheetMockup() {
  const rows = [
    { product: "Buffalo Trace Bourbon", size: "750ml", count: "3.7", cost: "$28.00", total: "$103.60", par: "4", low: false },
    { product: "Grey Goose Vodka", size: "1.75L", count: "1.2", cost: "$42.00", total: "$50.40", par: "3", low: true },
    { product: "Casamigos Blanco", size: "750ml", count: "2.5", cost: "$44.00", total: "$110.00", par: "3", low: false },
    { product: "Hendrick's Gin", size: "750ml", count: "0.8", cost: "$36.00", total: "$28.80", par: "2", low: true },
    { product: "Bacardi Superior", size: "1.75L", count: "4.1", cost: "$22.00", total: "$90.20", par: "3", low: false },
    { product: "Don Julio Reposado", size: "750ml", count: "1.9", cost: "$52.00", total: "$98.80", par: "2", low: false },
  ];
  return (
    <div style={{ background: "#0d0b09", border: "1px solid rgba(205,127,50,0.2)", borderRadius: 4, overflow: "hidden", fontFamily: "monospace" }}>
      {/* Title bar */}
      <div style={{ background: "rgba(205,127,50,0.12)", borderBottom: "1px solid rgba(205,127,50,0.2)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#cd7f32", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>Bar Inventory Master Sheet</span>
        <span style={{ color: "#cd7f32", fontSize: 10, opacity: 0.7 }}>Agave &amp; Rye · Week 23</span>
      </div>
      {/* Stats row */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(205,127,50,0.15)" }}>
        {[["Total Value", "$12,840"], ["Products", "147"], ["Low Stock", "12"], ["Pour Cost", "22.4%"]].map(([label, val]) => (
          <div key={label} style={{ flex: 1, padding: "8px 12px", borderRight: "1px solid rgba(205,127,50,0.1)" }}>
            <div style={{ color: "#a87640", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase" }}>{label}</div>
            <div style={{ color: "#cd7f32", fontSize: 14, fontWeight: 700, marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>
      {/* Table header */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 0.7fr 0.6fr 0.8fr 0.8fr 0.5fr 0.5fr", gap: 0, padding: "6px 12px", borderBottom: "1px solid rgba(205,127,50,0.25)", background: "rgba(205,127,50,0.06)" }}>
        {["Product", "Size", "Count", "Unit Cost", "Total", "Par", ""].map((h) => (
          <div key={h} style={{ color: "#cd7f32", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.8 }}>{h}</div>
        ))}
      </div>
      {/* Rows */}
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 0.7fr 0.6fr 0.8fr 0.8fr 0.5fr 0.5fr", gap: 0, padding: "5px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
          <div style={{ color: r.low ? "#e8cda0" : "#c4a882", fontSize: 10 }}>{r.product}</div>
          <div style={{ color: "#7a6040", fontSize: 10 }}>{r.size}</div>
          <div style={{ color: r.low ? "#e8c050" : "#c4a882", fontSize: 10, fontWeight: r.low ? 700 : 400 }}>{r.count}</div>
          <div style={{ color: "#7a6040", fontSize: 10 }}>{r.cost}</div>
          <div style={{ color: "#c4a882", fontSize: 10 }}>{r.total}</div>
          <div style={{ color: "#7a6040", fontSize: 10 }}>{r.par}</div>
          <div style={{ fontSize: 9 }}>{r.low ? <span style={{ color: "#e8c050", background: "rgba(232,192,80,0.12)", padding: "1px 5px", borderRadius: 2 }}>LOW</span> : <span style={{ color: "#4a8a5a", opacity: 0.7 }}>✓</span>}</div>
        </div>
      ))}
      {/* Totals */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 0.7fr 0.6fr 0.8fr 0.8fr 0.5fr 0.5fr", gap: 0, padding: "7px 12px", borderTop: "1px solid rgba(205,127,50,0.3)", background: "rgba(205,127,50,0.07)" }}>
        <div style={{ color: "#cd7f32", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>TOTALS (Liquor Tab)</div>
        <div /><div /><div />
        <div style={{ color: "#cd7f32", fontSize: 10, fontWeight: 700 }}>$481.80</div>
        <div /><div />
      </div>
    </div>
  );
}

function QuickCountMockup() {
  const sections = [
    { cat: "WELL LIQUOR", items: ["Well Vodka", "Well Gin", "Well Rum", "Well Tequila", "Well Bourbon"] },
    { cat: "CALL LIQUOR", items: ["Tito's Vodka", "Bacardi Superior", "Jim Beam", "Cuervo Silver"] },
    { cat: "BEER — DRAFT", items: ["Modelo Especial", "Bud Light", "Blue Moon", "IPA Rotation"] },
  ];
  return (
    <div style={{ background: "#0d0b09", border: "1px solid rgba(205,127,50,0.2)", borderRadius: 4, overflow: "hidden", fontFamily: "monospace" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "2px solid rgba(205,127,50,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#cd7f32", fontSize: 12, fontWeight: 700, letterSpacing: "0.2em" }}>QUICK COUNT SHEET</div>
          <div style={{ color: "#6a5030", fontSize: 9, marginTop: 2 }}>opensourcebarware.com — free to the trade</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#6a5030", fontSize: 9 }}>Date: ___________</div>
          <div style={{ color: "#6a5030", fontSize: 9, marginTop: 4 }}>Shift: ___________</div>
          <div style={{ color: "#6a5030", fontSize: 9, marginTop: 4 }}>Counter: _________</div>
        </div>
      </div>
      {sections.map((sec) => (
        <div key={sec.cat}>
          <div style={{ background: "rgba(205,127,50,0.08)", padding: "4px 16px", borderTop: "1px solid rgba(205,127,50,0.15)", borderBottom: "1px solid rgba(205,127,50,0.15)" }}>
            <span style={{ color: "#cd7f32", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 700 }}>{sec.cat}</span>
          </div>
          {sec.items.map((item) => (
            <div key={item} style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 60px", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "5px 16px", alignItems: "center" }}>
              <div style={{ color: "#a88050", fontSize: 10 }}>{item}</div>
              {["Open", "Back Bar", "Storage"].map((lbl) => (
                <div key={lbl} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  <div style={{ color: "#4a3820", fontSize: 8, letterSpacing: "0.1em" }}>{lbl}</div>
                  <div style={{ width: 40, height: 16, border: "1px solid rgba(205,127,50,0.2)", borderRadius: 2 }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
      <div style={{ padding: "8px 16px", display: "flex", gap: 16 }}>
        <div style={{ color: "#4a3820", fontSize: 9 }}>Notes: ____________________</div>
        <div style={{ color: "#cd7f32", fontSize: 9, marginLeft: "auto", opacity: 0.5 }}>→ Enter in spreadsheet after count</div>
      </div>
    </div>
  );
}

function VarianceMockup() {
  const cats = [
    { name: "Whiskey / Bourbon", physical: 42.3, pos: 44.1, variance: -1.8, pct: -4.1, flag: false },
    { name: "Vodka", physical: 28.7, pos: 32.4, variance: -3.7, pct: -11.4, flag: true },
    { name: "Tequila / Mezcal", physical: 19.2, pos: 19.8, variance: -0.6, pct: -3.0, flag: false },
    { name: "Gin", physical: 11.4, pos: 13.1, variance: -1.7, pct: -13.0, flag: true },
    { name: "Rum", physical: 16.8, pos: 17.2, variance: -0.4, pct: -2.3, flag: false },
    { name: "Beer — Draft", physical: 6.2, pos: 6.8, variance: -0.6, pct: -8.8, flag: false },
  ];
  const maxBar = 14;
  return (
    <div style={{ background: "#0d0b09", border: "1px solid rgba(205,127,50,0.2)", borderRadius: 4, overflow: "hidden", fontFamily: "monospace" }}>
      <div style={{ background: "rgba(205,127,50,0.12)", borderBottom: "1px solid rgba(205,127,50,0.2)", padding: "8px 14px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#cd7f32", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em" }}>VARIANCE CALCULATOR</span>
        <span style={{ color: "#cd7f32", fontSize: 10, opacity: 0.7 }}>Week 23 vs POS</span>
      </div>
      {/* Summary pills */}
      <div style={{ display: "flex", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(205,127,50,0.1)" }}>
        {[["Total Variance", "-$148.30", "#e8c050"], ["Pour Cost", "22.4%", "#cd7f32"], ["Flagged", "2 cats", "#e05050"], ["Vs Last Week", "+2.1%", "#4a8a5a"]].map(([l, v, c]) => (
          <div key={l} style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(205,127,50,0.1)", padding: "5px 8px", borderRadius: 3 }}>
            <div style={{ color: "#6a5030", fontSize: 8, letterSpacing: "0.15em" }}>{l}</div>
            <div style={{ color: c, fontSize: 13, fontWeight: 700, marginTop: 1 }}>{v}</div>
          </div>
        ))}
      </div>
      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.7fr 0.7fr 0.7fr 0.6fr 1fr", padding: "5px 12px", borderBottom: "1px solid rgba(205,127,50,0.2)", background: "rgba(205,127,50,0.05)" }}>
        {["Category", "Physical", "POS", "Variance", "Pct", ""].map((h) => (
          <div key={h} style={{ color: "#cd7f32", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.7 }}>{h}</div>
        ))}
      </div>
      {cats.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 0.7fr 0.7fr 0.7fr 0.6fr 1fr", padding: "5px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: r.flag ? "rgba(224,80,80,0.04)" : (i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)"), alignItems: "center" }}>
          <div style={{ color: r.flag ? "#e8a0a0" : "#a88050", fontSize: 10, display: "flex", alignItems: "center", gap: 5 }}>
            {r.flag && <span style={{ width: 6, height: 6, background: "#e05050", borderRadius: "50%", display: "inline-block" }} />}
            {r.name}
          </div>
          <div style={{ color: "#8a7050", fontSize: 10 }}>{r.physical}</div>
          <div style={{ color: "#8a7050", fontSize: 10 }}>{r.pos}</div>
          <div style={{ color: r.flag ? "#e08050" : "#8a9870", fontSize: 10, fontWeight: r.flag ? 700 : 400 }}>{r.variance}</div>
          <div style={{ color: r.flag ? "#e05050" : "#6a7860", fontSize: 10 }}>{r.pct}%</div>
          {/* Mini bar */}
          <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(Math.abs(r.pct) / maxBar * 100, 100)}%`, background: r.flag ? "#e05050" : "#cd7f32", opacity: 0.6, borderRadius: 2 }} />
          </div>
        </div>
      ))}
      <div style={{ padding: "6px 12px", background: "rgba(224,80,80,0.06)", borderTop: "1px solid rgba(224,80,80,0.2)", display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: "#e05050", fontSize: 9, letterSpacing: "0.15em" }}>⚠ INVESTIGATE: Vodka (-11.4%) and Gin (-13%) exceed 10% threshold</span>
      </div>
    </div>
  );
}

function ProductDatabaseMockup() {
  const products = [
    { name: "Buffalo Trace Bourbon", cat: "Whiskey", size: "750ml", cost: "$28.00", pour: "1.5oz", ppc: "$1.75" },
    { name: "Grey Goose Vodka", cat: "Vodka", size: "1.75L", cost: "$42.00", pour: "1.5oz", ppc: "$1.24" },
    { name: "Casamigos Blanco", cat: "Tequila", size: "750ml", cost: "$44.00", pour: "1.5oz", ppc: "$2.75" },
    { name: "Hendrick's Gin", cat: "Gin", size: "750ml", cost: "$36.00", pour: "1.5oz", ppc: "$2.25" },
    { name: "Bacardi Superior", cat: "Rum", size: "1.75L", cost: "$22.00", pour: "1.5oz", ppc: "$0.65" },
    { name: "Don Julio Reposado", cat: "Tequila", size: "750ml", cost: "$52.00", pour: "1.5oz", ppc: "$3.25" },
    { name: "Maker's Mark", cat: "Whiskey", size: "1.75L", cost: "$38.00", pour: "1.5oz", ppc: "$0.89" },
  ];
  return (
    <div style={{ background: "#0d0b09", border: "1px solid rgba(205,127,50,0.2)", borderRadius: 4, overflow: "hidden", fontFamily: "monospace" }}>
      <div style={{ background: "rgba(205,127,50,0.12)", borderBottom: "1px solid rgba(205,127,50,0.2)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#cd7f32", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em" }}>PRODUCT DATABASE</span>
        <span style={{ color: "#4a8a5a", fontSize: 10 }}>✓ 500+ products loaded</span>
      </div>
      {/* Search bar */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(205,127,50,0.1)", display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, height: 26, border: "1px solid rgba(205,127,50,0.25)", borderRadius: 3, padding: "0 10px", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#4a3820", fontSize: 10 }}>🔍</span>
          <span style={{ color: "#4a3820", fontSize: 10, letterSpacing: "0.05em" }}>Search 500+ products by name, brand, or category...</span>
        </div>
        {["All", "Whiskey", "Vodka", "Tequila", "Gin", "Rum"].map((f, i) => (
          <div key={f} style={{ padding: "3px 8px", border: `1px solid ${i === 0 ? "#cd7f32" : "rgba(205,127,50,0.2)"}`, borderRadius: 2, color: i === 0 ? "#cd7f32" : "#4a3820", fontSize: 9 }}>{f}</div>
        ))}
      </div>
      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 0.7fr 0.8fr 0.7fr 0.7fr", padding: "5px 12px", borderBottom: "1px solid rgba(205,127,50,0.2)", background: "rgba(205,127,50,0.05)" }}>
        {["Product Name", "Category", "Size", "Avg Cost", "Std Pour", "$/Pour"].map((h) => (
          <div key={h} style={{ color: "#cd7f32", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.7 }}>{h}</div>
        ))}
      </div>
      {products.map((p, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 0.7fr 0.8fr 0.7fr 0.7fr", padding: "4px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)", alignItems: "center" }}>
          <div style={{ color: "#c4a882", fontSize: 10 }}>{p.name}</div>
          <div style={{ fontSize: 9, padding: "1px 5px", background: "rgba(205,127,50,0.08)", color: "#cd7f32", borderRadius: 2, width: "fit-content" }}>{p.cat}</div>
          <div style={{ color: "#7a6040", fontSize: 10 }}>{p.size}</div>
          <div style={{ color: "#a88050", fontSize: 10 }}>{p.cost}</div>
          <div style={{ color: "#7a6040", fontSize: 10 }}>{p.pour}</div>
          <div style={{ color: "#c4a882", fontSize: 10 }}>{p.ppc}</div>
        </div>
      ))}
      <div style={{ padding: "6px 12px", borderTop: "1px solid rgba(205,127,50,0.1)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#4a3820", fontSize: 9 }}>Showing 7 of 523 products</span>
        <span style={{ color: "#cd7f32", fontSize: 9 }}>Import to your spreadsheet in one click →</span>
      </div>
    </div>
  );
}

const TOOL_MOCKUPS: Record<string, { tagline: string; mockup: React.ReactNode }> = {
  "01": {
    tagline: "A complete inventory workbook — counts, costs, variances, and reorder alerts, all wired up and ready to use.",
    mockup: <InventorySheetMockup />,
  },
  "02": {
    tagline: "Print it. Grab a pen. Count every bottle by tenths. Then transfer it. Simple and proven.",
    mockup: <QuickCountMockup />,
  },
  "03": {
    tagline: "Plug in your counts and POS data. Find out exactly where your money is going, by bottle.",
    mockup: <VarianceMockup />,
  },
  "04": {
    tagline: "Over 500 products pre-loaded with bottle sizes, costs, and pour sizes. Skip the data entry forever.",
    mockup: <ProductDatabaseMockup />,
  },
};

export default function DownloadPreviewModal({
  tool,
  onClose,
  onConfirm,
}: {
  tool: ToolPreview;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const preview = TOOL_MOCKUPS[tool.number];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      {/* Backdrop — no blur to prevent GPU glitch */}
      <div
        className="fixed inset-0 z-40 bg-black/75"
        onClick={onClose}
      />

      {/* Modal — flex column with sticky CTA footer */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="panel w-full max-w-2xl pointer-events-auto flex flex-col"
          style={{ maxHeight: "85vh", boxShadow: "0 32px 100px rgba(0,0,0,0.9), 0 0 3px rgba(205,127,50,0.3)" }}
        >
          {/* Top copper accent — fixed */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-copper to-transparent shrink-0" />

          {/* Header — fixed */}
          <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b border-gear-border shrink-0">
            <div className="flex items-start gap-3">
              <div className="text-copper shrink-0 mt-0.5">
                <Gear size={18} className="gear-spin-slow" />
              </div>
              <div>
                <div className="text-[9px] tracking-[0.3em] uppercase text-copper mb-1">Beta Testing</div>
                <h2 className="font-serif text-xl text-cream leading-tight">{tool.title}</h2>
              </div>
            </div>
            <button onClick={onClose} className="text-text-light hover:text-copper transition-colors shrink-0" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 min-h-0 px-7 py-5 space-y-4">
            {/* Beta notice */}
            <div className="flex items-start gap-3 p-4 border border-[rgba(232,192,80,0.2)] bg-[rgba(232,192,80,0.04)] rounded-sm">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
                <path d="M8 2L14 13H2L8 2Z" stroke="#e8c050" strokeWidth="1.2" fill="none" />
                <line x1="8" y1="7" x2="8" y2="10" stroke="#e8c050" strokeWidth="1.2" />
                <circle cx="8" cy="11.5" r="0.7" fill="#e8c050" />
              </svg>
              <div>
                <div className="text-[10px] font-semibold text-[#e8c050] tracking-[0.15em] uppercase mb-1">Live Testing at Agave &amp; Rye</div>
                <p className="text-xs text-text-muted leading-relaxed">
                  These tools are being tested in a real bar right now. You&rsquo;re getting an early build.
                  It works — we&rsquo;re just still counting bottles to prove it. Feedback welcome.
                </p>
              </div>
            </div>

            {/* Tagline */}
            {preview && (
              <p className="text-sm text-text-muted leading-relaxed">{preview.tagline}</p>
            )}

            {/* Mockup */}
            {preview && (
              <div>
                <div className="text-[9px] tracking-[0.2em] uppercase text-text-light mb-2 flex items-center gap-2">
                  <span className="inline-block w-4 h-[1px] bg-copper/30" />
                  Preview
                </div>
                <div className="overflow-hidden rounded-sm border border-gear-border">
                  {preview.mockup}
                </div>
              </div>
            )}
          </div>

          {/* CTA footer — always visible */}
          <div className="shrink-0 px-7 py-5 border-t border-gear-border flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className="w-full bg-copper hover:bg-copper-bright text-bg font-semibold py-3.5 text-sm tracking-wide transition-all hover:shadow-[0_0_30px_rgba(205,127,50,0.25)]"
            >
              Download Free — {tool.format}
            </button>
            <p className="text-[10px] text-text-light text-center tracking-wide">
              No signup. No email. Free forever. &mdash; opensourcebarware.com
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
