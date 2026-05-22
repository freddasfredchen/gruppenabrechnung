import { useState, useEffect } from "react";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { SK_SESSION, VORSTAND_USER } from "./constants";
import { computeCrossGroupNetting, computeTransactions, computeBalances } from "./logic";
import UserLoginScreen from "./components/UserLoginScreen";
import GroupList from "./components/GroupList";
import GroupDetail from "./components/GroupDetail";

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const s = sessionStorage.getItem(SK_SESSION); return s ? JSON.parse(s) : null;
  });
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let g = false, u = false;
    const check = () => { if (g && u) setLoaded(true); };
    const unsubG = onSnapshot(collection(db, "groups"), snap => { setGroups(snap.docs.map(d => d.data())); g = true; check(); });
    const unsubU = onSnapshot(collection(db, "users"), snap => { setUsers(snap.docs.map(d => d.data())); u = true; check(); });
    return () => { unsubG(); unsubU(); };
  }, []);

  // Einmal beim Start: verrechne Direktgruppen und lösche ausgeglichene
  useEffect(() => {
    if (!loaded || groups.length === 0) return;
    const snapshot = groups;
    (async () => {
      const nettingMap = Object.fromEntries(computeCrossGroupNetting(snapshot).map(g => [g.id, g]));
      for (const g of snapshot.filter(g => g.type === "direct")) {
        const effective = nettingMap[g.id] || g;
        const txs = computeTransactions(computeBalances(effective.members, effective.expenses, effective.payments));
        if (txs.length === 0) {
          await deleteDoc(doc(db, "groups", g.id));
        } else if (nettingMap[g.id]) {
          await setDoc(doc(db, "groups", g.id), effective);
        }
      }
    })();
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const allUsers = [VORSTAND_USER, ...users];

  const handleDelete = async (groupId, userId) => {
    if (groupId) await deleteDoc(doc(db, "groups", groupId));
    if (userId) await deleteDoc(doc(db, "users", userId));
  };
  const handleCreate = async (group, user) => {
    if (group) await setDoc(doc(db, "groups", group.id), group);
    if (user) await setDoc(doc(db, "users", user.id), user);
  };

  const login = user => { sessionStorage.setItem(SK_SESSION, JSON.stringify(user)); localStorage.setItem("vapp_last_user", user.name); setCurrentUser(user); };
  const logout = () => { sessionStorage.removeItem(SK_SESSION); setCurrentUser(null); };

  const handleUpdateUserPw = async (userId, newPwHash) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const updated = { ...user, pwHash: newPwHash };
    await setDoc(doc(db, "users", userId), updated);
    login(updated);
  };

  const handleUpdateUserProfile = async (userId, paymentInfo) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const updated = { ...user, paymentInfo };
    await setDoc(doc(db, "users", userId), updated);
    if (userId === currentUser.id) login(updated);
  };

  if (!loaded) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", color: "var(--color-text-secondary)" }}>Lade...</div>;
  if (!currentUser) return <UserLoginScreen users={users} onLogin={login} />;

  const handleGroupUpdate = async (updatedGroup) => {
    if (updatedGroup.type === "direct") {
      const txs = computeTransactions(computeBalances(updatedGroup.members, updatedGroup.expenses, updatedGroup.payments));
      if (txs.length === 0) {
        await deleteDoc(doc(db, "groups", updatedGroup.id));
        return;
      }
    }
    await setDoc(doc(db, "groups", updatedGroup.id), updatedGroup);
    const allGroups = groups.map(g => g.id === updatedGroup.id ? updatedGroup : g);
    for (const ng of computeCrossGroupNetting(allGroups)) {
      const txs = computeTransactions(computeBalances(ng.members, ng.expenses, ng.payments));
      if (ng.type === "direct" && txs.length === 0) {
        await deleteDoc(doc(db, "groups", ng.id));
      } else {
        await setDoc(doc(db, "groups", ng.id), ng);
      }
    }
  };

  if (activeGroup) {
    const current = groups.find(g => g.id === activeGroup.id) || activeGroup;
    return <GroupDetail group={current} allUsers={allUsers} onUpdate={handleGroupUpdate} onBack={() => setActiveGroup(null)} currentUser={currentUser} />;
  }
  return <GroupList groups={groups} users={users} currentUser={currentUser} onEnter={setActiveGroup} onCreateGroup={handleCreate} onDeleteGroup={handleDelete} onLogout={logout} onUpdateUserPw={handleUpdateUserPw} onUpdateGroup={handleGroupUpdate} onUpdateUserProfile={handleUpdateUserProfile} />;
}
