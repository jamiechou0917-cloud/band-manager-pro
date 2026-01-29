import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signInWithCustomToken, signOut, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Music2, Mic2, Users, ClipboardList, Beer, Calendar, 
  Settings, LogOut, Menu, X, ShieldCheck, Plus, Loader2, 
  MessageCircle, Play, Smile, Check, Wine,
  MapPin, Cake, XCircle, CheckCircle2,
  Wallet, Coffee, Gift, Zap, LayoutGrid, List,
  PartyPopper, Headphones, Speaker, Star, Disc,
  Ghost, Pencil, Trash2, Lock, MinusCircle, FilePlus, AlertTriangle,
  Database, Download, Filter, Search, Clock, CheckSquare,
  User, Heart, Sun, Moon, Cloud // 使用基礎圖示避免崩潰
} from 'lucide-react';

// ==========================================
// 🛡️ 錯誤邊界元件 (防止白頁)
// ==========================================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">發生錯誤</h2>
          <p className="text-sm text-gray-600 mb-4">很抱歉，應用程式遇到問題。</p>
          <pre className="bg-gray-100 p-2 rounded text-xs text-left overflow-auto mb-4">{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} className="bg-[#77ABC0] text-white px-4 py-2 rounded-xl">重新整理</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 🔐 權限設定
// ==========================================
// 超級管理員 (最後救援)
const ADMIN_EMAILS = ["jamie.chou0917@gmail.com", "demo@test.com"];
// 特殊職位
const ROLE_FINANCE_NAME = "陳昱維"; 
const ROLE_ALCOHOL_NAME = "李家賢"; 

const BAND_NAME = "不開玩笑";

// --- 輔助函式 ---
const safeDate = (val) => {
  if (!val) return new Date();
  // 處理 Firebase Timestamp 或一般字串
  if (val && typeof val.toDate === 'function') return val.toDate(); 
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
};

const secureCopy = (text) => {
  try {
     const textArea = document.createElement("textarea");
     textArea.value = text;
     textArea.style.position = "fixed";
     textArea.style.left = "-9999px";
     document.body.appendChild(textArea);
     textArea.focus();
     textArea.select();
     document.execCommand('copy');
     document.body.removeChild(textArea);
     return true;
  } catch (err) { return false; }
};

