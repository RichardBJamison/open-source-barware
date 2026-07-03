'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  generateId,
  getBar,
  saveBar,
  type Bar,
  type Bottle,
  type Station,
} from '@/lib/inventory-store';
import { seedDojoPlayground } from '@/lib/dojo';

function useHydrated() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
}

// ── Station type icons ──
function StationIcon({ type }: { type: Station['type'] }) {
  const icons: Record<Station['type'], string> = {
    well: '\u2693',       // anchor
    'back-bar': '\u2728', // sparkles
    service: '\u2615',    // coffee/service
    storage: '\u{1F4E6}', // package
    'walk-in': '\u2744',  // snowflake
    beer: '\u{1F37A}',    // beer
    wine: '\u{1F377}',    // wine
  };
  return <span className="text-lg">{icons[type] || '\u{1F37E}'}</span>;
}

// ── Level color logic ──
function getLevelStatus(current: number, par: number): 'good' | 'warning' | 'critical' {
  if (current > par) return 'good';
  if (current >= par * 0.8) return 'warning';
  return 'critical';
}

function getLevelColor(status: 'good' | 'warning' | 'critical') {
  switch (status) {
    case 'good': return { bar: 'bg-patina-light', text: 'text-patina-light', border: 'border-patina/40' };
    case 'warning': return { bar: 'bg-copper', text: 'text-copper', border: 'border-copper/40' };
    case 'critical': return { bar: 'bg-wine-glow', text: 'text-wine-glow', border: 'border-wine/40' };
  }
}

// ── Bottle gauge bar ──
function BottleGauge({ current, par }: { current: number; par: number }) {
  const status = getLevelStatus(current, par);
  const colors = getLevelColor(status);
  const pct = Math.min(Math.max(current * 100, 0), 100);

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-3 rounded-full bg-bg-warm border border-gear-border overflow-hidden relative">
        {/* Par level marker */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-text-light/40 z-10"
          style={{ left: `${par * 100}%` }}
          title={`Par: ${(par * 10).toFixed(0)}/10`}
        />
        {/* Fill */}
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
          style={{
            width: `${pct}%`,
            background: status === 'good'
              ? 'linear-gradient(90deg, var(--patina) 0%, var(--patina-light) 100%)'
              : status === 'warning'
              ? 'linear-gradient(90deg, var(--copper-dark) 0%, var(--copper-bright) 100%)'
              : 'linear-gradient(90deg, var(--wine) 0%, var(--wine-glow) 100%)',
          }}
        />
      </div>
      <span className={`text-xs font-mono w-8 text-right ${colors.text}`}>
        {current.toFixed(1)}
      </span>
    </div>
  );
}

// ── Category badge ──
function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-block text-[10px] tracking-wider uppercase px-2 py-0.5 border border-copper/30 rounded-full text-copper whitespace-nowrap">
      {category}
    </span>
  );
}

