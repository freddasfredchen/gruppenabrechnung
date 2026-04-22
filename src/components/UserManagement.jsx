import { useState } from "react";
import { sha256, BRAND, BRAND_LT } from "../constants";
import { ModalWrap, Avatar, SectionLabel, Inp, PrimaryBtn } from "../ui";

export default function UserManagement({ users, onAdd, onRemove, onResetPw, onClose }) {
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(new Set());
  const [resetDone, setResetDone] = useState(new Set());

  const toggleSet = (set, id, add) => { const n = new Set(set); add ? n.add(id) : n.delete(id); return n; };

  const handleReset = async (userId) => {
    setResetting(s => toggleSet(s, userId, true));
    const hash = await sha256("asdf");
    await onResetPw(userId, hash);
    setResetting(s => toggleSet(s, userId, false));
    setResetDone(s => toggleSet(s, userId, true));
    setTimeout(() => setResetDone(s => toggleSet(s, userId, false)), 2000);
  };

  const create = async () => {
    if (!name.trim() || !pw.trim()) return;
    setCreating(true);
    const pwHash = await sha256(pw);
    onAdd({ id: Date.now() + "", name: name.trim(), pwHash, isVorstand: false });
    setName(""); setPw(""); setCreating(false);
  };

  return (
    <ModalWrap>
      <div style={{ width: "100%", maxWidth: 380, background: "var(--color-background-primary)", border: "1.5px solid var(--brand-a33)", borderRadius: "var(--radius)", padding: "1.5rem", display: "grid", gap: 16, maxHeight: "80vh", overflowY: "auto", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontWeight: 700, fontSize: 16, margin: 0, color: BRAND }}>Nutzerverwaltung</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <SectionLabel>Bestehende Konten</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: "var(--radius-sm)", background: "var(--brand-a08)", border: "1px solid var(--brand-a15)" }}>
            <Avatar name="Vorstand" size={30} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Vorstand</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-full)", background: "var(--brand-a15)", color: BRAND }}>VORSTAND</span>
          </div>
          {users.map(u => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: "var(--radius-sm)", background: "var(--color-background-secondary)", border: "1px solid var(--brand-a10)" }}>
              <Avatar name={u.name} size={30} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{u.name}</span>
              {resetDone.has(u.id)
                ? <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-success)", padding: "2px 8px" }}>✓ zurückgesetzt</span>
                : <button onClick={() => handleReset(u.id)} disabled={resetting.has(u.id)} title="Passwort auf 'asdf' zurücksetzen" style={{ background: "none", border: "1px solid var(--color-border-secondary)", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 12, fontWeight: 600, padding: "3px 8px", marginRight: 4, opacity: resetting.has(u.id) ? 0.5 : 1 }}>{resetting.has(u.id) ? "…" : "↺ Reset"}</button>
              }
              <button onClick={() => onRemove(u.id)} style={{ background: "none", border: "none", cursor: "pointer", color: BRAND_LT, fontSize: 18, lineHeight: 1, fontWeight: 700, padding: "0 2px" }}>×</button>
            </div>
          ))}
          {users.length === 0 && <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Noch keine weiteren Konten.</p>}
        </div>
        <div style={{ borderTop: "1px solid var(--brand-a15)", paddingTop: 14, display: "grid", gap: 10 }}>
          <SectionLabel>Neues Konto erstellen</SectionLabel>
          <Inp placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <Inp type="password" placeholder="Passwort" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && create()} />
          <PrimaryBtn onClick={create} disabled={creating || !name.trim() || !pw.trim()} full>{creating ? "…" : "Konto erstellen"}</PrimaryBtn>
        </div>
      </div>
    </ModalWrap>
  );
}