const exportToCSV = (data, filename) => {
  if (!data || !data.length) { alert("無資料"); return; }
  const keys = Object.keys(data[0]);
  const csvContent = '\uFEFF' + keys.join(',') + '\n' + data.map(row => keys.map(k => {
    let cell = row[k] === null || row[k] === undefined ? '' : row[k];
    cell = cell.toString().replace(/"/g, '""');
    if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
    return cell;
  }).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

const MORANDI_COLORS = ['#8C736F', '#AAB8AB', '#B7B7BD', '#CCD2CC', '#9F8D8B', '#8FA39A'];
const stringToColor = (str) => {
  if (!str) return MORANDI_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return MORANDI_COLORS[Math.abs(hash) % MORANDI_COLORS.length];
};

const getZodiac = (dateStr) => {
  const d = safeDate(dateStr);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const z = [{n:"摩羯",d:[12,22]}, {n:"水瓶",d:[1,21]}, {n:"雙魚",d:[2,19]}, {n:"牡羊",d:[3,21]}, {n:"金牛",d:[4,21]}, {n:"雙子",d:[5,21]}, {n:"巨蟹",d:[6,22]}, {n:"獅子",d:[7,23]}, {n:"處女",d:[8,24]}, {n:"天秤",d:[9,24]}, {n:"天蠍",d:[10,24]}, {n:"射手",d:[11,23]}, {n:"摩羯",d:[12,22]}];
  const idx = z.findIndex((x, i) => {
    const next = z[i+1];
    if (!next) return true;
    const d1 = new Date(2000, x.d[0]-1, x.d[1]);
    const d2 = new Date(2000, next.d[0]-1, next.d[1]);
    const curr = new Date(2000, m-1, day);
    return curr >= d1 && curr < d2;
  });
  return (z[idx]?.n || "") + "座";
};

// --- Firebase Config ---
const USER_CONFIG = {
  apiKey: "AIzaSyDb36ftpgHzZEH2IuYOsPmJEiKgeVhLWKk",
  authDomain: "bandmanager-a3049.firebaseapp.com",
  projectId: "bandmanager-a3049",
  storageBucket: "bandmanager-a3049.firebasestorage.app",
  messagingSenderId: "193559225053",
  appId: "1:193559225053:web:124fd5a7ab3cf1a854f134"
};
const IS_CANVAS = typeof __firebase_config !== 'undefined';
const firebaseConfig = IS_CANVAS ? JSON.parse(__firebase_config) : USER_CONFIG;
const storageAppId = IS_CANVAS ? (typeof __app_id !== 'undefined' ? __app_id : 'band-manager-preview') : null;

// 安全獲取路徑
const getCollectionRef = (db, name) => IS_CANVAS && storageAppId ? collection(db, 'artifacts', storageAppId, 'public', 'data', name) : collection(db, name);
const getDocRef = (db, name, id) => IS_CANVAS && storageAppId ? doc(db, 'artifacts', storageAppId, 'public', 'data', name, id) : doc(db, name, id);

let auth, googleProvider, db;
try {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
} catch (e) { console.error("Init Error", e); }

const DEFAULT_GENERAL_DATA = {
  settings: {
    studioRate: 350, kbRate: 200,     
    studioBankAccount: '(013)國泰世華銀行 帳號：699514620885', 
    miscBankAccount: '(待設定)',
    alcoholTypes: ['紅酒', '白酒', '清酒', '氣泡酒', '啤酒', '威士忌', '其他']
  },
  practices: [] 
};

// --- Main App ---
const MainApp = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [role, setRole] = useState({ admin: false, finance: false, alcohol: false });

  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [alcohols, setAlcohols] = useState([]);
  const [songs, setSongs] = useState([]);
  const [generalData, setGeneralData] = useState(null);

  // Auth
  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      if (!u && IS_CANVAS) setTimeout(() => setUser({ uid: 'demo', displayName: '體驗帳號', email: 'demo@test.com' }), 1000);
      // 若非 Canvas 且無用戶，結束 Loading 顯示登入頁
      if (!u && !IS_CANVAS) setLoading(false);
    });
    return () => unsub();
  }, []);

  // 權限邏輯 (資料載入後才執行)
  useEffect(() => {
    if (user && members.length > 0) {
       const isAdmin = ADMIN_EMAILS.includes(user.email);
       // 白名單檢查
       if (!IS_CANVAS && !isAdmin && !members.some(m => m.email === user.email)) {
          alert(`您的 Email (${user.email}) 不在團員名單中。`);
          signOut(auth).then(() => setUser(null));
          return;
       }
       // 職位檢查
       const isFinance = isAdmin || members.some(m => m.email === user.email && (m.realName === ROLE_FINANCE_NAME || m.nickname === ROLE_FINANCE_NAME));
       const isAlcohol = isAdmin || members.some(m => m.email === user.email && (m.realName === ROLE_ALCOHOL_NAME || m.nickname === ROLE_ALCOHOL_NAME));
       
       setRole({ admin: isAdmin, finance: isFinance, alcohol: isAlcohol });
       setLoading(false);
    } else if (user && members.length === 0) {
       // 剛初始化無成員時，僅允許管理員操作
       const isAdmin = ADMIN_EMAILS.includes(user.email);
       setRole({ admin: isAdmin, finance: isAdmin, alcohol: isAdmin });
       setLoading(false);
    }
  }, [user, members]);

  // Firestore Sync
  useEffect(() => {
    if (!db || !user) return;
    const unsubM = onSnapshot(getCollectionRef(db, 'members'), s => setMembers(s.docs.map(d => ({id:d.id, ...d.data()}))), e => console.warn(e));
    const unsubL = onSnapshot(getCollectionRef(db, 'logs'), s => setLogs(s.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b) => new Date(b.date)-new Date(a.date))), e => console.warn(e));
    const unsubA = onSnapshot(getCollectionRef(db, 'alcohol'), s => setAlcohols(s.docs.map(d => ({id:d.id, ...d.data()}))), e => console.warn(e));
    const unsubS = onSnapshot(getCollectionRef(db, 'songs'), s => setSongs(s.docs.map(d => ({id:d.id, ...d.data()}))), e => console.warn(e));
    const unsubG = onSnapshot(getDocRef(db, 'general', 'info'), s => {
      if(s.exists()) {
        const d = s.data();
        // 防呆合併
        if(!d.settings?.alcoholTypes) d.settings = { ...DEFAULT_GENERAL_DATA.settings, ...(d.settings||{}) };
        if(!d.practices) d.practices = [];
        setGeneralData(d);
      } else {
        setDoc(getDocRef(db, 'general', 'info'), DEFAULT_GENERAL_DATA);
        setGeneralData(DEFAULT_GENERAL_DATA);
      }
    }, e => { console.warn(e); setGeneralData(DEFAULT_GENERAL_DATA); });

    return () => { unsubM(); unsubL(); unsubA(); unsubS(); unsubG(); };
  }, [user]);

  const handleLogin = () => signInWithPopup(auth, googleProvider).catch(() => signInWithRedirect(auth, googleProvider));
  const BandLogo = () => <div className="w-9 h-9 bg-[#CBABCA] rounded-xl flex items-center justify-center text-white"><Disc size={22} className="animate-spin"/></div>;

  if (loading && !generalData) return <div className="h-screen flex justify-center items-center bg-[#FDFBF7] text-[#CBABCA]"><Loader2 className="animate-spin"/></div>;

  if (!user) return (
    <div className="h-screen flex flex-col justify-center items-center bg-[#FDFBF7] p-6 text-center">
       <div className="bg-white p-8 rounded-[32px] shadow-xl w-full max-w-sm">
         <div className="flex justify-center mb-6"><BandLogo /></div>
         <h1 className="text-2xl font-black text-[#725E77] mb-2">{BAND_NAME}</h1>
         <button onClick={handleLogin} className="w-full bg-[#77ABC0] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"><ShieldCheck size={20}/> Google 登入</button>
         <div className="mt-6 p-3 bg-indigo-50 rounded-xl text-xs text-indigo-800 text-left">請使用手機瀏覽器 (Safari/Chrome) 開啟。</div>
       </div>
    </div>
  );

  const data = generalData || DEFAULT_GENERAL_DATA;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#725E77] font-sans pb-24">
      <header className="bg-white/80 backdrop-blur sticky top-0 z-40 border-b border-[#CBABCA]/20 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3"><BandLogo/><span className="font-bold text-lg text-[#77ABC0]">{BAND_NAME}</span></div>
        <div className="flex items-center gap-2">
          {role.admin && <button onClick={()=>setActiveTab('admin')} className="p-1.5 text-[#CBABCA]"><Settings size={18}/></button>}
          <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-200">
             {user.photoURL ? <img src={user.photoURL} alt="U"/> : <div className="w-full h-full flex items-center justify-center text-xs">{user.displayName?.[0]}</div>}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {activeTab === 'dashboard' && <DashboardView members={members} generalData={data} alcoholCount={alcohols.length} db={db} role={role} user={user} />}
        {activeTab === 'logs' && <SessionLogManager sessions={logs} practices={data.practices} members={members} settings={data.settings} db={db} role={role} />}
        {activeTab === 'alcohol' && <AlcoholManager alcohols={alcohols} members={members} settings={data.settings} db={db} role={role} user={user} />}
        {activeTab === 'tech' && <TechView songs={songs} db={db} role={role} user={user} />}
        {activeTab === 'admin' && <AdminDashboard members={members} logs={logs} generalData={data} db={db} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#CBABCA]/20 px-2 py-2 z-50 flex justify-around items-center pb-safe">
        <NavBtn id="dashboard" icon={Users} label="團員" active={activeTab} set={setActiveTab} />
        <NavBtn id="logs" icon={ClipboardList} label="日誌" active={activeTab} set={setActiveTab} />
        <div className="relative -top-6"><button className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-4 border-[#FDFBF7] bg-[#F1CEBA] text-white"><Ghost size={24}/></button></div>
        <NavBtn id="alcohol" icon={Beer} label="酒櫃" active={activeTab} set={setActiveTab} />
        <NavBtn id="tech" icon={Zap} label="資源" active={activeTab} set={setActiveTab} />
      </nav>
    </div>
  );
};

