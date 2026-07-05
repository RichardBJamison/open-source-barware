'use client';

import { useMemo, useState } from 'react';
import { useHydrated } from '@/components/dojo/useHydrated';
import { computeAnalytics } from '@/lib/dojo-admin';
import {
  getBar,
  getCounts,
  getInventorySettings,
} from '@/lib/inventory-store';

type TabId = 'dashboard' | 'product-master' | 'count-sheet' | 'variance' | 'order-generator';

interface VarianceRow {
  name: string;
  station: string;
  currentLevel: number;
  parLevel: number;
  variance: number;
  variancePct: number;
  status: 'over' | 'at' | 'under';
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'product-master', label: 'Product Master' },
  { id: 'count-sheet', label: 'Count Sheet' },
  { id: 'variance', label: 'Variance' },
  { id: 'order-generator', label: 'Order Generator' },
];

// ── Main Page ──
export default function SpreadsheetsPage() {
  const hydrated = useHydrated();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const bar = hydrated ? getBar() : null;
  const counts = hydrated ? getCounts() : [];
  const settings = hydrated ? getInventorySettings() : null;

  const workbook = useMemo(() => {
    if (!settings) return null;
    return computeAnalytics(bar, counts, settings);
  }, [bar, counts, settings]);

  const productRows = workbook?.product_rows ?? [];
  const varianceRows = useMemo(() => {
    return productRows
      .map((row) => {
        const variance = row.current_level - row.par_level;
        const variancePct = row.par_level ? (variance / row.par_level) * 100 : 0;
        const status: VarianceRow['status'] =
          variance > 0.05 ? 'over' : variance < -0.05 ? 'under' : 'at';
        return {
          name: row.name,
          station: row.station,
          currentLevel: row.current_level,
          parLevel: row.par_level,
          variance,
          variancePct,
          status,
        };
      })
      .sort((a, b) => a.variance - b.variance);
  }, [productRows]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted animate-pulse">Loading spreadsheets...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="view-header">
        <h1>Inventory Workbook</h1>
        <p>Live spreadsheet view plus exports — same data as the downloaded program.</p>
      </header>

      <section className="panel panel--glass">
        <div className="flex flex-wrap gap-3">
          <a
            href="/downloads/Bar-Inventory-Master.xlsx"
            download
            className="inline-flex items-center gap-2 bg-copper hover:bg-copper-bright text-bg font-semibold px-5 py-2.5 text-sm tracking-wide transition-all rounded-sm"
          >
            <DownloadSvg />
            Download workbook (.xlsx)
          </a>
          <a
            href="/downloads/Quick-Count-Sheet.xlsx"
            download
            className="inline-flex items-center gap-2 border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-5 py-2.5 text-sm tracking-wide transition-all rounded-sm"
          >
            <DownloadSvg />
            Blank count template
          </a>
        </div>
      </section>

      {/* ── Tabs ── */}
      <div className="border-b border-gear-border mb-6 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm tracking-wide border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-copper text-copper font-medium'
                  : 'border-transparent text-text-muted hover:text-text-light hover:border-gear-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel panel--glass overflow-hidden">
        {activeTab === 'dashboard' && <DashboardTab workbook={workbook} />}
        {activeTab === 'product-master' && <ProductMasterTab rows={productRows} />}
        {activeTab === 'count-sheet' && <CountSheetTab rows={productRows} />}
        {activeTab === 'variance' && <VarianceTab rows={varianceRows} />}
        {activeTab === 'order-generator' && <OrderGeneratorTab rows={varianceRows} />}
      </div>

      <section className="panel panel--glass">
        <h2 className="font-serif text-lg text-cream mb-2">Export toolkit</h2>
        <p className="dojo-field-hint mt-0 mb-4">
          Same exports as caterpillar setup — audit, walk sheets, count comparison, first-week JSON.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/downloads/Bar-Inventory-Master.xlsx"
            download
            className="border border-gear-border text-text-muted hover:text-copper px-4 py-2 text-sm tracking-wide transition-all rounded-sm"
          >
            Audit (.xlsx)
          </a>
          <a
            href="/downloads/Quick-Count-Sheet.xlsx"
            download
            className="border border-gear-border text-text-muted hover:text-copper px-4 py-2 text-sm tracking-wide transition-all rounded-sm"
          >
            Walk sheet (.xlsx)
          </a>
          <span className="border border-gear-border text-text-light px-4 py-2 text-sm tracking-wide rounded-sm opacity-70">
            First-week report — in downloaded program
          </span>
        </div>
      </section>
    </div>
  );
}