// ── Main Dashboard ──
export default function DashboardPage() {
  const hydrated = useHydrated();
  const [barOverride, setBarOverride] = useState<Bar | null>(null);
  const [expandedStations, setExpandedStations] = useState<Set<string>>(new Set());
  const bar = barOverride ?? (hydrated ? getBar() : null);
  const allBottles = useMemo(() => (bar ? bar.stations.flatMap((s) => s.bottles) : []), [bar]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted animate-pulse">Loading inventory...</div>
      </div>
    );
  }

  if (!bar) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="panel rounded-sm p-8 sm:p-12 rivets">
          <p className="text-text-muted mb-4">The Dojo is empty. Load the demo bar to start playing.</p>
          <button
            type="button"
            onClick={() => {
              seedDojoPlayground(true);
              window.location.reload();
            }}
            className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-6 py-2.5 text-sm tracking-wide transition-all"
          >
            Load Demo Bar
          </button>
        </div>
      </div>
    );
  }

  // ── Stats calculations ──
  const totalProducts = allBottles.length;
  const totalValue = allBottles.reduce((sum, b) => sum + b.costPerBottle * b.currentLevel, 0);
  const belowPar = allBottles.filter((b) => b.currentLevel < b.parLevel).length;
  const lastCount = bar.lastCountDate
    ? new Date(bar.lastCountDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never';

  const toggleStation = (id: string) => {
    setExpandedStations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="glow-dot" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-patina-light font-medium">
              Inventory Dashboard
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl copper-text">{bar.name}</h1>
        </div>

        {/* ── Quick Actions ── */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/inventory/count"
            className="bg-copper hover:bg-copper-bright text-bg font-semibold px-5 py-2.5 text-sm tracking-wide transition-all hover:shadow-[0_0_20px_rgba(168,120,79,0.3)]"
          >
            Start Count
          </Link>
          <button
            onClick={() => {
              const name = prompt('Product name:');
              if (!name) return;
              const category = prompt('Category (e.g. Vodka, Gin, Rum):') || 'Other';
              const stationId = bar.stations[0]?.id;
              if (!stationId) return;
              const newBottle: Bottle = {
                id: generateId('bottle'),
                name,
                category,
                currentLevel: 1.0,
                parLevel: 0.5,
                size: '750ml',
                costPerBottle: 20,
              };
              const updated = {
                ...bar,
                stations: bar.stations.map((s) =>
                  s.id === stationId ? { ...s, bottles: [...s.bottles, newBottle] } : s
                ),
              };
              saveBar(updated);
              setBarOverride(updated);
            }}
            className="border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-5 py-2.5 text-sm tracking-wide transition-all"
          >
            Add Product
          </button>
          <Link
            href="/inventory/history"
            className="border border-gear-border text-text-muted hover:text-copper hover:border-copper/50 px-5 py-2.5 text-sm tracking-wide transition-all"
          >
            View History
          </Link>
        </div>
      </div>

      {/* ── Overview Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10">
        <StatCard label="Total Products" value={String(totalProducts)} icon={<BottleSvg />} />
        <StatCard label="Est. Value" value={`$${totalValue.toFixed(0)}`} icon={<DollarSvg />} />
        <StatCard
          label="Below Par"
          value={String(belowPar)}
          icon={<AlertSvg />}
          accent={belowPar > 0 ? 'critical' : 'good'}
        />
        <StatCard label="Last Count" value={lastCount} icon={<CalendarSvg />} />
      </div>

      {/* ── Station Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {bar.stations.map((station) => {
          const isExpanded = expandedStations.has(station.id);
          const stationBelowPar = station.bottles.filter((b) => b.currentLevel < b.parLevel).length;

          return (
            <div key={station.id} className="panel rounded-sm relative rivets overflow-hidden">
              {/* Station header */}
              <button
                onClick={() => toggleStation(station.id)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-bg-warm/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StationIcon type={station.type} />
                  <div className="min-w-0">
                    <h3 className="font-serif text-lg text-cream truncate">{station.name}</h3>
                    <p className="text-xs text-text-light">
                      {station.bottles.length} bottle{station.bottles.length !== 1 ? 's' : ''}
                      {stationBelowPar > 0 && (
                        <span className="text-wine-glow ml-2">
                          {stationBelowPar} below par
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className={`text-text-light transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <path d="M5 8l5 5 5-5" />
                </svg>
              </button>

              {/* Expanded bottle list */}
              {isExpanded && (
                <div className="border-t border-gear-border">
                  {station.bottles.map((bottle, i) => {
                    const status = getLevelStatus(bottle.currentLevel, bottle.parLevel);
                    return (
                      <div
                        key={bottle.id}
                        className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3 ${
                          i < station.bottles.length - 1 ? 'border-b border-gear-border/50' : ''
                        } ${status === 'critical' ? 'bg-wine/5' : ''}`}
                      >
                        {/* Name + category */}
                        <div className="flex items-center gap-2 sm:w-2/5 min-w-0">
                          <div
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              status === 'good'
                                ? 'bg-patina-light'
                                : status === 'warning'
                                ? 'bg-copper'
                                : 'bg-wine-glow'
                            }`}
                          />
                          <span className="text-sm text-cream truncate">{bottle.name}</span>
                          <CategoryBadge category={bottle.category} />
                        </div>

                        {/* Gauge */}
                        <div className="sm:w-3/5">
                          <BottleGauge current={bottle.currentLevel} par={bottle.parLevel} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Empty state ── */}
      {bar.stations.length === 0 && (
        <div className="panel rounded-sm p-12 text-center">
          <p className="text-text-muted mb-4">No stations configured yet.</p>
          <button
            onClick={() => {
              const name = prompt('Station name (e.g. Well 1, Back Bar):');
              if (!name) return;
              const updated = {
                ...bar,
                stations: [
                  ...bar.stations,
                  { id: generateId('station'), name, type: 'well' as const, bottles: [] },
                ],
              };
              saveBar(updated);
              setBarOverride(updated);
            }}
            className="bg-copper hover:bg-copper-bright text-bg font-semibold px-6 py-2.5 text-sm tracking-wide transition-all"
          >
            Add First Station
          </button>
        </div>
      )}
    </div>
  );
}

// ── Stat Card ──
function StatCard({
  label,
  value,
  icon,
  accent = 'neutral',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: 'good' | 'critical' | 'neutral';
}) {
  const accentBorder =
    accent === 'critical' ? 'border-wine/40' : accent === 'good' ? 'border-patina/40' : 'border-gear-border';

  return (
    <div className={`panel rounded-sm p-4 sm:p-5 ${accentBorder}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-[0.2em] uppercase text-text-light">{label}</span>
        <div className="opacity-50">{icon}</div>
      </div>
      <div
        className={`font-serif text-2xl sm:text-3xl ${
          accent === 'critical' ? 'text-wine-glow' : accent === 'good' ? 'text-patina-light' : 'copper-text'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ── Inline SVG icons ──
function BottleSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 48" fill="none" className="w-5 h-5">
      <rect x="12" y="2" width="8" height="6" rx="1" stroke="var(--copper)" strokeWidth="1" />
      <path d="M13 8L10 16v26a2 2 0 002 2h8a2 2 0 002-2V16l-3-8H13z" stroke="var(--copper)" strokeWidth="1.5" />
    </svg>
  );
}

function DollarSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--copper)" strokeWidth="1.5" className="w-5 h-5">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function AlertSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--copper)" strokeWidth="1.5" className="w-5 h-5">
      <path d="M12 9v4M12 17h.01M10.29 3.86l-8.6 14.86A2 2 0 003.43 22h17.14a2 2 0 001.74-3.28l-8.6-14.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}

function CalendarSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--copper)" strokeWidth="1.5" className="w-5 h-5">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
