import { useState } from "react";
import { sha256, BRAND, BRAND_LT, fmt } from "../constants";
import { computeBalances, computeTransactions } from "../logic";
import { Avatar, ToggleBtn, PrimaryBtn, Inp, SectionLabel, Card, ModalWrap } from "../ui";
import ManualPayment from "./ManualPayment";

function MitgliederView({ g, allUsers, currentUser, isAdmin, getName, save, BRAND, BRAND_LT }) {
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState([]);
  const canManage = currentUser.id === g.creatorId || isAdmin;
  const available = allUsers.filter(u => !g.members.includes(u.id));

  const addMembers = () => {
    if (selected.length === 0) return;
    save(ng => { ng.members = [...ng.members, ...selected]; });
    setSelected([]); setAdding(false);
  };

  return (
    <div>
      <div style={{ display: "grid", gap: 10, marginBottom: "1rem" }}>
        {g.members.map(uid => { const name = getName(uid); return (
          <div key={uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--color-background-primary)", border: `1px solid ${BRAND}15`, borderRadius: 12 }}>
            <Avatar name={name} />
            <span style={{ flex: 1, fontWeight: 600, fontSize: 15, color: "var(--color-text-primary)" }}>{name}</span>
            {uid === g.creatorId && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: `${BRAND}15`, color: BRAND }}>ERSTELLER</span>}
            {isAdmin && uid !== g.creatorId && (
              <button onClick={() => save(ng => { ng.members = ng.members.filter(m => m !== uid); })} style={{ background: "none", border: "none", cursor: "pointer", color: BRAND_LT, fontSize: 18, lineHeight: 1, fontWeight: 700, padding: "0 2px" }}>×</button>
            )}
          </div>
        ); })}
      </div>
      {canManage && available.length > 0 && (
        <>
          <button onClick={() => setAdding(v => !v)} style={{ marginBottom: "1rem", padding: "8px 18px", borderRadius: 9, border: `1.5px solid ${BRAND}`, background: adding ? `${BRAND}10` : "transparent", color: BRAND, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            {adding ? "Abbrechen" : "+ Mitglied hinzufügen"}
          </button>
          {adding && (
            <Card style={{ padding: "1rem", marginBottom: "1rem" }}>
              <div style={{ display: "grid", gap: 12 }}>
                <SectionLabel>Mitglied auswählen</SectionLabel>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {available.map(u => (
                    <ToggleBtn key={u.id} active={selected.includes(u.id)} onClick={() => setSelected(s => s.includes(u.id) ? s.filter(x => x !== u.id) : [...s, u.id])}>
                      {u.name}
                    </ToggleBtn>
                  ))}
                </div>
                <PrimaryBtn onClick={addMembers} disabled={selected.length === 0} full>Hinzufügen</PrimaryBtn>
              </div>
            </Card>
          )}
        </>
      )}
      {canManage && available.length === 0 && <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Alle bekannten Nutzer sind bereits Mitglied.</p>}
    </div>
  );
}

