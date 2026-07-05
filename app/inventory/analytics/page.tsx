'use client';

import { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  getBar,
  getCounts,
} from '@/lib/inventory-store';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar as RechartsBar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

function useHydrated() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
}

// ── Chart color palette ──
const COPPER = '#B87333';
const PATINA = '#4ECDC4';
const WINE = '#722F37';
const WARM_GOLD = '#D4A847';
const CATEGORY_COLORS = [COPPER, PATINA, WINE, WARM_GOLD, '#8B5E3C', '#6B9B8A', '#A0522D', '#C8A96E'];

// ── Cost % Gauge (custom SVG semi-circle) ──
function CostGauge({ costPct }: { costPct: number }) {
  const clampedPct = Math.min(Math.max(costPct, 0), 60);
  // Gauge spans 180 degrees (left to right)
  const startAngle = Math.PI; // 180 degrees (left)
  const needleAngle = startAngle - (clampedPct / 60) * Math.PI;

  const cx = 140;
  const cy = 130;
  const radius = 100;
  const innerRadius = 70;

  // Arc helper
  function describeArc(startDeg: number, endDeg: number, r: number, ir: number) {
    const s1 = startAngle - (startDeg / 60) * Math.PI;
    const e1 = startAngle - (endDeg / 60) * Math.PI;
    const x1 = cx + r * Math.cos(s1);
    const y1 = cy - r * Math.sin(s1);
    const x2 = cx + r * Math.cos(e1);
    const y2 = cy - r * Math.sin(e1);
    const x3 = cx + ir * Math.cos(e1);
    const y3 = cy - ir * Math.sin(e1);
    const x4 = cx + ir * Math.cos(s1);
    const y4 = cy - ir * Math.sin(s1);
    const largeArc = (endDeg - startDeg) > 30 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${ir} ${ir} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  }

  // Needle endpoint
  const needleLen = 85;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy - needleLen * Math.sin(needleAngle);

  // Zone labels
  const zoneLabel = costPct <= 18
    ? { text: 'Low', color: '#D4A847' }
    : costPct <= 24
    ? { text: 'Target', color: '#4ECDC4' }
    : costPct <= 32
    ? { text: 'Warning', color: '#D4A847' }
    : { text: 'Danger', color: '#722F37' };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 280 160" className="w-full max-w-[280px]">
        {/* Danger zone: 32-60% */}
        <path d={describeArc(32, 60, radius, innerRadius)} fill="#722F37" opacity="0.7" />
        {/* Warning zone: 24-32% */}
        <path d={describeArc(24, 32, radius, innerRadius)} fill="#D4A847" opacity="0.7" />
        {/* Target zone: 18-24% */}
        <path d={describeArc(18, 24, radius, innerRadius)} fill="#4ECDC4" opacity="0.8" />
        {/* Low zone: 0-18% */}
        <path d={describeArc(0, 18, radius, innerRadius)} fill="#D4A847" opacity="0.4" />

        {/* Tick marks */}
        {[0, 10, 18, 24, 32, 40, 50, 60].map((tick) => {
          const a = startAngle - (tick / 60) * Math.PI;
          const tx1 = cx + (radius + 4) * Math.cos(a);
          const ty1 = cy - (radius + 4) * Math.sin(a);
          const tx2 = cx + (radius + 12) * Math.cos(a);
          const ty2 = cy - (radius + 12) * Math.sin(a);
          return (
            <g key={tick}>
              <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--copper)" strokeWidth="1.5" opacity="0.6" />
              <text
                x={cx + (radius + 20) * Math.cos(a)}
                y={cy - (radius + 20) * Math.sin(a)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--text-light)"
                fontSize="9"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--cream)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="var(--copper)" />
        <circle cx={cx} cy={cy} r="3" fill="var(--bg)" />

        {/* Value text */}
        <text x={cx} y={cy + 25} textAnchor="middle" fill="var(--cream)" fontSize="22" fontFamily="serif">
          {costPct.toFixed(1)}%
        </text>
      </svg>
      <span className="text-xs tracking-wider uppercase mt-1" style={{ color: zoneLabel.color }}>
        {zoneLabel.text} Zone
      </span>
    </div>
  );
}

// ── Main Analytics Page ──
export default function AnalyticsPage() {
  const hydrated = useHydrated();
  const bar = hydrated ? getBar() : null;
  const counts = hydrated ? getCounts() : [];
  // settings available via getInventorySettings() for future cycle-label display

  const allBottles = useMemo(() => (bar ? bar.stations.flatMap((s) => s.bottles) : []), [bar]);

  // ── Computed metrics ──
  const costPct = useMemo(() => {
    if (allBottles.length === 0) return 0;
    const withPrice = allBottles.filter((b) => b.costPerBottle > 0);
    if (withPrice.length === 0) return 0;
    // Avg cost % across products (costPerBottle as % of a typical sell price estimate)
    // Using a standard 4x markup assumption: sellPrice ~ costPerBottle * 4
    // So cost % = cost / (cost * 4) = 25% baseline, but we use actual ratio:
    // cost% = avg(costPerBottle / (costPerBottle * 4)) simplifies — instead,
    // use total inventory cost / estimated revenue value
    const totalCost = withPrice.reduce((sum, b) => sum + b.costPerBottle * b.currentLevel, 0);
    // Estimate sell value as 4x cost (industry standard pour cost target ~22-25%)
    const estimatedRevenue = totalCost * 4;
    return estimatedRevenue > 0 ? (totalCost / estimatedRevenue) * 100 : 0;
  }, [allBottles]);

  // ── Category value data (bar chart) ──
  const categoryValueData = useMemo(() => {
    const map = new Map<string, number>();
    allBottles.forEach((b) => {
      const val = b.costPerBottle * b.currentLevel;
      map.set(b.category, (map.get(b.category) || 0) + val);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [allBottles]);

  // ── Category distribution (pie chart) ──
  const categoryDistribution = useMemo(() => {
    const map = new Map<string, number>();
    allBottles.forEach((b) => {
      map.set(b.category, (map.get(b.category) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value);
  }, [allBottles]);

  // ── Variance alerts (below par) ──
  const varianceAlerts = useMemo(() => {
    return allBottles
      .filter((b) => b.currentLevel < b.parLevel)
      .map((b) => ({
        id: b.id,
        name: b.name,
        category: b.category,
        current: b.currentLevel,
        par: b.parLevel,
        deficit: b.parLevel - b.currentLevel,
      }))
      .sort((a, b) => b.deficit - a.deficit);
  }, [allBottles]);

  // ── Trend data (count history over time) ──
  const trendData = useMemo(() => {
    if (counts.length === 0) return [];
    return counts
      .slice(0, 12)
      .reverse()
      .map((c) => ({
        date: new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        items: c.entries.length,
        avgLevel: c.entries.length > 0
          ? Math.round((c.entries.reduce((s, e) => s + e.countedLevel, 0) / c.entries.length) * 100) / 100
          : 0,
      }));
  }, [counts]);

  // ── Velocity (items that changed level between most recent counts) ──
  const velocityData = useMemo(() => {
    if (counts.length < 2) return [];
    const latest = counts[0];
    const previous = counts[1];
    const prevMap = new Map(previous.entries.map((e) => [e.bottleId, e.countedLevel]));

    return latest.entries
      .filter((e) => prevMap.has(e.bottleId))
      .map((e) => {
        const prevLevel = prevMap.get(e.bottleId) || 0;
        const change = e.countedLevel - prevLevel;
        return {
          id: e.bottleId,
          name: e.bottleName,
          change: Math.round(change * 100) / 100,
          direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
        };
      })
      .filter((v) => v.direction !== 'flat')
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 10);
  }, [counts]);

  // ── Loading state ──
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  // ── Empty state ──
  if (!bar || allBottles.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="panel panel--glass">
          <p className="text-text-muted mb-4">No inventory data to analyze yet.</p>
          <p className="text-text-light text-sm mb-6">
            Load a bar and run at least one count to see analytics here.
          </p>
          <Link
            href="/inventory/dashboard"
            className="inline-block bg-copper hover:bg-copper-bright text-bg font-semibold px-6 py-2.5 text-sm tracking-wide transition-all"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Total inventory value ──
  const totalValue = allBottles.reduce((sum, b) => sum + b.costPerBottle * b.currentLevel, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <header className="view-header mb-8">
        <h1>Program Health</h1>
        <p>Inventory analytics from your live bar map and completed cycles.</p>
      </header>

      {/* ── Top row: Gauge + Summary Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {/* Cost % Gauge */}
        <div className="panel panel--glass lg:col-span-1 flex flex-col items-center justify-center">
          <span className="text-[10px] tracking-[0.2em] uppercase text-text-light mb-4">
            Beverage Cost %
          </span>
          <CostGauge costPct={costPct} />
          <p className="text-xs text-text-muted mt-4 text-center max-w-[200px]">
            Target: 18-24% for spirits programs
          </p>
        </div>

        {/* Inventory Value by Category (bar chart) */}
        <div className="panel panel--glass lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] tracking-[0.2em] uppercase text-text-light">
              Inventory Value by Category
            </span>
            <span className="font-serif text-lg copper-text">${totalValue.toFixed(0)}</span>
          </div>
          {categoryValueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryValueData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--text-light)', fontSize: 10 }}
                  axisLine={{ stroke: 'var(--gear-border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-light)', fontSize: 10 }}
                  axisLine={{ stroke: 'var(--gear-border)' }}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--gear-border)',
                    borderRadius: '4px',
                    color: 'var(--cream)',
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((value: number) => [`$${value.toFixed(2)}`, 'Value']) as any}
                />
                <RechartsBar dataKey="value" radius={[3, 3, 0, 0]}>
                  {categoryValueData.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </RechartsBar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">
              No category data available
            </div>
          )}
        </div>
      </div>

      {/* ── Middle row: Pie chart + Variance Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
        {/* Category Breakdown (donut) */}
        <div className="panel panel--glass">
          <span className="text-[10px] tracking-[0.2em] uppercase text-text-light block mb-4">
            Category Breakdown
          </span>
          {categoryDistribution.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    stroke="var(--bg-panel)"
                    strokeWidth={2}
                  >
                    {categoryDistribution.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-panel)',
                      border: '1px solid var(--gear-border)',
                      borderRadius: '4px',
                      color: 'var(--cream)',
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((value: number, name: string) => [`${value} items`, name]) as any}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 min-w-0">
                {categoryDistribution.slice(0, 6).map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                    />
                    <span className="text-text-light truncate">{cat.name}</span>
                    <span className="text-text-muted ml-auto">{cat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-text-muted text-sm">
              No products mapped yet
            </div>
          )}
        </div>

        {/* Variance Alerts */}
        <div className="panel panel--glass">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] tracking-[0.2em] uppercase text-text-light">
              Variance Alerts
            </span>
            {varianceAlerts.length > 0 && (
              <span className="text-xs font-mono text-wine-glow">
                {varianceAlerts.length} below par
              </span>
            )}
          </div>
          {varianceAlerts.length > 0 ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {varianceAlerts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded bg-wine/10 border border-wine/20"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-cream block truncate">{item.name}</span>
                    <span className="text-[10px] text-text-light uppercase">{item.category}</span>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-xs font-mono text-wine-glow block">
                      {item.current.toFixed(1)} / {item.par.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      -{item.deficit.toFixed(1)} deficit
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <div className="text-center">
                <span className="text-patina-light text-2xl block mb-2">&#10003;</span>
                <span className="text-text-muted text-sm">All items at or above par</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row: Trends + Velocity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Trend Indicators */}
        <div className="panel panel--glass">
          <span className="text-[10px] tracking-[0.2em] uppercase text-text-light block mb-4">
            Count Trends
          </span>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-light)', fontSize: 10 }}
                  axisLine={{ stroke: 'var(--gear-border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-light)', fontSize: 10 }}
                  axisLine={{ stroke: 'var(--gear-border)' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--gear-border)',
                    borderRadius: '4px',
                    color: 'var(--cream)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="items"
                  stroke={COPPER}
                  strokeWidth={2}
                  dot={{ fill: COPPER, r: 3 }}
                  name="Items Counted"
                />
                <Line
                  type="monotone"
                  dataKey="avgLevel"
                  stroke={PATINA}
                  strokeWidth={2}
                  dot={{ fill: PATINA, r: 3 }}
                  name="Avg Level"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-text-muted text-sm">
              Complete at least one count to see trends
            </div>
          )}
        </div>

        {/* Velocity */}
        <div className="panel panel--glass">
          <span className="text-[10px] tracking-[0.2em] uppercase text-text-light block mb-4">
            Velocity — Movers
          </span>
          {velocityData.length > 0 ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {velocityData.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded bg-bg-warm border border-gear-border/50"
                >
                  <span className="text-sm text-cream truncate flex-1 min-w-0">{item.name}</span>
                  <span
                    className={`text-xs font-mono ml-3 shrink-0 ${
                      item.direction === 'down' ? 'text-wine-glow' : 'text-patina-light'
                    }`}
                  >
                    {item.direction === 'down' ? '\u2193' : '\u2191'} {Math.abs(item.change).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-text-muted text-sm">
              Need 2+ counts to calculate velocity
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
