import { useState } from "react";
import { sha256, APP_PW_HASH, BRAND } from "../constants";
import { Card, Inp, PrimaryBtn } from "../ui";

export default function AppLoginScreen({ onSuccess }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true); setErr(false);
    const h = await sha256(pw);
    if (h === APP_PW_HASH) { onSuccess(); } else { setErr(true); setPw(""); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "var(--font-sans)" }}>
      <div style={{ width: "100%", maxWidth: 340, boxSizing: "border-box" }}>
        <Card style={{ padding: "2.5rem 2rem", display: "grid", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 800, fontSize: 22, margin: "0 0 4px", color: BRAND }}>Gruppenabrechnung</p>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Dawson Schach und Spiele Club</p>
          </div>
          <div style={{ borderTop: `1px solid ${BRAND}22`, paddingTop: 20, display: "grid", gap: 12 }}>
            <Inp type="password" placeholder="App-Passwort" value={pw} onChange={e => { setPw(e.target.value); setErr(false); }} onKeyDown={e => e.key === "Enter" && check()} autoFocus style={{ border: err ? "1.5px solid var(--color-border-danger)" : undefined }} />
            {err && <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-danger)", textAlign: "center" }}>Falsches Passwort</p>}
            <PrimaryBtn onClick={check} disabled={loading || !pw} full>{loading ? "…" : "Weiter"}</PrimaryBtn>
          </div>
        </Card>
      </div>
    </div>
  );
}