export default function GroupDetail({ group, allUsers, onUpdate, onBack, currentUser }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminErr, setAdminErr] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [view, setView] = useState("salden");
  const [expForm, setExpForm] = useState({ desc: "", amount: "", payer: "", participants: [] });
  const [showExpForm, setShowExpForm] = useState(false);

  const g = group;
  const getName = uid => allUsers.find(u => u.id === uid)?.name || "?";
  const save = fn => { const ng = { ...g, members: [...g.members], expenses: [...g.expenses], payments: [...g.payments] }; fn(ng); onUpdate(ng); };
  const balances = computeBalances(g.members, g.expenses, g.payments);
  const transactions = computeTransactions(balances);

  const checkAdmin = async () => {
    setAdminLoading(true); setAdminErr(false);
    const h = await sha256(adminPw);
    if (h === g.adminHash) { setIsAdmin(true); setShowAdminModal(false); setAdminPw(""); }
    else { setAdminErr(true); setAdminPw(""); }
    setAdminLoading(false);
  };

  const addExpense = () => {
    const amt = parseFloat(expForm.amount.replace(",", "."));
    if (!expForm.desc.trim() || isNaN(amt) || amt <= 0 || !expForm.payer) return;
    save(ng => { ng.expenses = [...ng.expenses, { id: Date.now() + "", desc: expForm.desc.trim(), amount: amt, payer: expForm.payer, participants: expForm.participants, date: new Date().toLocaleDateString("de-DE") }]; });
    setExpForm({ desc: "", amount: "", payer: "", participants: [] }); setShowExpForm(false);
  };
  const removeExpense = id => save(ng => { ng.expenses = ng.expenses.filter(e => e.id !== id); });
  const recordPayment = (from, to, amount) => save(ng => { ng.payments = [...ng.payments, { id: Date.now() + "", from, to, amount, date: new Date().toLocaleDateString("de-DE") }]; });
  const removePayment = id => save(ng => { ng.payments = ng.payments.filter(p => p.id !== id); });
  const togglePart = uid => setExpForm(f => ({ ...f, participants: f.participants.includes(uid) ? f.participants.filter(p => p !== uid) : [...f.participants, uid] }));

  const NavBtn = ({ k, label }) => (
    <button onClick={() => setView(k)} style={{ padding: "7px 14px", borderRadius: 20, background: view === k ? BRAND : "transparent", color: view === k ? "#fff" : "var(--color-text-secondary)", border: view === k ? "none" : "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, fontWeight: view === k ? 700 : 400, transition: "all 0.15s" }}>{label}</button>
  );

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 640, margin: "0 auto" }}>
      {showAdminModal && (
        <ModalWrap>
          <div style={{ width: "100%", maxWidth: 300, background: "var(--color-background-primary)", border: `1.5px solid ${BRAND}33`, borderRadius: 16, padding: "1.5rem", display: "grid", gap: 14, boxSizing: "border-box" }}>
            <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: BRAND }}>Administration</p>
            <Inp type="password" placeholder="Adminpasswort" value={adminPw} onChange={e => { setAdminPw(e.target.value); setAdminErr(false); }} onKeyDown={e => e.key === "Enter" && checkAdmin()} autoFocus style={{ border: adminErr ? "1.5px solid var(--color-border-danger)" : undefined }} />
            {adminErr && <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-danger)", textAlign: "center" }}>Falsches Passwort</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowAdminModal(false); setAdminPw(""); setAdminErr(false); }} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 14 }}>Abbrechen</button>
              <PrimaryBtn onClick={checkAdmin} disabled={adminLoading || !adminPw} full>{adminLoading ? "…" : "Bestätigen"}</PrimaryBtn>
            </div>
          </div>
        </ModalWrap>
      )}

      <div style={{ background: g.color, padding: "1.25rem 1.25rem 1rem", borderRadius: "0 0 20px 20px", marginBottom: "1.25rem" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 13, padding: "0 0 10px", display: "flex", alignItems: "center", gap: 4 }}>← Alle Gruppen</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff", flexShrink: 0 }}>{g.icon}</div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 18, margin: 0, color: "#fff" }}>{g.name}</p>
            <p style={{ fontSize: 12, margin: "2px 0 0", color: "rgba(255,255,255,0.65)" }}>{g.members.length} Mitglieder · {g.expenses.length} Ausgaben · {g.payments.length} Zahlungen</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 1rem 2rem" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <NavBtn k="salden" label="Salden" />
          <NavBtn k="ausgaben" label="Ausgaben" />
          <NavBtn k="zahlungen" label="Zahlungen" />
          <NavBtn k="mitglieder" label="Mitglieder" />
          {!isAdmin
            ? <button onClick={() => setShowAdminModal(true)} style={{ padding: "7px 14px", borderRadius: 20, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13 }}>Administration</button>
            : <button onClick={() => setIsAdmin(false)} style={{ padding: "7px 14px", borderRadius: 20, background: BRAND_LT, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Admin aktiv ×</button>
          }
        </div>

        {view === "salden" && (
          <div>
            {g.members.length === 0 && <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Noch keine Mitglieder.</p>}
            <div style={{ display: "grid", gap: 10, marginBottom: "1.5rem" }}>
              {g.members.map(uid => { const b = balances[uid] || 0; const name = getName(uid); return (
                <div key={uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--color-background-primary)", border: `1px solid ${BRAND}15`, borderRadius: 12 }}>
                  <Avatar name={name} />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 15, color: "var(--color-text-primary)" }}>{name}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: b > 0.005 ? "var(--color-text-success)" : b < -0.005 ? "var(--color-text-danger)" : "var(--color-text-secondary)" }}>{b > 0.005 ? "+" : ""}{fmt(b)}</span>
                </div>
              ); })}
            </div>
            {transactions.length > 0 && <>
              <SectionLabel>Empfohlene Ausgleichszahlungen</SectionLabel>
              <div style={{ display: "grid", gap: 8 }}>
                {transactions.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--color-background-secondary)", border: `1px solid ${BRAND}10`, borderRadius: 10, fontSize: 14 }}>
                    <Avatar name={getName(t.from)} size={28} />
                    <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{getName(t.from)}</span>
                    <span style={{ color: "var(--color-text-secondary)", flex: 1 }}>→ {getName(t.to)}</span>
                    <span style={{ fontWeight: 700, color: "var(--color-text-primary)", marginRight: 8 }}>{fmt(t.amt)}</span>
                    <button onClick={() => recordPayment(t.from, t.to, t.amt)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, border: `1.5px solid ${BRAND}`, background: "transparent", cursor: "pointer", color: BRAND, fontWeight: 600 }}>Tilgen</button>
                  </div>
                ))}
              </div>
            </>}
            {transactions.length === 0 && g.expenses.length > 0 && <p style={{ color: "var(--color-text-success)", fontSize: 14, fontWeight: 700 }}>Alle Schulden ausgeglichen!</p>}
          </div>
        )}

        {view === "ausgaben" && (
          <div>
            <button onClick={() => setShowExpForm(v => !v)} style={{ marginBottom: "1rem", padding: "8px 18px", borderRadius: 9, border: `1.5px solid ${BRAND}`, background: showExpForm ? `${BRAND}10` : "transparent", color: BRAND, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              {showExpForm ? "Abbrechen" : "+ Ausgabe hinzufügen"}
            </button>
            {showExpForm && (
              <Card style={{ padding: "1rem", marginBottom: "1rem" }}>
                <div style={{ display: "grid", gap: 12 }}>
                  <Inp placeholder="Beschreibung" value={expForm.desc} onChange={e => setExpForm(f => ({ ...f, desc: e.target.value }))} />
                  <Inp placeholder="Betrag (€)" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} />
                  <div><SectionLabel>Bezahlt von</SectionLabel><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{g.members.map(uid => <ToggleBtn key={uid} active={expForm.payer === uid} onClick={() => setExpForm(f => ({ ...f, payer: f.payer === uid ? "" : uid }))}>{getName(uid)}</ToggleBtn>)}</div></div>
                  <div><SectionLabel>Aufgeteilt unter <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0, opacity: 0.6 }}>(leer = alle)</span></SectionLabel><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{g.members.map(uid => <ToggleBtn key={uid} active={expForm.participants.includes(uid)} onClick={() => togglePart(uid)}>{getName(uid)}</ToggleBtn>)}</div></div>
                  <PrimaryBtn onClick={addExpense} disabled={!expForm.desc.trim() || !expForm.amount || !expForm.payer} full>Speichern</PrimaryBtn>
                </div>
              </Card>
            )}
            {g.expenses.length === 0 && <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Noch keine Ausgaben.</p>}
            <div style={{ display: "grid", gap: 10 }}>
              {[...g.expenses].reverse().map(exp => {
                const parts = exp.participants.length > 0 ? exp.participants.map(uid => getName(uid)) : g.members.map(uid => getName(uid));
                return (
                  <div key={exp.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "var(--color-background-primary)", border: `1px solid ${BRAND}15`, borderRadius: 12 }}>
                    <Avatar name={getName(exp.payer)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: "var(--color-text-primary)" }}>{exp.desc}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>{getName(exp.payer)} · {exp.date} · {parts.join(", ")}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>{fmt(exp.amount)}</span>
                      {isAdmin && <button onClick={() => removeExpense(exp.id)} style={{ background: "none", border: "none", cursor: "pointer", color: BRAND_LT, fontSize: 18, lineHeight: 1, padding: "0 2px", fontWeight: 700 }}>×</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "zahlungen" && (
          <div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: "1rem" }}>Über "Tilgen" in der Salden-Übersicht oder manuell eintragen.</p>
            <ManualPayment members={g.members} getName={getName} onSave={recordPayment} />
            {g.payments.length === 0 && <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginTop: "1rem" }}>Noch keine Zahlungen.</p>}
            {g.payments.length > 0 && <>
              <SectionLabel>Zahlungshistorie</SectionLabel>
              <div style={{ display: "grid", gap: 8 }}>
                {[...g.payments].reverse().map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--color-background-primary)", border: `1px solid ${BRAND}15`, borderRadius: 10, fontSize: 14 }}>
                    <Avatar name={getName(p.from)} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{getName(p.from)}</span>
                      <span style={{ color: "var(--color-text-secondary)" }}> → {getName(p.to)}</span>
                      <span style={{ display: "block", fontSize: 11, color: "var(--color-text-tertiary)" }}>{p.date}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: "var(--color-text-success)", marginRight: isAdmin ? 8 : 0 }}>{fmt(p.amount)}</span>
                    {isAdmin && <button onClick={() => removePayment(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: BRAND_LT, fontSize: 18, lineHeight: 1, padding: "0 2px", fontWeight: 700 }}>×</button>}
                  </div>
                ))}
              </div>
            </>}
          </div>
        )}

        {view === "mitglieder" && (
          <MitgliederView g={g} allUsers={allUsers} currentUser={currentUser} isAdmin={isAdmin} getName={getName} save={save} BRAND={BRAND} BRAND_LT={BRAND_LT} />
        )}
      </div>
    </div>
  );
}
