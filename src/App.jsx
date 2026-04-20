import { useState, useEffect } from "react";

// ── Storage keys ──────────────────────────────────────────────────────────────
const SK_GROUPS  = "vapp_groups";
const SK_USERS   = "vapp_users";
const SK_SESSION = "vapp_session";

// ── Hashes (SHA-256) ──────────────────────────────────────────────────────────
const APP_PW_HASH    = "f0e4c2f76c58916ec258f246851bea091d14d4247a2fc3e18694461b1816e13b";
const LIST_ADM_HASH  = "f0e4c2f76c58916ec258f246851bea091d14d4247a2fc3e18694461b1816e13b";
const VORSTAND_HASH  = "f0e4c2f76c58916ec258f246851bea091d14d4247a2fc3e18694461b1816e13b";

// ── Brand ─────────────────────────────────────────────────────────────────────
const BRAND    = "#3D1A24";
const BRAND_LT = "#6B2D3E";
const SILVER   = "#B0AEA8";
const COLORS_AVATAR = ["#7F77DD","#1D9E75","#D85A30","#378ADD","#D4537E","#BA7517","#639922","#E24B4A"];
const GROUP_ICONS   = ["♟","⚽","🎲","🍕","✈️","🎮","🏋️","🎵","🎯","💼"];
const GROUP_COLORS  = [BRAND, BRAND_LT, "#1D6B8C","#1D9E75","#7F77DD","#BA7517"];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function initials(name) { return name.trim().split(" ").map(w=>w[0]?.toUpperCase()||"").join("").slice(0,2)||"?"; }
function fmt(n) { return n.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})+" €"; }
function avatarColor(name) { return COLORS_AVATAR[name.charCodeAt(0)%COLORS_AVATAR.length]; }

