'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  getBar,
  getCounts,
  getInventorySettings,
  type Bar,
  type InventoryCount,
} from '@/lib/inventory-store';

function useHydrated() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
}

type TabId = 'dashboard' | 'product-master' | 'count-sheet' | 'variance' | 'purchases' | 'order-generator';

const TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'product-master', label: 'Product Master' },
  { id: 'count-sheet', label: 'Count Sheet' },
  { id: 'variance', label: 'Variance Analysis' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'order-generator', label: 'Order Generator' },
];

// ── Flat row for product master ──
interface ProductRow {
  name: string;
  category: string;
  station: string;
  size: string;
  cost: number;
  pourCost: number;
  costPct: number;
  currentLevel: number;
  parLevel: number;
}

function buildProductRows(bar: Bar): ProductRow[] {
  const rows: ProductRow[] = [];
  for (const station of bar.stations) {
    for (const bottle of station.bottles) {
      // Pour cost estimate: cost per bottle / ~17 pours per 750ml
      const poursPerBottle = bottle.size === '1L' ? 22 : bottle.size === '1.75L' ? 39 : 17;
      const pourCost = bottle.costPerBottle / poursPerBottle;
      // Cost % assumes average drink price of $12
      const avgDrinkPrice = 12;
      const costPct = avgDrinkPrice > 0 ? (pourCost / avgDrinkPrice) * 100 : 0;

      rows.push({
        name: bottle.name,
        category: bottle.category,
        station: station.name,
        size: bottle.size,
        cost: bottle.costPerBottle,
        pourCost,
        costPct,
        currentLevel: bottle.currentLevel,
        parLevel: bottle.parLevel,
      });
    }
  }
  return rows.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

// ── Variance row ──
interface VarianceRow {
  name: string;
  station: string;
  currentLevel: number;
  parLevel: number;
  variance: number;
  variancePct: number;
  status: 'over' | 'at' | 'under';
}

function buildVarianceRows(bar: Bar): VarianceRow[] {
  const rows: VarianceRow[] = [];
  for (const station of bar.stations) {
    for (const bottle of station.bottles) {
      const variance = bottle.currentLevel - bottle.parLevel;
      const variancePct = bottle.parLevel > 0 ? (variance / bottle.parLevel) * 100 : 0;
      const status = variance > 0.05 ? 'over' : variance < -0.05 ? 'under' : 'at';
      rows.push({
        name: bottle.name,
        station: station.name,
        currentLevel: bottle.currentLevel,
        parLevel: bottle.parLevel,
        variance,
        variancePct,
        status,
      });
    }
  }
  return rows.sort((a, b) => a.variance - b.variance);
}

// ── Main Page ──
export default function SpreadsheetsPage() {
  const hydrated = useHydrated();
  const [activeTab, setActiveTab] = useState<TabId>('product-master');

  const bar = hydrated ? getBar() : null;
  const counts = hydrated ? getCounts() : [];
  const settings = hydrated ? getInventorySettings() : null;

  const productRows = useMemo(() => (bar ? buildProductRows(bar) : []), [bar]);
  const varianceRows = useMemo(() => (bar ? buildVarianceRows(bar) : []), [bar]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted animate-pulse">Loading spreadsheets...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="glow-dot" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-patina-light font-medium">
              Spreadsheet View
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl copper-text">Inventory Workbook</h1>
        </div>

        {/* ── Download Buttons ── */}
        <div className="flex flex-wrap gap-3">
          <a
            href="/downloads/Bar-Inventory-Master.xlsx"
            download
            className="inline-flex items-center gap-2 bg-copper hover:bg-copper-bright text-bg font-semibold px-7 py-3 text-base tracking-wide transition-all hover:shadow-[0_0_24px_rgba(168,120,79,0.4)] rounded-sm"
          >
            <DownloadSvg />
            Download Workbook (.xlsx)
          </a>
          <a
            href="/downloads/Quick-Count-Sheet.xlsx"
            download
            className="inline-flex items-center gap-2 border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-5 py-3 text-sm tracking-wide transition-all rounded-sm"
          >
            <DownloadSvg />
            Download Blank Template
          </a>
        </div>
      </div>

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

      {/* ── Tab Content ── */}
      <div className="panel rounded-sm p-4 sm:p-6 rivets overflow-hidden">
        {activeTab === 'dashboard' && <DashboardTab bar={bar} counts={counts} settings={settings} />}
        {activeTab === 'product-master' && <ProductMasterTab rows={productRows} />}
        {activeTab === 'count-sheet' && <CountSheetTab bar={bar} />}
        {activeTab === 'variance' && <VarianceTab rows={varianceRows} />}
        {activeTab === 'purchases' && <PurchasesTab />}
        {activeTab === 'order-generator' && <OrderGeneratorTab rows={varianceRows} />}
      </div>

      {/* ── Back link ── */}
      <div className="mt-6">
        <Link
          href="/inventory/dashboard"
          className="text-sm text-text-muted hover:text-copper transition-colors"
        >
          &larr; Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

// ── Tab: Dashboard Summary ──
function DashboardTab({
  bar,
  counts,
  settings,
}: {
  bar: Bar | null;
  counts: InventoryCount[];
  settings: ReturnType<typeof getInventorySettings> | null;
}) {
  if (!bar) return <EmptyState />;

  const totalProducts = bar.stations.reduce((sum, s) => sum + s.bottles.length, 0);
  const totalValue = bar.stations.reduce(
    (sum, s) => sum + s.bottles.reduce((bSum, b) => bSum + b.costPerBottle * b.currentLevel, 0),
    0
  );
  const belowPar = bar.stations.reduce(
    (sum, s) => sum + s.bottles.filter((b) => b.currentLevel < b.parLevel).length,
    0
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gear-border">
            <th className="text-left py-2 px-3 text-text-light text-xs uppercase tracking-wider">Metric</th>
            <th className="text-right py-2 px-3 text-text-light text-xs uppercase tracking-wider">Value</th>
          </tr>
        </thead>
        <tbody className="text-text-light">
          <tr className="border-b border-gear-border/50">
            <td className="py-2 px-3">Bar Name</td>
            <td className="py-2 px-3 text-right text-cream">{bar.name}</td>
          </tr>
          <tr className="border-b border-gear-border/50">
            <td className="py-2 px-3">Total Stations</td>
            <td className="py-2 px-3 text-right text-cream">{bar.stations.length}</td>
          </tr>
          <tr className="border-b border-gear-border/50">
            <td className="py-2 px-3">Total Products</td>
            <td className="py-2 px-3 text-right text-cream">{totalProducts}</td>
          </tr>
          <tr className="border-b border-gear-border/50">
            <td className="py-2 px-3">Estimated Inventory Value</td>
            <td className="py-2 px-3 text-right copper-text font-medium">${totalValue.toFixed(2)}</td>
          </tr>
          <tr className="border-b border-gear-border/50">
            <td className="py-2 px-3">Products Below Par</td>
            <td className={`py-2 px-3 text-right font-medium ${belowPar > 0 ? 'text-wine-glow' : 'text-patina-light'}`}>
              {belowPar}
            </td>
          </tr>
          <tr className="border-b border-gear-border/50">
            <td className="py-2 px-3">Inventory Counts Recorded</td>
            <td className="py-2 px-3 text-right text-cream">{counts.length}</td>
          </tr>
          <tr className="border-b border-gear-border/50">
            <td className="py-2 px-3">Last Count Date</td>
            <td className="py-2 px-3 text-right text-cream">
              {bar.lastCountDate
                ? new Date(bar.lastCountDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Never'}
            </td>
          </tr>
          <tr>
            <td className="py-2 px-3">Cycle</td>
            <td className="py-2 px-3 text-right text-cream">{settings?.cycleLabel || 'Not set'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Product Master ──
function ProductMasterTab({ rows }: { rows: ProductRow[] }) {
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
              <td className="py-2 px-3 text-right font-mono">${row.pourCost.toFixed(2)}</td>
              <td className={`py-2 px-3 text-right font-mono ${row.costPct > 25 ? 'text-wine-glow' : row.costPct > 20 ? 'text-copper' : 'text-patina-light'}`}>
                {row.costPct.toFixed(1)}%
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

// ── Tab: Count Sheet ──
function CountSheetTab({ bar }: { bar: Bar | null }) {
  if (!bar || bar.stations.length === 0) return <EmptyState />;

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
          {bar.stations.map((station) =>
            station.bottles.map((bottle, i) => (
              <tr key={bottle.id} className={`border-b border-gear-border/30 ${i % 2 === 0 ? 'bg-bg-warm/20' : ''}`}>
                <td className="py-2 px-3 text-cream">{station.name}</td>
                <td className="py-2 px-3">{bottle.name}</td>
                <td className="py-2 px-3">{bottle.size}</td>
                <td className="py-2 px-3 text-right font-mono">{bottle.currentLevel.toFixed(1)}</td>
                <td className="py-2 px-3 text-right font-mono">{bottle.parLevel.toFixed(1)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="mt-3 text-xs text-text-muted">
        Levels shown as fraction of full bottle (0.0 - 1.0+)
      </div>
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

// ── Tab: Purchases (placeholder) ──
function PurchasesTab() {
  return (
    <div className="text-center py-12">
      <p className="text-text-muted mb-2">Purchase tracking coming soon.</p>
      <p className="text-xs text-text-muted">
        Invoice uploads from the{' '}
        <Link href="/inventory/inputs" className="text-copper hover:text-copper-bright transition-colors underline">
          Weekly Inputs
        </Link>{' '}
        page will populate this sheet.
      </p>
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
      <Link
        href="/inventory/dashboard"
        className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-6 py-2.5 text-sm tracking-wide transition-all"
      >
        Go to Dashboard
      </Link>
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
