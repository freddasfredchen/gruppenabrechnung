import { useState, useEffect } from "react";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { SK_SESSION, VORSTAND_USER } from "./constants";
import AppLoginScreen from "./components/AppLoginScreen";
import UserLoginScreen from "./components/UserLoginScreen";
import GroupList from "./components/GroupList";
import GroupDetail from "./components/GroupDetail";

export default function App() {
  const [appAuthed, setAppAuthed] = useState(() => sessionStorage.getItem("vapp_appauth") === "1");
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

  const allUsers = [VORSTAND_USER, ...users];

  const handleDelete = async (groupId, userId) => {
    if (groupId) await deleteDoc(doc(db, "groups", groupId));
    if (userId) await deleteDoc(doc(db, "users", userId));
  };
  const handleCreate = async (group, user) => {
    if (group) await setDoc(doc(db, "groups", group.id), group);
    if (user) await setDoc(doc(db, "users", user.id), user);
  };

  const login = user => { sessionStorage.setItem(SK_SESSION, JSON.stringify(user)); setCurrentUser(user); };
  const logout = () => { sessionStorage.removeItem(SK_SESSION); setCurrentUser(null); };

  const handleUpdateUserPw = async (userId, newPwHash) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const updated = { ...user, pwHash: newPwHash };
    await setDoc(doc(db, "users", userId), updated);
    login(updated);
  };

  if (!appAuthed) return <AppLoginScreen onSuccess={() => { sessionStorage.setItem("vapp_appauth", "1"); setAppAuthed(true); }} />;
  if (!loaded) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", color: "var(--color-text-secondary)" }}>Lade...</div>;
  if (!currentUser) return <UserLoginScreen users={users} onLogin={login} />;

  if (activeGroup) {
    const current = groups.find(g => g.id === activeGroup.id) || activeGroup;
    return <GroupDetail group={current} allUsers={allUsers} onUpdate={ng => setDoc(doc(db, "groups", ng.id), ng)} onBack={() => setActiveGroup(null)} currentUser={currentUser} />;
  }
  return <GroupList groups={groups} users={users} currentUser={currentUser} onEnter={setActiveGroup} onCreateGroup={handleCreate} onDeleteGroup={handleDelete} onLogout={logout} onUpdateUserPw={handleUpdateUserPw} />;
}
