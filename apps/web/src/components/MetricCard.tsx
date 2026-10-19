export function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return <article className="metric"><span className="metric__label">{label}</span><strong className="metric__value">{value}</strong>{note && <span className="muted">{note}</span>}</article>;
}