const NavBtn = ({ id, icon: Icon, label, active, set }) => (
  <button onClick={() => set(id)} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${active === id ? 'text-[#77ABC0]' : 'text-[#C5B8BF]'}`}>
    <Icon size={20} />
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

// --- 1. Dashboard ---
const DashboardView = ({ members, generalData, alcoholCount, db, role, user }) => {
  const [editingPractice, setEditingPractice] = useState(false);
  const [practices, setPractices] = useState(generalData.practices || []);
  const [expandedMember, setExpandedMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  
  const now = new Date();
  // 防呆：確保 date 存在
  const sorted = [...practices].filter(p=>p.date).map(p => ({...p, d: safeDate(p.date)})).sort((a,b)=>a.d-b.d);
  const nextP = sorted.find(p => p.d >= now) || sorted[sorted.length-1] || { date: new Date().toISOString(), title: '無安排', location: '圓頭音樂' };
  const nextD = safeDate(nextP.date);
  const diff = Math.ceil((nextD - now)/(1000*60*60*24));

  const handleUpdate = async () => { if(db) { await updateDoc(getDocRef(db, 'general', 'info'), { practices }); setEditingPractice(false); }};
  const toggleAtt = async (mid, dStr) => {
      const m = members.find(x=>x.id===mid);
      if(!m) return;
      if(!role.admin && user.email !== m.email) return alert("只能改自己的！");
      const att = m.attendance || [];
      const newAtt = att.includes(dStr) ? att.filter(x=>x!==dStr) : [...att, dStr];
      await updateDoc(getDocRef(db, 'members', mid), { attendance: newAtt });
  };
  const saveMember = async (d) => { if(db) { d.id ? await updateDoc(getDocRef(db, 'members', d.id), d) : await addDoc(getCollectionRef(db, 'members'), d); setEditingMember(null); }};
  const delMember = async (id) => { if(confirm("刪除？")) await deleteDoc(getDocRef(db, 'members', id)); };

  return (
    <div className="space-y-5 animate-in fade-in">
      {editingPractice && <PracticeEditor practices={practices} setPractices={setPractices} onClose={()=>setEditingPractice(false)} onSave={handleUpdate} />}
      {editingMember && <MemberEditModal member={editingMember} onClose={()=>setEditingMember(null)} onSave={saveMember} />}

      <div className="bg-gradient-to-br from-[#77ABC0] to-[#6E7F9B] rounded-[32px] p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-1">
             <h2 className="text-xl font-black tracking-widest">{nextP.title}</h2>
             {role.admin && <button onClick={()=>{setPractices(generalData.practices||[]);setEditingPractice(true)}}><Pencil size={18}/></button>}
          </div>
          <div className="text-4xl font-black mb-1 font-mono">{diff > 0 ? `倒數 ${diff} 天` : diff===0?"今天":"已結束"}</div>
          <div className="text-lg font-bold mb-4 flex items-center gap-2"><Clock size={18}/> {nextD.toLocaleString('zh-TW', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'})}</div>
          <div className="flex items-center gap-2 bg-black/20 w-fit px-4 py-2 rounded-full"><MapPin size={16}/>{nextP.location}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
         <div className="bg-[#F0EEE6] p-4 rounded-2xl flex items-center gap-3"><div className="bg-white p-2.5 rounded-full"><Beer size={20} className="text-[#C5A659]"/></div><div><div className="text-[10px] font-bold text-[#857650]">酒櫃</div><div className="text-xl font-black text-[#5C5142]">{alcoholCount}</div></div></div>
         <div className="bg-[#E8F1E9] p-4 rounded-2xl flex items-center gap-3"><div className="bg-white p-2.5 rounded-full"><Check size={20} className="text-[#77ABC0]"/></div><div><div className="text-[10px] font-bold text-[#6E7F9B]">練團</div><div className="text-xl font-black text-[#725E77]">{practices.length}</div></div></div>
      </div>

      <div>
         <div className="flex justify-between px-1 mb-2"><h3 className="font-bold text-xl text-[#725E77]">點名簿</h3>{role.admin && <button onClick={()=>setEditingMember({})} className="text-[#77ABC0]"><Plus/></button>}</div>
         <div className="grid gap-3">
            {members.map(m => (
               <div key={m.id} onClick={()=>setExpandedMember(expandedMember===m.id?null:m.id)} className="bg-white p-4 rounded-2xl shadow-sm border border-[#E0E0D9]">
                  <div className="flex justify-between items-center">
                     <div className="flex gap-3 items-center">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold" style={{backgroundColor: stringToColor(m.nickname)}}>{m.nickname?.[0]}</div>
                        <div><div className="font-bold text-[#725E77]">{m.nickname}</div><div className="text-xs text-[#C5B8BF]">{m.instrument}</div></div>
                     </div>
                     <div className="flex gap-1 overflow-x-auto max-w-[120px]">
                        {practices.filter(p=>p.date).map(p => {
                           const dStr = p.date.split('T')[0];
                           const isAtt = m.attendance?.includes(dStr);
                           return <button key={p.id||Math.random()} onClick={(e)=>{e.stopPropagation(); toggleAtt(m.id, dStr)}} className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isAtt?'bg-[#E8F1E9] text-[#5F7A61]':'bg-slate-50'}`}>{isAtt?<CheckCircle2 size={12}/>:<XCircle size={12}/>}</button>
                        })}
                     </div>
                  </div>
                  {expandedMember===m.id && (
                     <div className="mt-4 pt-3 border-t text-xs text-[#8B8C89] flex justify-between">
                        <span>🎂 {formatBirthdayDisplay(m.birthday)} ({getZodiac(m.birthday)})</span>
                        {role.admin && <div><button onClick={(e)=>{e.stopPropagation();setEditingMember(m)}} className="mr-2 text-[#77ABC0]">編輯</button><button onClick={(e)=>{e.stopPropagation();delMember(m.id)}} className="text-red-400">刪除</button></div>}
                     </div>
                  )}
               </div>
            ))}
         </div>
      </div>
    </div>
  );
};

