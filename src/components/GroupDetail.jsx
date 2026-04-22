import { useState, useMemo } from "react";
import { sha256, BRAND, BRAND_LT, fmt, CATEGORIES } from "../constants";
import { computeBalances, computeTransactions } from "../logic";
import { Avatar, ToggleBtn, PrimaryBtn, Inp, SectionLabel, Card, ModalWrap } from "../ui";
import ManualPayment from "./ManualPayment";
import StatsView from "./StatsView";

function CategoryBadge({ categoryId }) {
  const cat = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[5];
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--radius-full)", background: cat.color + "22", color: cat.color, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
      {cat.icon} {cat.label}
    </span>
  );
}

function SplitInput({ members, getName, splitMode, amount, shares, setShares }) {
  const totalAmt = parseFloat(String(amount).replace(",", ".")) || 0;

  if (splitMode === "proportional") {
    const total = members.reduce((s, uid) => s + (parseFloat(shares[uid]) || 0), 0);
    const valid = Math.abs(total - 100) <= 0.5;
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <SectionLabel style={{ margin: 0 }}>Prozentuale Aufteilung
          <span style={{ textTransform: "none", fontWeight: 500, letterSpacing: 0, opacity: 0.7, marginLeft: 6 }}>Summe: {total.toFixed(1)}%</span>
        </SectionLabel>
        {members.map(uid => (
          <div key={uid} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={getName(uid)} size={26} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{getName(uid)}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Inp type="number" min="0" max="100" step="0.1" value={shares[uid] ?? ""} onChange={e => setShares(s => ({ ...s, [uid]: e.target.value }))} style={{ width: 72, textAlign: "right" }} />
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>%</span>
            </div>
          </div>
        ))}
        {!valid && total > 0 && <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-danger)" }}>Summe muss 100% ergeben (aktuell {total.toFixed(1)}%)</p>}
      </div>
    );
  }

  if (splitMode === "exact") {
    const total = members.reduce((s, uid) => s + (parseFloat(shares[uid]) || 0), 0);
    const remaining = totalAmt - total;
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <SectionLabel style={{ margin: 0 }}>Exakte Beträge
          <span style={{ textTransform: "none", fontWeight: 500, letterSpacing: 0, opacity: 0.7, marginLeft: 6 }}>Verbleibend: {fmt(Math.max(0, remaining))}</span>
        </SectionLabel>
        {members.map(uid => (
          <div key={uid} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={getName(uid)} size={26} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{getName(uid)}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Inp type="number" min="0" step="0.01" value={shares[uid] ?? ""} onChange={e => setShares(s => ({ ...s, [uid]: e.target.value }))} style={{ width: 88, textAlign: "right" }} />
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>€</span>
            </div>
          </div>
        ))}
        {totalAmt > 0 && Math.abs(remaining) > 0.01 && (
          <p style={{ margin: 0, fontSize: 12, color: remaining < 0 ? "var(--color-text-danger)" : "var(--color-text-secondary)" }}>
            Summe: {fmt(total)} von {fmt(totalAmt)}
          </p>
        )}
      </div>
    );
  }

  return null;
}

