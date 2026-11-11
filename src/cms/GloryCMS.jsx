import React, {useEffect,useState,createContext,useContext} from "react";
import {createPortal} from "react-dom";
import {HashRouter,Routes,Route,Navigate,NavLink,Link,useNavigate,useParams,useLocation} from "react-router-dom";
import {onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signInWithPopup,GoogleAuthProvider,signOut} from "firebase/auth";
import {ref,onValue,get,set,update,push,remove,query,orderByChild,equalTo} from "firebase/database";
import {normalizeSong as norm} from "./songData";
import {saveSongToFirebase} from "./songRepository";
import SongEditorWorkspace from "./SongEditorWorkspace";
import {auth,database} from "../firebaseConfig";
import "./cms.css";
const Ctx=createContext(null), useAuth=()=>useContext(Ctx);
const perms={SUPER_ADMIN:["read","create","edit","publish","archive","taxonomy","reports","resolve","roles","announce","settings","dailyVerses"],ADMIN:["read","create","edit","publish","archive","taxonomy","reports","resolve","announce","settings","dailyVerses"],CONTENT_MANAGER:["read","create","edit","reports"],USER:[]};
const can=(r,p)=>(perms[r]||[]).includes(p), labels={SUPER_ADMIN:"Super Admin",ADMIN:"Admin",CONTENT_MANAGER:"Content Manager",USER:"Member"};
const arr=v=>Array.isArray(v)?v:v&&typeof v==="object"?Object.values(v):[];
const stamp=()=>Date.now();
function usePublicSongs(enabled=true){
 const [value,setValue]=useState(null),[error,setError]=useState("");
 useEffect(()=>{
  if(!enabled)return;
  const publicQuery=query(ref(database,"songs"),orderByChild("statusVisibility"),equalTo("PUBLISHED_PUBLIC"));
  return onValue(publicQuery,s=>{setValue(s.val());setError("");},e=>setError(e.message));
 },[enabled]);
 return {value,error};
}
function useData(path,enabled=true){const [value,setValue]=useState(null),[error,setError]=useState("");useEffect(()=>{if(!enabled)return;return onValue(ref(database,path),s=>{setValue(s.val());setError("");},e=>setError(e.message));},[path,enabled]);return {value,error};}
function Provider({children}){const [user,setUser]=useState(null),[role,setRole]=useState("USER"),[loading,setLoading]=useState(true);useEffect(()=>onAuthStateChanged(auth,async u=>{setUser(u);if(u){try{const [r,p]=await Promise.all([get(ref(database,"roles/"+u.uid)),get(ref(database,"users/"+u.uid))]);let x=r.val(),profile=p.val(),resolvedRole=String((typeof x==="string"?x:x?.role)||"USER").toUpperCase();setRole(resolvedRole);if(!profile){try{await set(ref(database,"users/"+u.uid),{uid:u.uid,email:u.email||"",displayName:u.displayName||u.email?.split("@")[0]||"Glory member",createdAt:stamp(),lastSeenAt:stamp()});}catch(error){console.warn("Could not create the user profile; check Firebase users-path rules.",error.message);}}else{try{await update(ref(database,"users/"+u.uid),{email:u.email||profile.email||"",displayName:u.displayName||profile.displayName||u.email?.split("@")[0]||"Glory member",lastSeenAt:stamp()});}catch(error){console.warn("Could not refresh the user profile; check Firebase users-path rules.",error.message);}}}catch{setRole("USER");}}else setRole("USER");setLoading(false);}),[]);return <Ctx.Provider value={{user,role,loading,can:p=>can(role,p),logout:()=>signOut(auth)}}>{children}</Ctx.Provider>;}
function Login(){const {user,role}=useAuth(),nav=useNavigate(),[email,E]=useState(""),[password,P]=useState(""),[mode,M]=useState(false),[error,Err]=useState(""),[busy,B]=useState(false);if(user)return <Navigate to={can(role,"read")?"/admin/dashboard":"/"} replace/>;const run=async fn=>{B(true);Err("");try{await fn();nav("/admin/dashboard");}catch(e){Err(e.message);}finally{B(false);}};return <main className="login-screen"><section className="login-art"><div className="brand-mark">G</div><span className="eyebrow">GLORY CONTENT STUDIO</span><h1>Every song.<br/>In harmony.</h1><p>A thoughtful workspace for worship lyrics, chords and the people who care for them.</p><small>GLORY · WORSHIP LIBRARY</small></section><section className="login-panel"><div className="login-form"><span className="eyebrow">WELCOME</span><h2>{mode?"Create your account":"Sign in to Glory"}</h2><p className="muted">Use your authorized content account to continue.</p><button className="secondary-btn full" disabled={busy} onClick={()=>run(()=>signInWithPopup(auth,new GoogleAuthProvider()))}>G　Continue with Google</button><div className="or">or use email</div><form onSubmit={e=>{e.preventDefault();run(()=>mode?createUserWithEmailAndPassword(auth,email,password):signInWithEmailAndPassword(auth,email,password));}}><label>Email<input type="email" value={email} onChange={e=>E(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>P(e.target.value)} minLength="6" required/></label>{error&&<p className="error-box">{error}</p>}<button className="primary-btn full" disabled={busy}>{busy?"Please wait…":mode?"Create account":"Sign in"}</button></form><button className="text-btn" onClick={()=>M(!mode)}>{mode?"Already registered? Sign in":"Create account"}</button><small className="tiny-note">Account creation does not grant CMS access. An administrator must assign a role.</small></div></section></main>;}
function Guard({permission="read",children}){const {user,role,loading}=useAuth();if(loading)return <div className="boot">Loading Glory…</div>;if(!user)return <Navigate to="/login" replace/>;if(!can(role,permission))return <div className="denied"><h2>Access not assigned</h2><p>Your account is signed in, but it does not have permission to use this workspace.</p><button className="primary-btn" onClick={()=>signOut(auth)}>Sign out</button></div>;return children;}
const groups=[["WORKSPACE",[["dashboard","Overview","◫"],["songs","Song library","♫"],["reports","Corrections","◎"]]],["LIBRARY SETUP", [["taxonomy","Categories & languages","▦"],["daily-verses","Daily verses","✦"],["announcements","Announcements","◈"]]],["ADMINISTRATION", [["users","People & roles","♙"],["settings","System settings","⚙"]]]];
function Shell({children}){
 const {user,role,logout}=useAuth(),[open,O]=useState(false),[theme,setTheme]=useState(()=>{try{return localStorage.getItem("glory-cms-theme")==="dark"?"dark":"light";}catch{return "light";}}),loc=useLocation(),seg=loc.pathname.split("/")[2]||"dashboard",titles={dashboard:"Overview",songs:"Song library",reports:"Corrections",taxonomy:"Categories & languages",users:"People & roles",announcements:"Announcements",settings:"System settings","daily-verses":"Daily verses",new:"Create song",edit:"Edit song",history:"Version history"};
 useEffect(()=>{try{localStorage.setItem("glory-cms-theme",theme);}catch{}},[theme]);
 useEffect(()=>{O(false);},[loc.pathname]);
 return <div className="shell" data-theme={theme}>
  <aside className={"sidebar "+(open?"show":"")}>
   <div className="brand"><div className="brand-mark small">G</div><div><b>Glory</b><small>CONTENT STUDIO</small></div><button className="close" aria-label="Close navigation" onClick={()=>O(false)}>×</button></div>
   <div className="workspace"><span className="workspace-dot"/> Worship library <span className="workspace-chevron">⌄</span></div>
   <nav className="sidebar-nav" aria-label="CMS navigation">{groups.map(g=><div className="nav-group" key={g[0]}><small>{g[0]}</small>{g[1].filter(x=>(x[0]!=="users"||can(role,"roles"))&&(x[0]!=="daily-verses"||can(role,"dailyVerses"))).map(x=><NavLink onClick={()=>O(false)} className={({isActive})=>isActive?"nav active":"nav"} to={"/admin/"+x[0]} key={x[0]}><i aria-hidden="true">{x[2]}</i><span>{x[1]}</span></NavLink>)}</div>)}</nav>
   <div className="side-bottom"><div className="sidebar-help"><b>Keep the library in tune.</b><Link to="/admin/reports">Review corrections <span>→</span></Link></div><div className="profile"><span className="profile-avatar">{(user.displayName||user.email||"G")[0].toUpperCase()}</span><div className="profile-copy"><b>{user.displayName||user.email}</b><small>{labels[role]||role}</small></div><button className="signout-btn" onClick={logout} aria-label="Sign out" title="Sign out"><span>↗</span><small>Sign out</small></button></div></div>
  </aside>
  {open&&<button className="scrim" aria-label="Close navigation" onClick={()=>O(false)}/>}
  <main className="main"><header className="topbar"><button className="menu" aria-label="Open navigation" onClick={()=>O(true)}>☰</button><span className="breadcrumb">Glory <span>/</span> <b>{titles[seg]||"Workspace"}</b></span><div className="topbar-actions"><small className="connection-status"><i/> Firebase connected</small><button className="theme-toggle" type="button" onClick={()=>setTheme(t=>t==="light"?"dark":"light")} aria-label={theme==="light"?"Switch to dark theme":"Switch to light theme"} title={theme==="light"?"Dark theme":"Light theme"}><span>{theme==="light"?"☾":"☀"}</span><small>{theme==="light"?"Dark":"Light"}</small></button></div></header><div className="page">{children}</div></main>
 </div>;
}
function Heading({title,sub,action}){return <div className="heading"><div><small>GLORY WORKSPACE</small><h1>{title}</h1><p>{sub}</p></div>{action}</div>;}
function Empty({title,text}){return <div className="empty"><b>♫</b><h3>{title}</h3><p>{text}</p></div>;}
function Dashboard(){const {role}=useAuth(),{value:s}=useData("songs"),{value:r}=useData("reports"),{value:roles}=useData("roles",role==="SUPER_ADMIN"),songs=Object.entries(s||{}).map(([id,v])=>norm(id,v)),reports=Object.values(r||{}),pending=reports.filter(x=>!["RESOLVED","REJECTED"].includes(x.status||"OPEN")).length,pub=songs.filter(x=>x.status==="PUBLISHED").length,man=Object.values(roles||{}).filter(x=>["ADMIN","CONTENT_MANAGER"].includes(typeof x==="string"?x:x?.role)).length,recent=[...songs].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,5);return <><Heading title="Good work starts here." sub="A clear view of the Glory library and the work that needs your attention." action={<Link className="primary-btn" to="/admin/songs/new">＋ New song</Link>}/><div className="stats">{[["Total songs",songs.length,"♫"],["Published",pub,"✓"],["Open reports",pending,"◎"],["Content managers",man,"♙"]].map(x=><div className="stat" key={x[0]}><i>{x[2]}</i><small>{x[0]}</small><strong>{x[1]}</strong></div>)}</div><div className="cols"><section className="panel"><div className="panel-title"><h3>Recently updated</h3><Link to="/admin/songs">View library ↗</Link></div>{recent.length?recent.map(x=><Link className="recent" key={x.firebaseKey} to={"/admin/songs/"+x.firebaseKey+"/edit"}><b>♫</b><span><strong>{x.songTitle}</strong><small>{x.songLanguage} · {x.songCategory}</small></span><em className={"pill "+x.status.toLowerCase()}>{x.status}</em></Link>):<Empty title="Your library is ready" text="Create your first song or connect existing songs in Firebase."/>}</section><section className="panel"><div className="panel-title"><h3>Content health</h3></div><div className="health"><strong>{songs.filter(x=>x.status==="DRAFT"||x.status==="REVIEW").length}</strong><span>Drafts & in review</span></div><div className="health"><strong>{pending}</strong><span>Reports awaiting review</span></div><Link className="text-link" to="/admin/reports">Open correction queue →</Link></section></div><div className="quick"><Link to="/admin/songs/new">＋　Add a song</Link><Link to="/admin/reports">◎　Review corrections</Link><Link to="/admin/announcements">◈　Publish an update</Link></div></>;}
function Songs(){
 const {value:songsData,error}=useData("songs"),{role}=useAuth();
 const [q,Q]=useState(""),[status,S]=useState("ALL"),[lang,L]=useState("ALL"),[category,C]=useState("ALL"),[key,K]=useState("ALL");
 const [sort,Sort]=useState("title"),[page,Page]=useState(1),[pageSize,PageSize]=useState(50),[selected,Select]=useState([]);
 const [openActionId,setOpenActionId]=useState(null),[actionMenuPosition,setActionMenuPosition]=useState({top:0,left:0});
 const [busy,B]=useState(false),[progress,Progress]=useState("");
 const all=Object.entries(songsData||{}).map(([id,v])=>norm(id,v));
 const langs=[...new Set(all.map(x=>x.songLanguage).filter(Boolean))].sort();
 const categories=[...new Set(all.map(x=>x.songCategory).filter(Boolean))].sort();
 const keys=[...new Set(all.map(x=>x.originalKey).filter(Boolean))].sort();
 const term=q.trim().toLocaleLowerCase();
 const rows=all.filter(x=>
  (status==="ALL"||x.status===status)&&
  (lang==="ALL"||x.songLanguage===lang)&&
  (category==="ALL"||x.songCategory===category)&&
  (key==="ALL"||x.originalKey===key)&&
  (!term||[x.songTitle,x.songNo,x.artist,x.songLanguage,x.songCategory,x.originalKey].join(" ").toLocaleLowerCase().includes(term))
 ).sort((a,b)=>{
  if(sort==="number")return Number(a.songNo||0)-Number(b.songNo||0)||String(a.songTitle).localeCompare(String(b.songTitle));
  if(sort==="updated")return Number(b.updatedAt||0)-Number(a.updatedAt||0);
  if(sort==="language")return String(a.songLanguage||"").localeCompare(String(b.songLanguage||""))||String(a.songTitle).localeCompare(String(b.songTitle));
  return String(a.songTitle||"").localeCompare(String(b.songTitle||""),undefined,{sensitivity:"base"});
 });
 const pageCount=Math.max(1,Math.ceil(rows.length/pageSize));
 const visible=rows.slice((page-1)*pageSize,page*pageSize);
 const selectedVisible=visible.length>0&&visible.every(x=>selected.includes(x.firebaseKey));
 useEffect(()=>{Page(1);Select([]);},[q,status,lang,category,key,sort,pageSize]);
 useEffect(()=>{
  const closeOnOutside=e=>{if(!e.target.closest(".song-row-actions")&&!e.target.closest(".song-action-menu"))setOpenActionId(null);};
  const closeOnEscape=e=>{if(e.key==="Escape")setOpenActionId(null);};
  document.addEventListener("pointerdown",closeOnOutside);
  document.addEventListener("keydown",closeOnEscape);
  return ()=>{document.removeEventListener("pointerdown",closeOnOutside);document.removeEventListener("keydown",closeOnEscape);};
 },[]);
 useEffect(()=>{if(page>pageCount)Page(pageCount);},[page,pageCount]);
 const toggleOne=(id,checked)=>Select(old=>checked?[...new Set([...old,id])]:old.filter(x=>x!==id));
 const togglePage=checked=>Select(old=>checked?[...new Set([...old,...visible.map(x=>x.firebaseKey)])]:old.filter(id=>!visible.some(x=>x.firebaseKey===id)));
 const archiveSong=async song=>{
  const snap=await get(ref(database,"songs/"+song.firebaseKey));
  if(!snap.exists())throw new Error("Song no longer exists: "+song.songTitle);
  const existing=norm(song.firebaseKey,snap.val());
  await saveSongToFirebase({database,songId:song.firebaseKey,existing,edited:{...existing,status:"ARCHIVED",visibility:"PRIVATE"},uid:auth.currentUser.uid,changeNote:"Archived from Song Library"});
 };
 const archiveSelected=async()=>{
  if(!selected.length||busy)return;
  const targets=all.filter(x=>selected.includes(x.firebaseKey));
  if(!window.confirm("Archive "+targets.length+" selected song(s)? This changes status and visibility; it does not delete song data."))return;
  B(true);Progress("Preparing bulk archive…");let done=0,failed=[];
  try{
   for(const song of targets){
    Progress("Archiving "+(done+1)+" of "+targets.length+": "+song.songTitle);
    try{await archiveSong(song);done++;}catch(e){failed.push(song.songTitle+": "+e.message);}
   }
   Select([]);
   if(failed.length)alert(done+" song(s) archived. "+failed.length+" failed:\n"+failed.slice(0,8).join("\n"));
   else alert(done+" song(s) archived successfully.");
  }finally{B(false);Progress("");}
 };
 const singleArchive=async song=>{
  if(!window.confirm("Archive "+song.songTitle+"? The song will remain in Firebase and can be edited later."))return;
  B(true);try{await archiveSong(song);}catch(e){alert(e.message);}finally{B(false);}
 };
 const from=(page-1)*pageSize+1,to=Math.min(page*pageSize,rows.length);
 return <>
  <Heading title="Song library" sub="Search, organize and manage your worship catalogue." action={can(role,"create")&&<Link className="primary-btn" to="/admin/songs/new">＋ Add song</Link>}/>
  <section className="panel table-panel song-library-panel">
   <div className="song-library-toolbar">
    <label className="song-library-search"><span>⌕</span><input aria-label="Search songs" placeholder="Search title, song number, artist, language…" value={q} onChange={e=>Q(e.target.value)}/>{q&&<button type="button" onClick={()=>Q("")} aria-label="Clear search">×</button>}</label>
    <div className="song-library-filters">
     <select aria-label="Filter by status" value={status} onChange={e=>S(e.target.value)}><option value="ALL">All statuses</option>{["DRAFT","REVIEW","PUBLISHED","ARCHIVED"].map(x=><option key={x} value={x}>{x}</option>)}</select>
     <select aria-label="Filter by language" value={lang} onChange={e=>L(e.target.value)}><option value="ALL">All languages</option>{langs.map(x=><option key={x}>{x}</option>)}</select>
     <select aria-label="Filter by category" value={category} onChange={e=>C(e.target.value)}><option value="ALL">All categories</option>{categories.map(x=><option key={x}>{x}</option>)}</select>
     <select aria-label="Filter by key" value={key} onChange={e=>K(e.target.value)}><option value="ALL">All keys</option>{keys.map(x=><option key={x}>{x}</option>)}</select>
    </div>
    <div className="song-library-toolbar-bottom">
     <label className="song-library-sort">Sort by <select value={sort} onChange={e=>Sort(e.target.value)}><option value="title">Title A–Z</option><option value="number">Song number</option><option value="language">Language</option><option value="updated">Recently updated</option></select></label>
     <span className="song-library-count">{rows.length.toLocaleString()} matching songs · {all.length.toLocaleString()} total</span>
    </div>
   </div>
   {error&&<p className="error-box">{error}</p>}
   {!songsData&& !error&&<div className="song-index-empty"><b>Loading song library…</b></div>}
   {songsData&&Object.keys(songsData).length===0&&<Empty title="No songs found" text="Your existing /songs collection is empty."/>}
   {songsData&&Object.keys(songsData).length>0&&<>
    {can(role,"archive")&&selected.length>0&&<div className="song-bulk-bar"><span>{selected.length} selected</span><button className="secondary-btn" onClick={()=>Select([])} disabled={busy}>Clear selection</button><button className="danger-btn" onClick={archiveSelected} disabled={busy}>{busy?"Working…":"Archive selected"}</button></div>}
    {progress&&<div className="song-bulk-progress">{progress}</div>}
    <div className="scroll song-library-table-wrap"><table className="song-library-table"><thead><tr>{can(role,"archive")&&<th className="song-select-cell"><input type="checkbox" aria-label="Select all songs on this page" checked={selectedVisible} onChange={e=>togglePage(e.target.checked)}/></th>}<th>SONG</th><th>LANGUAGE</th><th>CATEGORY</th><th>KEY</th><th>STATUS</th><th>UPDATED</th><th>ACTIONS</th></tr></thead><tbody>
     {visible.map(x=><tr key={x.firebaseKey}>{can(role,"archive")&&<td className="song-select-cell"><input type="checkbox" aria-label={"Select "+x.songTitle} checked={selected.includes(x.firebaseKey)} onChange={e=>toggleOne(x.firebaseKey,e.target.checked)}/></td>}<td className="song-title-cell"><b>{x.songTitle}</b><small>#{x.songNo||"—"}{x.artist?" · "+x.artist:""}</small></td><td>{x.songLanguage}</td><td>{x.songCategory}</td><td>{x.originalKey}</td><td><em className={"pill "+String(x.status||"DRAFT").toLowerCase()}>{x.status||"DRAFT"}</em></td><td>{x.updatedAt?new Date(x.updatedAt).toLocaleDateString():"—"}</td><td><div className="song-row-actions"><button type="button" className="song-row-action-trigger" aria-label={"Actions for "+x.songTitle} aria-expanded={openActionId===x.firebaseKey} onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();const menuHeight=can(role,"archive")?126:92;const top=rect.bottom+menuHeight+8>window.innerHeight?Math.max(8,rect.top-menuHeight-8):rect.bottom+6;const left=Math.max(8,Math.min(window.innerWidth-164,rect.right-154));setActionMenuPosition({top,left});setOpenActionId(current=>current===x.firebaseKey?null:x.firebaseKey);}}>•••</button>{openActionId===x.firebaseKey&&createPortal(<div className="song-action-menu" style={actionMenuPosition}><Link to={"/admin/songs/"+x.firebaseKey+"/edit"} onClick={()=>setOpenActionId(null)}>Edit song</Link><Link to={"/admin/songs/"+x.firebaseKey+"/history"} onClick={()=>setOpenActionId(null)}>Version history</Link>{can(role,"archive")&&<button onClick={()=>{setOpenActionId(null);singleArchive(x);}} disabled={busy}>Archive</button>}</div>,document.querySelector(".shell")||document.body)}</div></td></tr>)}
    </tbody></table></div>
    {!visible.length&&<Empty title="No matching songs" text="Change your search or filters."/>}
    <div className="song-library-pagination"><span>Showing {rows.length?from:0}–{to} of {rows.length.toLocaleString()} matching songs</span><div className="song-pagination-controls"><label>Rows <select value={pageSize} onChange={e=>PageSize(Number(e.target.value))}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><button className="secondary-btn" disabled={page<=1} onClick={()=>Page(p=>p-1)}>Previous</button><span>Page {page} of {pageCount}</span><button className="secondary-btn" disabled={page>=pageCount} onClick={()=>Page(p=>p+1)}>Next</button></div></div>
   </>}
  </section>
 </>;
}
function SongEditor({create=false}){const {id}=useParams(),nav=useNavigate(),{user,role}=useAuth(),{value:remote}=useData("songs/"+(id||"none"),!!id),[f,F]=useState(null),[sections,T]=useState([]),[note,N]=useState(""),[error,E]=useState(""),[busy,B]=useState(false),[pendingSave,PS]=useState(null),[activeTab,AT]=useState("info");useEffect(()=>{if(remote&&id){const x=norm(id,remote);F(x);T(x.sections||[]);}},[remote,id]);useEffect(()=>{if(create)F({songNo:"",songTitle:"",songLanguage:"English",songCategory:"Worship",originalKey:"C",tempo:"",artist:"",author:"",composer:"",description:"",status:"DRAFT",visibility:"PRIVATE",version:0});},[create]);if(!f)return <div className="boot">Loading song…</div>;const field=(k,v)=>F({...f,[k]:v});const save=async publish=>{
 if(!f.songTitle?.trim()){E("Song title is required.");return;}
 const edited={...f,sections:sections,status:publish?"PUBLISHED":f.status,visibility:publish?"PUBLIC":f.visibility};
 if(pendingSave&&JSON.stringify(edited)!==JSON.stringify(pendingSave.edited)){E("A previous save is unfinished. Retry that save without changing the song, then make your next edits.");return;}
 B(true);E("");
 try{
  let operation=pendingSave;
  if(!operation){
   const songId=create?push(ref(database,"songs")).key:id;
   if(!songId)throw new Error("Could not allocate a song ID.");
   const operationId=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"op-"+Date.now()+"-"+Math.random().toString(16).slice(2);
   operation={songId,operationId,preparedAt:stamp(),edited,existing:create?null:f,changeNote:note};
   PS(operation);
  }
  const result=await saveSongToFirebase({database,songId:operation.songId,existing:operation.existing,edited:operation.edited,uid:user.uid,changeNote:operation.changeNote,operationId:operation.operationId,preparedAt:operation.preparedAt});
  PS(null);F(norm(result.songId,result.song));T(result.song.sections||[]);
  if(create)nav("/admin/songs/"+result.songId+"/edit");
 }catch(e){E(e.message);}finally{B(false);}
};return <><Heading title={create?"Create a song":"Edit song"} sub="Complete each step in its own tab. Changes stay available as you move between tabs." action={<Link className="secondary-btn" to="/admin/songs">← Library</Link>}/>
<div className="song-editor-tabs" role="tablist" aria-label="Song editor steps">
<button type="button" role="tab" aria-selected={activeTab==="info"} className={activeTab==="info"?"active":""} onClick={()=>AT("info")}><span>01</span>Song information</button>
<button type="button" role="tab" aria-selected={activeTab==="lyrics"} className={activeTab==="lyrics"?"active":""} onClick={()=>AT("lyrics")}><span>02</span>Lyrics sections</button>
<button type="button" role="tab" aria-selected={activeTab==="chords"} className={activeTab==="chords"?"active":""} onClick={()=>AT("chords")}><span>03</span>Chord adding</button>
</div>
<div className="editor-grid song-editor-tab-content"><div>
{activeTab==="info"&&<section className="panel editor"><h3>01　Song information</h3><div className="form-grid">{[["songTitle","Song title"],["songNo","Song number"],["songLanguage","Language"],["songCategory","Category"],["originalKey","Original key"],["tempo","Tempo (BPM)"],["artist","Artist"],["author","Lyric writer"],["composer","Composer"],["copyright","Copyright"],["year","Year"],["coverImageUrl","Cover image URL"]].map(([k,l])=><label key={k}>{l}<input value={f[k]||""} onChange={e=>field(k,e.target.value)}/></label>)}<label className="wide">Description<textarea rows="2" value={f.description||""} onChange={e=>field("description",e.target.value)}/></label><label className="wide">Tags (comma separated)<input value={arr(f.tags).join(", ")} onChange={e=>field("tags",e.target.value.split(",").map(v=>v.trim()).filter(Boolean))}/></label><label className="wide">Aliases (comma separated)<input value={arr(f.aliases).join(", ")} onChange={e=>field("aliases",e.target.value.split(",").map(v=>v.trim()).filter(Boolean))}/></label><label className="wide">Preferred keys (comma separated)<input value={arr(f.preferredKeys).join(", ")} onChange={e=>field("preferredKeys",e.target.value.split(",").map(v=>v.trim()).filter(Boolean))}/></label></div></section>}
{(activeTab==="lyrics"||activeTab==="chords")&&<section className="panel editor"><h3>{activeTab==="lyrics"?"02　Lyrics sections":"03　Chord adding"}</h3><p className="hint">{activeTab==="lyrics"?"Add and organize verses, choruses and lyric lines here.":"Select a chord, then click its position in the lyrics below. Your lyrics remain editable in tab 02."}</p><SongEditorWorkspace value={sections} onChange={T} activeTab={activeTab}/></section>}
</div>
<aside><section className="panel publish"><small>PUBLISHING</small><h3>Ready to share?</h3><label>Status<select value={f.status} onChange={e=>field("status",e.target.value)}>{["DRAFT","REVIEW","PUBLISHED","ARCHIVED"].map(x=><option>{x}</option>)}</select></label><label>Visibility<select value={f.visibility} onChange={e=>field("visibility",e.target.value)}><option>PRIVATE</option><option>PUBLIC</option></select></label><label>Change note<input value={note} onChange={e=>N(e.target.value)} placeholder="What changed?"/></label>{error&&<p className="error-box">{error}</p>}<button className="primary-btn full" disabled={busy||!can(role,create?"create":"edit")} onClick={()=>save(false)}>{busy?"Saving…":"Save draft / changes"}</button>{can(role,"publish")&&<button className="publish-btn full" disabled={busy} onClick={()=>save(true)}>✓ Save & publish</button>}<small className="hint">Publishing requires matching RTDB security rules.</small></section><section className="panel preview"><small>LIVE PREVIEW</small><h3>{f.songTitle||"Song title"}</h3><p>{f.songLanguage} · {f.originalKey} {f.tempo? "· "+f.tempo+" BPM":""}</p>{sections.map((s,i)=><section key={i}><b>{s.title}</b>{s.lines.map((l,j)=><p key={j}>{l.text}</p>)}</section>)}</section></aside></div></>;}
function History(){const {id}=useParams(),{value:song}=useData("songs/"+id),{value:v}=useData("songVersions/"+id),items=Object.entries(v||{}).map(([k,x])=>({...x,key:k})).sort((a,b)=>(b.changedAt||0)-(a.changedAt||0));return <><Heading title="Version history" sub={song?.songTitle||"Song revision log"} action={<Link className="secondary-btn" to={"/admin/songs/"+id+"/edit"}>← Editor</Link>}/><section className="panel history">{items.length?items.map(x=><div key={x.key}><b>Version {x.version||x.key}</b><p>{x.changeNote||"Song updated"}</p><small>{x.changedAt?new Date(x.changedAt).toLocaleString():""} · {x.changedBy||"Editor"}</small></div>):<Empty title="No history yet" text="Snapshots appear after songs are saved in the CMS."/>}</section></>;}
function Reports(){const {value}=useData("reports"),{can:allowed}=useAuth(),[filter,F]=useState("OPEN"),[selected,S]=useState(null),items=Object.entries(value||{}).map(([id,x])=>({...x,id})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)),rows=items.filter(x=>filter==="ALL"||(x.status||"OPEN")===filter);const status=async (x,s)=>update(ref(database,"reports/"+x.id),{status:s,reviewedBy:auth.currentUser.uid,updatedAt:stamp(),...(s==="RESOLVED"?{resolvedBy:auth.currentUser.uid,resolvedAt:stamp()}:{})});return <><Heading title="Correction queue" sub="Review lyric, chord and metadata issues reported by listeners."/><div className="tabs">{["OPEN","INVESTIGATING","RESOLVED","REJECTED","ALL"].map(x=><button className={filter===x?"active":""} onClick={()=>F(x)}>{x}</button>)}</div><div className="report-grid"><section className="panel report-list">{rows.map(x=><button className={selected?.id===x.id?"selected":""} onClick={()=>S(x)} key={x.id}><small>{x.type||"SONG REPORT"} · {x.status||"OPEN"}</small><b>{x.songTitle||x.songName||"Song correction"}</b><p>{x.message||x.description||"No details"}</p></button>)}{!rows.length&&<Empty title="Queue is clear" text="No reports in this view."/>}</section><section className="panel report-detail">{selected?<><small>REPORT DETAILS</small><h2>{selected.songTitle||selected.songName||"Song correction"}</h2><p>{selected.message||selected.description}</p><dl><dt>Song ID</dt><dd>{selected.songId||"—"}</dd><dt>Submitted by</dt><dd>{selected.userId||"—"}</dd><dt>Report ID</dt><dd>{selected.id}</dd></dl>{allowed("resolve")&&<div className="actions"><button className="secondary-btn" onClick={()=>status(selected,"INVESTIGATING")}>Investigating</button><button className="primary-btn" onClick={()=>status(selected,"RESOLVED")}>Resolve</button><button className="danger-btn" onClick={()=>status(selected,"REJECTED")}>Reject</button></div>}{selected.songId&&<Link to={"/admin/songs/"+selected.songId+"/edit"}>Open related song ↗</Link>}</>:<Empty title="Select a report" text="Choose a report to inspect and update its status."/>}</section></div></>;}
function Taxonomy(){const {value:c}=useData("appConfig"),[cat,C]=useState(""),[lang,L]=useState("");const add=async(k,v,clear)=>{if(!v.trim())return;await set(ref(database,"appConfig/"+k),[...new Set([...arr(c?.[k]||(k==="categories"?["Worship","Praise","Christmas"]:["English","Hindi","Marathi","Gujarati","Gamit"])),v.trim()])]);clear("");};return <><Heading title="Categories & languages" sub="Manage the taxonomy used by the Glory catalogue."/><div className="cols">{[["Categories","categories",cat,C],["Languages","languages",lang,L]].map(([title,key,val,setter])=><section className="panel taxonomy"><h3>{title}</h3>{arr(c?.[key]||(key==="categories"?["Worship","Praise","Christmas"]:["English","Hindi","Marathi","Gujarati","Gamit"])).map(x=><p>{x}<small>ACTIVE</small></p>)}<form onSubmit={e=>{e.preventDefault();add(key,val,setter);}}><input value={val} onChange={e=>setter(e.target.value)} placeholder={"Add "+title.toLowerCase().slice(0,-1)}/><button className="primary-btn">＋ Add</button></form></section>)}</div><p className="notice">Stored under appConfig. Confirm RTDB rules permit authorized managers to update these paths.</p></>;}
function Users(){const {value:u,error:userError}=useData("users"),{value:r,error:roleError}=useData("roles"),{user}=useAuth();const ids=new Set([...Object.keys(u||{}),...Object.keys(r||{})]);const rows=[...ids].map(uid=>{const profile=u?.[uid]||{},rawRole=r?.[uid],assignedRole=(typeof rawRole==="string"?rawRole:rawRole?.role)||"USER";return {uid,...profile,role:String(assignedRole).toUpperCase()};}).sort((a,b)=>(a.displayName||a.email||a.uid).localeCompare(b.displayName||b.email||b.uid));const change=async(x,v)=>{if(x.uid===user.uid||x.role==="SUPER_ADMIN")return;try{await update(ref(database,"roles/"+x.uid),{role:v,updatedAt:stamp(),updatedBy:user.uid});}catch(e){alert("Could not update role. Check Firebase rules: "+e.message);}};return <><Heading title="People & roles" sub="Only the platform owner can assign administrator and contributor access." action={<span className="pill">{rows.length} {rows.length===1?"person":"people"}</span>}/><div className="notice">SUPER_ADMIN is the protected platform-owner role. You can assign ADMIN, CONTENT_MANAGER or USER to other accounts. Existing Android user profiles and favorites remain under the same Firebase paths.</div>{(userError||roleError)&&<p className="error-box">Could not load account records: {userError||roleError}</p>}<section className="panel table-panel" style={{marginTop:14}}><div className="panel-title" style={{padding:"16px 16px 0"}}><h3>People</h3><small>{rows.length} registered accounts</small></div><div className="scroll"><table><thead><tr><th>PERSON</th><th>EMAIL</th><th>ROLE</th><th>USER ID</th></tr></thead><tbody>{rows.map(x=><tr key={x.uid}><td><b>{x.displayName||"Glory member"}</b></td><td>{x.email||"—"}</td><td>{x.role==="SUPER_ADMIN"||x.uid===user.uid?<span className="pill">{labels[x.role]||x.role}{x.uid===user.uid?" · You":""}</span>:<select value={x.role} onChange={e=>change(x,e.target.value)}>{["USER","CONTENT_MANAGER","ADMIN"].map(v=><option key={v} value={v}>{labels[v]||v}</option>)}</select>}</td><td title={x.uid}>{x.uid.slice(0,12)}…</td></tr>)}</tbody></table></div>{!rows.length&&<Empty title="No contributors yet" text="Accounts appear after they sign in and their profiles are saved in Firebase. Check the SUPER_ADMIN role and database read rules if this list is unexpectedly empty."/>}</section></>;}
function Announcements(){const [title,T]=useState(""),[body,B]=useState(""),[kind,K]=useState("ANNOUNCEMENT"),[error,E]=useState("");const {value}=useData("announcements");const publish=async e=>{e.preventDefault();E("");try{const r=push(ref(database,"announcements"));await set(r,{title,body,type:kind,status:"PUBLISHED",createdAt:stamp(),createdBy:auth.currentUser.uid});T("");B("");}catch(e){E(e.message);}};return <><Heading title="Announcements" sub="Share updates with the Glory community."/><div className="cols"><section className="panel editor"><h3>Compose announcement</h3><form className="stack-form" onSubmit={publish}><label>Type<select value={kind} onChange={e=>K(e.target.value)}><option>ANNOUNCEMENT</option><option>NEW_SONGS</option><option>EVENT</option><option>MAINTENANCE</option></select></label><label>Headline<input value={title} onChange={e=>T(e.target.value)} required/></label><label>Message<textarea rows="6" value={body} onChange={e=>B(e.target.value)} required/></label>{error&&<p className="error-box">{error}</p>}<button className="primary-btn">Publish announcement</button><small className="hint">This writes RTDB data only. Push notifications require a trusted Cloud Function; FCM is not sent from the browser.</small></form></section><section className="panel"><h3>Recent messages</h3>{Object.entries(value||{}).map(([id,x])=><div className="announcement"><small>{x.type}</small><b>{x.title}</b><p>{x.body}</p></div>)}{!value&&<Empty title="No announcements yet" text="Published messages appear here."/>}</section></div></>;}

const DAILY_LANGUAGES=[["en","English"],["hi","Hindi"],["mr","Marathi"],["gu","Gujarati"]];
const emptyDailyVerse=(order=1)=>({en:{text:"",reference:""},hi:{text:"",reference:""},mr:{text:"",reference:""},gu:{text:"",reference:""},order,active:true});
function DailyVerses(){
 const {user}=useAuth(),{value,error}=useData("dailyVerses"),[editing,setEditing]=useState(null),[form,setForm]=useState(emptyDailyVerse()),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[saveError,setSaveError]=useState("");
 const items=Object.entries(value||{}).map(([id,item])=>({id,...(item||{})})).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)||a.id.localeCompare(b.id));
 const beginCreate=()=>{setEditing("new");setForm(emptyDailyVerse(items.reduce((m,x)=>Math.max(m,Number(x.order)||0),0)+1));setMessage("");setSaveError("");};
 const beginEdit=item=>{setEditing(item.id);setForm({...emptyDailyVerse(),...item,en:{text:item.en?.text||"",reference:item.en?.reference||""},hi:{text:item.hi?.text||"",reference:item.hi?.reference||""},mr:{text:item.mr?.text||"",reference:item.mr?.reference||""},gu:{text:item.gu?.text||"",reference:item.gu?.reference||""},order:Number(item.order)||1,active:item.active===true});setMessage("");setSaveError("");};
 const changeTranslation=(code,key,val)=>setForm(current=>({...current,[code]:{...(current[code]||{}),[key]:val}}));
 const save=async e=>{
  e.preventDefault();setSaveError("");setMessage("");
  const missing=DAILY_LANGUAGES.filter(([code])=>!String(form[code]?.text||"").trim()||!String(form[code]?.reference||"").trim());
  if(missing.length){setSaveError("Complete both verse text and Bible reference for all four languages: "+missing.map(x=>x[1]).join(", ")+".");return;}
  const order=Number(form.order);
  if(!Number.isInteger(order)||order<1){setSaveError("Order must be a positive whole number.");return;}
  if(!user?.uid){setSaveError("Your sign-in session has expired. Sign in again.");return;}
  setBusy(true);
  try{
   const id=editing==="new"?push(ref(database,"dailyVerses")).key:editing;
   if(!id)throw new Error("Could not create a verse ID.");
   const record={en:{text:form.en.text.trim(),reference:form.en.reference.trim()},hi:{text:form.hi.text.trim(),reference:form.hi.reference.trim()},mr:{text:form.mr.text.trim(),reference:form.mr.reference.trim()},gu:{text:form.gu.text.trim(),reference:form.gu.reference.trim()},order,active:form.active===true,updatedAt:stamp(),updatedBy:user.uid};
   await set(ref(database,"dailyVerses/"+id),record);
   setEditing(null);setForm(emptyDailyVerse());setMessage(editing==="new"?"Daily verse added successfully.":"Daily verse updated successfully.");
  }catch(err){setSaveError(err.message||"Could not save this verse.");}
  finally{setBusy(false);}
 };
 const deleteVerse=async item=>{
  if(!window.confirm("Delete this Daily Verse permanently? This cannot be undone."))return;
  setSaveError("");setMessage("");
  try{await remove(ref(database,"dailyVerses/"+item.id));if(editing===item.id)setEditing(null);setMessage("Daily verse deleted.");}
  catch(err){setSaveError(err.message||"Could not delete this verse.");}
 };
 return <><Heading title="Daily verses" sub="Manage the multilingual scripture collection used by the Glory Android app." action={<button className="primary-btn" onClick={beginCreate}>＋ Add verse</button>}/>
 <div className="daily-verse-summary"><div><strong>{items.length}</strong><span>Total verses</span></div><div><strong>{items.filter(x=>x.active===true).length}</strong><span>Active in rotation</span></div><div><strong>{items.filter(x=>x.active!==true).length}</strong><span>Inactive</span></div><p>Android selects one active verse per day. The same verse is shown to every user; language preferences only change the translation.</p></div>
 {(error||saveError)&&<p className="error-box">{error||saveError}</p>}{message&&<p className="daily-verse-success">{message}</p>}
 {editing!==null&&<section className="panel daily-verse-editor"><div className="panel-title"><div><small className="eyebrow">{editing==="new"?"NEW SCRIPTURE":"EDIT SCRIPTURE"}</small><h3>{editing==="new"?"Add daily verse":"Edit daily verse"}</h3></div><button type="button" className="secondary-btn" onClick={()=>setEditing(null)}>Cancel</button></div>
 <form onSubmit={save}><div className="daily-verse-language-grid">{DAILY_LANGUAGES.map(([code,label])=><section className="daily-verse-language" key={code}><header><b>{label}</b><span>{code.toUpperCase()}</span></header><label>Verse text<textarea rows="4" value={form[code]?.text||""} onChange={e=>changeTranslation(code,"text",e.target.value)} placeholder={"Enter "+label+" verse text"} required/></label><label>Bible reference<input value={form[code]?.reference||""} onChange={e=>changeTranslation(code,"reference",e.target.value)} placeholder={code==="en"?"Psalm 23:1":"Enter reference in "+label} required/></label></section>)}</div>
 <div className="daily-verse-options"><label>Rotation order<input type="number" min="1" step="1" value={form.order} onChange={e=>setForm(x=>({...x,order:e.target.value}))}/></label><label className="daily-verse-active"><input type="checkbox" checked={form.active===true} onChange={e=>setForm(x=>({...x,active:e.target.checked}))}/> Active — include in random daily rotation</label></div>
 {saveError&&<p className="error-box">{saveError}</p>}<div className="daily-verse-form-actions"><button type="button" className="secondary-btn" onClick={()=>setEditing(null)} disabled={busy}>Cancel</button><button type="submit" className="primary-btn" disabled={busy}>{busy?"Saving…":editing==="new"?"Add verse":"Save changes"}</button></div></form></section>}
 <section className="panel table-panel daily-verse-list"><div className="panel-title"><h3>Verse collection</h3><small>{items.length} records · sorted by order</small></div>
 {!items.length?<Empty title="No Daily Verses yet" text="Add your first scripture in all four languages to begin the Android daily rotation."/>:<div className="scroll"><table><thead><tr><th>ORDER</th><th>VERSE</th><th>TRANSLATIONS</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td><b>{Number(item.order)||"—"}</b></td><td><b>{item.en?.reference||"No English reference"}</b><small>{item.en?.text||"No English text"}</small></td><td><div className="daily-verse-language-tags">{DAILY_LANGUAGES.map(([code,label])=><span className={item[code]?.text&&item[code]?.reference?"complete":"incomplete"} key={code}>{code.toUpperCase()}</span>)}</div></td><td><em className={"pill "+(item.active===true?"published":"archived")}>{item.active===true?"ACTIVE":"INACTIVE"}</em></td><td><button className="link-button" onClick={()=>beginEdit(item)}>Edit</button>　<button className="link-button danger-link" onClick={()=>deleteVerse(item)}>Delete</button></td></tr>)}</tbody></table></div>}</section>
 <p className="notice">All four translations and references are entered manually. Changes are saved to Firebase at <code>/dailyVerses</code>. Android reads this collection; it does not manage or write verses.</p></>;
}