const PracticeEditor = ({ practices, setPractices, onClose, onSave }) => (
  <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
    <div className="bg-white p-6 rounded-3xl w-full max-w-sm space-y-4 max-h-[80vh] overflow-y-auto">
       <h3 className="font-bold text-lg">設定練團時間</h3>
       {practices.map((p, i) => (
         <div key={i} className="bg-slate-50 p-2 rounded-xl border space-y-2 relative">
            <button onClick={()=>setPractices(practices.filter((_,idx)=>idx!==i))} className="absolute top-2 right-2 text-red-400"><MinusCircle size={16}/></button>
            <input type="datetime-local" className="w-full bg-white p-2 rounded" value={p.date} onChange={e=>{const n=[...practices];n[i].date=e.target.value;setPractices(n)}}/>
            <input className="w-full bg-white p-2 rounded" placeholder="標題" value={p.title} onChange={e=>{const n=[...practices];n[i].title=e.target.value;setPractices(n)}}/>
            <input className="w-full bg-white p-2 rounded" placeholder="地點" value={p.location} onChange={e=>{const n=[...practices];n[i].location=e.target.value;setPractices(n)}}/>
         </div>
       ))}
       <button onClick={()=>setPractices([...practices, {date:new Date().toISOString(), title:'新練團', location:'圓頭音樂'}])} className="w-full py-2 border-2 border-dashed border-[#77ABC0] text-[#77ABC0] rounded-xl"><Plus className="mx-auto"/></button>
       <div className="flex gap-2"><button onClick={onClose} className="flex-1 p-3 rounded-xl text-slate-400">取消</button><button onClick={onSave} className="flex-1 p-3 rounded-xl bg-[#77ABC0] text-white">儲存</button></div>
    </div>
  </div>
);

