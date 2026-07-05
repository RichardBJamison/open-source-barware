export interface MetricItem {
  value: string | number;
  label: string;
  accent?: "default" | "warning" | "hero" | "patina";
}

export default function MetricGrid({ items }: { items: MetricItem[] }) {
  return (
    <div className="dojo-metrics-grid dojo-metrics-grid--bento">
      {items.map((item) => (
        <div
          key={item.label}
          className={[
            "dojo-metric",
            item.accent === "warning" ? "dojo-metric-warning" : "",
            item.accent === "hero" ? "dojo-metric-hero" : "",
            item.accent === "patina" ? "dojo-metric-patina" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="dojo-metric-num">{item.value}</div>
          <div className="dojo-metric-lbl">{item.label}</div>
        </div>
      ))}
    </div>
  );
}