// ── Vorstand seed user ────────────────────────────────────────────────────────
const VORSTAND_USER = { id:"vorstand", name:"Vorstand", pwHash: VORSTAND_HASH, isVorstand: true };

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Avatar({name, size=36}) {
  return <div style={{width:size,height:size,borderRadius:"50%",background:avatarColor(name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:600,color:"#fff",flexShrink:0}}>{initials(name)}</div>;
}
const ToggleBtn=({active,onClick,children})=>(
  <button onClick={onClick} style={{padding:"6px 14px",borderRadius:20,fontSize:13,cursor:"pointer",userSelect:"none",background:active?BRAND:"var(--color-background-secondary)",color:active?"#fff":"var(--color-text-primary)",border:active?`2px solid ${BRAND}`:"0.5px solid var(--color-border-secondary)",fontWeight:active?600:400,transition:"all 0.15s"}}>
    {children}
  </button>
);
function PrimaryBtn({onClick,disabled,children,full=false}) {
  return <button onClick={onClick} disabled={disabled} style={{padding:"10px 20px",borderRadius:10,border:"none",background:disabled?"var(--color-background-tertiary)":BRAND,color:disabled?"var(--color-text-tertiary)":"#fff",fontWeight:600,cursor:disabled?"default":"pointer",fontSize:14,width:full?"100%":"auto",transition:"opacity 0.15s"}}>{children}</button>;
}
function Inp({style={}, ...props}) {
  return <input {...props} style={{padding:"9px 12px",borderRadius:9,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",...style}}/>;
}
function SectionLabel({children}) {
  return <p style={{fontSize:11,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",color:BRAND,margin:"0 0 8px",opacity:0.8}}>{children}</p>;
}
function Card({children, style={}}) {
  return <div style={{background:"var(--color-background-primary)",border:`1px solid ${BRAND}18`,borderRadius:14,padding:"1.25rem",...style}}>{children}</div>;
}
function ModalWrap({children}) {
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"1rem"}}>{children}</div>;
}

// ── Balance logic ─────────────────────────────────────────────────────────────
function computeBalances(members,expenses,payments){
  const bal={};
  members.forEach(m=>bal[m]=0);
  expenses.forEach(exp=>{
    const parts=exp.participants.length>0?exp.participants:members;
    const share=exp.amount/parts.length;
    bal[exp.payer]=(bal[exp.payer]||0)+exp.amount;
    parts.forEach(uid=>{bal[uid]=(bal[uid]||0)-share;});
  });
  (payments||[]).forEach(p=>{bal[p.from]=(bal[p.from]||0)+p.amount;bal[p.to]=(bal[p.to]||0)-p.amount;});
  return bal;
}
function computeTransactions(balances){
  const d=[],c=[];
  Object.entries(balances).forEach(([id,v])=>{if(v>0.005)c.push({id,amt:v});else if(v<-0.005)d.push({id,amt:-v});});
  c.sort((a,b)=>b.amt-a.amt); d.sort((a,b)=>b.amt-a.amt);
  const txs=[]; let ci=0,di=0;
  while(ci<c.length&&di<d.length){
    const amt=Math.min(c[ci].amt,d[di].amt);
    txs.push({from:d[di].id,to:c[ci].id,amt});
    c[ci].amt-=amt; d[di].amt-=amt;
    if(c[ci].amt<0.005)ci++; if(d[di].amt<0.005)di++;
  }
  return txs;
}

// ── Screen 1: App password ────────────────────────────────────────────────────
function AppLoginScreen({onSuccess}) {
  const [pw,setPw]=useState(""); const [err,setErr]=useState(false); const [loading,setLoading]=useState(false);
  const check=async()=>{setLoading(true);setErr(false);const h=await sha256(pw);if(h===APP_PW_HASH){onSuccess();}else{setErr(true);setPw("");}setLoading(false);};
  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem",fontFamily:"var(--font-sans)"}}>
      <div style={{width:"100%",maxWidth:340,boxSizing:"border-box"}}>
        <Card style={{padding:"2.5rem 2rem",display:"grid",gap:20}}>
          <div style={{textAlign:"center"}}>
            <p style={{fontWeight:800,fontSize:22,margin:"0 0 4px",color:BRAND}}>Gruppenabrechnung</p>
            <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:0}}>Dawson Schach und Spiele Club</p>
          </div>
          <div style={{borderTop:`1px solid ${BRAND}22`,paddingTop:20,display:"grid",gap:12}}>
            <Inp type="password" placeholder="App-Passwort" value={pw} onChange={e=>{setPw(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&check()} autoFocus style={{border:err?"1.5px solid var(--color-border-danger)":undefined}}/>
            {err&&<p style={{margin:0,fontSize:12,color:"var(--color-text-danger)",textAlign:"center"}}>Falsches Passwort</p>}
            <PrimaryBtn onClick={check} disabled={loading||!pw} full>{loading?"…":"Weiter"}</PrimaryBtn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Screen 2: User login ──────────────────────────────────────────────────────
function UserLoginScreen({users, onLogin}) {
  const [selected,setSelected]=useState(null);
  const [pw,setPw]=useState(""); const [err,setErr]=useState(false); const [loading,setLoading]=useState(false);
  const allUsers=[VORSTAND_USER,...users];

  const check=async()=>{
    if(!selected) return;
    setLoading(true);setErr(false);
    const h=await sha256(pw);
    if(h===selected.pwHash){onLogin(selected);}else{setErr(true);setPw("");}
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem",fontFamily:"var(--font-sans)"}}>
      <div style={{width:"100%",maxWidth:380,boxSizing:"border-box"}}>
        <Card style={{padding:"2rem",display:"grid",gap:16}}>
          <div>
            <p style={{fontWeight:800,fontSize:18,margin:"0 0 2px",color:BRAND}}>Konto wählen</p>
            <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:0}}>Mit welchem Konto möchtest du einloggen?</p>
          </div>
          <div style={{display:"grid",gap:8,maxHeight:240,overflowY:"auto"}}>
            {allUsers.map(u=>(
              <div key={u.id} onClick={()=>{setSelected(u);setPw("");setErr(false);}}
                style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:10,border:selected?.id===u.id?`2px solid ${BRAND}`:`1px solid ${BRAND}15`,cursor:"pointer",background:selected?.id===u.id?`${BRAND}08`:"var(--color-background-secondary)",transition:"all 0.15s"}}>
                <Avatar name={u.name} size={34}/>
                <span style={{fontWeight:selected?.id===u.id?700:500,fontSize:14,color:"var(--color-text-primary)"}}>{u.name}</span>
                {u.isVorstand&&<span style={{marginLeft:"auto",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${BRAND}15`,color:BRAND}}>VORSTAND</span>}
              </div>
            ))}
          </div>
          {selected&&(
            <div style={{borderTop:`1px solid ${BRAND}15`,paddingTop:14,display:"grid",gap:10}}>
              <Inp type="password" placeholder={`Passwort für ${selected.name}`} value={pw} onChange={e=>{setPw(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&check()} autoFocus style={{border:err?"1.5px solid var(--color-border-danger)":undefined}}/>
              {err&&<p style={{margin:0,fontSize:12,color:"var(--color-text-danger)",textAlign:"center"}}>Falsches Passwort</p>}
              <PrimaryBtn onClick={check} disabled={loading||!pw} full>{loading?"…":`Als ${selected.name} einloggen`}</PrimaryBtn>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Vorstand: user management ─────────────────────────────────────────────────
function UserManagement({users, onAdd, onRemove, onClose}) {
  const [name,setName]=useState(""); const [pw,setPw]=useState(""); const [creating,setCreating]=useState(false);
  const create=async()=>{
    if(!name.trim()||!pw.trim()) return;
    setCreating(true);
    const pwHash=await sha256(pw);
    onAdd({id:Date.now()+"",name:name.trim(),pwHash,isVorstand:false});
    setName("");setPw("");setCreating(false);
  };
  return(
    <ModalWrap>
      <div style={{width:"100%",maxWidth:380,background:"var(--color-background-primary)",border:`1.5px solid ${BRAND}33`,borderRadius:16,padding:"1.5rem",display:"grid",gap:16,maxHeight:"80vh",overflowY:"auto",boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <p style={{fontWeight:700,fontSize:16,margin:0,color:BRAND}}>Nutzerverwaltung</p>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"var(--color-text-secondary)",fontSize:20,lineHeight:1}}>×</button>
        </div>
        <div style={{display:"grid",gap:8}}>
          <SectionLabel>Bestehende Konten</SectionLabel>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,background:`${BRAND}08`,border:`1px solid ${BRAND}15`}}>
            <Avatar name="Vorstand" size={30}/>
            <span style={{flex:1,fontSize:14,fontWeight:600,color:"var(--color-text-primary)"}}>Vorstand</span>
            <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${BRAND}15`,color:BRAND}}>VORSTAND</span>
          </div>
          {users.map(u=>(
            <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,background:"var(--color-background-secondary)",border:`1px solid ${BRAND}10`}}>
              <Avatar name={u.name} size={30}/>
              <span style={{flex:1,fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{u.name}</span>
              <button onClick={()=>onRemove(u.id)} style={{background:"none",border:"none",cursor:"pointer",color:BRAND_LT,fontSize:18,lineHeight:1,fontWeight:700,padding:"0 2px"}}>×</button>
            </div>
          ))}
          {users.length===0&&<p style={{fontSize:13,color:"var(--color-text-secondary)",margin:0}}>Noch keine weiteren Konten.</p>}
        </div>
        <div style={{borderTop:`1px solid ${BRAND}15`,paddingTop:14,display:"grid",gap:10}}>
          <SectionLabel>Neues Konto erstellen</SectionLabel>
          <Inp placeholder="Name" value={name} onChange={e=>setName(e.target.value)}/>
          <Inp type="password" placeholder="Passwort" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&create()}/>
          <PrimaryBtn onClick={create} disabled={creating||!name.trim()||!pw.trim()} full>{creating?"…":"Konto erstellen"}</PrimaryBtn>
        </div>
      </div>
    </ModalWrap>
  );
}

// ── Group List ────────────────────────────────────────────────────────────────
function GroupList({groups, users, currentUser, onEnter, onCreateGroup, onDeleteGroup, onLogout}) {
  const allUsers=[VORSTAND_USER,...users];
  const getName=uid=>allUsers.find(u=>u.id===uid)?.name||"?";
  const [showCreate,setShowCreate]=useState(false);
  const [newName,setNewName]=useState(""); const [newPw,setNewPw]=useState(""); const [newAdminPw,setNewAdminPw]=useState("");
  const [newIcon,setNewIcon]=useState("♟"); const [newColor,setNewColor]=useState(GROUP_COLORS[0]);
  const [newMembers,setNewMembers]=useState([]);
  const [creating,setCreating]=useState(false);
  const [unlocking,setUnlocking]=useState(null); const [pw,setPw]=useState(""); const [pwErr,setPwErr]=useState(false);
  const [isListAdmin,setIsListAdmin]=useState(false);
  const [showListAdminModal,setShowListAdminModal]=useState(false);
  const [ladminPw,setLadminPw]=useState(""); const [ladminErr,setLadminErr]=useState(false); const [ladminLoading,setLadminLoading]=useState(false);
  const [showUserMgmt,setShowUserMgmt]=useState(false);

  const checkListAdmin=async()=>{setLadminLoading(true);setLadminErr(false);const h=await sha256(ladminPw);if(h===LIST_ADM_HASH){setIsListAdmin(true);setShowListAdminModal(false);setLadminPw("");}else{setLadminErr(true);setLadminPw("");}setLadminLoading(false);};
  const toggleMember=uid=>setNewMembers(m=>m.includes(uid)?m.filter(x=>x!==uid):[...m,uid]);

  const create=async()=>{
    if(!newName.trim()||!newPw.trim()||!newAdminPw.trim()||newMembers.length<2) return;
    setCreating(true);
    const [pwHash,adminHash]=await Promise.all([sha256(newPw),sha256(newAdminPw)]);
    onCreateGroup({id:Date.now()+"",name:newName.trim(),icon:newIcon,color:newColor,pwHash,adminHash,members:newMembers,expenses:[],payments:[]});
    setNewName("");setNewPw("");setNewAdminPw("");setNewIcon("♟");setNewColor(GROUP_COLORS[0]);setNewMembers([]);setShowCreate(false);setCreating(false);
  };

  const tryUnlock=async(g)=>{const h=await sha256(pw);if(h===g.pwHash){onEnter(g);setUnlocking(null);setPw("");setPwErr(false);}else{setPwErr(true);setPw("");}};
  const unlockGroup=groups.find(g=>g.id===unlocking);
  const canCreate=newName.trim()&&newPw.trim()&&newAdminPw.trim()&&newMembers.length>=2;

  return(
    <div style={{fontFamily:"var(--font-sans)",maxWidth:640,margin:"0 auto"}}>
      {showUserMgmt&&currentUser.isVorstand&&(
        <UserManagement users={users} onAdd={u=>onCreateGroup(null,u)} onRemove={id=>onDeleteGroup(null,id)} onClose={()=>setShowUserMgmt(false)}/>
      )}
      {showListAdminModal&&(
        <ModalWrap>
          <div style={{width:"100%",maxWidth:300,background:"var(--color-background-primary)",border:`1.5px solid ${BRAND}33`,borderRadius:16,padding:"1.5rem",display:"grid",gap:14,boxSizing:"border-box"}}>
            <p style={{fontWeight:700,fontSize:15,margin:0,color:BRAND}}>Administration</p>
            <Inp type="password" placeholder="Adminpasswort" value={ladminPw} onChange={e=>{setLadminPw(e.target.value);setLadminErr(false);}} onKeyDown={e=>e.key==="Enter"&&checkListAdmin()} autoFocus style={{border:ladminErr?"1.5px solid var(--color-border-danger)":undefined}}/>
            {ladminErr&&<p style={{margin:0,fontSize:12,color:"var(--color-text-danger)",textAlign:"center"}}>Falsches Passwort</p>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setShowListAdminModal(false);setLadminPw("");setLadminErr(false);}} style={{flex:1,padding:"9px",borderRadius:9,border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer",fontSize:14}}>Abbrechen</button>
              <PrimaryBtn onClick={checkListAdmin} disabled={ladminLoading||!ladminPw} full>{ladminLoading?"…":"Bestätigen"}</PrimaryBtn>
            </div>
          </div>
        </ModalWrap>
      )}
      {unlockGroup&&(
        <ModalWrap>
          <div style={{width:"100%",maxWidth:300,background:"var(--color-background-primary)",border:`1.5px solid ${BRAND}33`,borderRadius:16,padding:"1.5rem",display:"grid",gap:14,boxSizing:"border-box"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:40,height:40,borderRadius:10,background:unlockGroup.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"#fff",flexShrink:0}}>{unlockGroup.icon}</div>
              <div><p style={{fontWeight:700,fontSize:15,margin:0,color:"var(--color-text-primary)"}}>{unlockGroup.name}</p><p style={{fontSize:12,color:"var(--color-text-secondary)",margin:0}}>Passwort eingeben</p></div>
            </div>
            <Inp type="password" placeholder="Passwort" value={pw} onChange={e=>{setPw(e.target.value);setPwErr(false);}} onKeyDown={e=>e.key==="Enter"&&tryUnlock(unlockGroup)} autoFocus style={{border:pwErr?"1.5px solid var(--color-border-danger)":undefined}}/>
            {pwErr&&<p style={{margin:0,fontSize:12,color:"var(--color-text-danger)",textAlign:"center"}}>Falsches Passwort</p>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setUnlocking(null);setPw("");setPwErr(false);}} style={{flex:1,padding:"9px",borderRadius:9,border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer",fontSize:14}}>Abbrechen</button>
              <PrimaryBtn onClick={()=>tryUnlock(unlockGroup)} disabled={!pw} full>Öffnen</PrimaryBtn>
            </div>
          </div>
        </ModalWrap>
      )}

      <div style={{background:BRAND,padding:"1.25rem 1.25rem 1rem",borderRadius:"0 0 20px 20px",marginBottom:"1.5rem"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <p style={{fontWeight:800,fontSize:18,margin:0,color:"#fff"}}>Gruppenabrechnung</p>
            <p style={{fontSize:12,margin:"2px 0 0",color:SILVER}}>Dawson Schach und Spiele Club</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {currentUser.isVorstand&&(
              <button onClick={()=>setShowUserMgmt(true)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>Nutzer</button>
            )}
            <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.12)",borderRadius:20,padding:"5px 12px 5px 5px",cursor:"pointer"}} onClick={onLogout}>
              <Avatar name={currentUser.name} size={26}/>
              <span style={{fontSize:13,color:"#fff",fontWeight:500}}>{currentUser.name}</span>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginLeft:4}}>↩</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:"0 1rem 2rem"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
          <SectionLabel style={{margin:0}}>{groups.length} {groups.length===1?"Gruppe":"Gruppen"}</SectionLabel>
          {!isListAdmin
            ?<button onClick={()=>setShowListAdminModal(true)} style={{padding:"5px 12px",borderRadius:20,background:"transparent",color:"var(--color-text-secondary)",border:"0.5px solid var(--color-border-secondary)",cursor:"pointer",fontSize:12}}>Administration</button>
            :<button onClick={()=>setIsListAdmin(false)} style={{padding:"5px 12px",borderRadius:20,background:BRAND_LT,color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:700}}>Admin aktiv ×</button>
          }
        </div>

        <div style={{display:"grid",gap:10,marginBottom:"1.25rem"}}>
          {groups.map(g=>{
            const total=g.expenses.reduce((s,e)=>s+e.amount,0);
            const openTxs=computeTransactions(computeBalances(g.members,g.expenses,g.payments)).length;
            return(
              <div key={g.id} onClick={()=>!isListAdmin&&setUnlocking(g.id)}
                style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"var(--color-background-primary)",border:`1px solid ${BRAND}1A`,borderRadius:14,cursor:isListAdmin?"default":"pointer"}}>
                <div style={{width:46,height:46,borderRadius:12,background:g.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,color:"#fff"}}>{g.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontWeight:700,fontSize:15,color:"var(--color-text-primary)"}}>{g.name}</p>
                  <p style={{margin:"3px 0 0",fontSize:12,color:"var(--color-text-secondary)"}}>{g.members.length} Mitglieder · {fmt(total)} Gesamt</p>
                </div>
                {openTxs>0&&<span style={{background:`${BRAND}15`,color:BRAND,fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,whiteSpace:"nowrap"}}>{openTxs} offen</span>}
                {isListAdmin
                  ?<button onClick={e=>{e.stopPropagation();onDeleteGroup(g.id,null);}} style={{background:"none",border:"none",cursor:"pointer",color:BRAND_LT,fontSize:20,lineHeight:1,padding:"0 4px",fontWeight:700,flexShrink:0}}>×</button>
                  :<span style={{fontSize:20,color:SILVER}}>›</span>
                }
              </div>
            );
          })}
          {groups.length===0&&<p style={{color:"var(--color-text-secondary)",fontSize:14}}>Noch keine Gruppen.</p>}
        </div>

        <button onClick={()=>setShowCreate(v=>!v)} style={{padding:"9px 20px",borderRadius:10,border:`1.5px solid ${BRAND}`,background:showCreate?`${BRAND}10`:"transparent",color:BRAND,cursor:"pointer",fontSize:14,fontWeight:700,width:"100%",marginBottom:showCreate?"1rem":0}}>
          {showCreate?"Abbrechen":"+ Neue Gruppe erstellen"}
        </button>

        {showCreate&&(
          <Card style={{marginTop:"1rem"}}>
            <div style={{display:"grid",gap:14}}>
              <div><SectionLabel>Gruppenname</SectionLabel><Inp placeholder="z.B. WG Koblenz" value={newName} onChange={e=>setNewName(e.target.value)}/></div>
              <div><SectionLabel>Gruppenpasswort</SectionLabel><Inp type="password" placeholder="Passwort für alle Mitglieder" value={newPw} onChange={e=>setNewPw(e.target.value)}/></div>
              <div><SectionLabel>Adminpasswort</SectionLabel><Inp type="password" placeholder="Separates Passwort für Admins" value={newAdminPw} onChange={e=>setNewAdminPw(e.target.value)}/></div>
              <div>
                <SectionLabel>Mitglieder wählen <span style={{textTransform:"none",fontWeight:400,letterSpacing:0,opacity:0.6}}>(min. 2)</span></SectionLabel>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {[VORSTAND_USER,...users].map(u=>(
                    <ToggleBtn key={u.id} active={newMembers.includes(u.id)} onClick={()=>toggleMember(u.id)}>{u.name}</ToggleBtn>
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel>Symbol</SectionLabel>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {GROUP_ICONS.map(ic=>(
                    <button key={ic} onClick={()=>setNewIcon(ic)} style={{width:38,height:38,borderRadius:9,border:newIcon===ic?`2px solid ${BRAND}`:"0.5px solid var(--color-border-secondary)",background:newIcon===ic?`${BRAND}15`:"var(--color-background-secondary)",fontSize:18,cursor:"pointer",transition:"all 0.15s"}}>{ic}</button>
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel>Farbe</SectionLabel>
                <div style={{display:"flex",gap:10}}>
                  {GROUP_COLORS.map(c=>(
                    <button key={c} onClick={()=>setNewColor(c)} style={{width:30,height:30,borderRadius:"50%",background:c,border:newColor===c?"3px solid var(--color-text-primary)":"3px solid transparent",cursor:"pointer",filter:newColor===c?"brightness(1.3)":"brightness(1)",transform:newColor===c?"scale(1.2)":"scale(1)",transition:"all 0.15s"}}/>
                  ))}
                </div>
              </div>
              <PrimaryBtn onClick={create} disabled={creating||!canCreate} full>{creating?"…":"Gruppe erstellen"}</PrimaryBtn>
              {newMembers.length<2&&newMembers.length>0&&<p style={{margin:0,fontSize:12,color:"var(--color-text-danger)"}}>Bitte mindestens 2 Mitglieder wählen.</p>}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Manual Payment ────────────────────────────────────────────────────────────
function ManualPayment({members,getName,onSave}) {
  const [from,setFrom]=useState(""); const [to,setTo]=useState(""); const [amount,setAmount]=useState(""); const [open,setOpen]=useState(false);
  const save=()=>{const amt=parseFloat(amount.replace(",","."));if(!from||!to||from===to||isNaN(amt)||amt<=0)return;onSave(from,to,amt);setFrom("");setTo("");setAmount("");setOpen(false);};
  if(members.length<2) return null;
  return(
    <div>
      <button onClick={()=>setOpen(v=>!v)} style={{marginBottom:"1rem",padding:"8px 18px",borderRadius:9,border:`1.5px solid ${BRAND}`,background:open?`${BRAND}10`:"transparent",color:BRAND,cursor:"pointer",fontSize:14,fontWeight:600}}>
        {open?"Abbrechen":"+ Zahlung manuell eintragen"}
      </button>
      {open&&(
        <Card style={{padding:"1rem",marginBottom:"1rem"}}>
          <div style={{display:"grid",gap:12}}>
            <div><SectionLabel>Von (zahlt)</SectionLabel><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{members.map(uid=><ToggleBtn key={uid} active={from===uid} onClick={()=>setFrom(f=>f===uid?"":uid)}>{getName(uid)}</ToggleBtn>)}</div></div>
            <div><SectionLabel>An (empfängt)</SectionLabel><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{members.filter(uid=>uid!==from).map(uid=><ToggleBtn key={uid} active={to===uid} onClick={()=>setTo(t=>t===uid?"":uid)}>{getName(uid)}</ToggleBtn>)}</div></div>
            <Inp placeholder="Betrag (€)" value={amount} onChange={e=>setAmount(e.target.value)}/>
            <PrimaryBtn onClick={save} disabled={!from||!to||!amount} full>Speichern</PrimaryBtn>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Group Detail ──────────────────────────────────────────────────────────────
function GroupDetail({group, allUsers, onUpdate, onBack, currentUser}) {
  const [isAdmin,setIsAdmin]=useState(false);
  const [showAdminModal,setShowAdminModal]=useState(false);
  const [adminPw,setAdminPw]=useState(""); const [adminErr,setAdminErr]=useState(false); const [adminLoading,setAdminLoading]=useState(false);
  const [view,setView]=useState("salden");
  const [expForm,setExpForm]=useState({desc:"",amount:"",payer:"",participants:[]});
  const [showExpForm,setShowExpForm]=useState(false);

  const g=group;
  const getName=uid=>allUsers.find(u=>u.id===uid)?.name||"?";
  const save=fn=>{const ng={...g,members:[...g.members],expenses:[...g.expenses],payments:[...g.payments]};fn(ng);onUpdate(ng);};
  const balances=computeBalances(g.members,g.expenses,g.payments);
  const transactions=computeTransactions(balances);

  const checkAdmin=async()=>{setAdminLoading(true);setAdminErr(false);const h=await sha256(adminPw);if(h===g.adminHash){setIsAdmin(true);setShowAdminModal(false);setAdminPw("");}else{setAdminErr(true);setAdminPw("");}setAdminLoading(false);};
  const addExpense=()=>{
    const amt=parseFloat(expForm.amount.replace(",","."));
    if(!expForm.desc.trim()||isNaN(amt)||amt<=0||!expForm.payer) return;
    save(ng=>{ng.expenses=[...ng.expenses,{id:Date.now()+"",desc:expForm.desc.trim(),amount:amt,payer:expForm.payer,participants:expForm.participants,date:new Date().toLocaleDateString("de-DE")}];});
    setExpForm({desc:"",amount:"",payer:"",participants:[]});setShowExpForm(false);
  };
  const removeExpense=id=>save(ng=>{ng.expenses=ng.expenses.filter(e=>e.id!==id);});
  const recordPayment=(from,to,amount)=>save(ng=>{ng.payments=[...ng.payments,{id:Date.now()+"",from,to,amount,date:new Date().toLocaleDateString("de-DE")}];});
  const removePayment=id=>save(ng=>{ng.payments=ng.payments.filter(p=>p.id!==id);});
  const togglePart=uid=>setExpForm(f=>({...f,participants:f.participants.includes(uid)?f.participants.filter(p=>p!==uid):[...f.participants,uid]}));

  const NavBtn=({k,label})=>(
    <button onClick={()=>setView(k)} style={{padding:"7px 14px",borderRadius:20,background:view===k?BRAND:"transparent",color:view===k?"#fff":"var(--color-text-secondary)",border:view===k?"none":"0.5px solid var(--color-border-secondary)",cursor:"pointer",fontSize:13,fontWeight:view===k?700:400,transition:"all 0.15s"}}>{label}</button>
  );

  return(
    <div style={{fontFamily:"var(--font-sans)",maxWidth:640,margin:"0 auto"}}>
      {showAdminModal&&(
        <ModalWrap>
          <div style={{width:"100%",maxWidth:300,background:"var(--color-background-primary)",border:`1.5px solid ${BRAND}33`,borderRadius:16,padding:"1.5rem",display:"grid",gap:14,boxSizing:"border-box"}}>
            <p style={{fontWeight:700,fontSize:15,margin:0,color:BRAND}}>Administration</p>
            <Inp type="password" placeholder="Adminpasswort" value={adminPw} onChange={e=>{setAdminPw(e.target.value);setAdminErr(false);}} onKeyDown={e=>e.key==="Enter"&&checkAdmin()} autoFocus style={{border:adminErr?"1.5px solid var(--color-border-danger)":undefined}}/>
            {adminErr&&<p style={{margin:0,fontSize:12,color:"var(--color-text-danger)",textAlign:"center"}}>Falsches Passwort</p>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setShowAdminModal(false);setAdminPw("");setAdminErr(false);}} style={{flex:1,padding:"9px",borderRadius:9,border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer",fontSize:14}}>Abbrechen</button>
              <PrimaryBtn onClick={checkAdmin} disabled={adminLoading||!adminPw} full>{adminLoading?"…":"Bestätigen"}</PrimaryBtn>
            </div>
          </div>
        </ModalWrap>
      )}

      <div style={{background:g.color,padding:"1.25rem 1.25rem 1rem",borderRadius:"0 0 20px 20px",marginBottom:"1.25rem"}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.7)",fontSize:13,padding:"0 0 10px",display:"flex",alignItems:"center",gap:4}}>← Alle Gruppen</button>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:42,height:42,borderRadius:12,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#fff",flexShrink:0}}>{g.icon}</div>
          <div>
            <p style={{fontWeight:800,fontSize:18,margin:0,color:"#fff"}}>{g.name}</p>
            <p style={{fontSize:12,margin:"2px 0 0",color:"rgba(255,255,255,0.65)"}}>{g.members.length} Mitglieder · {g.expenses.length} Ausgaben · {g.payments.length} Zahlungen</p>
          </div>
        </div>
      </div>

      <div style={{padding:"0 1rem 2rem"}}>
        <div style={{display:"flex",gap:8,marginBottom:"1.5rem",flexWrap:"wrap"}}>
          <NavBtn k="salden" label="Salden"/>
          <NavBtn k="ausgaben" label="Ausgaben"/>
          <NavBtn k="zahlungen" label="Zahlungen"/>
          <NavBtn k="mitglieder" label="Mitglieder"/>
          {!isAdmin
            ?<button onClick={()=>setShowAdminModal(true)} style={{padding:"7px 14px",borderRadius:20,background:"transparent",color:"var(--color-text-secondary)",border:"0.5px solid var(--color-border-secondary)",cursor:"pointer",fontSize:13}}>Administration</button>
            :<button onClick={()=>setIsAdmin(false)} style={{padding:"7px 14px",borderRadius:20,background:BRAND_LT,color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:700}}>Admin aktiv ×</button>
          }
        </div>

        {view==="salden"&&(
          <div>
            {g.members.length===0&&<p style={{color:"var(--color-text-secondary)",fontSize:14}}>Noch keine Mitglieder.</p>}
            <div style={{display:"grid",gap:10,marginBottom:"1.5rem"}}>
              {g.members.map(uid=>{const b=balances[uid]||0;const name=getName(uid);return(
                <div key={uid} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"var(--color-background-primary)",border:`1px solid ${BRAND}15`,borderRadius:12}}>
                  <Avatar name={name}/>
                  <span style={{flex:1,fontWeight:600,fontSize:15,color:"var(--color-text-primary)"}}>{name}</span>
                  <span style={{fontWeight:700,fontSize:15,color:b>0.005?"var(--color-text-success)":b<-0.005?"var(--color-text-danger)":"var(--color-text-secondary)"}}>{b>0.005?"+":""}{fmt(b)}</span>
                </div>
              );})}
            </div>
            {transactions.length>0&&<>
              <SectionLabel>Empfohlene Ausgleichszahlungen</SectionLabel>
              <div style={{display:"grid",gap:8}}>
                {transactions.map((t,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"var(--color-background-secondary)",border:`1px solid ${BRAND}10`,borderRadius:10,fontSize:14}}>
                    <Avatar name={getName(t.from)} size={28}/>
                    <span style={{color:"var(--color-text-primary)",fontWeight:600}}>{getName(t.from)}</span>
                    <span style={{color:"var(--color-text-secondary)",flex:1}}>→ {getName(t.to)}</span>
                    <span style={{fontWeight:700,color:"var(--color-text-primary)",marginRight:8}}>{fmt(t.amt)}</span>
                    <button onClick={()=>recordPayment(t.from,t.to,t.amt)} style={{padding:"5px 12px",borderRadius:8,fontSize:12,border:`1.5px solid ${BRAND}`,background:"transparent",cursor:"pointer",color:BRAND,fontWeight:600}}>Tilgen</button>
                  </div>
                ))}
              </div>
            </>}
            {transactions.length===0&&g.expenses.length>0&&<p style={{color:"var(--color-text-success)",fontSize:14,fontWeight:700}}>Alle Schulden ausgeglichen!</p>}
          </div>
        )}

        {view==="ausgaben"&&(
          <div>
            <button onClick={()=>setShowExpForm(v=>!v)} style={{marginBottom:"1rem",padding:"8px 18px",borderRadius:9,border:`1.5px solid ${BRAND}`,background:showExpForm?`${BRAND}10`:"transparent",color:BRAND,cursor:"pointer",fontSize:14,fontWeight:600}}>
              {showExpForm?"Abbrechen":"+ Ausgabe hinzufügen"}
            </button>
            {showExpForm&&(
              <Card style={{padding:"1rem",marginBottom:"1rem"}}>
                <div style={{display:"grid",gap:12}}>
                  <Inp placeholder="Beschreibung" value={expForm.desc} onChange={e=>setExpForm(f=>({...f,desc:e.target.value}))}/>
                  <Inp placeholder="Betrag (€)" value={expForm.amount} onChange={e=>setExpForm(f=>({...f,amount:e.target.value}))}/>
                  <div><SectionLabel>Bezahlt von</SectionLabel><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{g.members.map(uid=><ToggleBtn key={uid} active={expForm.payer===uid} onClick={()=>setExpForm(f=>({...f,payer:f.payer===uid?"":uid}))}>{getName(uid)}</ToggleBtn>)}</div></div>
                  <div><SectionLabel>Aufgeteilt unter <span style={{textTransform:"none",fontWeight:400,letterSpacing:0,opacity:0.6}}>(leer = alle)</span></SectionLabel><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{g.members.map(uid=><ToggleBtn key={uid} active={expForm.participants.includes(uid)} onClick={()=>togglePart(uid)}>{getName(uid)}</ToggleBtn>)}</div></div>
                  <PrimaryBtn onClick={addExpense} disabled={!expForm.desc.trim()||!expForm.amount||!expForm.payer} full>Speichern</PrimaryBtn>
                </div>
              </Card>
            )}
            {g.expenses.length===0&&<p style={{color:"var(--color-text-secondary)",fontSize:14}}>Noch keine Ausgaben.</p>}
            <div style={{display:"grid",gap:10}}>
              {[...g.expenses].reverse().map(exp=>{
                const parts=exp.participants.length>0?exp.participants.map(uid=>getName(uid)):g.members.map(uid=>getName(uid));
                return(
                  <div key={exp.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",background:"var(--color-background-primary)",border:`1px solid ${BRAND}15`,borderRadius:12}}>
                    <Avatar name={getName(exp.payer)}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{margin:0,fontWeight:600,fontSize:15,color:"var(--color-text-primary)"}}>{exp.desc}</p>
                      <p style={{margin:"2px 0 0",fontSize:12,color:"var(--color-text-secondary)"}}>{getName(exp.payer)} · {exp.date} · {parts.join(", ")}</p>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontWeight:700,fontSize:15,color:"var(--color-text-primary)",whiteSpace:"nowrap"}}>{fmt(exp.amount)}</span>
                      {isAdmin&&<button onClick={()=>removeExpense(exp.id)} style={{background:"none",border:"none",cursor:"pointer",color:BRAND_LT,fontSize:18,lineHeight:1,padding:"0 2px",fontWeight:700}}>×</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view==="zahlungen"&&(
          <div>
            <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1rem"}}>Über "Tilgen" in der Salden-Übersicht oder manuell eintragen.</p>
            <ManualPayment members={g.members} getName={getName} onSave={recordPayment}/>
            {g.payments.length===0&&<p style={{color:"var(--color-text-secondary)",fontSize:14,marginTop:"1rem"}}>Noch keine Zahlungen.</p>}
            {g.payments.length>0&&<>
              <SectionLabel>Zahlungshistorie</SectionLabel>
              <div style={{display:"grid",gap:8}}>
                {[...g.payments].reverse().map(p=>(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"var(--color-background-primary)",border:`1px solid ${BRAND}15`,borderRadius:10,fontSize:14}}>
                    <Avatar name={getName(p.from)} size={28}/>
                    <div style={{flex:1,minWidth:0}}>
                      <span style={{color:"var(--color-text-primary)",fontWeight:600}}>{getName(p.from)}</span>
                      <span style={{color:"var(--color-text-secondary)"}}> → {getName(p.to)}</span>
                      <span style={{display:"block",fontSize:11,color:"var(--color-text-tertiary)"}}>{p.date}</span>
                    </div>
                    <span style={{fontWeight:700,color:"var(--color-text-success)",marginRight:isAdmin?8:0}}>{fmt(p.amount)}</span>
                    {isAdmin&&<button onClick={()=>removePayment(p.id)} style={{background:"none",border:"none",cursor:"pointer",color:BRAND_LT,fontSize:18,lineHeight:1,padding:"0 2px",fontWeight:700}}>×</button>}
                  </div>
                ))}
              </div>
            </>}
          </div>
        )}

        {view==="mitglieder"&&(
          <div>
            <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1rem"}}>Mitglieder werden beim Erstellen der Gruppe festgelegt.</p>
            {g.members.map(uid=>{const name=getName(uid);return(
              <div key={uid} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"var(--color-background-primary)",border:`1px solid ${BRAND}15`,borderRadius:12,marginBottom:10}}>
                <Avatar name={name}/>
                <span style={{flex:1,fontWeight:600,fontSize:15,color:"var(--color-text-primary)"}}>{name}</span>
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [appAuthed, setAppAuthed] = useState(()=>sessionStorage.getItem("vapp_appauth")==="1");
  const [currentUser, setCurrentUser] = useState(()=>{
    const s=sessionStorage.getItem(SK_SESSION); return s?JSON.parse(s):null;
  });
  const [groups,setGroups]=useState(()=>{
    try { const v=localStorage.getItem(SK_GROUPS); return v?JSON.parse(v):[]; } catch { return []; }
  });
  const [users,setUsers]=useState(()=>{
    try { const v=localStorage.getItem(SK_USERS); return v?JSON.parse(v):[]; } catch { return []; }
  });
  const [activeGroup,setActiveGroup]=useState(null);

  useEffect(()=>{ try { localStorage.setItem(SK_GROUPS,JSON.stringify(groups)); } catch {} },[groups]);
  useEffect(()=>{ try { localStorage.setItem(SK_USERS,JSON.stringify(users)); } catch {} },[users]);

  const allUsers=[VORSTAND_USER,...users];

  const handleDelete=(groupId,userId)=>{
    if(groupId) setGroups(gs=>gs.filter(g=>g.id!==groupId));
    if(userId)  setUsers(us=>us.filter(u=>u.id!==userId));
  };
  const handleCreate=(group,user)=>{
    if(group) setGroups(gs=>[...gs,group]);
    if(user)  setUsers(us=>[...us,user]);
  };

  const login=user=>{ sessionStorage.setItem(SK_SESSION,JSON.stringify(user)); setCurrentUser(user); };
  const logout=()=>{ sessionStorage.removeItem(SK_SESSION); setCurrentUser(null); };

  if(!appAuthed) return <AppLoginScreen onSuccess={()=>{sessionStorage.setItem("vapp_appauth","1");setAppAuthed(true);}}/>;
  if(!currentUser) return <UserLoginScreen users={users} onLogin={login}/>;

  if(activeGroup){
    const current=groups.find(g=>g.id===activeGroup.id)||activeGroup;
    return <GroupDetail group={current} allUsers={allUsers} onUpdate={ng=>setGroups(gs=>gs.map(g=>g.id===ng.id?ng:g))} onBack={()=>setActiveGroup(null)} currentUser={currentUser}/>;
  }
  return <GroupList groups={groups} users={users} currentUser={currentUser} onEnter={setActiveGroup} onCreateGroup={handleCreate} onDeleteGroup={handleDelete} onLogout={logout}/>;
}