const MemberEditModal = ({ member, onClose, onSave }) => {
  const [form, setForm] = useState(member);
  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
       <div className="bg-white p-6 rounded-3xl w-full max-w-sm space-y-3">
          <h3 className="font-bold text-lg">{member.id?'編輯':'新增'}團員</h3>
          <input className="w-full bg-slate-50 p-3 rounded-xl" placeholder="暱稱" value={form.nickname||''} onChange={e=>setForm({...form, nickname:e.target.value})}/>
          <input className="w-full bg-slate-50 p-3 rounded-xl" placeholder="Email (登入用)" value={form.email||''} onChange={e=>setForm({...form, email:e.target.value})}/>
          <input className="w-full bg-slate-50 p-3 rounded-xl" placeholder="樂器" value={form.instrument||''} onChange={e=>setForm({...form, instrument:e.target.value})}/>
          <input type="date" className="w-full bg-slate-50 p-3 rounded-xl" value={form.birthday||''} onChange={e=>setForm({...form, birthday:e.target.value})}/>
          <div className="flex gap-2"><button onClick={onClose} className="flex-1 p-3 text-slate-400">取消</button><button onClick={()=>onSave(form)} className="flex-1 p-3 bg-[#77ABC0] text-white rounded-xl">儲存</button></div>
       </div>
    </div>
  );
};

