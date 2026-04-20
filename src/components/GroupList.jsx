import { useState } from "react";
import { sha256, BRAND, BRAND_LT, SILVER, GROUP_ICONS, GROUP_COLORS, VORSTAND_USER, LIST_ADM_HASH, fmt } from "../constants";
import { computeBalances, computeTransactions } from "../logic";
import { Avatar, ToggleBtn, PrimaryBtn, Inp, SectionLabel, Card, ModalWrap } from "../ui";
import UserManagement from "./UserManagement";

export default function GroupList({ groups, users, currentUser, onEnter, onCreateGroup, onDeleteGroup, onLogout }) {
  const allUsers = [VORSTAND_USER, ...users];
  const getName = uid => allUsers.find(u => u.id === uid)?.name || "?";

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newAdminPw, setNewAdminPw] = useState("");
  const [newIcon, setNewIcon] = useState("♟");
  const [newColor, setNewColor] = useState(GROUP_COLORS[0]);
  const [newMembers, setNewMembers] = useState([]);
  const [creating, setCreating] = useState(false);

  const [unlocking, setUnlocking] = useState(null);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);

  const [isListAdmin, setIsListAdmin] = useState(false);
  const [showListAdminModal, setShowListAdminModal] = useState(false);
  const [ladminPw, setLadminPw] = useState("");
  const [ladminErr, setLadminErr] = useState(false);
  const [ladminLoading, setLadminLoading] = useState(false);

  const [showUserMgmt, setShowUserMgmt] = useState(false);

  const checkListAdmin = async () => {
    setLadminLoading(true); setLadminErr(false);
    const h = await sha256(ladminPw);
    if (h === LIST_ADM_HASH) { setIsListAdmin(true); setShowListAdminModal(false); setLadminPw(""); }
    else { setLadminErr(true); setLadminPw(""); }
    setLadminLoading(false);
  };

  const toggleMember = uid => setNewMembers(m => m.includes(uid) ? m.filter(x => x !== uid) : [...m, uid]);

  const create = async () => {
    if (!newName.trim() || !newPw.trim() || !newAdminPw.trim() || newMembers.length < 2) return;
    setCreating(true);
    const [pwHash, adminHash] = await Promise.all([sha256(newPw), sha256(newAdminPw)]);
    onCreateGroup({ id: Date.now() + "", name: newName.trim(), icon: newIcon, color: newColor, pwHash, adminHash, members: newMembers, expenses: [], payments: [] });
    setNewName(""); setNewPw(""); setNewAdminPw(""); setNewIcon("♟"); setNewColor(GROUP_COLORS[0]); setNewMembers([]); setShowCreate(false); setCreating(false);
  };

  const tryUnlock = async (g) => {
    const h = await sha256(pw);
    if (h === g.pwHash) { onEnter(g); setUnlocking(null); setPw(""); setPwErr(false); }
    else { setPwErr(true); setPw(""); }
  };

  const unlockGroup = groups.find(g => g.id === unlocking);
  const canCreate = newName.trim() && newPw.trim() && newAdminPw.trim() && newMembers.length >= 2;

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 640, margin: "0 auto" }}>
      {showUserMgmt && currentUser.isVorstand && (
        <UserManagement users={users} onAdd={u => onCreateGroup(null, u)} onRemove={id => onDeleteGroup(null, id)} onClose={() => setShowUserMgmt(false)} />
      )}

      {showListAdminModal && (
        <ModalWrap>
          <div style={{ width: "100%", maxWidth: 300, background: "var(--color-background-primary)", border: `1.5px solid ${BRAND}33`, borderRadius: 16, padding: "1.5rem", display: "grid", gap: 14, boxSizing: "border-box" }}>
            <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: BRAND }}>Administration</p>
            <Inp type="password" placeholder="Adminpasswort" value={ladminPw} onChange={e => { setLadminPw(e.target.value); setLadminErr(false); }} onKeyDown={e => e.key === "Enter" && checkListAdmin()} autoFocus style={{ border: ladminErr ? "1.5px solid var(--color-border-danger)" : undefined }} />
            {ladminErr && <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-danger)", textAlign: "center" }}>Falsches Passwort</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowListAdminModal(false); setLadminPw(""); setLadminErr(false); }} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 14 }}>Abbrechen</button>
              <PrimaryBtn onClick={checkListAdmin} disabled={ladminLoading || !ladminPw} full>{ladminLoading ? "…" : "Bestätigen"}</PrimaryBtn>
            </div>
          </div>
        </ModalWrap>
      )}

      {unlockGroup && (
        <ModalWrap>
          <div style={{ width: "100%", maxWidth: 300, background: "var(--color-background-primary)", border: `1.5px solid ${BRAND}33`, borderRadius: 16, padding: "1.5rem", display: "grid", gap: 14, boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: unlockGroup.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", flexShrink: 0 }}>{unlockGroup.icon}</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: "var(--color-text-primary)" }}>{unlockGroup.name}</p>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>Passwort eingeben</p>
              </div>
            </div>
            <Inp type="password" placeholder="Passwort" value={pw} onChange={e => { setPw(e.target.value); setPwErr(false); }} onKeyDown={e => e.key === "Enter" && tryUnlock(unlockGroup)} autoFocus style={{ border: pwErr ? "1.5px solid var(--color-border-danger)" : undefined }} />
            {pwErr && <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-danger)", textAlign: "center" }}>Falsches Passwort</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setUnlocking(null); setPw(""); setPwErr(false); }} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 14 }}>Abbrechen</button>
              <PrimaryBtn onClick={() => tryUnlock(unlockGroup)} disabled={!pw} full>Öffnen</PrimaryBtn>
            </div>
          </div>
        </ModalWrap>
      )}

      <div style={{ background: BRAND, padding: "1.25rem 1.25rem 1rem", borderRadius: "0 0 20px 20px", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontWeight: 800, fontSize: 18, margin: 0, color: "#fff" }}>Gruppenabrechnung</p>
            <p style={{ fontSize: 12, margin: "2px 0 0", color: SILVER }}>Dawson Schach und Spiele Club</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {currentUser.isVorstand && (
              <button onClick={() => setShowUserMgmt(true)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Nutzer</button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "5px 12px 5px 5px", cursor: "pointer" }} onClick={onLogout}>
              <Avatar name={currentUser.name} size={26} />
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{currentUser.name}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginLeft: 4 }}>↩</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 1rem 2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <SectionLabel style={{ margin: 0 }}>{groups.length} {groups.length === 1 ? "Gruppe" : "Gruppen"}</SectionLabel>
          {!isListAdmin
            ? <button onClick={() => setShowListAdminModal(true)} style={{ padding: "5px 12px", borderRadius: 20, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 12 }}>Administration</button>
            : <button onClick={() => setIsListAdmin(false)} style={{ padding: "5px 12px", borderRadius: 20, background: BRAND_LT, color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Admin aktiv ×</button>
          }
        </div>

        <div style={{ display: "grid", gap: 10, marginBottom: "1.25rem" }}>
          {groups.map(g => {
            const total = g.expenses.reduce((s, e) => s + e.amount, 0);
            const openTxs = computeTransactions(computeBalances(g.members, g.expenses, g.payments)).length;
            return (
              <div key={g.id} onClick={() => !isListAdmin && setUnlocking(g.id)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--color-background-primary)", border: `1px solid ${BRAND}1A`, borderRadius: 14, cursor: isListAdmin ? "default" : "pointer" }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: g.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, color: "#fff" }}>{g.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>{g.name}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>{g.members.length} Mitglieder · {fmt(total)} Gesamt</p>
                </div>
                {openTxs > 0 && <span style={{ background: `${BRAND}15`, color: BRAND, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>{openTxs} offen</span>}
                {isListAdmin
                  ? <button onClick={e => { e.stopPropagation(); onDeleteGroup(g.id, null); }} style={{ background: "none", border: "none", cursor: "pointer", color: BRAND_LT, fontSize: 20, lineHeight: 1, padding: "0 4px", fontWeight: 700, flexShrink: 0 }}>×</button>
                  : <span style={{ fontSize: 20, color: SILVER }}>›</span>
                }
              </div>
            );
          })}
          {groups.length === 0 && <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Noch keine Gruppen.</p>}
        </div>

        <button onClick={() => setShowCreate(v => !v)} style={{ padding: "9px 20px", borderRadius: 10, border: `1.5px solid ${BRAND}`, background: showCreate ? `${BRAND}10` : "transparent", color: BRAND, cursor: "pointer", fontSize: 14, fontWeight: 700, width: "100%", marginBottom: showCreate ? "1rem" : 0 }}>
          {showCreate ? "Abbrechen" : "+ Neue Gruppe erstellen"}
        </button>

        {showCreate && (
          <Card style={{ marginTop: "1rem" }}>
            <div style={{ display: "grid", gap: 14 }}>
              <div><SectionLabel>Gruppenname</SectionLabel><Inp placeholder="z.B. WG Koblenz" value={newName} onChange={e => setNewName(e.target.value)} /></div>
              <div><SectionLabel>Gruppenpasswort</SectionLabel><Inp type="password" placeholder="Passwort für alle Mitglieder" value={newPw} onChange={e => setNewPw(e.target.value)} /></div>
              <div><SectionLabel>Adminpasswort</SectionLabel><Inp type="password" placeholder="Separates Passwort für Admins" value={newAdminPw} onChange={e => setNewAdminPw(e.target.value)} /></div>
              <div>
                <SectionLabel>Mitglieder wählen <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0, opacity: 0.6 }}>(min. 2)</span></SectionLabel>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {allUsers.map(u => <ToggleBtn key={u.id} active={newMembers.includes(u.id)} onClick={() => toggleMember(u.id)}>{u.name}</ToggleBtn>)}
                </div>
              </div>
              <div>
                <SectionLabel>Symbol</SectionLabel>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {GROUP_ICONS.map(ic => <button key={ic} onClick={() => setNewIcon(ic)} style={{ width: 38, height: 38, borderRadius: 9, border: newIcon === ic ? `2px solid ${BRAND}` : "0.5px solid var(--color-border-secondary)", background: newIcon === ic ? `${BRAND}15` : "var(--color-background-secondary)", fontSize: 18, cursor: "pointer", transition: "all 0.15s" }}>{ic}</button>)}
                </div>
              </div>
              <div>
                <SectionLabel>Farbe</SectionLabel>
                <div style={{ display: "flex", gap: 10 }}>
                  {GROUP_COLORS.map(c => <button key={c} onClick={() => setNewColor(c)} style={{ width: 30, height: 30, borderRadius: "50%", background: c, border: newColor === c ? "3px solid var(--color-text-primary)" : "3px solid transparent", cursor: "pointer", filter: newColor === c ? "brightness(1.3)" : "brightness(1)", transform: newColor === c ? "scale(1.2)" : "scale(1)", transition: "all 0.15s" }} />)}
                </div>
              </div>
              <PrimaryBtn onClick={create} disabled={creating || !canCreate} full>{creating ? "…" : "Gruppe erstellen"}</PrimaryBtn>
              {newMembers.length < 2 && newMembers.length > 0 && <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-danger)" }}>Bitte mindestens 2 Mitglieder wählen.</p>}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
