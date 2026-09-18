export function StatCard({ label, value, detail, tone = 'blue', icon: Icon }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-icon-${tone}`} aria-hidden="true">{Icon && <Icon size={18} strokeWidth={1.8} />}</div>
      <div>
        <p className="eyebrow">{label}</p>
        <p className="stat-value">{value}</p>
        <p className="stat-detail">{detail}</p>
      </div>
    </article>
  )
}
