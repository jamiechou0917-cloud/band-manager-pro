import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signInWithCustomToken, signOut, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Music2, Mic2, Users, ClipboardList, Beer, Calendar, 
  Settings, LogOut, Menu, X, ShieldCheck, Plus, Loader2, 
  MessageCircle, ChevronDown, ChevronUp, Play, 
  ExternalLink, Smile, DollarSign, Copy, Check, Wine,
  MapPin, CalendarPlus, Cake, XCircle, CheckCircle2,
  Wallet, Receipt, Coffee, Gift, Zap, LayoutGrid, List,
  PartyPopper, Headphones, Speaker, Star, Image as ImageIcon, Disc,
  Ghost, Pencil, Trash2, Lock, Save, MinusCircle, FilePlus, AlertTriangle,
  Database, Download, Filter, Search, Clock
} from 'lucide-react';

// ==========================================
// 🔐 權限管理區
// ==========================================

// 1. 團員白名單
const MEMBER_EMAILS = [
  "jamie.chou0917@gmail.com", 
  "drummer@gmail.com",
  "bass@gmail.com",
  "keyboard@gmail.com",
  "demo@test.com"
];

// 2. 超級管理員
const ADMIN_EMAILS = [
  "jamie.chou0917@gmail.com",
  "demo@test.com"
];

// 3. 特殊職位名稱
const ROLE_FINANCE_NAME = "陳昱維"; 
const ROLE_ALCOHOL_NAME = "李家賢"; 

// --- 🎸 樂團專屬設定 ---
const BAND_LOGO_BASE64 = ""; 
const BAND_LOGO_URL = ""; 
const BAND_NAME = "不開玩笑";

// --- Logo 元件 ---
const BandLogo = () => (
  <div className="w-9 h-9 bg-[#CBABCA] rounded-xl flex items-center justify-center text-white shadow-md shadow-[#CBABCA]/30 overflow-hidden relative">
    <Disc size={22} className="animate-spin" style={{animationDuration: '10s'}}/>
    <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#F1CEBA] rounded-full opacity-90 border border-white/50"></div>
  </div>
);

// --- 工具: 安全複製 ---
const secureCopy = (text) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (err) {
    console.error('Copy failed', err);
    document.body.removeChild(textArea);
    return false;
  }
};

