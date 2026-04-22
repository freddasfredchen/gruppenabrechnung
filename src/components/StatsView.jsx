import { CATEGORIES, fmt } from "../constants";

function DonutChart({ segments, size = 140 }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (!segments.length || total === 0) return null;

  const cx = size / 2, cy = size / 2;
  const r = size * 0.36;
  const sw = size * 0.19;
  const circ = 2 * Math.PI * r;

  let cum = 0;
  const arcs = segments.map(seg => {
    const pct = seg.value / total;
    const arc = { ...seg, dash: pct * circ, gap: circ - pct * circ, offset: -(cum * circ) };
    cum += pct;
    return arc;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      {arcs.map((arc, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={arc.color} strokeWidth={sw}
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={arc.offset}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export default function StatsView({ g, getName }) {
  const total = g.expenses.reduce((s, e) => s + e.amount, 0);

  const catTotals = {};
  g.expenses.forEach(exp => {
    const id = exp.category || "other";
    catTotals[id] = (catTotals[id] || 0) + exp.amount;
  });

  const catData = CATEGORIES
    .map(c => ({ ...c, value: catTotals[c.id] || 0 }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);

  if (g.expenses.length === 0) {
    return <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Noch keine Ausgaben vorhanden.</p>;
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem", animation: "fadeIn 0.2s ease" }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: "1.25rem", display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <DonutChart segments={catData} size={140} />
        <div style={{ flex: 1, minWidth: 160, display: "grid", gap: 10 }}>
          {catData.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{c.icon} {c.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{fmt(c.value)}</span>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)", width: 36, textAlign: "right" }}>{Math.round(c.value / total * 100)}%</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--color-border-secondary)", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
            <span>Gesamt</span><span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: "1.25rem" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-secondary)", margin: "0 0 12px" }}>Ausgaben pro Person</p>
        <div style={{ display: "grid", gap: 8 }}>
          {(() => {
            const paidByMember = {};
            g.expenses.forEach(e => { paidByMember[e.payer] = (paidByMember[e.payer] || 0) + e.amount; });
            return g.members.map(uid => {
              const paid = paidByMember[uid] || 0;
              return paid > 0 ? (
              <div key={uid} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{getName(uid)}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{fmt(paid)}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", width: 36, textAlign: "right" }}>{Math.round(paid / total * 100)}%</div>
              </div>
              ) : null;
            });
          })()}
        </div>
      </div>
    </div>
  );
}
