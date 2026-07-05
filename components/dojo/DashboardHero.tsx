export interface DashboardHeroStat {
  value: string | number;
  label: string;
}

export default function DashboardHero({
  badge,
  title,
  sub,
  stats,
}: {
  badge: string;
  title: string;
  sub: string;
  stats: DashboardHeroStat[];
}) {
  return (
    <div className="dashboard-hero">
      <div className="dashboard-hero-glow" aria-hidden="true" />
      <div className="dashboard-hero-main">
        <span className="dashboard-hero-badge">{badge}</span>
        <h2 className="dashboard-hero-title">{title}</h2>
        <p className="dashboard-hero-sub">{sub}</p>
      </div>
      <div className="dashboard-hero-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="dashboard-hero-stat">
            <span className="dashboard-hero-stat-num">{stat.value}</span>
            <span className="dashboard-hero-stat-lbl">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}