function MitgliederView({ g, allUsers, currentUser, isAdmin, getName, save }) {
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
      <div style={{ display: "grid", gap: 8, marginBottom: "1rem" }}>
        {g.members.map(uid => {
          const name = getName(uid);
          return (
            <div key={uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--color-background-primary)", boxShadow: "var(--shadow-sm)", borderRadius: "var(--radius)" }}>
              <Avatar name={name} />
              <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{name}</span>
              {uid === g.creatorId && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--radius-full)", background: "var(--brand-a15)", color: BRAND }}>ERSTELLER</span>}
              {isAdmin && uid !== g.creatorId && (
                <button onClick={() => save(ng => { ng.members = ng.members.filter(m => m !== uid); })} style={{ background: "none", border: "none", cursor: "pointer", color: BRAND_LT, fontSize: 18, lineHeight: 1, fontWeight: 700, padding: "0 2px" }}>×</button>
              )}
            </div>
          );
        })}
      </div>
      {canManage && available.length > 0 && (
        <>
          <button onClick={() => setAdding(v => !v)} style={{ marginBottom: "1rem", padding: "8px 18px", borderRadius: "var(--radius-sm)", border: `1.5px solid ${BRAND}`, background: adding ? "var(--brand-a10)" : "transparent", color: BRAND, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
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

const SPLIT_MODES = [
  { id: "equal",        label: "Gleich" },
  { id: "proportional", label: "Prozentual" },
  { id: "exact",        label: "Exakt" },
];

export default function GroupDetail({ group, allUsers, onUpdate, onBack, currentUser }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminErr, setAdminErr] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [view, setView] = useState("salden");

  const emptyForm = { desc: "", amount: "", payer: "", participants: [], category: "other", splitMode: "equal", shares: {} };
  const [expForm, setExpForm] = useState(emptyForm);
  const [showExpForm, setShowExpForm] = useState(false);

  const [apw, setApw] = useState({ current: "", next: "", confirm: "", err: null, saving: false, done: false });
  const [confirmTx, setConfirmTx] = useState(null);

  const g = group;
  const getName = uid => allUsers.find(u => u.id === uid)?.name || "?";
  const save = fn => { const ng = { ...g, members: [...g.members], expenses: [...g.expenses], payments: [...g.payments] }; fn(ng); onUpdate(ng); };
  const balances = useMemo(() => computeBalances(g.members, g.expenses, g.payments), [g.members, g.expenses, g.payments]);
  const transactions = useMemo(() => computeTransactions(balances), [balances]);

  const checkAdmin = async () => {
    setAdminLoading(true); setAdminErr(false);
    const h = await sha256(adminPw);
    if (h === g.adminHash) { setIsAdmin(true); setShowAdminModal(false); setAdminPw(""); }
    else { setAdminErr(true); setAdminPw(""); }
    setAdminLoading(false);
  };

  const handleSplitModeChange = mode => {
    const parts = expForm.participants.length > 0 ? expForm.participants : g.members;
    const amt = parseFloat(String(expForm.amount).replace(",", ".")) || 0;
    let shares = {};
    if (mode === "proportional") {
      const pct = parseFloat((100 / parts.length).toFixed(1));
      parts.forEach(uid => { shares[uid] = pct; });
    } else if (mode === "exact") {
      const share = amt > 0 ? parseFloat((amt / parts.length).toFixed(2)) : "";
      parts.forEach(uid => { shares[uid] = share; });
    }
    setExpForm(f => ({ ...f, splitMode: mode, shares }));
  };

  const canSaveExp = () => {
    const amt = parseFloat(String(expForm.amount).replace(",", "."));
    if (!expForm.desc.trim() || isNaN(amt) || amt <= 0 || !expForm.payer) return false;
    const parts = expForm.participants.length > 0 ? expForm.participants : g.members;
    if (expForm.splitMode === "proportional") {
      const total = parts.reduce((s, uid) => s + (parseFloat(expForm.shares[uid]) || 0), 0);
      if (Math.abs(total - 100) > 0.5) return false;
    }
    if (expForm.splitMode === "exact") {
      const total = parts.reduce((s, uid) => s + (parseFloat(expForm.shares[uid]) || 0), 0);
      if (Math.abs(total - amt) > 0.01) return false;
    }
    return true;
  };

  const addExpense = () => {
    if (!canSaveExp()) return;
    const amt = parseFloat(String(expForm.amount).replace(",", "."));
    const shares = expForm.splitMode !== "equal"
      ? Object.fromEntries(Object.entries(expForm.shares).map(([k, v]) => [k, parseFloat(v) || 0]).filter(([, v]) => v > 0))
      : {};
    save(ng => { ng.expenses = [...ng.expenses, { id: Date.now() + "", desc: expForm.desc.trim(), amount: amt, payer: expForm.payer, participants: expForm.splitMode === "equal" ? expForm.participants : [], category: expForm.category, splitMode: expForm.splitMode, shares, date: new Date().toLocaleDateString("de-DE") }]; });
    setExpForm(emptyForm); setShowExpForm(false);
  };

  const removeExpense = id => save(ng => { ng.expenses = ng.expenses.filter(e => e.id !== id); });
  const recordPayment = (from, to, amount) => save(ng => { ng.payments = [...ng.payments, { id: Date.now() + "", from, to, amount, date: new Date().toLocaleDateString("de-DE"), recordedBy: currentUser.id }]; });
  const removePayment = id => save(ng => { ng.payments = ng.payments.filter(p => p.id !== id); });
  const togglePart = uid => setExpForm(f => ({ ...f, participants: f.participants.includes(uid) ? f.participants.filter(p => p !== uid) : [...f.participants, uid] }));

  const exportCSV = () => {
    const rows = [
      ["Beschreibung", "Betrag (€)", "Bezahlt von", "Aufteilung", "Kategorie", "Datum"],
      ...g.expenses.map(exp => {
        const parts = exp.participants?.length > 0 ? exp.participants : g.members;
        const splitDesc = exp.splitMode === "proportional"
          ? Object.entries(exp.shares || {}).map(([uid, pct]) => `${getName(uid)}: ${pct}%`).join("; ")
          : exp.splitMode === "exact"
          ? Object.entries(exp.shares || {}).map(([uid, a]) => `${getName(uid)}: ${a}€`).join("; ")
          : parts.map(uid => getName(uid)).join("; ");
        const cat = CATEGORIES.find(c => c.id === exp.category)?.label || "Sonstiges";
        return [exp.desc, exp.amount.toFixed(2).replace(".", ","), getName(exp.payer), splitDesc, cat, exp.date];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${g.name}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const resetPwForm = setter => setter({ current: "", next: "", confirm: "", err: null, saving: false, done: false });

  const changePw = async (state, setter, currentHash, onSaveHash) => {
    if (state.next.length < 6) { setter(s => ({ ...s, err: "min" })); return; }
    if (state.next !== state.confirm) { setter(s => ({ ...s, confirm: "", err: "mismatch" })); return; }
    setter(s => ({ ...s, saving: true, err: null }));
    const h = await sha256(state.current);
    if (h !== currentHash) { setter(s => ({ ...s, saving: false, err: "wrong", current: "" })); return; }
    const newHash = await sha256(state.next);
    onSaveHash(newHash);
    setter({ current: "", next: "", confirm: "", err: null, saving: false, done: true });
  };

  const NavBtn = ({ k, label }) => {
    const active = view === k;
    return <button onClick={() => setView(k)} style={{ padding: "7px 14px", borderRadius: "var(--radius-full)", background: active ? BRAND : "transparent", color: active ? "#fff" : "var(--color-text-secondary)", border: active ? "none" : "1px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500, transition: "all 0.15s", whiteSpace: "nowrap" }}>{label}</button>;
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 640, margin: "0 auto" }}>
      {confirmTx && (
        <ModalWrap>
          <div style={{ width: "100%", maxWidth: 300, background: "var(--color-background-primary)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-hover)", padding: "1.5rem", display: "grid", gap: 16, boxSizing: "border-box" }}>
            <p style={{ fontWeight: 700, fontSize: 16, margin: 0, color: "var(--color-text-primary)", textAlign: "center" }}>Hast du bezahlt?</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--color-background-secondary)", borderRadius: "var(--radius-sm)", fontSize: 14 }}>
              <Avatar name={getName(confirmTx.from)} size={28} />
              <span style={{ fontWeight: 600 }}>{getName(confirmTx.from)}</span>
              <span style={{ color: "var(--color-text-secondary)", flex: 1 }}>→ {getName(confirmTx.to)}</span>
              <span style={{ fontWeight: 700 }}>{fmt(confirmTx.amt)}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmTx(null)} style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Nein</button>
              <PrimaryBtn onClick={() => { recordPayment(confirmTx.from, confirmTx.to, confirmTx.amt); setConfirmTx(null); }} full>Ja</PrimaryBtn>
            </div>
          </div>
        </ModalWrap>
      )}
      {showAdminModal && (
        <ModalWrap>
          <div style={{ width: "100%", maxWidth: 300, background: "var(--color-background-primary)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-hover)", padding: "1.5rem", display: "grid", gap: 14, boxSizing: "border-box" }}>
            <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: BRAND }}>Administration</p>
            <Inp type="password" placeholder="Adminpasswort" value={adminPw} onChange={e => { setAdminPw(e.target.value); setAdminErr(false); }} onKeyDown={e => e.key === "Enter" && checkAdmin()} autoFocus style={{ border: adminErr ? "1.5px solid var(--color-border-danger)" : undefined }} />
            {adminErr && <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-danger)", textAlign: "center" }}>Falsches Passwort</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowAdminModal(false); setAdminPw(""); setAdminErr(false); }} style={{ flex: 1, padding: "9px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 14 }}>Abbrechen</button>
              <PrimaryBtn onClick={checkAdmin} disabled={adminLoading || !adminPw} full>{adminLoading ? "…" : "Bestätigen"}</PrimaryBtn>
            </div>
          </div>
        </ModalWrap>
      )}

      <div style={{ background: g.color, padding: "1.25rem 1.25rem 1rem", borderRadius: "0 0 22px 22px", marginBottom: "1.25rem" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 13, padding: "0 0 10px", display: "flex", alignItems: "center", gap: 4 }}>← Alle Gruppen</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff", flexShrink: 0 }}>{g.icon}</div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 18, margin: 0, color: "#fff", letterSpacing: "-0.02em" }}>{g.name}</p>
            <p style={{ fontSize: 12, margin: "2px 0 0", color: "rgba(255,255,255,0.65)" }}>{g.members.length} Mitglieder · {g.expenses.length} Ausgaben · {g.payments.length} Zahlungen</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 1rem 2rem" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <NavBtn k="salden" label="Salden" />
          <NavBtn k="ausgaben" label="Ausgaben" />
          <NavBtn k="zahlungen" label="Zahlungen" />
          <NavBtn k="statistiken" label="Statistiken" />
          <NavBtn k="mitglieder" label="Mitglieder" />
          {!isAdmin
            ? <button onClick={() => setShowAdminModal(true)} style={{ padding: "7px 14px", borderRadius: "var(--radius-full)", background: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Administration</button>
            : <>
                <NavBtn k="passwörter" label="Passwörter" />
                <button onClick={() => { setIsAdmin(false); if (view === "passwörter") setView("salden"); resetPwForm(setGpw); resetPwForm(setApw); }} style={{ padding: "7px 14px", borderRadius: "var(--radius-full)", background: BRAND_LT, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Admin aktiv ×</button>
              </>
          }
        </div>

        {view === "salden" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            {g.members.length === 0 && <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Noch keine Mitglieder.</p>}
            <div style={{ display: "grid", gap: 8, marginBottom: "1.5rem" }}>
              {g.members.map(uid => { const b = balances[uid] || 0; const name = getName(uid); return (
                <div key={uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--color-background-primary)", boxShadow: "var(--shadow-sm)", borderRadius: "var(--radius)" }}>
                  <Avatar name={name} />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{name}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: b > 0.005 ? "var(--color-text-success)" : b < -0.005 ? "var(--color-text-danger)" : "var(--color-text-secondary)" }}>{b > 0.005 ? "+" : ""}{fmt(b)}</span>
                </div>
              ); })}
            </div>
            {transactions.length > 0 && <>
              <SectionLabel>Empfohlene Ausgleichszahlungen</SectionLabel>
              <div style={{ display: "grid", gap: 8 }}>
                {(isAdmin || currentUser.isVorstand ? transactions : transactions.filter(t => t.from === currentUser.id || t.to === currentUser.id)).map((t, i) => {
                  const canSettle = isAdmin || currentUser.isVorstand || t.from === currentUser.id;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--color-background-primary)", boxShadow: "var(--shadow-sm)", borderRadius: "var(--radius)", fontSize: 14 }}>
                      <Avatar name={getName(t.from)} size={28} />
                      <span style={{ fontWeight: 600 }}>{getName(t.from)}</span>
                      <span style={{ color: "var(--color-text-secondary)", flex: 1 }}>→ {getName(t.to)}</span>
                      <span style={{ fontWeight: 700, marginRight: canSettle ? 8 : 0 }}>{fmt(t.amt)}</span>
                      {canSettle && <button onClick={() => setConfirmTx(t)} style={{ padding: "5px 12px", borderRadius: "var(--radius-sm)", fontSize: 12, border: `1.5px solid ${BRAND}`, background: "transparent", cursor: "pointer", color: BRAND, fontWeight: 600 }}>Tilgen</button>}
                    </div>
                  );
                })}
              </div>
            </>}
            {transactions.length === 0 && g.expenses.length > 0 && <p style={{ color: "var(--color-text-success)", fontSize: 14, fontWeight: 700, marginTop: "0.5rem" }}>Alle Schulden ausgeglichen!</p>}
          </div>
        )}

        {view === "ausgaben" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
              <button onClick={() => setShowExpForm(v => !v)} style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: `1.5px solid ${BRAND}`, background: showExpForm ? "var(--brand-a10)" : "transparent", color: BRAND, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                {showExpForm ? "Abbrechen" : "+ Ausgabe hinzufügen"}
              </button>
              {g.expenses.length > 0 && (
                <button onClick={exportCSV} style={{ padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>↓ CSV</button>
              )}
            </div>

            {showExpForm && (
              <Card style={{ padding: "1.25rem", marginBottom: "1rem" }}>
                <div style={{ display: "grid", gap: 14 }}>
                  <Inp placeholder="Beschreibung" value={expForm.desc} onChange={e => setExpForm(f => ({ ...f, desc: e.target.value }))} />
                  <Inp placeholder="Betrag (€)" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} />

                  <div>
                    <SectionLabel>Kategorie</SectionLabel>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {CATEGORIES.map(c => (
                        <button key={c.id} onClick={() => setExpForm(f => ({ ...f, category: c.id }))} style={{ padding: "5px 11px", borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 600, cursor: "pointer", border: expForm.category === c.id ? `2px solid ${c.color}` : "1.5px solid var(--color-border-secondary)", background: expForm.category === c.id ? c.color + "22" : "transparent", color: expForm.category === c.id ? c.color : "var(--color-text-secondary)", transition: "all 0.15s" }}>
                          {c.icon} {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Bezahlt von</SectionLabel>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {g.members.map(uid => <ToggleBtn key={uid} active={expForm.payer === uid} onClick={() => setExpForm(f => ({ ...f, payer: f.payer === uid ? "" : uid }))}>{getName(uid)}</ToggleBtn>)}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Aufteilung</SectionLabel>
                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                      {SPLIT_MODES.map(m => (
                        <button key={m.id} onClick={() => handleSplitModeChange(m.id)} style={{ padding: "6px 14px", borderRadius: "var(--radius-full)", fontSize: 13, fontWeight: expForm.splitMode === m.id ? 700 : 500, cursor: "pointer", border: expForm.splitMode === m.id ? `2px solid ${BRAND}` : "1px solid var(--color-border-secondary)", background: expForm.splitMode === m.id ? "var(--brand-a10)" : "transparent", color: expForm.splitMode === m.id ? BRAND : "var(--color-text-secondary)", transition: "all 0.15s" }}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                    {expForm.splitMode === "equal" && (
                      <div>
                        <SectionLabel style={{ margin: "0 0 8px" }}>Aufgeteilt unter <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0, opacity: 0.6 }}>(leer = alle)</span></SectionLabel>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {g.members.map(uid => <ToggleBtn key={uid} active={expForm.participants.includes(uid)} onClick={() => togglePart(uid)}>{getName(uid)}</ToggleBtn>)}
                        </div>
                      </div>
                    )}
                    {(expForm.splitMode === "proportional" || expForm.splitMode === "exact") && (
                      <SplitInput members={g.members} getName={getName} splitMode={expForm.splitMode} amount={expForm.amount} shares={expForm.shares} setShares={s => setExpForm(f => ({ ...f, shares: typeof s === "function" ? s(f.shares) : s }))} />
                    )}
                  </div>

                  <PrimaryBtn onClick={addExpense} disabled={!canSaveExp()} full>Speichern</PrimaryBtn>
                </div>
              </Card>
            )}

            {g.expenses.length === 0 && !showExpForm && <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Noch keine Ausgaben.</p>}
            <div style={{ display: "grid", gap: 8 }}>
              {[...g.expenses].reverse().map(exp => {
                const parts = exp.participants?.length > 0 ? exp.participants : g.members;
                return (
                  <div key={exp.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 14px", background: "var(--color-background-primary)", boxShadow: "var(--shadow-sm)", borderRadius: "var(--radius)" }}>
                    <Avatar name={getName(exp.payer)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{exp.desc}</p>
                        <CategoryBadge categoryId={exp.category} />
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {getName(exp.payer)} · {exp.date}
                        {exp.splitMode && exp.splitMode !== "equal" && <span style={{ marginLeft: 5, fontSize: 11, fontWeight: 600, color: BRAND }}>· {SPLIT_MODES.find(m => m.id === exp.splitMode)?.label}</span>}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--color-text-tertiary)" }}>{parts.map(uid => getName(uid)).join(", ")}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{fmt(exp.amount)}</span>
                      {isAdmin && <button onClick={() => removeExpense(exp.id)} style={{ background: "none", border: "none", cursor: "pointer", color: BRAND_LT, fontSize: 18, lineHeight: 1, padding: "0 2px", fontWeight: 700 }}>×</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "zahlungen" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: "1rem" }}>Über "Tilgen" in der Salden-Übersicht oder manuell eintragen.</p>
            <ManualPayment members={g.members} getName={getName} onSave={recordPayment} />
            {g.payments.length === 0 && <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginTop: "1rem" }}>Noch keine Zahlungen.</p>}
            {g.payments.length > 0 && <>
              <SectionLabel>Zahlungshistorie</SectionLabel>
              <div style={{ display: "grid", gap: 8 }}>
                {[...g.payments].reverse().map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--color-background-primary)", boxShadow: "var(--shadow-sm)", borderRadius: "var(--radius)", fontSize: 14 }}>
                    <Avatar name={getName(p.from)} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600 }}>{getName(p.from)}</span>
                      <span style={{ color: "var(--color-text-secondary)" }}> → {getName(p.to)}</span>
                      <span style={{ display: "block", fontSize: 11, color: "var(--color-text-tertiary)" }}>{p.date}{p.recordedBy && p.recordedBy !== p.from ? ` · eingetragen von ${getName(p.recordedBy)}` : ""}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: "var(--color-text-success)", marginRight: isAdmin ? 8 : 0 }}>{fmt(p.amount)}</span>
                    {isAdmin && <button onClick={() => removePayment(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: BRAND_LT, fontSize: 18, lineHeight: 1, padding: "0 2px", fontWeight: 700 }}>×</button>}
                  </div>
                ))}
              </div>
            </>}
          </div>
        )}

        {view === "statistiken" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <StatsView g={g} getName={getName} />
          </div>
        )}

        {view === "mitglieder" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <MitgliederView g={g} allUsers={allUsers} currentUser={currentUser} isAdmin={isAdmin} getName={getName} save={save} />
          </div>
        )}

        {view === "passwörter" && isAdmin && (
          <div style={{ display: "grid", gap: "1.25rem", animation: "fadeIn 0.2s ease" }}>
            {[
              { label: "Adminpasswort", state: apw, setter: setApw, hash: g.adminHash, onSave: h => save(ng => { ng.adminHash = h; }) },
            ].map(({ label, state, setter, hash, onSave }) => (
              <Card key={label} style={{ padding: "1.25rem" }}>
                <SectionLabel>{label} ändern</SectionLabel>
                {state.done ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-success)" }}>{label} erfolgreich geändert.</p>
                    <button onClick={() => resetPwForm(setter)} style={{ padding: "7px 14px", borderRadius: "var(--radius-sm)", border: `1.5px solid ${BRAND}`, background: "transparent", color: BRAND, cursor: "pointer", fontSize: 13, fontWeight: 600, alignSelf: "start" }}>Weiteres Passwort ändern</button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    <Inp type="password" placeholder={`Aktuelles ${label}`} value={state.current} onChange={e => setter(s => ({ ...s, current: e.target.value, err: null }))} style={{ border: state.err === "wrong" ? "1.5px solid var(--color-border-danger)" : undefined }} />
                    {state.err === "wrong" && <p style={{ margin: "-4px 0 0", fontSize: 12, color: "var(--color-text-danger)" }}>Aktuelles Passwort falsch.</p>}
                    <Inp type="password" placeholder="Neues Passwort" value={state.next} onChange={e => setter(s => ({ ...s, next: e.target.value, err: null }))} style={{ border: state.err === "min" ? "1.5px solid var(--color-border-danger)" : undefined }} />
                    {state.err === "min" && <p style={{ margin: "-4px 0 0", fontSize: 12, color: "var(--color-text-danger)" }}>Mindestens 6 Zeichen.</p>}
                    <Inp type="password" placeholder="Neues Passwort bestätigen" value={state.confirm} onChange={e => setter(s => ({ ...s, confirm: e.target.value, err: null }))} onKeyDown={e => e.key === "Enter" && changePw(state, setter, hash, onSave)} style={{ border: state.err === "mismatch" ? "1.5px solid var(--color-border-danger)" : undefined }} />
                    {state.err === "mismatch" && <p style={{ margin: "-4px 0 0", fontSize: 12, color: "var(--color-text-danger)" }}>Passwörter stimmen nicht überein.</p>}
                    <PrimaryBtn onClick={() => changePw(state, setter, hash, onSave)} disabled={state.saving || !state.current || !state.next || !state.confirm} full>{state.saving ? "…" : "Speichern"}</PrimaryBtn>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
