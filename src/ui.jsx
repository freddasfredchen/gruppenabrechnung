import { BRAND, COLORS_AVATAR, initials, avatarColor } from "./constants";

export function Avatar({ name, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: avatarColor(name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "#fff", flexShrink: 0, letterSpacing: "-0.02em" }}>
      {initials(name)}
    </div>
  );
}

export const ToggleBtn = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{ padding: "6px 14px", borderRadius: "var(--radius-full)", fontSize: 13, cursor: "pointer", userSelect: "none", background: active ? BRAND : "var(--color-background-secondary)", color: active ? "#fff" : "var(--color-text-primary)", border: active ? `2px solid ${BRAND}` : "1.5px solid var(--color-border-secondary)", fontWeight: active ? 700 : 500, transition: "all 0.15s" }}>
    {children}
  </button>
);

export function PrimaryBtn({ onClick, disabled, children, full = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: "11px 20px", borderRadius: "var(--radius-sm)", border: "none", background: disabled ? "var(--color-background-tertiary)" : BRAND, color: disabled ? "var(--color-text-tertiary)" : "#fff", fontWeight: 700, cursor: disabled ? "default" : "pointer", fontSize: 14, width: full ? "100%" : "auto", transition: "opacity 0.15s", letterSpacing: "0.01em" }}>
      {children}
    </button>
  );
}

export function Inp({ style = {}, ...props }) {
  return <input {...props} style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.15s", fontFamily: "var(--font-sans)", ...style }} />;
}

export function SectionLabel({ children, style = {} }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: BRAND, margin: "0 0 10px", opacity: 0.85, ...style }}>{children}</p>;
}

export function Card({ children, style = {} }) {
  return <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", ...style }}>{children}</div>;
}

export function ModalWrap({ children }) {
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem", backdropFilter: "blur(4px)" }}>{children}</div>;
}