function DashboardTab({
  workbook,
}: {
  workbook: ReturnType<typeof computeAnalytics> | null;
}) {
  if (!workbook?.bottle_count) return <EmptyState />;

  const rows: [string, string][] = [
    ['Bar name', workbook.bar_name],
    ['Total products', String(workbook.bottle_count)],
    ['Stations', String(workbook.station_count)],
    ['Estimated value', `$${workbook.total_value.toFixed(2)}`],
    ['Below par', String(workbook.below_par)],
    ['Cycles logged', String(workbook.cycles_total)],
    ['Cycle label', workbook.cycle_label],
    [
      'Last count',
      workbook.last_count_at
        ? workbook.last_count_at.slice(0, 10)
        : 'Never',
    ],
  ];

  return (
    <div className="dojo-review-table-wrap">
      <table className="dojo-review-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([metric, value]) => (
            <tr key={metric}>
              <td>{metric}</td>
              <td className="text-cream">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductMasterTab({
  rows,
}: {
  rows: ReturnType<typeof computeAnalytics>['product_rows'];
}) {
  if (rows.length === 0) return <EmptyState />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gear-border">
            <th className="text-left py-2 px-3 text-text-light text-xs uppercase tracking-wider">Product</th>
            <th className="text-left py-2 px-3 text-text-light text-xs uppercase tracking-wider">Category</th>
            <th className="text-left py-2 px-3 text-text-light text-xs uppercase tracking-wider">Station</th>
            <th className="text-left py-2 px-3 text-text-light text-xs uppercase tracking-wider">Size</th>
            <th className="text-right py-2 px-3 text-text-light text-xs uppercase tracking-wider">Cost</th>
            <th className="text-right py-2 px-3 text-text-light text-xs uppercase tracking-wider">Pour Cost</th>
            <th className="text-right py-2 px-3 text-text-light text-xs uppercase tracking-wider">Cost %</th>
          </tr>
        </thead>
        <tbody className="text-text-light">
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-gear-border/30 ${i % 2 === 0 ? 'bg-bg-warm/20' : ''}`}>
              <td className="py-2 px-3 text-cream">{row.name}</td>
              <td className="py-2 px-3">
                <span className="inline-block text-[10px] tracking-wider uppercase px-2 py-0.5 border border-copper/30 rounded-full text-copper">
                  {row.category}
                </span>
              </td>
              <td className="py-2 px-3">{row.station}</td>
              <td className="py-2 px-3">{row.size}</td>
              <td className="py-2 px-3 text-right font-mono">${row.cost.toFixed(2)}</td>
              <td className="py-2 px-3 text-right font-mono">${row.pour_cost.toFixed(2)}</td>
              <td className={`py-2 px-3 text-right font-mono ${row.cost_pct > 25 ? 'text-wine-glow' : row.cost_pct > 20 ? 'text-copper' : 'text-patina-light'}`}>
                {row.cost_pct.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-xs text-text-muted">
        {rows.length} product{rows.length !== 1 ? 's' : ''} &middot; Pour cost assumes ~17 pours per 750ml &middot; Cost % based on $12 avg drink price
      </div>
    </div>
  );
}

function CountSheetTab({
  rows,
}: {
  rows: ReturnType<typeof computeAnalytics>['product_rows'];
}) {
  if (rows.length === 0) return <EmptyState />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gear-border">
            <th className="text-left py-2 px-3 text-text-light text-xs uppercase tracking-wider">Station</th>
            <th className="text-left py-2 px-3 text-text-light text-xs uppercase tracking-wider">Product</th>
            <th className="text-left py-2 px-3 text-text-light text-xs uppercase tracking-wider">Size</th>
            <th className="text-right py-2 px-3 text-text-light text-xs uppercase tracking-wider">Current Level</th>
            <th className="text-right py-2 px-3 text-text-light text-xs uppercase tracking-wider">Par Level</th>
          </tr>
        </thead>
        <tbody className="text-text-light">
          {rows.map((row, i) => (
            <tr key={`${row.name}-${i}`} className={`border-b border-gear-border/30 ${i % 2 === 0 ? 'bg-bg-warm/20' : ''}`}>
              <td className="py-2 px-3 text-cream">{row.station}</td>
              <td className="py-2 px-3">{row.name}</td>
              <td className="py-2 px-3">{row.size}</td>
              <td className="py-2 px-3 text-right font-mono">{row.current_level.toFixed(1)}</td>
              <td className="py-2 px-3 text-right font-mono">{row.par_level.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Variance Analysis ──
function VarianceTab({ rows }: { rows: VarianceRow[] }) {
  if (rows.length === 0) return <EmptyState />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gear-border">
            <th className="text-left py-2 px-3 text-text-light text-xs uppercase tracking-wider">Product</th>
            <th className="text-left py-2 px-3 text-text-light text-xs uppercase tracking-wider">Station</th>
            <th className="text-right py-2 px-3 text-text-light text-xs uppercase tracking-wider">Current</th>
            <th className="text-right py-2 px-3 text-text-light text-xs uppercase tracking-wider">Par</th>
            <th className="text-right py-2 px-3 text-text-light text-xs uppercase tracking-wider">Variance</th>
            <th className="text-right py-2 px-3 text-text-light text-xs uppercase tracking-wider">Var %</th>
            <th className="text-center py-2 px-3 text-text-light text-xs uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="text-text-light">
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-gear-border/30 ${row.status === 'under' ? 'bg-wine/5' : i % 2 === 0 ? 'bg-bg-warm/20' : ''}`}>
              <td className="py-2 px-3 text-cream">{row.name}</td>
              <td className="py-2 px-3">{row.station}</td>
              <td className="py-2 px-3 text-right font-mono">{row.currentLevel.toFixed(2)}</td>
              <td className="py-2 px-3 text-right font-mono">{row.parLevel.toFixed(2)}</td>
              <td className={`py-2 px-3 text-right font-mono ${row.variance < 0 ? 'text-wine-glow' : row.variance > 0 ? 'text-patina-light' : ''}`}>
                {row.variance >= 0 ? '+' : ''}{row.variance.toFixed(2)}
              </td>
              <td className={`py-2 px-3 text-right font-mono ${row.variancePct < 0 ? 'text-wine-glow' : row.variancePct > 0 ? 'text-patina-light' : ''}`}>
                {row.variancePct >= 0 ? '+' : ''}{row.variancePct.toFixed(0)}%
              </td>
              <td className="py-2 px-3 text-center">
                <span className={`inline-block text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                  row.status === 'over'
                    ? 'text-patina-light border-patina/40'
                    : row.status === 'under'
                    ? 'text-wine-glow border-wine/40'
                    : 'text-text-muted border-gear-border'
                }`}>
                  {row.status === 'over' ? 'Over' : row.status === 'under' ? 'Under' : 'At Par'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-xs text-text-muted">
        {rows.filter((r) => r.status === 'under').length} product{rows.filter((r) => r.status === 'under').length !== 1 ? 's' : ''} below par
      </div>
    </div>
  );
}

// ── Tab: Order Generator ──
function OrderGeneratorTab({ rows }: { rows: VarianceRow[] }) {
  const needsOrder = rows.filter((r) => r.status === 'under');

  if (needsOrder.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-patina-light mb-2">All products are at or above par.</p>
        <p className="text-xs text-text-muted">No orders needed at this time.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="mb-4">
        <p className="text-xs text-text-muted">
          Products below par that need reordering &mdash; {needsOrder.length} item{needsOrder.length !== 1 ? 's' : ''}
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gear-border">
            <th className="text-left py-2 px-3 text-text-light text-xs uppercase tracking-wider">Product</th>
            <th className="text-left py-2 px-3 text-text-light text-xs uppercase tracking-wider">Station</th>
            <th className="text-right py-2 px-3 text-text-light text-xs uppercase tracking-wider">Current</th>
            <th className="text-right py-2 px-3 text-text-light text-xs uppercase tracking-wider">Par</th>
            <th className="text-right py-2 px-3 text-text-light text-xs uppercase tracking-wider">Need</th>
          </tr>
        </thead>
        <tbody className="text-text-light">
          {needsOrder.map((row, i) => {
            const need = row.parLevel - row.currentLevel;
            return (
              <tr key={i} className={`border-b border-gear-border/30 ${i % 2 === 0 ? 'bg-bg-warm/20' : ''}`}>
                <td className="py-2 px-3 text-cream">{row.name}</td>
                <td className="py-2 px-3">{row.station}</td>
                <td className="py-2 px-3 text-right font-mono">{row.currentLevel.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono">{row.parLevel.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono text-copper font-medium">
                  +{need.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Empty State ──
function EmptyState() {
  return (
    <div className="text-center py-12">
      <p className="text-text-muted mb-4">No inventory data loaded yet.</p>
      <a
        href="/inventory/dashboard"
        className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-6 py-2.5 text-sm tracking-wide transition-all"
      >
        Go to Home base
      </a>
    </div>
  );
}

// ── SVG Icons ──
function DownloadSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
