import { useState } from "react";
import { sha256, BRAND, VORSTAND_USER } from "../constants";
import { Card, Inp, PrimaryBtn, Avatar } from "../ui";

export default function UserLoginScreen({ users, onLogin }) {
  const [selected, setSelected] = useState(null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const allUsers = [VORSTAND_USER, ...users];

  const check = async () => {
    if (!selected) return;
    setLoading(true); setErr(false);
    const h = await sha256(pw);
    if (h === selected.pwHash) { onLogin(selected); } else { setErr(true); setPw(""); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "var(--font-sans)" }}>
      <div style={{ width: "100%", maxWidth: 380, boxSizing: "border-box" }}>
        <Card style={{ padding: "2rem", display: "grid", gap: 16 }}>
          <div>
            <p style={{ fontWeight: 800, fontSize: 18, margin: "0 0 2px", color: BRAND }}>Konto wählen</p>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Mit welchem Konto möchtest du einloggen?</p>
          </div>
          <div style={{ display: "grid", gap: 8, maxHeight: 240, overflowY: "auto" }}>
            {allUsers.map(u => (
              <div key={u.id} onClick={() => { setSelected(u); setPw(""); setErr(false); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: selected?.id === u.id ? `2px solid ${BRAND}` : `1px solid ${BRAND}15`, cursor: "pointer", background: selected?.id === u.id ? `${BRAND}08` : "var(--color-background-secondary)", transition: "all 0.15s" }}>
                <Avatar name={u.name} size={34} />
                <span style={{ fontWeight: selected?.id === u.id ? 700 : 500, fontSize: 14, color: "var(--color-text-primary)" }}>{u.name}</span>
                {u.isVorstand && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: `${BRAND}15`, color: BRAND }}>VORSTAND</span>}
              </div>
            ))}
          </div>
          {selected && (
            <div style={{ borderTop: `1px solid ${BRAND}15`, paddingTop: 14, display: "grid", gap: 10 }}>
              <Inp type="password" placeholder={`Passwort für ${selected.name}`} value={pw} onChange={e => { setPw(e.target.value); setErr(false); }} onKeyDown={e => e.key === "Enter" && check()} autoFocus style={{ border: err ? "1.5px solid var(--color-border-danger)" : undefined }} />
              {err && <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-danger)", textAlign: "center" }}>Falsches Passwort</p>}
              <PrimaryBtn onClick={check} disabled={loading || !pw} full>{loading ? "…" : `Als ${selected.name} einloggen`}</PrimaryBtn>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