function Settings(){const {value:s}=useData("songs"),{value:d,error}=useData("dailyVerses");const verses=Object.values(d||{}),active=verses.filter(x=>x?.active===true).length;return <><Heading title="System settings" sub="Firebase-backed content health and configuration."/><div className="stats">{[["Firebase project","glory-68505"],["Song records",Object.keys(s||{}).length],["Active daily verses",active],["Connection","Live"]].map(x=><div className="stat" key={x[0]}><small>{x[0]}</small><strong>{x[1]}</strong></div>)}</div><section className="panel editor daily"><h3>Daily Verse collection</h3><p className="hint">Daily scripture content is managed in the dedicated multilingual collection. The legacy /dailyVerse node is left untouched for rollback compatibility.</p>{error&&<p className="error-box">{error}</p>}<p><b>{verses.length}</b> total verses · <b>{active}</b> active in rotation</p><Link className="primary-btn" to="/admin/daily-verses">Manage Daily Verses →</Link></section><p className="notice">CMS does not change Firebase rules or Cloud Functions. Verify least-privilege rules for all managed RTDB paths before production.</p></>;}
const DEVANAGARI_LETTERS=["अ","आ","इ","ई","उ","ऊ","ए","ऐ","ओ","औ","क","ख","ग","घ","ङ","च","छ","ज","झ","ञ","ट","ठ","ड","ढ","ण","त","थ","द","ध","न","प","फ","ब","भ","म","य","र","ल","व","श","ष","स","ह"];
const ENGLISH_LETTERS="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
function PublicHome(){
 const {value:s,error}=usePublicSongs(),{value:d}=useData("dailyVerse");
 const [queryText,setQueryText]=useState(""),[activeTab,setActiveTab]=useState("songs"),[script,setScript]=useState("devanagari");
 const [language,setLanguage]=useState("ALL"),[category,setCategory]=useState("ALL"),[sort,setSort]=useState("title"),[letter,setLetter]=useState(""),[visibleCount,setVisibleCount]=useState(12);
 const allSongs=Object.entries(s||{}).map(([id,v])=>norm(id,v));
 const languages=[...new Set(allSongs.map(x=>x.songLanguage).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 const categories=[...new Set(allSongs.map(x=>x.songCategory).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 const getFirstLetter=title=>{const value=String(title||"").trim();return value?Array.from(value)[0].toLocaleUpperCase():"";};
 const isDevanagari=title=>/[\u0900-\u097F]/.test(String(title||"").trim());
 const isEnglish=title=>/[A-Za-z]/.test(String(title||"").trim());
 const filtered=allSongs.filter(song=>{
  const title=String(song.songTitle||"");
  const matchesScript=activeTab!=="letters"||(script==="devanagari"?isDevanagari(title):isEnglish(title));
  const matchesQuery=[song.songTitle,song.songNo,song.artist,song.author,song.songLanguage,song.songCategory].join(" ").toLocaleLowerCase().includes(queryText.trim().toLocaleLowerCase());
  const matchesLanguage=language==="ALL"||song.songLanguage===language;
  const matchesCategory=category==="ALL"||song.songCategory===category;
  const matchesLetter=!letter||getFirstLetter(title)===letter;
  return matchesScript&&matchesQuery&&matchesLanguage&&matchesCategory&&matchesLetter;
 }).sort((a,b)=>{
  if(sort==="title")return String(a.songTitle||"").localeCompare(String(b.songTitle||""),undefined,{sensitivity:"base"});
  if(sort==="number")return (Number(a.songNo)||Infinity)-(Number(b.songNo)||Infinity)||String(a.songTitle||"").localeCompare(String(b.songTitle||""));
  if(sort==="language")return String(a.songLanguage||"").localeCompare(String(b.songLanguage||""))||String(a.songTitle||"").localeCompare(String(b.songTitle||""));
  if(sort==="recent")return (Number(b.updatedAt)||0)-(Number(a.updatedAt)||0);
  return 0;
 });
 const letters=script==="devanagari"?DEVANAGARI_LETTERS:ENGLISH_LETTERS;
 const availableLetters=new Set(allSongs.filter(song=>script==="devanagari"?isDevanagari(song.songTitle):isEnglish(song.songTitle)).map(song=>getFirstLetter(song.songTitle)));
 const shown=filtered.slice(0,visibleCount);
 const updateFilter=(setter,value)=>{setter(value);setVisibleCount(12);};
 return <div className="public">
  <header><Link to="/" className="public-brand"><span className="brand-mark small">G</span><span>Glory</span></Link><nav className="public-header-links"><a href="#explore">Explore</a><Link className="secondary-btn" to="/login">Editor sign in</Link></nav></header>
  <section className="hero"><span className="hero-kicker">A LIBRARY FOR WORSHIP</span><h1>Sing with <em>one heart.</em></h1><p>Find the songs, lyrics and chords that bring your community together.</p>
   <div className="public-search"><span aria-hidden="true">⌕</span><input value={queryText} onChange={e=>updateFilter(setQueryText,e.target.value)} placeholder="Search songs, lyrics, language or category…" aria-label="Search songs"/>{queryText&&<button type="button" onClick={()=>updateFilter(setQueryText,"")} aria-label="Clear search">×</button>}<kbd>⌘ K</kbd></div>
   <div className="hero-meta"><span>♫ {allSongs.length} songs in the library</span><span>·</span><span>Multiple languages</span></div>
  </section>
  {d&&<section className="daily"><small>TODAY'S VERSE</small><p>“{d.text}”</p><b>{d.reference}</b></section>}
  <section className="library" id="explore">
   <div className="library-heading"><div><span className="section-kicker">DISCOVER THE COLLECTION</span><h2>Explore the library</h2><p>Browse worship songs or find one by its first letter.</p></div><span className="library-count">{filtered.length} {filtered.length===1?"song":"songs"}</span></div>
   <div className="public-tabs" role="tablist" aria-label="Library browsing mode">
    <button type="button" role="tab" aria-selected={activeTab==="songs"} className={activeTab==="songs"?"active":""} onClick={()=>{setActiveTab("songs");setLetter("");setVisibleCount(12);}}>♫ <span>Songs</span></button>
    <button type="button" role="tab" aria-selected={activeTab==="letters"} className={activeTab==="letters"?"active":""} onClick={()=>{setActiveTab("letters");setLetter("");setVisibleCount(12);}}>⌗ <span>Letters</span></button>
   </div>
   <div className="public-controls">
    <label className="public-filter"><span>Language</span><select value={language} onChange={e=>updateFilter(setLanguage,e.target.value)}><option value="ALL">All languages</option>{languages.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
    <label className="public-filter"><span>Category</span><select value={category} onChange={e=>updateFilter(setCategory,e.target.value)}><option value="ALL">All categories</option>{categories.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
    <label className="public-filter"><span>Sort by</span><select value={sort} onChange={e=>updateFilter(setSort,e.target.value)}><option value="title">Title (A–Z)</option><option value="number">Song number</option><option value="language">Language</option><option value="recent">Recently updated</option></select></label>
    {(language!=="ALL"||category!=="ALL"||queryText||letter)&&<button className="clear-filters" type="button" onClick={()=>{setQueryText("");setLanguage("ALL");setCategory("ALL");setLetter("");setVisibleCount(12);}}>Clear filters</button>}
   </div>
   {activeTab==="letters"&&<div className="letter-browser"><div className="letter-browser-head"><div><b>Browse by first letter</b><small>Choose the writing system used by song titles.</small></div><div className="script-switch" role="group" aria-label="Letter script"><button type="button" className={script==="devanagari"?"active":""} onClick={()=>{setScript("devanagari");setLetter("");setVisibleCount(12);}}>देवनागरी</button><button type="button" className={script==="english"?"active":""} onClick={()=>{setScript("english");setLetter("");setVisibleCount(12);}}>English</button></div></div>
    <div className="letter-list">{letters.map(char=><button type="button" key={char} disabled={!availableLetters.has(char)} className={letter===char?"selected":""} onClick={()=>updateFilter(setLetter,letter===char?"":char)}>{char}</button>)}</div>
    <p className="letter-hint">{letter?<>Showing titles beginning with <b>{letter}</b>. <button type="button" onClick={()=>setLetter("")}>Show all letters</button></>:"Select a letter to narrow the song list."}</p>
   </div>}
   {error&&<p className="error-box">{error}</p>}
   <div className="public-results-head"><span>{activeTab==="letters"?(letter?"Songs under "+letter:"All songs in selected script"):"All published songs"}</span><span>Showing {shown.length} of {filtered.length}</span></div>
   {shown.length?<div className="public-grid">{shown.map((song,index)=><Link to={"/song/"+song.firebaseKey} key={song.firebaseKey} className="public-song-card"><span className="song-card-index">{String(index+1).padStart(2,"0")}</span><span className="song-card-main"><b>{song.songTitle}</b><small>{song.songLanguage||"Language not set"} <i>·</i> {song.songCategory||"Uncategorized"}</small></span><span className="song-card-arrow">↗</span></Link>)}</div>:<div className="public-empty"><span>♫</span><b>No songs found</b><p>Try another search, letter or filter to explore the library.</p><button type="button" onClick={()=>{setQueryText("");setLanguage("ALL");setCategory("ALL");setLetter("");}}>Reset search and filters</button></div>}
   {shown.length<filtered.length&&<div className="load-more-wrap"><button type="button" className="load-more" onClick={()=>setVisibleCount(n=>n+12)}>Load 12 more songs <span>↓</span></button></div>}
  </section>
  <footer><span className="brand-mark small">G</span><b>Glory</b><span>Made for worship, shared in community.</span><small>GLORY · WORSHIP LIBRARY</small></footer>
 </div>;
}
function PublicSong(){const {id}=useParams(),{value}=usePublicSongs(),s=value?.[id]&&norm(id,value[id]);return <div className="public-reader"><Link to="/">← Glory library</Link>{s?<article><small>{s.songLanguage} · {s.songCategory}</small><h1>{s.songTitle}</h1><p>{s.originalKey}{s.tempo?" · "+s.tempo+" BPM":""}</p>{s.sections.map((x,i)=><section key={i}><h3>{x.title}</h3>{x.lines.map((l,j)=><p key={j}>{l.text}</p>)}</section>)}</article>:<p>Loading song…</p>}</div>;}
function Setlist(){const {shareId}=useParams(),{value}=useData("sharedSetlists/"+shareId),{value:songs}=usePublicSongs();return <div className="public-reader"><Link to="/">← Glory</Link><article><small>SHARED WORSHIP SETLIST</small><h1>{value?.name||value?.title||"Worship setlist"}</h1>{arr(value?.songs||value?.items).map((x,i)=>{let id=typeof x==="string"?x:x.songId||x.id;return <p key={i}>{i+1}.　{songs?.[id]?.songTitle||x.title||id}</p>;})}{!value&&<p>Loading setlist…</p>}</article></div>;}
function Admin(){return <Shell><Routes><Route path="dashboard" element={<Dashboard/>}/><Route path="songs" element={<Songs/>}/><Route path="songs/new" element={<Guard permission="create"><SongEditor create/></Guard>}/><Route path="songs/:id/edit" element={<Guard permission="edit"><SongEditor/></Guard>}/><Route path="songs/:id/history" element={<History/>}/><Route path="reports" element={<Reports/>}/><Route path="taxonomy" element={<Guard permission="taxonomy"><Taxonomy/></Guard>}/><Route path="daily-verses" element={<Guard permission="dailyVerses"><DailyVerses/></Guard>}/><Route path="users" element={<Guard permission="roles"><Users/></Guard>}/><Route path="announcements" element={<Guard permission="announce"><Announcements/></Guard>}/><Route path="settings" element={<Guard permission="settings"><Settings/></Guard>}/><Route path="*" element={<Navigate to="dashboard" replace/>}/></Routes></Shell>;}
export default function GloryCMS(){return <HashRouter><Provider><Routes><Route path="/" element={<PublicHome/>}/><Route path="/song/:id" element={<PublicSong/>}/><Route path="/setlist/:shareId" element={<Setlist/>}/><Route path="/login" element={<Login/>}/><Route path="/admin/*" element={<Guard><Admin/></Guard>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Provider></HashRouter>;}