// --- 2. SessionLog ---
const SessionLogManager = ({ sessions, practices, members, settings, db, role, user }) => {
  const [viewId, setViewId] = useState(null);
  const existing = sessions.map(s=>s.date);
  const pending = practices.filter(p=>p.date && !existing.includes(p.date.split('T')[0]));

  const createLog = async (date, loc) => {
    if(!db) return;
    const ref = await addDoc(getCollectionRef(db, 'logs'), { date: date.split('T')[0], location: loc, funNotes: '', tracks:[], miscExpenses:[], createdAt: serverTimestamp() });
    setViewId(ref.id);
  };
  const delLog = async (e, id) => { e.stopPropagation(); if(confirm("刪除此日誌？")) await deleteDoc(getDocRef(db, 'logs', id)); };

  if(viewId) {
    const s = sessions.find(x=>x.id===viewId);
    return s ? <SessionDetail session={s} members={members} settings={settings} onBack={()=>setViewId(null)} db={db} role={role} user={user}/> : <div>Loading...</div>;
  }

  return (
    <div className="space-y-4 animate-in fade-in">
       <div className="flex justify-between items-end px-1"><h2 className="text-2xl font-bold text-[#725E77]">練團日誌</h2>{role.admin && <button onClick={()=>createLog(new Date().toISOString(), '圓頭音樂')} className="text-[#77ABC0] flex items-center gap-1"><FilePlus size={14}/> 自訂</button>}</div>
       {role.admin && pending.map(p => (
         <button key={p.date} onClick={()=>createLog(p.date, p.location)} className="w-full p-4 border-2 border-dashed border-[#CBABCA] bg-[#FDFBF7] flex justify-between items-center text-[#CBABCA] rounded-2xl">
            <div className="flex items-center gap-3"><Plus size={20}/><div className="text-left font-bold">{new Date(p.date).toLocaleDateString()} 待補</div></div>
         </button>
       ))}
       {sessions.map(s => (
         <div key={s.id} onClick={()=>setViewId(s.id)} className="bg-white p-5 rounded-[28px] shadow-sm border border-[#E0E0D9] relative">
            <div className="flex justify-between">
               <span className="bg-[#A8D8E2]/20 text-[#6E7F9B] px-2 py-0.5 rounded text-xs font-bold">{s.date}</span>
               {role.admin && <button onClick={(e)=>delLog(e, s.id)} className="text-red-300"><Trash2 size={16}/></button>}
            </div>
            <h3 className="font-bold text-xl mt-2 text-[#725E77]">{s.location}</h3>
         </div>
       ))}
    </div>
  );
};

