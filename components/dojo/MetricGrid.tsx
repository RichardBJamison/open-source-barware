export interface MetricItem {
  value: string | number;
  label: string;
  accent?: "default" | "warning";
}

export default function MetricGrid({ items }: { items: MetricItem[] }) {
  return (
    <div className="dojo-metrics-grid">
      {items.map((item) => (
        <div
          key={item.label}
          className={`dojo-metric ${item.accent === "warning" ? "dojo-metric-warning" : ""}`}
        >
          <div className="dojo-metric-num">{item.value}</div>
          <div className="dojo-metric-lbl">{item.label}</div>
        </div>
      ))}
    </div>
  );
}