// --- 工具: 匯出 CSV ---
const exportToCSV = (data, filename) => {
  if (!data || !data.length) {
    alert("沒有資料可匯出");
    return;
  }
  const processedData = data.map(row => {
    const newRow = {};
    Object.keys(row).forEach(key => {
       if (typeof row[key] !== 'object' || row[key] === null) {
         newRow[key] = row[key];
       } else if (key === 'tracks') {
         newRow['曲目數'] = row[key].length;
       }
    });
    return newRow;
  });

  const separator = ',';
  const keys = Object.keys(processedData[0]);
  const csvContent =
    '\uFEFF' + 
    keys.join(separator) +
    '\n' +
    processedData.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// --- 工具: 生日顯示 ---
const formatBirthdayDisplay = (dateStr) => {
  if (!dateStr) return "未知";
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`; 
  return dateStr;
};

const getZodiac = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const z = [
    {n:"摩羯",d:[12,22]}, {n:"水瓶",d:[1,21]}, {n:"雙魚",d:[2,19]},
    {n:"牡羊",d:[3,21]}, {n:"金牛",d:[4,21]}, {n:"雙子",d:[5,21]},
    {n:"巨蟹",d:[6,22]}, {n:"獅子",d:[7,23]}, {n:"處女",d:[8,24]},
    {n:"天秤",d:[9,24]}, {n:"天蠍",d:[10,24]}, {n:"射手",d:[11,23]},
    {n:"摩羯",d:[12,22]}
  ];
  const idx = z.findIndex((x, i) => {
    const next = z[i+1];
    if (!next) return true;
    const d1 = new Date(2000, x.d[0]-1, x.d[1]);
    const d2 = new Date(2000, next.d[0]-1, next.d[1]);
    const curr = new Date(2000, m-1, d);
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
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : USER_CONFIG;
const IS_CANVAS = typeof __firebase_config !== 'undefined';
const storageAppId = IS_CANVAS ? (typeof __app_id !== 'undefined' ? __app_id : 'band-manager-preview') : null;

// Helper 函式
const getCollectionRef = (db, name) => {
  if (IS_CANVAS && storageAppId) {
    return collection(db, 'artifacts', storageAppId, 'public', 'data', name);
  }
  return collection(db, name);
};

const getDocRef = (db, name, id) => {
  if (IS_CANVAS && storageAppId) {
    return doc(db, 'artifacts', storageAppId, 'public', 'data', name, id);
  }
  return doc(db, name, id);
};

let auth, googleProvider, db;
try {
  if (firebaseConfig) {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  }
} catch (e) { console.error("Firebase init error:", e); }

// --- 預設資料 ---
const DEFAULT_GENERAL_DATA = {
  settings: {
    studioRate: 350, kbRate: 200,     
    studioBankAccount: '(013)國泰世華 699514620885', 
    miscBankAccount: '(待設定)' 
  },
  practices: [] 
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [imgError, setImgError] = useState(false);
  const [showPrankModal, setShowPrankModal] = useState(false);
  const [role, setRole] = useState({ admin: false, finance: false, alcohol: false });

  // Data States
  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [alcohols, setAlcohols] = useState([]);
  const [songs, setSongs] = useState([]);
  const [generalData, setGeneralData] = useState(null);

  const appId = USER_CONFIG.appId; 

  // Auth Effect
  useEffect(() => {
    if (auth) {
      getRedirectResult(auth).catch(e => console.log(e));
      const unsubAuth = onAuthStateChanged(auth, async (u) => {
        if (u) {
          if (!IS_CANVAS && !MEMBER_EMAILS.includes(u.email)) {
            alert(`⛔ 抱歉，您的 Email (${u.email}) 不在團員名單中。`);
            await signOut(auth);
            setUser(null); setLoading(false); return;
          }
          setUser(u); setLoading(false);
        } else {
          setUser(null); setLoading(false);
          if (IS_CANVAS) setTimeout(() => setUser({ uid: 'demo', displayName: '體驗帳號', photoURL: null, email: 'demo@test.com' }), 1000);
        }
      });
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        signInWithCustomToken(auth, __initial_auth_token).catch(e => console.error(e));
      }
      return () => unsubAuth();
    } else {
      setLoading(false);
    }
  }, []);

  // Role Effect
  useEffect(() => {
    if (user) {
      const userEmail = user.email;
      const isAdmin = ADMIN_EMAILS.includes(userEmail);
      const financeMember = members.find(m => m.realName === ROLE_FINANCE_NAME || m.nickname === ROLE_FINANCE_NAME);
      const isFinance = isAdmin || (financeMember && financeMember.email === userEmail);
      const alcoholMember = members.find(m => m.realName === ROLE_ALCOHOL_NAME || m.nickname === ROLE_ALCOHOL_NAME);
      const isAlcohol = isAdmin || (alcoholMember && alcoholMember.email === userEmail);
      setRole({ admin: isAdmin, finance: isFinance, alcohol: isAlcohol });
    } else {
      setRole({ admin: false, finance: false, alcohol: false });
    }
  }, [user, members]);

  // Firestore Effect
  useEffect(() => {
    if (!db || !user) return;

    const unsubMembers = onSnapshot(getCollectionRef(db, 'members'), (snap) => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (e)=>{if(e.code==='permission-denied') console.warn("Perms");});
    const unsubLogs = onSnapshot(getCollectionRef(db, 'logs'), (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date))));
    const unsubAlcohol = onSnapshot(getCollectionRef(db, 'alcohol'), (snap) => setAlcohols(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSongs = onSnapshot(getCollectionRef(db, 'songs'), (snap) => setSongs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubGeneral = onSnapshot(getDocRef(db, 'general', 'info'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.nextPractice && !data.practices) data.practices = [data.nextPractice];
        setGeneralData(data);
      } else {
        setDoc(getDocRef(db, 'general', 'info'), DEFAULT_GENERAL_DATA);
        setGeneralData(DEFAULT_GENERAL_DATA);
      }
    });

    return () => { unsubMembers(); unsubLogs(); unsubAlcohol(); unsubSongs(); unsubGeneral(); };
  }, [user]);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (err) { console.warn("Popup failed"); signInWithRedirect(auth, googleProvider); }
  };
  
  const handleLogout = async () => { await signOut(auth); setUser(null); };

  const renderContent = () => {
    // 確保有資料，避免崩潰
    const data = generalData || DEFAULT_GENERAL_DATA;
    // 如果沒有資料且非預覽，顯示載入中
    if (!generalData && !IS_CANVAS) return <div className="h-full flex items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> 資料讀取中...</div>;

    switch (activeTab) {
      case 'dashboard': return <DashboardView members={members} generalData={data} alcoholCount={alcohols.length} db={db} role={role} user={user} />;
      case 'logs': return <SessionLogManager sessions={logs} practices={data.practices || []} members={members} settings={data.settings} db={db} role={role} />;
      case 'alcohol': return <AlcoholManager alcohols={alcohols} members={members} settings={data.settings} db={db} role={role} />;
      case 'tech': return <TechView songs={songs} db={db} role={role} user={user} />;
      case 'admin': return <AdminDashboard members={members} logs={logs} db={db} />;
      default: return <DashboardView />;
    }
  };

  if (loading) return <div className="h-screen flex justify-center items-center bg-[#FDFBF7]"><Loader2 className="animate-spin text-[#77ABC0]"/></div>;
  const logoSrc = BAND_LOGO_BASE64 || BAND_LOGO_URL;
  const showImage = logoSrc && !imgError;
  const handlePrankClick = (e) => {
    const btn = e.currentTarget;
    btn.style.transform = 'rotate(360deg) scale(1.2)';
    setTimeout(() => { setShowPrankModal(true); btn.style.transform = 'rotate(0deg) scale(1)'; }, 300);
  };

  if (!user) {
    return (
      <div className="h-screen flex flex-col justify-center items-center bg-[#FDFBF7] p-6 text-center">
        <div className="bg-white p-8 rounded-[32px] shadow-xl max-w-sm w-full">
           <div className="flex justify-center mb-6"><BandLogo /></div>
           <h1 className="text-2xl font-black text-[#725E77] mb-2">{BAND_NAME}</h1>
           <button onClick={handleLogin} className="w-full bg-[#77ABC0] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#77ABC0]/30 active:scale-95 transition">
             <ShieldCheck size={20}/> Google 登入
           </button>
           <div className="mt-6 p-3 bg-indigo-50 rounded-xl text-xs text-indigo-800 text-left border border-indigo-100">
             <div className="flex items-center gap-1 font-bold mb-1"><Lock size={12}/> 存取限制</div>
             本系統僅限受邀團員登入。若無法進入，請聯繫管理員加入白名單。
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#725E77] font-sans pb-24">
      <header className="bg-white/80 backdrop-blur sticky top-0 z-40 border-b border-[#CBABCA]/20 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          {showImage ? <img src={logoSrc} alt="Logo" className="w-9 h-9 rounded-xl object-contain bg-white shadow-sm" onError={() => setImgError(true)} /> : <BandLogo />}
          <span className="font-bold text-lg tracking-wide text-[#77ABC0]">{BAND_NAME}</span>
        </div>
        <div className="flex items-center gap-2">
          {role.admin && <span className="bg-rose-100 text-rose-600 text-[10px] px-2 py-0.5 rounded-full font-bold">Admin</span>}
          <div className="flex flex-col items-end mr-1">
             <span className="text-xs font-bold text-[#CBABCA]">{user?.displayName}</span>
             <span className="text-[9px] text-slate-400 max-w-[80px] truncate">{user?.email}</span>
          </div>
          <div className="w-8 h-8 bg-[#E5C3D3]/20 rounded-full flex items-center justify-center text-[#77ABC0] font-bold border-2 border-white shadow-sm overflow-hidden">
             {user.photoURL ? <img src={user.photoURL} alt="U" /> : user.displayName?.[0]}
          </div>
          <button onClick={handleLogout} className="p-1.5 bg-[#FDFBF7] rounded-full text-[#BC8F8F] hover:bg-[#F2D7DD] transition"><LogOut size={16} /></button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">{renderContent()}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#CBABCA]/20 px-2 py-2 z-50 flex justify-around items-center pb-safe shadow-[0_-4px_20px_-10px_rgba(203,171,202,0.15)]">
        <NavBtn id="dashboard" icon={Users} label="團員" active={activeTab} set={setActiveTab} />
        <NavBtn id="logs" icon={ClipboardList} label="日誌" active={activeTab} set={setActiveTab} />
        <div className="relative -top-6">
          <button onClick={handlePrankClick} className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-4 border-[#FDFBF7] bg-[#F1CEBA] text-white transition-all duration-500 hover:rotate-12 active:scale-95" title="不要按我！"><Ghost size={24} /></button>
        </div>
        <NavBtn id="alcohol" icon={Beer} label="酒櫃" active={activeTab} set={setActiveTab} />
        {role.admin ? (
           <NavBtn id="admin" icon={Database} label="後台" active={activeTab} set={setActiveTab} />
        ) : (
           <NavBtn id="tech" icon={Zap} label="資源" active={activeTab} set={setActiveTab} />
        )}
      </nav>

      {showPrankModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs p-6 rounded-[32px] text-center shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#F1CEBA]"></div>
            <div className="w-20 h-20 bg-[#F1CEBA]/20 text-[#F1CEBA] rounded-full flex items-center justify-center mx-auto mb-4"><Ghost size={40} className="animate-bounce" /></div>
            <h3 className="text-xl font-black text-[#725E77] mb-2">👻 抓到了！</h3>
            <p className="text-[#6E7F9B] font-bold mb-6">嘿嘿！被騙了吧！<br/>這顆按鈕只是裝飾！😜</p>
            <button onClick={() => setShowPrankModal(false)} className="w-full py-3 rounded-xl bg-[#77ABC0] text-white font-bold shadow-lg shadow-[#77ABC0]/30 active:scale-95 transition">好啦我知道了</button>
          </div>
        </div>
      )}
    </div>
  );
};

const NavBtn = ({ id, icon: Icon, label, active, set }) => (
  <button onClick={() => set(id)} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${active === id ? 'text-[#77ABC0]' : 'text-[#C5B8BF] hover:text-[#CBABCA]'}`}>
    <Icon size={20} strokeWidth={active === id ? 2.5 : 2} />
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
  
  // 安全的日期排序
  const sortedPractices = [...practices]
    .filter(p => p && p.date) // 過濾無效資料
    .map(p => ({...p, dateObj: new Date(p.date)}))
    .sort((a,b) => a.dateObj - b.dateObj);
  
  const nextPractice = sortedPractices.find(p => p.dateObj >= now) || sortedPractices[sortedPractices.length - 1] || { date: new Date().toISOString(), title: '尚未安排', location: '圓頭音樂' };
  
  // 安全計算日期差異
  const nextDateObj = new Date(nextPractice.date);
  const isValidDate = !isNaN(nextDateObj.getTime());
  const diffDays = isValidDate ? Math.ceil((nextDateObj - now) / (1000 * 60 * 60 * 24)) : 0; 
  
  const endTimeObj = nextPractice.endTime ? new Date(nextPractice.endTime) : (isValidDate ? new Date(nextDateObj.getTime() + 2*60*60*1000) : null);

  const handleUpdatePractices = async () => {
    if (!db) return;
    await updateDoc(getDocRef(db, 'general', 'info'), { practices: practices });
    setEditingPractice(false);
  };

  const toggleAttendance = async (memberId, dateStr) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    const canEdit = role.admin || (user.email && member.email === user.email);
    if (!canEdit) { alert("只能修改自己的出席狀態喔！"); return; }
    const currentAttendance = member.attendance || [];
    let newAttendance = currentAttendance.includes(dateStr) 
      ? currentAttendance.filter(d => d !== dateStr) 
      : [...currentAttendance, dateStr];
    await updateDoc(getDocRef(db, 'members', memberId), { attendance: newAttendance });
  };

  const handleSaveMember = async (memberData) => {
    if (!db) return;
    if (memberData.id) await updateDoc(getDocRef(db, 'members', memberData.id), memberData);
    else await addDoc(getCollectionRef(db, 'members'), memberData);
    setEditingMember(null);
  };

  const handleDeleteMember = async (id) => {
    if (confirm("確定要刪除這位團員嗎？")) await deleteDoc(getDocRef(db, 'members', id));
  };

  const addToCalendarUrl = () => {
    if (!isValidDate) return "#";
    const start = nextDateObj.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = endTimeObj ? endTimeObj.toISOString().replace(/-|:|\.\d\d\d/g, "") : start;
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(nextPractice.title)}&dates=${start}/${end}&location=${encodeURIComponent(nextPractice.location)}`;
  };

  const renderPracticeEditor = () => (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-3xl w-full max-w-sm space-y-4 max-h-[80vh] overflow-y-auto">
        <h3 className="font-bold text-lg text-[#725E77]">設定本月練團時間</h3>
        <p className="text-xs text-slate-400">請一次規劃好本月的場次，日誌會自動連動。</p>
        {practices.map((p, idx) => (
          <div key={idx} className="bg-[#FDFBF7] p-3 rounded-xl border border-[#E0E0D9] space-y-2 relative">
             <button onClick={() => setPractices(practices.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-[#BC8F8F]"><MinusCircle size={16}/></button>
             <div className="text-xs text-[#C5B8BF] font-bold">開始</div>
             <input type="datetime-local" className="w-full bg-white p-2 rounded-lg text-sm" value={p.date} onChange={e => {
               const newP = [...practices]; newP[idx].date = e.target.value; setPractices(newP);
             }} />
             <div className="text-xs text-[#C5B8BF] font-bold">結束</div>
             <input type="datetime-local" className="w-full bg-white p-2 rounded-lg text-sm" value={p.endTime || ''} onChange={e => {
               const newP = [...practices]; newP[idx].endTime = e.target.value; setPractices(newP);
             }} />
             <input type="text" className="w-full bg-white p-2 rounded-lg text-sm" placeholder="標題 (例: 2月第一練)" value={p.title} onChange={e => {
               const newP = [...practices]; newP[idx].title = e.target.value; setPractices(newP);
             }} />
             <input type="text" className="w-full bg-white p-2 rounded-lg text-sm" placeholder="地點" value={p.location} onChange={e => {
               const newP = [...practices]; newP[idx].location = e.target.value; setPractices(newP);
             }} />
          </div>
        ))}
        <button onClick={() => setPractices([...practices, { date: new Date().toISOString(), endTime: '', title: '新練團', location: '圓頭音樂' }])} className="w-full py-2 border-2 border-dashed border-[#77ABC0] text-[#77ABC0] rounded-xl font-bold flex justify-center items-center gap-1">
          <Plus size={16}/> 增加場次
        </button>
        <div className="flex gap-2 pt-2">
          <button onClick={() => setEditingPractice(false)} className="flex-1 p-3 rounded-xl text-slate-400 font-bold">取消</button>
          <button onClick={handleUpdatePractices} className="flex-1 p-3 rounded-xl bg-[#77ABC0] text-white font-bold shadow-lg">儲存設定</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
      {editingPractice && renderPracticeEditor()}
      {editingMember && <MemberEditModal member={editingMember} onClose={() => setEditingMember(null)} onSave={handleSaveMember} />}

      <div className="bg-gradient-to-br from-[#77ABC0] to-[#6E7F9B] rounded-[32px] p-6 text-white shadow-lg shadow-[#77ABC0]/20 relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-1">
            <h2 className="text-xl font-black text-[#E0E7EA] uppercase tracking-widest drop-shadow-md">{isValidDate ? nextPractice.title : "無練團安排"}</h2>
            <div className="flex gap-2">
              {role.admin && <button onClick={() => { setPractices(generalData.practices || []); setEditingPractice(true); }} className="bg-white/20 p-2 rounded-full backdrop-blur-sm hover:bg-white/40"><Pencil size={18}/></button>}
              <a href={addToCalendarUrl()} target="_blank" className="bg-white/20 hover:bg-white/30 p-2 rounded-full backdrop-blur-sm transition active:scale-95"><CalendarPlus size={18} className="text-white"/></a>
            </div>
          </div>
          <div className="text-4xl font-black mb-1 font-mono tracking-tight drop-shadow-md">
             {isValidDate ? (diffDays > 0 ? `倒數 ${diffDays} 天` : diffDays === 0 ? "就是今天！" : "已結束") : "--"}
          </div>
          <div className="text-lg text-[#E0E7EA] font-bold mb-4 flex items-center gap-2">
            <Clock size={18}/> 
            {isValidDate 
              ? `${nextDateObj.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit' })} ${nextPractice.endTime ? `- ${new Date(nextPractice.endTime).toLocaleTimeString('zh-TW', { hour: '2-digit', minute:'2-digit' })}` : ''}`
              : "時間未定"}
          </div>
          <div className="flex items-center gap-2 bg-black/20 w-fit px-4 py-2 rounded-full backdrop-blur-sm border border-white/10"><MapPin size={16} className="text-[#E0E7EA]"/><span className="text-sm font-bold">{nextPractice.location}</span></div>
        </div>
        <PartyPopper className="absolute -right-4 -bottom-4 text-white opacity-10 rotate-12" size={140} />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#F0EEE6] p-4 rounded-2xl border border-[#F2D7DD] flex items-center gap-3 shadow-sm">
          <div className="bg-white p-2.5 rounded-full shadow-sm"><Beer size={20} className="text-[#C5A659]"/></div>
          <div><div className="text-[10px] font-bold text-[#857650] uppercase tracking-wide">酒櫃庫存</div><div className="text-xl font-black text-[#5C5142]">{alcoholCount} 瓶</div></div>
        </div>
        <div className="bg-[#E8F1E9] p-4 rounded-2xl border border-[#A8D8E2]/50 flex items-center gap-3 shadow-sm">
          <div className="bg-white p-2.5 rounded-full shadow-sm"><Check size={20} className="text-[#77ABC0]"/></div>
          <div><div className="text-[10px] font-bold text-[#6E7F9B] uppercase tracking-wide">本月練團</div><div className="text-xl font-black text-[#725E77]">{practices.length} 場</div></div>
        </div>
      </div>

      {/* 點名表 */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="font-bold text-xl text-[#725E77]">本月練團點名</h3>
          {role.admin && <button onClick={() => setEditingMember({})} className="text-xs font-bold text-[#77ABC0] bg-[#F0F4F5] px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus size={14}/> 新增團員</button>}
        </div>
        <div className="grid grid-cols-1 gap-3">
          {members.length === 0 && <div className="text-center text-[#C5B8BF] py-4">目前無團員資料</div>}
          {members.map(m => (
            <div key={m.id} onClick={() => setExpandedMember(expandedMember === m.id ? null : m.id)} className={`bg-white p-4 rounded-2xl border shadow-sm transition-all cursor-pointer ${expandedMember === m.id ? 'border-[#CBABCA] ring-1 ring-[#CBABCA]/30' : 'border-[#E0E0D9]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#E5C3D3]/30 flex items-center justify-center text-[#725E77] font-bold text-lg border border-[#E5C3D3]/50">{m.nickname?.[0] || 'M'}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#725E77] text-lg">{m.nickname}</span>
                      {m.birthday && new Date().getMonth()+1 === parseInt(m.birthday.split('-')[1]) && <span className="bg-[#BC8F8F] text-white text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm"><Cake size={10} /> 壽星</span>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#C5B8BF] font-medium"><span className="text-[#77ABC0] font-bold">{m.instrument}</span><span>•</span><span>{m.realName}</span></div>
                  </div>
                </div>
                {/* 互動式日期出席按鈕 */}
                <div className="flex gap-1.5 overflow-x-auto max-w-[120px] scrollbar-hide">
                  {practices.map(p => {
                    const dateStr = p.date.split('T')[0]; // Safe split needed here? p.date guaranteed by form
                    const isAttending = m.attendance?.includes(dateStr);
                    return (
                      <button 
                        key={p.id}
                        onClick={(e) => { e.stopPropagation(); toggleAttendance(m.id, dateStr); }}
                        className={`flex flex-col items-center justify-center w-9 h-9 rounded-xl border transition active:scale-90 ${isAttending ? 'bg-[#E8F1E9] border-[#CFE3D1] text-[#5F7A61]' : 'bg-[#F7F2F2] border-[#E8E0E0] text-[#A69898]'}`}
                        title={p.title}
                      >
                        <span className="text-[9px] font-bold leading-none">{new Date(p.date).getDate()}</span>
                        {isAttending ? <CheckCircle2 size={10}/> : <XCircle size={10}/>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {expandedMember === m.id && (
                <div className="mt-4 pt-3 border-t border-[#F2D7DD]/30 animate-in fade-in">
                  <div className="flex items-start gap-2 bg-[#FDFBF7] p-3 rounded-xl border border-[#E0E0D9]">
                    <MessageCircle size={16} className="text-[#CBABCA] shrink-0 mt-0.5"/>
                    <div><p className="text-[10px] font-bold text-[#C5B8BF] uppercase mb-0.5">管理者備註</p><p className="text-sm text-[#725E77] font-medium">{m.note}</p></div>
                  </div>
                  <div className="mt-2 flex justify-between items-center text-xs font-bold text-[#8B8C89] px-1">
                    {/* 隱私優化：前台只顯示月/日 */}
                    <span className="flex items-center gap-1"><Calendar size={12}/> 生日: {formatBirthdayDisplay(m.birthday)} ({getZodiac(m.birthday)})</span>
                    {role.admin && (
                      <div className="flex gap-3">
                         <button onClick={(e) => { e.stopPropagation(); setEditingMember(m); }} className="text-[#77ABC0] hover:text-[#50656e] flex items-center gap-1"><Pencil size={12}/> 編輯</button>
                         <button onClick={(e) => { e.stopPropagation(); handleDeleteMember(m.id); }} className="text-[#BC8F8F] hover:text-red-600 flex items-center gap-1"><Trash2 size={12}/> 刪除</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Member Edit Modal ---
const MemberEditModal = ({ member, onClose, onSave }) => {
  const [form, setForm] = useState(member || {});
  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-3xl w-full max-w-sm space-y-3">
        <h3 className="font-bold text-lg text-[#725E77]">{member.id ? '編輯團員' : '新增團員'}</h3>
        <div className="grid grid-cols-2 gap-2">
           <input className="bg-[#FDFBF7] p-3 rounded-xl text-sm" placeholder="暱稱" value={form.nickname || ''} onChange={e => setForm({...form, nickname: e.target.value})} />
           <input className="bg-[#FDFBF7] p-3 rounded-xl text-sm" placeholder="本名" value={form.realName || ''} onChange={e => setForm({...form, realName: e.target.value})} />
        </div>
        <input className="w-full bg-[#FDFBF7] p-3 rounded-xl text-sm border border-[#77ABC0]/30" placeholder="Google Email (權限綁定用)" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} />
        <input className="w-full bg-[#FDFBF7] p-3 rounded-xl text-sm" placeholder="樂器 (Vocal, Bass...)" value={form.instrument || ''} onChange={e => setForm({...form, instrument: e.target.value})} />
        <input type="date" className="w-full bg-[#FDFBF7] p-3 rounded-xl text-sm" value={form.birthday || ''} onChange={e => setForm({...form, birthday: e.target.value})} />
        <textarea className="w-full bg-[#FDFBF7] p-3 rounded-xl text-sm h-20" placeholder="備註..." value={form.note || ''} onChange={e => setForm({...form, note: e.target.value})} />
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 p-3 rounded-xl text-[#C5B8BF] font-bold">取消</button>
          <button onClick={() => onSave(form)} className="flex-1 p-3 rounded-xl bg-[#77ABC0] text-white font-bold shadow-lg shadow-[#77ABC0]/20">儲存</button>
        </div>
      </div>
    </div>
  );
};

// --- 2. 日誌管理器 ---
const SessionLogManager = ({ sessions, scheduledDates, members, settings, db, role }) => {
  const [activeSessionId, setActiveSessionId] = useState(null);
  
  // scheduledDates 現在是 practices 陣列，需要先提取日期
  const practices = scheduledDates || []; 

  // 安全過濾
  const pendingPractices = practices.filter(p => {
      if(!p.date) return false;
      const pDate = p.date.split('T')[0];
      return !sessions.some(s => s.date.startsWith(pDate));
  }).sort((a,b) => new Date(a.date) - new Date(b.date));

  const [showManualCreate, setShowManualCreate] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  const handleCreate = async (dateStr, location = '未定地點') => {
    if (!db) return;
    const newSession = { 
        date: dateStr, 
        location: location, 
        funNotes: '', 
        tracks: [], 
        miscExpenses: [], 
        createdAt: serverTimestamp() 
    };
    try {
      const docRef = await addDoc(getCollectionRef(db, 'logs'), newSession);
      setActiveSessionId(docRef.id);
      setShowManualCreate(false);
    } catch(e) { alert("Error: " + e.message); }
  };

  if (activeSessionId) {
    const session = sessions.find(s => s.id === activeSessionId);
    if (!session) return <div className="p-10 text-center text-[#CBABCA]">正在同步...</div>;
    return <SessionDetail session={session} members={members} settings={settings} onBack={() => setActiveSessionId(null)} db={db} role={role} />;
  }

  return (
    <div className="space-y-4 animate-in slide-in-from-right-8">
      <div className="flex justify-between items-end px-1">
        <h2 className="text-2xl font-bold text-[#725E77]">練團日誌</h2>
        {role.admin && (
           <button 
             onClick={() => setShowManualCreate(true)} 
             className="text-xs font-bold text-[#77ABC0] bg-[#F0F4F5] px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#E0E7EA]"
           >
             <FilePlus size={14}/> 自訂日誌
           </button>
        )}
      </div>
      
      {role.admin && pendingPractices.map(p => (
        <button key={p.id} onClick={() => handleCreate(p.date.split('T')[0], p.location)} className="w-full p-4 rounded-[28px] border-2 border-dashed border-[#CBABCA] bg-[#FDFBF7] flex items-center justify-between text-[#CBABCA] hover:bg-[#FFF5F7] transition group">
          <div className="flex items-center gap-3">
            <div className="bg-[#F2D7DD]/30 p-2 rounded-full group-hover:scale-110 transition text-[#CBABCA]"><Plus size={20}/></div>
            <div className="text-left">
                <div className="font-bold text-lg text-[#CBABCA]">{new Date(p.date).toLocaleDateString()} 待補</div>
                <div className="text-xs opacity-70 text-[#C5B8BF]">{p.title}</div>
            </div>
          </div>
          <ChevronDown className="-rotate-90 opacity-50 text-[#C5B8BF]" />
        </button>
      ))}

      {/* 手動新增 Modal */}
      {showManualCreate && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
           <div className="bg-white p-6 rounded-3xl w-full max-w-sm space-y-4">
              <h3 className="font-bold text-lg text-[#725E77]">自訂新增日誌</h3>
              <p className="text-xs text-[#C5B8BF]">若要補登過去或臨時加練的場次，請選擇日期。</p>
              <input type="date" className="w-full bg-[#FDFBF7] p-3 rounded-xl text-sm" value={manualDate} onChange={e => setManualDate(e.target.value)} />
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowManualCreate(false)} className="flex-1 p-3 rounded-xl text-[#C5B8BF] font-bold">取消</button>
                <button onClick={() => handleCreate(manualDate)} className="flex-1 p-3 rounded-xl bg-[#77ABC0] text-white font-bold shadow-lg">建立</button>
              </div>
           </div>
        </div>
      )}

      {sessions.map(s => (
        <div key={s.id} onClick={() => setActiveSessionId(s.id)} className="bg-white p-5 rounded-[28px] shadow-sm border border-[#E0E0D9] cursor-pointer hover:border-[#77ABC0]/50 transition relative group">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="bg-[#A8D8E2]/20 text-[#6E7F9B] text-[10px] font-bold px-2 py-0.5 rounded border border-[#A8D8E2]/30">{s.date}</span>
              <h3 className="font-bold text-xl mt-1 text-[#725E77]">{s.tracks?.length || 0} 首歌</h3>
            </div>
            <div className="bg-[#FDFBF7] p-2 rounded-full text-[#C5B8BF] group-hover:bg-[#E5C3D3]/20 group-hover:text-[#CBABCA] transition"><ChevronDown className="-rotate-90" size={20}/></div>
          </div>
          {s.funNotes && <p className="text-xs text-[#C5B8BF] truncate">👻 {s.funNotes}</p>}
        </div>
      ))}
    </div>
  );
};

// --- 日誌詳情 ---
const SessionDetail = ({ session, members, settings, onBack, db, role }) => {
  const [tab, setTab] = useState('tracks'); 
  const [funNotes, setFunNotes] = useState(session.funNotes || "");

  const handleUpdateNotes = async () => {
    if (!db) return;
    await updateDoc(getDocRef(db, 'logs', session.id), { funNotes });
  };

  return (
    <div className="animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-1 text-[#C5B8BF] font-bold text-sm mb-4 hover:text-[#725E77]"><ChevronDown className="rotate-90" size={16}/> 返回列表</button>
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-[#E0E0D9] mb-6">
        <h1 className="text-3xl font-black text-[#725E77]">{session.date}</h1>
        <div className="flex items-center gap-2 text-[#C5B8BF] text-sm font-bold mt-1"><MapPin size={14}/> {session.location}</div>
        <div className="mt-4 bg-[#F2D7DD]/20 p-3 rounded-2xl border border-[#CBABCA]/20 flex gap-2 items-start">
          <Smile size={16} className="text-[#F1CEBA] shrink-0 mt-0.5"/>
          <textarea 
            className="bg-transparent w-full text-xs font-bold text-[#725E77] outline-none resize-none h-auto min-h-[40px]" 
            value={funNotes} 
            onChange={e => setFunNotes(e.target.value)}
            onBlur={handleUpdateNotes} 
            placeholder="輸入不負責任備註..."
          />
        </div>
      </div>

      <div className="flex bg-[#E0E0D9]/50 p-1 rounded-xl mb-6">
        <button onClick={() => setTab('tracks')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${tab === 'tracks' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}><Music2 size={14}/> 曲目</button>
        <button onClick={() => setTab('practice-fee')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${tab === 'practice-fee' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}><ShieldCheck size={14}/> 練團費</button>
        <button onClick={() => setTab('misc-fee')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${tab === 'misc-fee' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}><Coffee size={14}/> 雜支分攤</button>
      </div>

      <div className="bg-white rounded-[32px] border border-[#E0E0D9] p-2 min-h-[300px]">
        {tab === 'tracks' && <TrackList session={session} db={db} />}
        {tab === 'practice-fee' && <PracticeFeeCalculator session={session} members={members} settings={settings} role={role} />}
        {tab === 'misc-fee' && <MiscFeeCalculator session={session} members={members} settings={settings} />}
      </div>
    </div>
  );
};

// --- TrackList (任何人可編輯內容) ---
const TrackList = ({ session, db }) => {
  const [expandedTrack, setExpandedTrack] = useState(null);
  const [newTrackName, setNewTrackName] = useState("");
  const [newComment, setNewComment] = useState("");
  const tracks = session.tracks || [];
  
  // 取得當前使用者 (為了留言顯示名字)
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const handleAddTrack = async () => {
    if (!newTrackName.trim() || !db) return;
    const newTrack = { id: Date.now(), title: newTrackName, status: 'new', link: '', comments: [] };
    await updateDoc(getDocRef(db, 'logs', session.id), { tracks: [...tracks, newTrack] });
    setNewTrackName("");
  };

  const handleAddComment = async (trackId) => {
    if (!newComment.trim()) return;
    const updatedTracks = tracks.map(t => {
      if (t.id === trackId) {
        return { 
           ...t, 
           comments: [...(t.comments || []), { user: currentUser?.displayName || '團員', text: newComment }] 
        };
      }
      return t;
    });
    await updateDoc(getDocRef(db, 'logs', session.id), { tracks: updatedTracks });
    setNewComment("");
  };

  return (
    <div className="p-3 space-y-3">
      {tracks.map(t => (
        <div key={t.id} className="border border-[#E0E0D9] rounded-2xl overflow-hidden">
          <div className="bg-[#FAFAF9] p-4 flex justify-between items-center cursor-pointer" onClick={() => setExpandedTrack(expandedTrack === t.id ? null : t.id)}>
            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${t.status === 'ready' ? 'bg-[#77ABC0]' : 'bg-[#F1CEBA]'}`}></span>
              <span className="font-bold text-[#725E77]">{t.title}</span>
            </div>
            <ChevronDown size={16} className={`text-[#C5B8BF] ${expandedTrack === t.id ? 'rotate-180' : ''}`}/>
          </div>
          {expandedTrack === t.id && (
            <div className="p-4 bg-white border-t border-[#E0E0D9] space-y-3">
              {t.link && <a href={t.link} target="_blank" className="flex items-center gap-2 text-xs text-[#77ABC0] font-bold bg-[#A8D8E2]/20 p-2 rounded-lg"><Play size={14}/> {t.link}</a>}
              <div className="space-y-2">
                {(t.comments || []).map((c, i) => <div key={i} className="text-xs bg-[#FDFBF7] p-2 rounded-lg text-[#6E7F9B]"><span className="font-bold text-[#725E77]">{c.user}:</span> {c.text}</div>)}
                <div className="flex gap-2">
                   <input 
                     className="w-full bg-[#FDFBF7] text-xs p-2 rounded-lg outline-none text-[#725E77]" 
                     placeholder="輸入留言..." 
                     value={newComment}
                     onChange={e => setNewComment(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleAddComment(t.id)}
                   />
                   <button onClick={() => handleAddComment(t.id)} className="text-[#77ABC0]"><Check size={16}/></button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <input className="flex-1 bg-[#FDFBF7] border border-[#E0E0D9] rounded-xl px-3 text-xs outline-none" placeholder="輸入新歌名..." value={newTrackName} onChange={e => setNewTrackName(e.target.value)} />
        <button onClick={handleAddTrack} className="px-4 py-3 bg-[#77ABC0]/10 text-[#77ABC0] font-bold text-xs flex items-center justify-center gap-1 border border-dashed border-[#77ABC0]/50 hover:bg-[#77ABC0]/20 rounded-2xl transition"><Plus size={14}/> 新增</button>
      </div>
    </div>
  );
};

// --- 練團費計算機 (限制: Admin 或 財務) ---
const PracticeFeeCalculator = ({ session, members, settings, role }) => {
  const [selectedIds, setSelectedIds] = useState(members.filter(m => m.attendance?.includes(session.date)).map(m => m.id));
  const [hours, setHours] = useState(2);
  const [hasKB, setHasKB] = useState(true);
  const [bankAccount, setBankAccount] = useState(settings?.studioBankAccount || "");
  const [copied, setCopied] = useState(false);

  const total = (hours * (settings?.studioRate || 350)) + (hasKB ? (settings?.kbRate || 200) : 0);
  const perPerson = selectedIds.length > 0 ? Math.ceil(total / selectedIds.length) : 0;

  const copyText = () => {
    const names = selectedIds.map(id => members.find(m => m.id === id)?.nickname).join('、');
    const text = `📅 ${session.date} 練團費用\n----------------\n⏱️ 時數：${hours}hr\n🎹 KB租借：${hasKB?'有':'無'}\n👥 分攤人：${names}\n----------------\n💰 總金額：$${total}\n👉 每人應付：$${perPerson}\n\n匯款帳號：\n${bankAccount}`;
    if(secureCopy(text)) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div className="p-4 space-y-5">
      <div className="bg-[#F0F4F5] p-4 rounded-2xl text-center border border-[#A8D8E2]/30">
        <div className="text-3xl font-black text-[#77ABC0] mb-1">${total}</div>
        <div className="text-xs font-bold text-[#6E7F9B]">每人 <span className="text-lg text-[#725E77]">${perPerson}</span></div>
      </div>
      {role.finance ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            {[2, 3].map(h => <button key={h} onClick={() => setHours(h)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${hours === h ? 'bg-[#725E77] text-white' : 'bg-[#FDFBF7] text-[#C5B8BF]'}`}>{h}hr</button>)}
            <button onClick={() => setHasKB(!hasKB)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${hasKB ? 'bg-[#77ABC0] text-white' : 'bg-[#FDFBF7] text-[#C5B8BF]'}`}>KB {hasKB?'+':'-'}</button>
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#C5B8BF] mb-2 block uppercase">出席確認</label>
            <div className="flex flex-wrap gap-2">
              {members.map(m => (
                <button key={m.id} onClick={() => setSelectedIds(prev => prev.includes(m.id) ? prev.filter(i => i!==m.id) : [...prev, m.id])} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedIds.includes(m.id) ? 'bg-[#A8D8E2]/20 border-[#A8D8E2] text-[#5F8794]' : 'bg-white border-[#E0E0D9] text-[#C5B8BF]'}`}>{m.nickname}</button>
              ))}
            </div>
          </div>
          <input className="w-full bg-[#FDFBF7] p-3 rounded-xl text-xs text-[#725E77] border border-transparent focus:border-[#77ABC0] outline-none" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
        </div>
      ) : (
        <div className="text-center text-[#CBABCA] text-xs py-4 flex flex-col items-center gap-2">
          <Lock size={20}/> 僅財務大臣可編輯
        </div>
      )}
      <button onClick={copyText} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${copied ? 'bg-[#8DA399] text-white' : 'bg-[#77ABC0] text-white'}`}>{copied ? <Check size={16}/> : <Copy size={16}/>} 複製請款文</button>
    </div>
  );
};

// --- 雜支分攤 ---
const MiscFeeCalculator = ({ session, members, settings }) => {
  const [items, setItems] = useState(session.miscExpenses || []); 
  const [newItem, setNewItem] = useState({ item: '', amount: '', payerId: '', splitters: [] });
  const [copied, setCopied] = useState(false);

  const handleAdd = () => {
    if(!newItem.item || !newItem.amount || !newItem.payerId) return;
    setItems([...items, { ...newItem, id: Date.now() }]);
    setNewItem({ item: '', amount: '', payerId: '', splitters: [] });
  };

  const copyText = () => {
    let text = `🍱 ${session.date} 雜支明細\n----------------\n`;
    items.forEach(i => {
      const payer = members.find(m => m.id === i.payerId)?.nickname;
      const splitters = i.splitters.map(id => members.find(m => m.id === id)?.nickname).join('、');
      const per = Math.ceil(i.amount / i.splitters.length);
      text += `🔹 ${i.item} ($${i.amount})\n   墊付: ${payer}\n   分攤: ${splitters}\n   👉 每人給 ${payer} $${per}\n\n`;
    });
    const success = secureCopy(text);
    if(success) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div className="p-4 space-y-6">
      {/* 新增區塊 */}
      <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E0E0D9] space-y-3">
        <div className="flex gap-2">
          <input className="flex-1 bg-white p-2 rounded-xl text-xs outline-none text-[#725E77]" placeholder="項目 (例: 雞排)" value={newItem.item} onChange={e=>setNewItem({...newItem, item: e.target.value})} />
          <input className="w-20 bg-white p-2 rounded-xl text-xs outline-none text-[#725E77]" type="number" placeholder="$" value={newItem.amount} onChange={e=>setNewItem({...newItem, amount: e.target.value})} />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] font-bold text-[#C5B8BF] shrink-0">墊付:</span>
          {members.map(m => (
            <button key={m.id} onClick={()=>setNewItem({...newItem, payerId: m.id})} className={`px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${newItem.payerId === m.id ? 'bg-[#F1CEBA] text-white border-[#F1CEBA]' : 'bg-white text-[#C5B8BF] border-[#E0E0D9]'}`}>{m.nickname}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] font-bold text-[#C5B8BF] shrink-0">分攤:</span>
          {members.map(m => (
            <button key={m.id} onClick={()=>{
              const has = newItem.splitters.includes(m.id);
              setNewItem({...newItem, splitters: has ? newItem.splitters.filter(x=>x!==m.id) : [...newItem.splitters, m.id]});
            }} className={`px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${newItem.splitters.includes(m.id) ? 'bg-[#725E77] text-white border-[#725E77]' : 'bg-white text-[#C5B8BF] border-[#E0E0D9]'}`}>{m.nickname}</button>
          ))}
        </div>
        <button onClick={handleAdd} className="w-full bg-[#725E77] text-white text-xs font-bold py-2 rounded-xl active:scale-95 transition">加入清單</button>
      </div>

      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="bg-white border border-[#E0E0D9] p-3 rounded-xl flex justify-between items-center text-xs">
            <div>
              <div className="font-bold text-[#725E77]">{it.item} <span className="text-[#F1CEBA]">${it.amount}</span></div>
              <div className="text-[#C5B8BF] text-[10px]">墊付: {members.find(m=>m.id===it.payerId)?.nickname}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-[#F1CEBA]">每人 ${Math.ceil(it.amount/it.splitters.length)}</div>
              <div className="text-[#C5B8BF] text-[10px]">{it.splitters.length} 人分</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={copyText} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${copied ? 'bg-[#8DA399] text-white' : 'bg-[#CBABCA] text-white'}`}>{copied ? <Check size={16}/> : <Copy size={16}/>} 複製請款文</button>
    </div>
  );
};

// --- 4. Alcohol Manager (補貨計算機) ---
const AlcoholManager = ({ alcohols, members, settings, db, role }) => {
  const [tab, setTab] = useState('list'); // list, calculator
  const [newAlcohol, setNewAlcohol] = useState({ name: '', type: 'Whiskey', level: 100, rating: 5, note: '' });
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = async () => {
    if (!newAlcohol.name) return;
    await addDoc(getCollectionRef(db, 'alcohol'), newAlcohol);
    setShowAdd(false);
    setNewAlcohol({ name: '', type: 'Whiskey', level: 100, rating: 5, note: '' });
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-right-8">
      <div className="flex bg-[#E0E0D9] p-1 rounded-xl mb-2">
        <button onClick={() => setTab('list')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${tab === 'list' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}>庫存清單</button>
        <button onClick={() => setTab('calculator')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${tab === 'calculator' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}>補貨計算</button>
      </div>

      {tab === 'list' ? (
        <div className="space-y-3">
          {role.alcohol && (
            <button onClick={() => setShowAdd(true)} className="w-full py-3 text-[#CBABCA] font-bold text-xs flex items-center justify-center gap-1 border border-dashed border-[#CBABCA] rounded-2xl hover:bg-[#FFF5F7]"><Plus size={14}/> 新增酒品</button>
          )}

          {showAdd && (
            <div className="bg-white p-4 rounded-[24px] border border-[#77ABC0] space-y-3">
               <input className="w-full bg-[#FDFBF7] p-2 rounded-lg text-sm" placeholder="酒名" value={newAlcohol.name} onChange={e=>setNewAlcohol({...newAlcohol, name: e.target.value})} />
               <select className="w-full bg-[#FDFBF7] p-2 rounded-lg text-sm" value={newAlcohol.type} onChange={e=>setNewAlcohol({...newAlcohol, type: e.target.value})}>
                 <option value="Whiskey">Whiskey</option>
                 <option value="Gin">Gin</option>
                 <option value="Beer">Beer</option>
                 <option value="Other">Other</option>
               </select>
               <input className="w-full bg-[#FDFBF7] p-2 rounded-lg text-sm" placeholder="備註..." value={newAlcohol.note} onChange={e=>setNewAlcohol({...newAlcohol, note: e.target.value})} />
               <div className="flex gap-2">
                  <button onClick={() => setShowAdd(false)} className="flex-1 p-2 text-xs text-slate-400">取消</button>
                  <button onClick={handleAdd} className="flex-1 p-2 bg-[#77ABC0] text-white rounded-lg text-xs font-bold">儲存</button>
               </div>
            </div>
          )}

          {alcohols.map(a => (
            <div key={a.id} className="bg-white p-5 rounded-[28px] border border-[#E0E0D9] shadow-sm flex gap-4 items-start">
              <div className="bg-[#F0EEE6] w-16 h-20 rounded-2xl flex items-center justify-center shrink-0"><Wine className="text-[#D6C592]" size={32} /></div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-[#725E77]">{a.name}</h3>
                  <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} size={12} className={i < a.rating ? "fill-[#F1CEBA] text-[#F1CEBA]" : "text-[#E0E0D9]"} />)}</div>
                </div>
                <p className="text-xs font-bold text-[#8B8C89] mb-2">{a.type}</p>
                <div className="w-full bg-[#FDFBF7] h-2 rounded-full overflow-hidden mb-2"><div className="bg-[#F1CEBA] h-full rounded-full" style={{width: `${a.level}%`}}></div></div>
                <div className="mt-3 bg-[#FDFBF7] p-2 rounded-xl text-xs text-[#6E7F9B]">💬 {a.note}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <AlcoholFeeCalculator members={members} settings={settings} />
      )}
    </div>
  );
};

const AlcoholFeeCalculator = ({ members, settings }) => {
  const [amount, setAmount] = useState('');
  const [items, setItems] = useState('');
  const [drinkers, setDrinkers] = useState([]);
  const [bankAccount, setBankAccount] = useState(settings?.miscBankAccount);
  const [copied, setCopied] = useState(false);

  const perPerson = drinkers.length > 0 && amount ? Math.ceil(parseInt(amount) / drinkers.length) : 0;

  const copyText = () => {
    const names = drinkers.map(id => members.find(m => m.id === id)?.nickname).join('、');
    const text = `🍺 酒水補貨費用\n----------------\n🍾 項目：${items}\n👥 分攤人：${names}\n----------------\n💰 總金額：$${amount}\n👉 每人應付：$${perPerson}\n\n匯款帳號：\n${bankAccount}`;
    if(secureCopy(text)) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-[#E0E0D9] space-y-5">
      <div className="text-center bg-[#F9F6F0] p-4 rounded-2xl border border-[#F1CEBA]/20">
        <div className="text-3xl font-black text-[#F1CEBA]">${amount || 0}</div>
        <div className="text-xs font-bold text-[#8C8473]">每人 <span className="text-lg">${perPerson}</span></div>
      </div>
      <input type="number" placeholder="總金額" className="w-full bg-[#FDFBF7] p-3 rounded-xl text-center font-bold outline-none text-[#725E77]" value={amount} onChange={e=>setAmount(e.target.value)} />
      <input type="text" placeholder="買了什麼？" className="w-full bg-[#FDFBF7] p-3 rounded-xl text-xs outline-none text-[#725E77]" value={items} onChange={e=>setItems(e.target.value)} />
      <div>
        <label className="text-[10px] font-bold text-[#C5B8BF] mb-2 block uppercase">分攤名單</label>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <button key={m.id} onClick={() => setDrinkers(prev => prev.includes(m.id) ? prev.filter(i=>i!==m.id) : [...prev, m.id])} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${drinkers.includes(m.id) ? 'bg-[#F2D7DD]/30 border-[#BC8F8F] text-[#BC8F8F]' : 'bg-white border-[#E0E0D9] text-[#C5B8BF]'}`}>{m.nickname}</button>
          ))}
        </div>
      </div>
      <input className="w-full bg-[#FDFBF7] p-3 rounded-xl text-xs text-[#725E77]" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
      <button onClick={copyText} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${copied ? 'bg-[#8DA399] text-white' : 'bg-[#CBABCA] text-white'}`}>{copied ? <Check size={16}/> : <Copy size={16}/>} 複製請款文</button>
    </div>
  );
};

// --- 5. Tech View ---
const TechView = ({ songs, db, role, user }) => {
  const [viewMode, setViewMode] = useState('list'); 
  const [filter, setFilter] = useState('all'); 
  const [showAdd, setShowAdd] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', artist: '', link: '', type: 'cover' });

  const filteredSongs = filter === 'all' ? songs : songs.filter(s => s.type.toLowerCase() === filter);

  const handleAdd = async () => {
    if (!newSong.title || !db) return;
    await addDoc(getCollectionRef(db, 'songs'), { ...newSong, user: user.displayName });
    setShowAdd(false);
    setNewSong({ title: '', artist: '', link: '', type: 'cover' });
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-right-8">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-bold text-[#725E77]">資源分享</h2>
        <div className="flex bg-[#E0E0D9]/50 p-1 rounded-lg">
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white text-[#725E77]' : 'text-[#C5B8BF]'}`}><List size={16}/></button>
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white text-[#725E77]' : 'text-[#C5B8BF]'}`}><LayoutGrid size={16}/></button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', 'cover', 'tech', 'gear'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition ${filter === f ? 'bg-[#77ABC0] text-white' : 'bg-white border border-[#E0E0D9] text-[#C5B8BF]'}`}>
            {f}
          </button>
        ))}
      </div>
      
      {/* 新增資源按鈕 (人人可按) */}
      <button onClick={() => setShowAdd(true)} className="w-full py-3 text-[#77ABC0] font-bold text-xs flex items-center justify-center gap-1 border border-dashed border-[#77ABC0]/50 hover:bg-[#77ABC0]/5 rounded-2xl transition"><Plus size={14}/> 分享資源</button>

      {showAdd && (
         <div className="bg-white p-4 rounded-[24px] border border-[#77ABC0] space-y-3">
             <input className="w-full bg-[#FDFBF7] p-2 rounded-lg text-sm" placeholder="標題 (歌名/器材名)" value={newSong.title} onChange={e=>setNewSong({...newSong, title: e.target.value})} />
             <input className="w-full bg-[#FDFBF7] p-2 rounded-lg text-sm" placeholder="說明 (歌手/用途)" value={newSong.artist} onChange={e=>setNewSong({...newSong, artist: e.target.value})} />
             <input className="w-full bg-[#FDFBF7] p-2 rounded-lg text-sm" placeholder="連結 (Youtube/Drive)" value={newSong.link} onChange={e=>setNewSong({...newSong, link: e.target.value})} />
             <select className="w-full bg-[#FDFBF7] p-2 rounded-lg text-sm" value={newSong.type} onChange={e=>setNewSong({...newSong, type: e.target.value})}>
                 <option value="cover">Cover</option>
                 <option value="tech">Tech</option>
                 <option value="gear">Gear</option>
             </select>
             <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 p-2 text-xs text-slate-400">取消</button>
                <button onClick={handleAdd} className="flex-1 p-2 bg-[#77ABC0] text-white rounded-lg text-xs font-bold">發布</button>
             </div>
         </div>
      )}

      <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-3" : "space-y-3"}>
        {filteredSongs.map(s => (
          <a key={s.id} href={s.link} className={`bg-white p-4 rounded-[24px] border border-[#E0E0D9] shadow-sm hover:shadow-md transition block ${viewMode === 'list' ? 'flex items-center gap-4' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${s.type === 'cover' ? 'bg-[#FDF2F2] text-[#BC8F8F]' : s.type === 'tech' ? 'bg-[#F0F4F5] text-[#6D8A96]' : 'bg-[#FFF9DB] text-[#D6C592]'}`}>
              {s.type === 'cover' ? <Headphones size={20}/> : s.type === 'tech' ? <Zap size={20}/> : <Gift size={20}/>}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-[#725E77] truncate">{s.title}</h4>
              <p className="text-xs text-[#8B8C89]">{s.artist}</p>
              {viewMode === 'grid' && <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[#77ABC0]">開啟 <ExternalLink size={10}/></div>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

// --- 6. Admin Dashboard (後台管理) ---
const AdminDashboard = ({ members, logs, db }) => {
  const [tab, setTab] = useState('members');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleExport = () => {
    const dataToExport = tab === 'members' ? members : logs;
    const filteredData = dataToExport.filter(item => {
       const inDateRange = tab === 'logs' && filterStart && filterEnd ? (item.date >= filterStart && item.date <= filterEnd) : true;
       const matchesSearch = searchTerm ? Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase())) : true;
       return inDateRange && matchesSearch;
    });

    const formattedData = filteredData.map(item => {
      if (tab === 'members') {
        return { 暱稱: item.nickname, 本名: item.realName, 樂器: item.instrument, 生日: item.birthday, Email: item.email || '未設定', 備註: item.note };
      } else {
        return { 日期: item.date, 地點: item.location, 曲目數: item.tracks?.length || 0, 備註: item.funNotes };
      }
    });

    exportToCSV(formattedData, `Band_${tab}_export_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const handleDelete = async (collectionName, id) => {
    if (confirm("⚠️ 警告：這將永久刪除此筆資料！確定嗎？")) {
      await deleteDoc(getDocRef(db, collectionName, id));
    }
  };

  const displayData = (tab === 'members' ? members : logs).filter(item => {
     const inDateRange = tab === 'logs' && filterStart && filterEnd ? (item.date >= filterStart && item.date <= filterEnd) : true;
     const matchesSearch = searchTerm ? Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase())) : true;
     return inDateRange && matchesSearch;
  });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 pb-20">
      <div className="bg-white p-5 rounded-[32px] border border-[#E0E0D9] shadow-sm">
        <h2 className="text-xl font-black text-[#725E77] flex items-center gap-2 mb-4"><Database size={24}/> 後台管理系統</h2>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button onClick={() => setTab('members')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${tab === 'members' ? 'bg-[#77ABC0] text-white' : 'bg-[#F0F4F5] text-[#77ABC0]'}`}>成員名單</button>
          <button onClick={() => setTab('logs')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${tab === 'logs' ? 'bg-[#77ABC0] text-white' : 'bg-[#F0F4F5] text-[#77ABC0]'}`}>練團紀錄</button>
        </div>
        <div className="bg-[#FDFBF7] p-3 rounded-xl border border-[#E0E0D9] mb-4 space-y-2">
            <div className="text-[10px] font-bold text-[#C5B8BF] uppercase flex items-center gap-1"><Search size={10}/> 關鍵字搜尋</div>
            <input type="text" className="w-full p-2 rounded-lg text-xs bg-white border border-[#E0E0D9] outline-none focus:ring-1 ring-[#77ABC0]" placeholder={tab === 'members' ? "搜尋姓名、樂器..." : "搜尋地點、備註..."} value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
        </div>
        {tab === 'logs' && (
          <div className="bg-[#FDFBF7] p-3 rounded-xl border border-[#E0E0D9] mb-4 space-y-2">
            <div className="text-[10px] font-bold text-[#C5B8BF] uppercase flex items-center gap-1"><Filter size={10}/> 日期篩選</div>
            <div className="flex gap-2">
              <input type="date" className="w-full p-2 rounded-lg text-xs bg-white border border-[#E0E0D9]" value={filterStart} onChange={e=>setFilterStart(e.target.value)} />
              <span className="text-[#C5B8BF] self-center">~</span>
              <input type="date" className="w-full p-2 rounded-lg text-xs bg-white border border-[#E0E0D9]" value={filterEnd} onChange={e=>setFilterEnd(e.target.value)} />
            </div>
          </div>
        )}
        <button onClick={handleExport} className="w-full py-3 bg-[#E8F1E9] text-[#5F7A61] rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-[#CFE3D1] hover:bg-[#CFE3D1] transition"><Download size={16}/> 匯出報表 (CSV)</button>
      </div>
      <div className="bg-white rounded-[24px] border border-[#E0E0D9] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F0F4F5] text-[#77ABC0]">
            <tr>
              <th className="p-3 font-bold">{tab === 'members' ? '暱稱/本名' : '日期/地點'}</th>
              <th className="p-3 font-bold text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((item, idx) => (
              <tr key={item.id} className="border-t border-[#FDFBF7] hover:bg-[#F9F9F9]">
                <td className="p-3">
                  <div className="font-bold text-[#725E77]">{tab === 'members' ? item.nickname : item.date}</div>
                  <div className="text-[10px] text-[#C5B8BF]">{tab === 'members' ? `${item.realName} (${item.birthday || '無生日'})` : item.location}</div>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => handleDelete(tab === 'members' ? 'members' : 'logs', item.id)} className="p-2 bg-[#F2D7DD]/50 text-[#BC8F8F] rounded-lg hover:bg-[#BC8F8F] hover:text-white transition"><Trash2 size={14}/></button>
                </td>
              </tr>
            ))}
            {displayData.length === 0 && <tr><td colSpan="2" className="p-4 text-center text-[#C5B8BF]">無符合資料</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;