// --- Session Detail ---
const SessionDetail = ({ session, members, settings, onBack, db, role, user }) => {
  const [tab, setTab] = useState('tracks');
  const [notes, setNotes] = useState(session.funNotes||'');
  const [loc, setLoc] = useState(session.location||'圓頭音樂');
  const [editLoc, setEditLoc] = useState(false);

  const save = async () => { if(db) await updateDoc(getDocRef(db, 'logs', session.id), { funNotes: notes, location: loc }); setEditLoc(false); };
  
  return (
    <div className="animate-in fade-in">
       <button onClick={onBack} className="mb-4 text-[#C5B8BF] flex items-center gap-1"><ChevronDown className="rotate-90"/> 返回</button>
       <div className="bg-white p-6 rounded-[32px] shadow-sm mb-6">
          <h1 className="text-3xl font-black text-[#725E77] mb-2">{session.date}</h1>
          {editLoc ? <div className="flex gap-2"><input className="bg-slate-50 p-1 rounded" value={loc} onChange={e=>setLoc(e.target.value)}/><button onClick={save}><Check/></button></div> : 
          <div onClick={()=>setEditLoc(true)} className="flex items-center gap-2 text-[#C5B8BF] font-bold cursor-pointer"><MapPin size={14}/> {loc}</div>}
          <textarea className="w-full bg-slate-50 p-3 rounded-xl mt-4 text-xs" value={notes} onChange={e=>setNotes(e.target.value)} onBlur={save} placeholder="備註..."/>
       </div>
       <div className="flex bg-[#E0E0D9]/50 p-1 rounded-xl mb-6">
          {['tracks','money','misc'].map(t => <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-2 rounded-lg text-xs font-bold ${tab===t?'bg-white shadow text-[#77ABC0]':'text-[#C5B8BF]'}`}>{t==='tracks'?'曲目':t==='money'?'練團費':'雜支'}</button>)}
       </div>
       {tab==='tracks' && <TrackList session={session} db={db} user={user} role={role} />}
       {tab==='money' && <PracticeFeeCalculator session={session} members={members} settings={settings} role={role} db={db} />}
       {tab==='misc' && <MiscFeeCalculator session={session} members={members} db={db} />}
    </div>
  );
};

const TrackList = ({ session, db, user }) => {
  const [newTrack, setNewTrack] = useState("");
  const add = async () => { if(newTrack && db) { await updateDoc(getDocRef(db, 'logs', session.id), { tracks: [...(session.tracks||[]), {id: Date.now(), title: newTrack, comments:[]}] }); setNewTrack(""); }};
  const addComm = async (tid, txt) => {
     if(!txt) return;
     const newTracks = session.tracks.map(t => t.id===tid ? {...t, comments:[...(t.comments||[]), {user: user.displayName, text: txt, uid: user.uid}]} : t);
     await updateDoc(getDocRef(db, 'logs', session.id), { tracks: newTracks });
  };
  return (
    <div className="space-y-3">
       {(session.tracks||[]).map(t => (
         <div key={t.id} className="bg-white p-4 rounded-2xl border border-[#E0E0D9]">
            <div className="font-bold text-[#725E77] mb-2">{t.title}</div>
            <div className="space-y-1">
               {(t.comments||[]).map((c,i) => <div key={i} className="text-xs text-slate-500 bg-slate-50 p-1 rounded"><span className="font-bold">{c.user}:</span> {c.text}</div>)}
               <input className="w-full text-xs bg-slate-100 p-2 rounded" placeholder="留言..." onKeyDown={e=>{if(e.key==='Enter'){addComm(t.id, e.target.value);e.target.value=''}}}/>
            </div>
         </div>
       ))}
       <div className="flex gap-2"><input className="flex-1 bg-white p-2 rounded-xl" placeholder="新歌名" value={newTrack} onChange={e=>setNewTrack(e.target.value)} /><button onClick={add}><Plus/></button></div>
    </div>
  );
};

const PracticeFeeCalculator = ({ session, members, settings, role, db }) => {
   const [ids, setIds] = useState(session.attendance||[]);
   const [hours, setHours] = useState(2);
   const [kb, setKb] = useState(true);
   const total = hours * (settings.studioRate||350) + (kb ? (settings.kbRate||200) : 0);
   const per = ids.length ? Math.ceil(total/ids.length) : 0;
   
   return (
     <div className="p-4 space-y-4">
        <div className="bg-[#F0F4F5] p-4 rounded-2xl text-center"><div className="text-3xl font-black text-[#77ABC0]">${total}</div><div className="text-xs">每人 ${per}</div></div>
        {role.finance ? (
           <div className="flex flex-wrap gap-2">
              {members.map(m => <button key={m.id} onClick={()=>{const n = ids.includes(m.id)?ids.filter(x=>x!==m.id):[...ids,m.id]; setIds(n);}} className={`px-2 py-1 rounded border ${ids.includes(m.id)?'bg-[#77ABC0] text-white':'bg-white'}`}>{m.nickname}</button>)}
           </div>
        ) : <div className="text-center text-xs text-slate-400">僅財務可編輯</div>}
        <button className="w-full py-3 bg-[#77ABC0] text-white rounded-xl font-bold" onClick={()=>secureCopy(`練團費: $${per}/人`)}>複製</button>
     </div>
   );
};

const MiscFeeCalculator = ({ session, members, db }) => {
   const [items, setItems] = useState(session.miscExpenses||[]);
   const [newItem, setNewItem] = useState({item:'', amount:''});
   const update = async (n) => { setItems(n); if(db) await updateDoc(getDocRef(db, 'logs', session.id), { miscExpenses: n }); };
   const add = () => { if(newItem.item) { update([...items, {...newItem, id: Date.now(), isSettled: false}]); setNewItem({item:'', amount:''}); }};
   
   const calcDebt = () => {
      // 簡單結算邏輯：假設所有人平分
      if(!items.length) return [];
      const total = items.reduce((s,i)=>s+Number(i.amount),0);
      const per = Math.ceil(total / members.length);
      return [`總計: $${total}`, `每人: $${per}`];
   };

   return (
     <div className="p-4 space-y-4">
        <div className="bg-slate-50 p-4 rounded-xl">
           <div className="font-bold text-[#725E77] mb-2">結算建議</div>
           {calcDebt().map(s=><div key={s} className="text-xs">{s}</div>)}
        </div>
        <div className="flex gap-2"><input className="flex-1 bg-white p-2 rounded" placeholder="項目" value={newItem.item} onChange={e=>setNewItem({...newItem, item:e.target.value})}/><input className="w-20 bg-white p-2 rounded" type="number" placeholder="$" value={newItem.amount} onChange={e=>setNewItem({...newItem, amount:e.target.value})}/><button onClick={add}><Plus/></button></div>
        <div className="space-y-2">
           {items.map((i, idx) => (
              <div key={idx} className={`bg-white p-3 rounded flex justify-between items-center ${i.isSettled?'opacity-50 line-through':''}`}>
                 <span>{i.item} ${i.amount}</span>
                 <div className="flex gap-2">
                    <button onClick={()=>{const n=[...items];n[idx].isSettled=!n[idx].isSettled;update(n)}}><CheckSquare size={16}/></button>
                    <button onClick={()=>{const n=items.filter((_,x)=>x!==idx);update(n)}}><Trash2 size={16}/></button>
                 </div>
              </div>
           ))}
        </div>
     </div>
   );
};

// --- Alcohol & Tech (Simplified for stability) ---
const AlcoholManager = ({ alcohols, db, role }) => {
  const [addMode, setAddMode] = useState(false);
  const [form, setForm] = useState({name:'', type:'威士忌', note:''});
  const add = async () => { if(db && form.name) { await addDoc(getCollectionRef(db, 'alcohol'), form); setAddMode(false); }};
  return (
    <div className="space-y-3 animate-in fade-in">
       {role.alcohol && <button onClick={()=>setAddMode(true)} className="w-full py-3 border-2 border-dashed border-[#CBABCA] text-[#CBABCA] rounded-2xl flex justify-center"><Plus/></button>}
       {addMode && <div className="bg-white p-4 rounded-2xl space-y-2"><input className="w-full bg-slate-50 p-2 rounded" placeholder="酒名" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/><button onClick={add} className="w-full bg-[#77ABC0] text-white p-2 rounded">儲存</button></div>}
       {alcohols.map(a => <div key={a.id} className="bg-white p-4 rounded-2xl border flex gap-3"><Wine className="text-[#D6C592]"/><div className="flex-1"><div className="font-bold text-[#725E77]">{a.name}</div><div className="text-xs text-slate-400">{a.note}</div></div></div>)}
    </div>
  );
};

const TechView = ({ songs, db, user }) => {
  const [addMode, setAddMode] = useState(false);
  const [form, setForm] = useState({title:'', link:''});
  const add = async () => { if(db && form.title) { await addDoc(getCollectionRef(db, 'songs'), {...form, uid: user.uid}); setAddMode(false); }};
  return (
    <div className="space-y-3 animate-in fade-in">
       <button onClick={()=>setAddMode(true)} className="w-full py-3 border-2 border-dashed border-[#77ABC0] text-[#77ABC0] rounded-2xl flex justify-center"><Plus/></button>
       {addMode && <div className="bg-white p-4 rounded-2xl space-y-2"><input className="w-full bg-slate-50 p-2 rounded" placeholder="標題" value={form.title} onChange={e=>setForm({...form, title:e.target.value})}/><input className="w-full bg-slate-50 p-2 rounded" placeholder="連結" value={form.link} onChange={e=>setForm({...form, link:e.target.value})}/><button onClick={add} className="w-full bg-[#77ABC0] text-white p-2 rounded">發布</button></div>}
       {songs.map(s => <div key={s.id} className="bg-white p-4 rounded-2xl border flex gap-3 items-center"><Zap className="text-[#77ABC0]"/><a href={s.link} target="_blank" className="flex-1 font-bold text-[#725E77]">{s.title}</a></div>)}
    </div>
  );
};

const AdminDashboard = ({ members, logs, db }) => (
  <div className="p-4 bg-white rounded-3xl border text-center">
     <h2 className="text-xl font-bold text-[#725E77] mb-4"><Database className="inline"/> 後台管理</h2>
     <button onClick={()=>exportToCSV(members, 'members.csv')} className="w-full py-3 bg-[#E8F1E9] text-[#5F7A61] rounded-xl font-bold mb-2">匯出成員名單</button>
     <button onClick={()=>exportToCSV(logs, 'logs.csv')} className="w-full py-3 bg-[#F0F4F5] text-[#77ABC0] rounded-xl font-bold">匯出練團紀錄</button>
  </div>
);

// --- Entry Component ---
export default function SafeApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
