import { useState, useRef } from "react";
import { sha256, BRAND, VORSTAND_USER } from "../constants";
import { Card, Inp, PrimaryBtn, Avatar } from "../ui";

export default function UserLoginScreen({ users, onLogin }) {
  const [nameInput, setNameInput] = useState("");
  const [selected, setSelected] = useState(null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const pwRef = useRef(null);

  const allUsers = [VORSTAND_USER, ...users];

  const suggestions = nameInput.trim().length > 0
    ? allUsers.filter(u => u.name.toLowerCase().startsWith(nameInput.toLowerCase()))
    : [];

  const selectUser = u => {
    setSelected(u);
    setNameInput(u.name);
    setShowSuggestions(false);
    setErr(false);
    setPw("");
    setTimeout(() => pwRef.current?.focus(), 50);
  };

  const handleNameChange = e => {
    const val = e.target.value;
    setNameInput(val);
    setShowSuggestions(true);
    const exact = allUsers.find(u => u.name.toLowerCase() === val.toLowerCase());
    setSelected(exact || null);
    setErr(false);
  };

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
            <p style={{ fontWeight: 800, fontSize: 18, margin: "0 0 2px", color: BRAND }}>Anmelden</p>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Name eingeben und Passwort bestätigen</p>
          </div>

          <div style={{ position: "relative" }}>
            <Inp
              placeholder="Name"
              value={nameInput}
              onChange={handleNameChange}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              autoFocus
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-hover)", marginTop: 4, overflow: "hidden" }}>
                {suggestions.map(u => (
                  <div key={u.id} onMouseDown={() => selectUser(u)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <Avatar name={u.name} size={28} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</span>
                    {u.isVorstand && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-full)", background: "var(--brand-a15)", color: BRAND }}>VORSTAND</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <Inp
              ref={pwRef}
              type="password"
              placeholder="Passwort"
              value={pw}
              onChange={e => { setPw(e.target.value); setErr(false); }}
              onKeyDown={e => e.key === "Enter" && check()}
              style={{ border: err ? "1.5px solid var(--color-border-danger)" : undefined }}
            />
            {err && <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-danger)", textAlign: "center" }}>Falsches Passwort</p>}
            <PrimaryBtn onClick={check} disabled={loading || !pw || !selected} full>
              {loading ? "…" : "Anmelden"}
            </PrimaryBtn>
          </div>
        </Card>
      </div>
    </div>
  );
}
