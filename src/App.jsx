import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signInWithCustomToken, signOut, signInWithRedirect, getRedirectResult, setPersistence, browserLocalPersistence } from 'firebase/auth';
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
  Database, Download, Filter, Search, Clock, CheckSquare,
  User, StickyNote, ArrowRight, Calculator, Link as LinkIcon, Youtube
} from 'lucide-react';

// ==========================================
// 🛡️ 錯誤邊界元件 (防止白頁)
// ==========================================
// 修正 1：移除 TS 泛型語法 <any, any>，避免在純 JS 環境或嚴格 JSX 解析器中報錯
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
          <AlertTriangle size={48} className="text-red-500 mb-4"/>
          <h2 className="text-xl font-bold mb-2">程式發生錯誤</h2>
          <p className="text-sm text-slate-500 mb-4">別擔心，這通常只是暫時的資料問題。</p>
          <pre className="bg-slate-200 p-4 rounded-lg text-xs overflow-auto max-w-full mb-6 border border-slate-300 w-full">{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#77ABC0] text-white rounded-xl font-bold shadow-lg">重新整理頁面</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 🔐 設定與常數
// ==========================================

const ADMIN_EMAILS = [
  "jamie.chou0917@gmail.com",
  "demo@test.com"
];

const ROLE_FINANCE_NAME = "陳昱維"; 
const ROLE_ALCOHOL_NAME = "李家賢"; 
const BAND_NAME = "不開玩笑";
const BAND_LOGO_BASE64 = ""; 
const BAND_LOGO_URL = ""; 
const MORANDI_COLORS = ['#8C736F', '#AAB8AB', '#B7B7BD', '#CCD2CC', '#9F8D8B', '#8FA39A'];

// 時間選單生成器 (08:00 - 23:30)
const TIME_SLOTS = [];
for (let i = 8; i < 24; i++) {
  const h = i.toString().padStart(2, '0');
  TIME_SLOTS.push(`${h}:00`, `${h}:30`);
}

const stringToColor = (str) => {
  if (!str) return MORANDI_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MORANDI_COLORS[Math.abs(hash) % MORANDI_COLORS.length];
};

const getMemberStyle = (name) => {
    return { 
        color: stringToColor(name), 
        Icon: User 
    };
};

const BandLogo = () => (
  <div className="w-9 h-9 bg-[#CBABCA] rounded-xl flex items-center justify-center text-white shadow-md shadow-[#CBABCA]/30 overflow-hidden relative">
    <Disc size={22} className="animate-spin" style={{animationDuration: '10s'}}/>
    <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#F1CEBA] rounded-full opacity-90 border border-white/50"></div>
  </div>
);

// --- 工具函式 ---
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
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const formatBirthdayDisplay = (dateStr) => {
  if (!dateStr) return "未知";
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : dateStr;
};

const getZodiac = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
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
let firebaseConfig;
const IS_CANVAS = typeof __firebase_config !== 'undefined';
try { firebaseConfig = IS_CANVAS ? JSON.parse(__firebase_config) : USER_CONFIG; } catch (e) { firebaseConfig = USER_CONFIG; }
const storageAppId = IS_CANVAS ? (typeof __app_id !== 'undefined' ? __app_id : 'band-manager-preview') : null;

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
  practices: [],
  prankMessage: "👻 抓到了！"
};

// --- Main App ---
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [imgError, setImgError] = useState(false);
  const [showPrankModal, setShowPrankModal] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [role, setRole] = useState({ admin: false, finance: false, alcohol: false });

  const [members, setMembers] = useState([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [logs, setLogs] = useState([]);
  const [alcohols, setAlcohols] = useState([]);
  const [songs, setSongs] = useState([]);
  const [generalData, setGeneralData] = useState(null);
  
  const appId = USER_CONFIG.appId; 

  // 偵測 In-App Browser
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    if (/Line|FBAN|FBAV|Instagram|Twitter/i.test(ua)) {
      setIsInAppBrowser(true);
    }
  }, []);

  // Auth 監聽
  useEffect(() => {
    if (auth) {
      setPersistence(auth, browserLocalPersistence)
        .then(() => {
           const unsubAuth = onAuthStateChanged(auth, async (u) => {
             setUser(u);
             if (!u && IS_CANVAS) setTimeout(() => setUser({ uid: 'demo', displayName: '體驗帳號', email: 'demo@test.com' }), 1000);
           });
           return () => unsubAuth();
        })
        .catch((error) => {
           console.error("Persistence error:", error);
        });
      
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) signInWithCustomToken(auth, __initial_auth_token).catch(e => console.error(e));
    } else { setLoading(false); }
  }, []);

  // 權限檢查
  useEffect(() => {
    if (user && membersLoaded) { 
       const normalize = (str) => (str || '').trim().toLowerCase();
       const userEmail = normalize(user.email);
       const adminEmails = ADMIN_EMAILS.map(normalize);
       const isAdmin = adminEmails.includes(userEmail);
       
       if (!IS_CANVAS && !isAdmin && members.length > 0) {
          const isMember = members.some(m => normalize(m.email) === userEmail);
          if (!isMember) {
             alert(`⛔ 抱歉，您的 Email (${user.email}) 不在團員名單中。`);
             signOut(auth).then(() => setUser(null));
             return;
          }
       }

       const financeMember = members.find(m => m.realName === ROLE_FINANCE_NAME || m.nickname === ROLE_FINANCE_NAME);
       const isFinance = isAdmin || (financeMember && normalize(financeMember.email) === userEmail);
       const alcoholMember = members.find(m => m.realName === ROLE_ALCOHOL_NAME || m.nickname === ROLE_ALCOHOL_NAME);
       const isAlcohol = isAdmin || (alcoholMember && normalize(alcoholMember.email) === userEmail);

       setRole({ admin: isAdmin, finance: isFinance, alcohol: isAlcohol });
       setLoading(false);
    } else if (user && !membersLoaded) {
       // Wait
    } else {
       setRole({ admin: false, finance: false, alcohol: false });
       if (!IS_CANVAS) setLoading(false);
    }
  }, [user, members, membersLoaded]);

  // Firestore
  useEffect(() => {
    if (!db || !user) return;
    const unsubMembers = onSnapshot(getCollectionRef(db, 'members'), (snap) => {
        setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setMembersLoaded(true);
    }, (e) => console.warn(e));
    const unsubLogs = onSnapshot(getCollectionRef(db, 'logs'), (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date))));
    const unsubAlcohol = onSnapshot(getCollectionRef(db, 'alcohol'), (snap) => setAlcohols(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSongs = onSnapshot(getCollectionRef(db, 'songs'), (snap) => setSongs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubGeneral = onSnapshot(getDocRef(db, 'general', 'info'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.nextPractice && !data.practices) data.practices = [data.nextPractice];
        if (!data.settings?.alcoholTypes) data.settings = { ...DEFAULT_GENERAL_DATA.settings, ...(data.settings || {}) };
        
        // 🛡️ 強力防呆：確保 practices 永遠是陣列
        if (!Array.isArray(data.practices)) data.practices = [];
        // 🛡️ 強力防呆：確保 alcoholTypes 永遠是陣列
        if (data.settings && !Array.isArray(data.settings.alcoholTypes)) {
            data.settings.alcoholTypes = DEFAULT_GENERAL_DATA.settings.alcoholTypes;
        }
        
        setGeneralData(data);
      } else {
        setDoc(getDocRef(db, 'general', 'info'), DEFAULT_GENERAL_DATA);
        setGeneralData(DEFAULT_GENERAL_DATA);
      }
      setLoading(false);
    });
    return () => { unsubMembers(); unsubLogs(); unsubAlcohol(); unsubSongs(); unsubGeneral(); };
  }, [user]);

  const handleLogin = async () => {
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (err) { 
      console.error("Popup failed", err);
      alert("登入彈窗被阻擋，請允許彈出視窗後重試，或是使用 Chrome/Safari 瀏覽器。");
    }
  };
  
  const handleLogout = async () => { await signOut(auth); setUser(null); };

  const renderContent = () => {
    const data = generalData || DEFAULT_GENERAL_DATA;
    // 🛡️ 防呆：傳入前再次確保 practices 是陣列
    const safePractices = Array.isArray(data.practices) ? data.practices : [];
    
    switch (activeTab) {
      case 'dashboard': return <DashboardView members={members} generalData={data} alcoholCount={alcohols.length} db={db} role={role} user={user} />;
      case 'logs': return <SessionLogManager sessions={logs} practices={safePractices} members={members} settings={data.settings} db={db} role={role} user={user} />;
      case 'alcohol': return <AlcoholManager alcohols={alcohols} members={members} settings={data.settings} db={db} role={role} user={user} />;
      case 'tech': return <TechView songs={songs} db={db} role={role} user={user} />;
      case 'admin': return <AdminDashboard members={members} logs={logs} generalData={data} db={db} />;
      // 🛡️ 致命地雷修復：確保 default case 也回傳完整的 props
      default: return <DashboardView members={members} generalData={data} alcoholCount={alcohols.length} db={db} role={role} user={user} />;
    }
  };

  if (isInAppBrowser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-100 text-center">
        <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">無法在 App 內登入</h2>
          <p className="text-sm text-slate-600 mb-6">Google 安全政策限制了此瀏覽器的登入功能。</p>
          <div className="bg-blue-50 p-4 rounded-xl text-left text-sm text-blue-800 mb-6">
            <p className="font-bold mb-2">請依照以下步驟操作：</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>點擊右上角的 <span className="font-bold">...</span> 或 <span className="font-bold">分享</span> 圖示</li>
              <li>選擇 <span className="font-bold">「以預設瀏覽器開啟」</span> (Safari/Chrome)</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !generalData) return <div className="h-screen flex justify-center items-center bg-[#FDFBF7] flex-col gap-2"><Loader2 className="animate-spin text-[#77ABC0]"/><p className="text-xs text-[#C5B8BF]">正在同步雲端資料...</p></div>;
  const showImage = !imgError && BAND_LOGO_BASE64;
  const handlePrankClick = (e) => { const btn = e.currentTarget; btn.style.transform = 'rotate(360deg) scale(1.2)'; setTimeout(() => { setShowPrankModal(true); btn.style.transform = 'rotate(0deg) scale(1)'; }, 300); };

  if (!user) return (
      <div className="h-screen flex flex-col justify-center items-center bg-[#FDFBF7] p-6 text-center">
        <div className="bg-white p-8 rounded-[32px] shadow-xl w-full max-w-sm">
           <div className="flex justify-center mb-6"><BandLogo /></div>
           <h1 className="text-2xl font-black text-[#725E77] mb-2">{BAND_NAME}</h1>
           <button onClick={handleLogin} className="w-full bg-[#77ABC0] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"><ShieldCheck size={20}/> Google 登入</button>
           <div className="mt-6 p-3 bg-indigo-50 rounded-xl text-xs text-indigo-800 text-left border border-indigo-100">本系統僅限受邀團員登入。請使用 Safari 或 Chrome 開啟。</div>
        </div>
      </div>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FDFBF7] text-[#725E77] font-sans pb-24">
        <header className="bg-white/80 backdrop-blur sticky top-0 z-40 border-b border-[#CBABCA]/20 px-4 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            {showImage ? <img src={BAND_LOGO_BASE64} alt="Logo" className="w-9 h-9 rounded-xl object-contain bg-white shadow-sm" onError={() => setImgError(true)} /> : <BandLogo />}
            <span className="font-bold text-lg tracking-wide text-[#77ABC0]">{BAND_NAME}</span>
          </div>
          <div className="flex items-center gap-2">
            {role.admin && <span className="bg-rose-100 text-rose-600 text-[10px] px-2 py-0.5 rounded-full font-bold">Admin</span>}
            {role.admin && (
              <button onClick={() => setActiveTab('admin')} className={`p-1.5 rounded-full transition ${activeTab === 'admin' ? 'bg-[#77ABC0] text-white' : 'text-[#CBABCA] hover:bg-[#F2D7DD]'}`}><Settings size={18}/></button>
            )}
            <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-200" style={{backgroundColor: stringToColor(user.displayName)}}>
                {user.photoURL ? <img src={user.photoURL} alt="U" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"><User size={16}/></div>}
            </div>
            <button onClick={handleLogout} className="p-1.5 bg-[#FDFBF7] rounded-full text-[#BC8F8F] hover:bg-[#F2D7DD] transition"><LogOut size={16} /></button>
          </div>
        </header>

        <main className="max-w-md mx-auto p-4">{renderContent()}</main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#CBABCA]/20 px-2 py-2 z-50 flex justify-around items-center pb-safe shadow-[0_-4px_20px_-10px_rgba(203,171,202,0.15)]">
          <NavBtn id="dashboard" icon={Users} label="團員" active={activeTab} set={setActiveTab} />
          <NavBtn id="logs" icon={ClipboardList} label="日誌" active={activeTab} set={setActiveTab} />
          <div className="relative -top-6"><button onClick={handlePrankClick} className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-4 border-[#FDFBF7] bg-[#F1CEBA] text-white transition-all duration-500 hover:rotate-12 active:scale-95"><Ghost size={24} /></button></div>
          <NavBtn id="alcohol" icon={Beer} label="酒櫃" active={activeTab} set={setActiveTab} />
          <NavBtn id="tech" icon={Zap} label="資源" active={activeTab} set={setActiveTab} />
        </nav>

        {showPrankModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xs p-6 rounded-[32px] text-center shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
              <div className="w-20 h-20 bg-[#F1CEBA]/20 text-[#F1CEBA] rounded-full flex items-center justify-center mx-auto mb-4"><Ghost size={40} className="animate-bounce" /></div>
              <h3 className="text-xl font-black text-[#725E77] mb-2">{generalData?.prankMessage || "👻 抓到了！"}</h3>
              <button onClick={() => setShowPrankModal(false)} className="w-full py-3 rounded-xl bg-[#77ABC0] text-white font-bold shadow-lg active:scale-95 transition">好啦我知道了</button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

const NavBtn = ({ id, icon: Icon, label, active, set }) => (
  <button onClick={() => set(id)} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${active === id ? 'text-[#77ABC0]' : 'text-[#C5B8BF] hover:text-[#CBABCA]'}`}>
    <Icon size={20} strokeWidth={active === id ? 2.5 : 2} />
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

// --- 1. Dashboard ---
// 🛡️ 元件級別防呆：使用預設參數 ({ members = [], ... }) 確保內部不會炸裂
const DashboardView = ({ members = [], generalData = {}, alcoholCount = 0, db, role = {}, user }) => {
  const [editingPractice, setEditingPractice] = useState(false);
  const [practices, setPractices] = useState(generalData.practices || []);
  const [expandedMember, setExpandedMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null); 
  
  useEffect(() => {
    if (!editingPractice && generalData.practices) {
      setPractices(generalData.practices);
    }
  }, [generalData.practices, editingPractice]);

  const now = new Date();
  
  // 🛡️ 防呆：過濾無效日期
  const sortedPractices = [...practices]
    .filter(p => p && p.date) 
    .map(p => ({...p, dateObj: new Date(p.date), endObj: p.endTime ? new Date(p.endTime) : new Date(new Date(p.date).getTime() + 2*60*60*1000) }))
    .sort((a,b) => a.dateObj - b.dateObj);
  
  const nextPractice = sortedPractices.find(p => p.dateObj >= now) || sortedPractices[sortedPractices.length - 1] || { date: new Date().toISOString(), title: '尚未安排', location: '圓頭音樂' };
  
  const nextDateObj = new Date(nextPractice.date);
  const isValidDate = !isNaN(nextDateObj.getTime());
  const diffDays = isValidDate ? Math.ceil((nextDateObj - now) / (1000 * 60 * 60 * 24)) : 0; 

  const handleUpdatePractices = async () => { if (!db) return; await updateDoc(getDocRef(db, 'general', 'info'), { practices }); setEditingPractice(false); };
  
  const toggleAttendance = async (memberId, dateStr) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    const canEdit = role.admin || (user.email && member.email === user.email);
    if (!canEdit) { alert("只能修改自己的出席狀態喔！"); return; }
    const currentAttendance = member.attendance || [];
    let newAttendance;
    if (currentAttendance.includes(dateStr)) {
      newAttendance = currentAttendance.filter(d => d !== dateStr);
    } else {
      newAttendance = [...currentAttendance, dateStr];
    }
    await updateDoc(getDocRef(db, 'members', memberId), { attendance: newAttendance });
  };
  
  const handleSaveMember = async (data) => { if (!db) return; data.id ? await updateDoc(getDocRef(db, 'members', data.id), data) : await addDoc(getCollectionRef(db, 'members'), data); setEditingMember(null); };
  const handleDeleteMember = async (id) => { if (confirm("確定要刪除這位團員嗎？")) { await deleteDoc(getDocRef(db, 'members', id)); } };
  
  const generateCalendarUrl = (p) => {
    if (!p || !p.date) return "#";
    const startDate = new Date(p.date);
    const endDate = p.endTime ? new Date(p.endTime) : new Date(startDate.getTime() + 2*60*60*1000);
    const format = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const details = `${p.targetSongs ? '🎵 預計曲目: ' + p.targetSongs : ''}${p.memo ? '\n📝 備註: ' + p.memo : ''}`;
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(p.title)}&dates=${format(startDate)}/${format(endDate)}&location=${encodeURIComponent(p.location || '')}&details=${encodeURIComponent(details)}`;
  };

  const renderPracticeEditor = () => (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-3xl w-full max-w-sm space-y-4 max-h-[80vh] overflow-y-auto">
        <h3 className="font-bold text-lg text-[#725E77]">設定本月練團時間</h3>
        <p className="text-xs text-slate-400">請一次規劃好本月的場次，日誌會自動連動。</p>
        {practices.map((p, idx) => {
          const dateStr = p.date ? p.date.split('T')[0] : '';
          const startTimeStr = p.date && p.date.includes('T') ? p.date.split('T')[1].substring(0, 5) : '20:00';
          const endTimeStr = p.endTime && p.endTime.includes('T') ? p.endTime.split('T')[1].substring(0, 5) : '22:00';
          
          const updateTime = (newDate, newTime, isEnd = false) => {
             const combined = `${newDate}T${newTime}`;
             const newP = [...practices];
             if (isEnd) newP[idx].endTime = combined;
             else newP[idx].date = combined;
             setPractices(newP);
          };

          return (
            <div key={idx} className="bg-[#FDFBF7] p-4 rounded-xl border border-[#E0E0D9] space-y-3 relative">
               <button onClick={() => setPractices(practices.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-[#BC8F8F] hover:text-red-500"><MinusCircle size={18}/></button>
               
               <div className="grid grid-cols-1 gap-2">
                 <div>
                    <label className="text-[10px] font-bold text-[#C5B8BF] mb-1 block uppercase">日期</label>
                    <input type="date" className="w-full bg-white p-2 rounded-lg text-sm border border-transparent focus:border-[#77ABC0] outline-none" value={dateStr} onChange={e => {
                      updateTime(e.target.value, startTimeStr);
                      const currentEndTime = p.endTime ? p.endTime.split('T')[1].substring(0, 5) : '22:00';
                      const newP = [...practices];
                      newP[idx].date = `${e.target.value}T${startTimeStr}`;
                      newP[idx].endTime = `${e.target.value}T${currentEndTime}`;
                      setPractices(newP);
                    }} />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="text-[10px] font-bold text-[#C5B8BF] mb-1 block uppercase">開始時間</label>
                    <div className="relative">
                        <select className="w-full bg-white p-2 rounded-lg text-sm appearance-none outline-none pr-6" value={startTimeStr} onChange={e => updateTime(dateStr, e.target.value)}>
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-3 text-[#C5B8BF] pointer-events-none"/>
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-[#C5B8BF] mb-1 block uppercase">結束時間</label>
                    <div className="relative">
                        <select className="w-full bg-white p-2 rounded-lg text-sm appearance-none outline-none pr-6" value={endTimeStr} onChange={e => updateTime(dateStr, e.target.value, true)}>
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-3 text-[#C5B8BF] pointer-events-none"/>
                    </div>
                 </div>
               </div>

               <input type="text" className="w-full bg-white p-2 rounded-lg text-sm" placeholder="標題 (預設: 練團)" value={p.title} onChange={e => {
                 const newP = [...practices]; newP[idx].title = e.target.value; setPractices(newP);
               }} />
               <input type="text" className="w-full bg-white p-2 rounded-lg text-sm" placeholder="地點 (預設: 圓頭音樂)" value={p.location} onChange={e => {
                 const newP = [...practices]; newP[idx].location = e.target.value; setPractices(newP);
               }} />
               <input type="text" className="w-full bg-white p-2 rounded-lg text-sm border-t-2 border-[#E0E0D9] pt-2 mt-1" placeholder="🎵 預計曲目 (Ex: Last Dance...)" value={p.targetSongs || ''} onChange={e => {
                 const newP = [...practices]; newP[idx].targetSongs = e.target.value; setPractices(newP);
               }} />
               <input type="text" className="w-full bg-white p-2 rounded-lg text-sm" placeholder="📝 備註 (Ex: 記得帶譜)" value={p.memo || ''} onChange={e => {
                 const newP = [...practices]; newP[idx].memo = e.target.value; setPractices(newP);
               }} />
            </div>
          );
        })}
        <button onClick={() => setPractices([...practices, { date: new Date().toISOString().split('T')[0] + 'T20:00', endTime: new Date().toISOString().split('T')[0] + 'T22:00', title: '練團', location: '圓頭音樂' }])} className="w-full py-3 border-2 border-dashed border-[#77ABC0] text-[#77ABC0] rounded-xl font-bold flex justify-center items-center gap-1 hover:bg-[#F0F8FF] transition"><Plus size={16}/> 增加場次</button>
        <div className="flex gap-2 pt-2"><button onClick={() => setEditingPractice(false)} className="flex-1 p-3 rounded-xl text-slate-400 font-bold hover:bg-slate-100 transition">取消</button><button onClick={handleUpdatePractices} className="flex-1 p-3 rounded-xl bg-[#77ABC0] text-white font-bold shadow-lg hover:bg-[#6699af] transition">儲存設定</button></div>
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
              {role.admin && <button onClick={() => setEditingPractice(true)} className="bg-white/20 p-2 rounded-full backdrop-blur-sm hover:bg-white/40"><Pencil size={18}/></button>}
              <a href={generateCalendarUrl(nextPractice)} target="_blank" className="bg-white/20 hover:bg-white/30 p-2 rounded-full backdrop-blur-sm transition active:scale-95"><CalendarPlus size={18} className="text-white"/></a>
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
          
          {isValidDate && nextPractice.targetSongs && (
             <div className="mb-3 text-sm bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/10 text-[#E0E7EA]">
                <div className="text-[10px] opacity-70 mb-0.5 uppercase tracking-wider font-bold">Target Songs</div>
                <div className="font-bold flex items-center gap-1"><Music2 size={12}/> {nextPractice.targetSongs}</div>
             </div>
          )}

          <div className="flex items-center gap-2 bg-black/20 w-fit px-4 py-2 rounded-full backdrop-blur-sm border border-white/10"><MapPin size={16} className="text-[#E0E7EA]"/><span className="text-sm font-bold">{nextPractice.location}</span></div>
        </div>
        <PartyPopper className="absolute -right-4 -bottom-4 text-white opacity-10 rotate-12" size={140} />
      </div>
       
      <div className="bg-white p-4 rounded-2xl border border-[#E0E0D9]">
         <div className="font-bold text-[#725E77] mb-2 flex items-center gap-2"><Calendar size={18}/> 本月場次列表</div>
         <div className="space-y-2">
            {sortedPractices.map(p => (
               <div key={p.date} className="flex justify-between items-start text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1">
                      <div className="font-bold text-slate-700 text-base mb-0.5">{new Date(p.date).toLocaleDateString()} {p.title}</div>
                      <div className="text-xs text-slate-400 font-bold mb-1">{new Date(p.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {p.endTime ? new Date(p.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '??'} @ {p.location}</div>
                      {p.memo && <div className="text-xs text-[#77ABC0] bg-[#77ABC0]/10 px-2 py-1 rounded w-fit mt-1 flex items-center gap-1"><StickyNote size={10}/> {p.memo}</div>}
                  </div>
                  {/* 新增：每一行的加入行事曆按鈕 */}
                  <a href={generateCalendarUrl(p)} target="_blank" className="p-2 text-[#C5B8BF] hover:text-[#77ABC0] hover:bg-[#77ABC0]/10 rounded-lg transition" title="加入行事曆">
                     <CalendarPlus size={18}/>
                  </a>
               </div>
            ))}
            {sortedPractices.length === 0 && <div className="text-xs text-slate-400 text-center py-2">本月尚無安排</div>}
         </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#F0EEE6] p-4 rounded-2xl border border-[#F2D7DD] flex items-center gap-3 shadow-sm"><div className="bg-white p-2.5 rounded-full shadow-sm"><Beer size={20} className="text-[#C5A659]"/></div><div><div className="text-[10px] font-bold text-[#857650] uppercase">酒櫃庫存</div><div className="text-xl font-black text-[#5C5142]">{alcoholCount} 瓶</div></div></div>
        <div className="bg-[#E8F1E9] p-4 rounded-2xl border border-[#A8D8E2]/50 flex items-center gap-3 shadow-sm"><div className="bg-white p-2.5 rounded-full shadow-sm"><Check size={20} className="text-[#77ABC0]"/></div><div><div className="text-[10px] font-bold text-[#6E7F9B] uppercase">本月練團</div><div className="text-xl font-black text-[#725E77]">{practices.length} 場</div></div></div>
      </div>

      <div>
        <div className="flex items-center justify-between px-1 mb-2"><h3 className="font-bold text-xl text-[#725E77]">本月練團點名</h3>{role.admin && <button onClick={() => setEditingMember({})} className="text-xs font-bold text-[#77ABC0] bg-[#F0F4F5] px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus size={14}/> 新增團員</button>}</div>
        <div className="grid grid-cols-1 gap-3">
          {members.map(m => {
            const style = getMemberStyle(m.nickname || m.realName);
            return (
            <div key={m.id} onClick={() => setExpandedMember(expandedMember === m.id ? null : m.id)} className={`bg-white p-4 rounded-2xl border shadow-sm transition-all cursor-pointer ${expandedMember === m.id ? 'border-[#CBABCA] ring-1 ring-[#CBABCA]/30' : 'border-[#E0E0D9]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-sm overflow-hidden" style={{backgroundColor: style.color}}>
                    {m.nickname?.[0] || 'M'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2"><span className="font-bold text-[#725E77] text-lg">{m.nickname}</span>{m.birthday && new Date().getMonth()+1 === parseInt(m.birthday.split('-')[1]) && <span className="bg-[#BC8F8F] text-white text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Cake size={10} /> 壽星</span>}</div>
                    <div className="flex items-center gap-1 text-xs text-[#C5B8BF] font-medium"><span className="text-[#77ABC0] font-bold">{m.instrument}</span><span>•</span><span>{m.realName}</span></div>
                  </div>
                </div>
                <div className="flex gap-1.5 overflow-x-auto max-w-[120px] scrollbar-hide">
                  {practices.map(p => {
                    const dateStr = p.date ? p.date.split('T')[0] : ''; 
                    if (!dateStr) return null;
                    const isAttending = m.attendance?.includes(dateStr);
                    return (<button key={p.id || Math.random()} onClick={(e) => { e.stopPropagation(); toggleAttendance(m.id, dateStr); }} className={`flex flex-col items-center justify-center w-9 h-9 rounded-xl border transition active:scale-90 ${isAttending ? 'bg-[#E8F1E9] border-[#CFE3D1] text-[#5F7A61]' : 'bg-[#F7F2F2] border-[#E8E0E0] text-[#A69898]'}`}><span className="text-[9px] font-bold leading-none">{new Date(p.date).getDate()}</span>{isAttending ? <CheckCircle2 size={10}/> : <XCircle size={10}/>}</button>);
                  })}
                </div>
              </div>
              {expandedMember === m.id && (
                <div className="mt-4 pt-3 border-t border-[#F2D7DD]/30 animate-in fade-in">
                  <div className="flex items-start gap-2 bg-[#FDFBF7] p-3 rounded-xl border border-[#E0E0D9]"><MessageCircle size={16} className="text-[#CBABCA] shrink-0 mt-0.5"/><div><p className="text-[10px] font-bold text-[#C5B8BF] uppercase mb-0.5">管理者備註</p><p className="text-sm text-[#725E77] font-medium">{m.note}</p></div></div>
                  <div className="mt-2 flex justify-between items-center text-xs font-bold text-[#8B8C89] px-1"><span className="flex items-center gap-1"><Calendar size={12}/> 生日: {formatBirthdayDisplay(m.birthday)} ({getZodiac(m.birthday)})</span>{role.admin && (<div className="flex gap-3"><button onClick={(e) => { e.stopPropagation(); setEditingMember(m); }} className="text-[#77ABC0] hover:text-[#50656e] flex items-center gap-1"><Pencil size={12}/> 編輯</button><button onClick={(e) => { e.stopPropagation(); handleDeleteMember(m.id); }} className="text-[#BC8F8F] hover:text-red-600 flex items-center gap-1"><Trash2 size={12}/> 刪除</button></div>)}</div>
                </div>
              )}
            </div>
          )})}
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
        <input className="w-full bg-[#FDFBF7] p-3 rounded-xl text-sm" placeholder="頭像網址 (FB/IG圖片連結，選填)" value={form.avatarUrl || ''} onChange={e => setForm({...form, avatarUrl: e.target.value})} />
        <input className="w-full bg-[#FDFBF7] p-3 rounded-xl text-sm" placeholder="樂器 (Vocal, Bass...)" value={form.instrument || ''} onChange={e => setForm({...form, instrument: e.target.value})} />
        <input type="date" className="w-full bg-[#FDFBF7] p-3 rounded-xl text-sm" value={form.birthday || ''} onChange={e => setForm({...form, birthday: e.target.value})} />
        <textarea className="w-full bg-[#FDFBF7] p-3 rounded-xl text-sm h-20" placeholder="備註 (僅管理員可見)" value={form.note || ''} onChange={e => setForm({...form, note: e.target.value})} />
        <div className="flex gap-2 pt-2"><button onClick={onClose} className="flex-1 p-3 rounded-xl text-[#C5B8BF] font-bold">取消</button><button onClick={() => onSave(form)} className="flex-1 p-3 rounded-xl bg-[#77ABC0] text-white font-bold shadow-lg shadow-[#77ABC0]/20">儲存</button></div>
      </div>
    </div>
  );
};

// --- 2. 日誌管理器 ---
const SessionLogManager = ({ sessions = [], practices = [], members = [], settings = {}, db, appId, role = {}, user }) => {
  const [activeSessionId, setActiveSessionId] = useState(null);
  // 🛡️ 強力防呆：如果 sessions 是 null，轉為空陣列 []
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const existingDates = safeSessions.map(s => s.date);
  
  // 🛡️ 強力防呆：確保 practices 是陣列
  // 🛡️ 修正 4：Safari 日期解析地雷修復 - 檢查 p.date 是否有 T
  const pendingPractices = (Array.isArray(practices) ? practices : []).filter(p => {
      if(!p || !p.date) return false;
      const dateStr = String(p.date); // 確保是字串
      const pDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr; // 安全分割
      return !existingDates.includes(pDate);
  }).sort((a,b) => new Date(a.date) - new Date(b.date));

  const [showManualCreate, setShowManualCreate] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  // 修改：建立日誌時自動帶入出席名單
  const handleCreate = async (dateStr, location = '圓頭音樂', preFilledAttendance = []) => {
    if (!db) return;
    
    const newSession = { 
      date: dateStr, 
      location: location, 
      funNotes: '', 
      tracks: [], 
      miscExpenses: [], 
      attendance: preFilledAttendance, // 自動帶入
      createdAt: serverTimestamp() 
    };
    
    try {
      const docRef = await addDoc(getCollectionRef(db, 'logs'), newSession);
      setActiveSessionId(docRef.id);
      setShowManualCreate(false);
    } catch(e) { alert("Error: " + e.message); }
  };
  
  // 刪除日誌維持僅限管理員
  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    if (!db || !confirm("確定要刪除這筆練團日誌嗎？資料將無法復原。")) return;
    await deleteDoc(getDocRef(db, 'logs', id));
  };

  if (activeSessionId) {
    const session = safeSessions.find(s => s.id === activeSessionId);
    if (!session) return <div className="p-10 text-center text-[#CBABCA]">正在同步...</div>;
    return <SessionDetail session={session} members={members} settings={settings} onBack={() => setActiveSessionId(null)} db={db} role={role} user={user} />;
  }

  return (
    <div className="space-y-4 animate-in slide-in-from-right-8">
      <div className="flex justify-between items-end px-1">
        <h2 className="text-2xl font-bold text-[#725E77]">練團日誌</h2>
        {/* 開放所有成員建立自訂日誌 */}
        <button 
          onClick={() => setShowManualCreate(true)} 
          className="text-xs font-bold text-[#77ABC0] bg-[#F0F4F5] px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#E0E7EA]"
        >
          <FilePlus size={14}/> 自訂日誌
        </button>
      </div>
      
      {/* 開放所有成員點擊虛線框建立日誌 */}
      {pendingPractices.map(p => {
        // 修正：計算當日出席者
        const dateOnly = p.date.split('T')[0];
        const attendingIds = members.filter(m => m.attendance?.includes(dateOnly)).map(m => m.id);
        
        return (
        <button key={p.id || Math.random()} onClick={() => handleCreate(dateOnly, p.location, attendingIds)} className="w-full p-4 rounded-[28px] border-2 border-dashed border-[#CBABCA] bg-[#FDFBF7] flex items-center justify-between text-[#CBABCA] hover:bg-[#FFF5F7] transition group">
          <div className="flex items-center gap-3"><div className="bg-[#F2D7DD]/30 p-2 rounded-full group-hover:scale-110 transition text-[#CBABCA]"><Plus size={20}/></div><div className="text-left"><div className="font-bold text-lg text-[#CBABCA]">{new Date(p.date).toLocaleDateString()} 待補</div><div className="text-xs opacity-70 text-[#C5B8BF]">{p.title}</div></div></div>
          <ChevronDown className="-rotate-90 opacity-50 text-[#C5B8BF]" />
        </button>
      )})}

      {showManualCreate && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
           <div className="bg-white p-6 rounded-3xl w-full max-w-sm space-y-4">
              <h3 className="font-bold text-lg text-[#725E77]">自訂新增日誌</h3>
              <input type="date" className="w-full bg-[#FDFBF7] p-3 rounded-xl text-sm" value={manualDate} onChange={e => setManualDate(e.target.value)} />
              <div className="flex gap-2 pt-2"><button onClick={() => setShowManualCreate(false)} className="flex-1 p-3 rounded-xl text-[#C5B8BF] font-bold">取消</button><button onClick={() => handleCreate(manualDate)} className="flex-1 p-3 rounded-xl bg-[#77ABC0] text-white font-bold shadow-lg">建立</button></div>
           </div>
        </div>
      )}

      {safeSessions.map(s => (
        <div key={s.id} onClick={() => setActiveSessionId(s.id)} className="bg-white p-5 rounded-[28px] shadow-sm border border-[#E0E0D9] cursor-pointer hover:border-[#77ABC0]/50 transition relative group">
          <div className="flex justify-between items-start mb-2">
            <div><span className="bg-[#A8D8E2]/20 text-[#6E7F9B] text-[10px] font-bold px-2 py-0.5 rounded border border-[#A8D8E2]/30">{s.date}</span><h3 className="font-bold text-xl mt-1 text-[#725E77]">{s.tracks?.length || 0} 首歌</h3></div>
            <div className="flex items-center gap-2">
                {role.admin && <button onClick={(e) => handleDeleteSession(e, s.id)} className="p-1 text-[#BC8F8F] opacity-0 group-hover:opacity-100 hover:text-red-600 transition"><Trash2 size={16}/></button>}
                <div className="bg-[#FDFBF7] p-2 rounded-full text-[#C5B8BF] group-hover:bg-[#E5C3D3]/20 group-hover:text-[#CBABCA] transition"><ChevronDown className="-rotate-90" size={20}/></div>
            </div>
          </div>
          <div className="text-[10px] text-[#C5B8BF] mt-1 flex items-center gap-1"><MapPin size={10}/> {s.location}</div>
        </div>
      ))}
    </div>
  );
};

// --- Session Detail ---
const SessionDetail = ({ session, members, settings, onBack, db, role, user }) => {
  const [tab, setTab] = useState('tracks'); 
  const [funNotes, setFunNotes] = useState(session.funNotes || "");
  const [editingLocation, setEditingLocation] = useState(false);
  const [location, setLocation] = useState(session.location || "圓頭音樂");

  const handleUpdateNotes = async () => { if (!db) return; await updateDoc(getDocRef(db, 'logs', session.id), { funNotes }); };
  const handleUpdateLocation = async () => { if (!db) return; await updateDoc(getDocRef(db, 'logs', session.id), { location }); setEditingLocation(false); };
  
  const toggleSessionAttendance = async (memberId) => {
      const currentAtt = session.attendance || []; 
      const newAtt = currentAtt.includes(memberId) ? currentAtt.filter(id => id !== memberId) : [...currentAtt, memberId];
      await updateDoc(getDocRef(db, 'logs', session.id), { attendance: newAtt });
  };

  return (
    <div className="animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-1 text-[#C5B8BF] font-bold text-sm mb-4 hover:text-[#725E77]"><ChevronDown className="rotate-90" size={16}/> 返回列表</button>
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-[#E0E0D9] mb-6">
        <h1 className="text-3xl font-black text-[#725E77]">{session.date}</h1>
        {editingLocation ? (
          <div className="flex gap-2 mt-1"><input className="bg-[#FDFBF7] border border-[#77ABC0] rounded-lg px-2 py-1 text-sm text-[#725E77]" value={location} onChange={e=>setLocation(e.target.value)} /><button onClick={handleUpdateLocation} className="text-[#77ABC0]"><Check size={16}/></button></div>
        ) : (
          <div className="flex items-center gap-2 text-[#C5B8BF] text-sm font-bold mt-1 group cursor-pointer" onClick={() => setEditingLocation(true)}>
             <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} target="_blank" className="flex items-center gap-2 hover:text-[#77ABC0] transition" onClick={(e) => e.stopPropagation()}><MapPin size={14}/> {location}</a>
             <Pencil size={12} className="opacity-0 group-hover:opacity-100 transition"/>
          </div>
        )}
        <div className="mt-4 bg-[#F2D7DD]/20 p-3 rounded-2xl border border-[#CBABCA]/20 flex gap-2 items-start">
          <Smile size={16} className="text-[#F1CEBA] shrink-0 mt-0.5"/>
          <textarea className="bg-transparent w-full text-xs font-bold text-[#725E77] outline-none resize-none h-auto min-h-[40px]" value={funNotes} onChange={e => setFunNotes(e.target.value)} onBlur={handleUpdateNotes} placeholder="輸入不負責任備註..."/>
        </div>
        <div className="mt-4 pt-3 border-t border-[#F2D7DD]/30">
          <div className="text-[10px] font-bold text-[#C5B8BF] mb-2 uppercase">👥 出席名單設定</div>
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <button key={m.id} onClick={() => toggleSessionAttendance(m.id)} className={`px-2 py-1 rounded-lg text-xs font-bold border transition ${session.attendance?.includes(m.id) ? 'bg-[#77ABC0] text-white border-[#77ABC0]' : 'bg-white text-[#C5B8BF] border-[#E0E0D9]'}`}>{m.nickname}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex bg-[#E0E0D9]/50 p-1 rounded-xl mb-6">
        {['tracks', 'practice-fee', 'misc-fee'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${tab === t ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}>{t === 'tracks' ? '曲目' : t === 'practice-fee' ? '練團費' : '雜支'}</button>
        ))}
      </div>
      <div className="bg-white rounded-[32px] border border-[#E0E0D9] p-2 min-h-[300px]">
        {/* 傳入 members 讓 TrackList 可以查暱稱 */}
        {tab === 'tracks' && <TrackList session={session} db={db} user={user} role={role} members={members} />}
        {tab === 'practice-fee' && <PracticeFeeCalculator session={session} members={members} settings={settings} role={role} db={db} />}
        {tab === 'misc-fee' && <MiscFeeCalculator session={session} members={members} db={db} />}
      </div>
    </div>
  );
};

// --- TrackList (修復留言功能) ---
const TrackList = ({ session, db, user, role, members }) => {
  const [expandedTrack, setExpandedTrack] = useState(null);
  const [newTrackName, setNewTrackName] = useState("");
  const [newComment, setNewComment] = useState("");
  // 🛡️ 強力防呆：確保 session.tracks 是陣列
  const tracks = Array.isArray(session.tracks) ? session.tracks : [];
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const handleAddTrack = async () => { if (!newTrackName.trim() || !db) return; const newTrack = { id: Date.now(), title: newTrackName, status: 'new', link: '', comments: [] }; await updateDoc(getDocRef(db, 'logs', session.id), { tracks: [...tracks, newTrack] }); setNewTrackName(""); };
  
  // 修改：儲存留言時，不存 displayName，改存 uid 讓前端即時 render 暱稱
  const handleAddComment = async (trackId) => { if (!newComment.trim()) return; const updatedTracks = tracks.map(t => { if (t.id === trackId) { return { ...t, comments: [...(t.comments || []), { text: newComment, uid: user?.uid, timestamp: Date.now() }] }; } return t; }); await updateDoc(getDocRef(db, 'logs', session.id), { tracks: updatedTracks }); setNewComment(""); };
  
  const handleDeleteComment = async (trackId, commentIdx) => { if(!confirm("刪除留言?")) return; const updatedTracks = tracks.map(t => { if (t.id === trackId) { const newComments = [...t.comments]; newComments.splice(commentIdx, 1); return { ...t, comments: newComments }; } return t; }); await updateDoc(getDocRef(db, 'logs', session.id), { tracks: updatedTracks }); };
  const handleEditComment = async (trackId, commentIdx, newText) => { const updatedTracks = tracks.map(t => { if (t.id === trackId) { const newComments = [...t.comments]; newComments[commentIdx].text = newText; return { ...t, comments: newComments }; } return t; }); await updateDoc(getDocRef(db, 'logs', session.id), { tracks: updatedTracks }); };

  // 新增：更新連結功能
  const handleUpdateLink = async (trackId, link) => { const updatedTracks = tracks.map(t => { if (t.id === trackId) { return { ...t, link }; } return t; }); await updateDoc(getDocRef(db, 'logs', session.id), { tracks: updatedTracks }); };

  // 輔助函式：取得顯示名稱
  const getDisplayName = (uid) => {
      const member = members.find(m => m.id === uid); // 先找 id
      if (member) return member.nickname;
      const memberByEmail = members.find(m => m.email === user?.email); // 再找 email (雖然這裡只有 uid，但如果資料結構有存 uid 最好)
      // 由於 comments 以前存的是 { user: "名字" }，為了相容舊資料：
      return member ? member.nickname : "團員";
  };

  return (
    <div className="p-3 space-y-3">
      {tracks.map(t => (
        <div key={t.id} className="border border-[#E0E0D9] rounded-2xl overflow-hidden">
          <div className="bg-[#FAFAF9] p-4 flex justify-between items-center cursor-pointer" onClick={() => setExpandedTrack(expandedTrack === t.id ? null : t.id)}>
            <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-bold text-[#725E77] truncate">{t.title}</span>
                {t.link && <a href={t.link} target="_blank" onClick={e=>e.stopPropagation()} className="text-[#77ABC0] hover:text-[#50656e]"><ExternalLink size={14}/></a>}
            </div>
            <ChevronDown size={16} className={`text-[#C5B8BF] ${expandedTrack === t.id ? 'rotate-180' : ''}`}/>
          </div>
          {expandedTrack === t.id && (
            <div className="p-4 bg-white border-t border-[#E0E0D9] space-y-3">
              {/* 連結編輯區 */}
              <div className="flex items-center gap-2 bg-[#F0F4F5] p-2 rounded-lg">
                  <LinkIcon size={14} className="text-[#C5B8BF]"/>
                  <input 
                    className="bg-transparent text-xs w-full outline-none text-[#725E77]" 
                    placeholder="貼上音檔/影片連結 (Drive/YouTube)" 
                    value={t.link || ''}
                    onChange={(e) => handleUpdateLink(t.id, e.target.value)}
                  />
              </div>

              {(t.comments || []).map((c, i) => {
                  // 相容舊資料：如果有 c.uid 就查暱稱，否則用舊的 c.user
                  const displayName = c.uid ? (members.find(m => m.id === c.uid)?.nickname || '團員') : c.user;
                  return (
                  <div key={i} className="text-xs bg-[#FDFBF7] p-2 rounded-lg flex justify-between items-start group">
                      <div><span className="font-bold text-[#725E77]">{displayName}:</span> {c.text}</div>
                      {(c.uid === user?.uid || role.admin) && (
                          <div className="flex gap-1"><button onClick={() => { const val = prompt("編輯留言", c.text); if(val) handleEditComment(t.id, i, val); }} className="text-[#77ABC0] opacity-0 group-hover:opacity-100"><Pencil size={12}/></button><button onClick={() => handleDeleteComment(t.id, i)} className="text-[#BC8F8F] opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button></div>
                      )}
                  </div>
              )})}
              <div className="flex gap-2"><input className="w-full bg-[#FDFBF7] text-xs p-2 rounded-lg outline-none text-[#725E77]" placeholder="輸入留言..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment(t.id)} /><button onClick={() => handleAddComment(t.id)} className="text-[#77ABC0]"><Check size={16}/></button></div>
            </div>
          )}
        </div>
      ))}
      <div className="flex gap-2"><input className="flex-1 bg-[#FDFBF7] border border-[#E0E0D9] rounded-xl px-3 text-xs outline-none" placeholder="輸入新歌名..." value={newTrackName} onChange={e => setNewTrackName(e.target.value)} /><button onClick={handleAddTrack} className="px-4 py-3 bg-[#77ABC0]/10 text-[#77ABC0] font-bold text-xs flex items-center justify-center gap-1 border border-dashed border-[#77ABC0]/50 hover:bg-[#77ABC0]/20 rounded-2xl transition"><Plus size={14}/> 新增</button></div>
    </div>
  );
};

// --- PracticeFeeCalculator ---
const PracticeFeeCalculator = ({ session, members, settings, role, db }) => {
  const [selectedIds, setSelectedIds] = useState(session.attendance || []); 
  const [hours, setHours] = useState(2);
  const [hasKB, setHasKB] = useState(true);
  // 修改：預設帳號改為國泰世華，但優先讀取 settings 中的值 (如果有的話)
  const defaultBank = "(013)國泰世華銀行 帳號：699514620885";
  const [bankAccount, setBankAccount] = useState(settings?.studioBankAccount || defaultBank);
  const [editingBank, setEditingBank] = useState(false);
  
  const total = (hours * (settings?.studioRate || 350)) + (hasKB ? (settings?.kbRate || 200) : 0);
  const perPerson = selectedIds.length > 0 ? Math.ceil(total / selectedIds.length) : 0;
  
  const handleUpdateBank = async () => { if(!db) return; await updateDoc(getDocRef(db, 'general', 'info'), { settings: { ...settings, studioBankAccount: bankAccount } }); setEditingBank(false); };
  const copyText = () => { const names = selectedIds.map(id => (members.find(m => m.id === id)?.nickname || '未知')).join('、'); const text = `📅 ${session.date} 練團費用\n----------------\n⏱️ 時數：${hours}hr\n🎹 KB租借：${hasKB?'有':'無'}\n👥 分攤人：${names}\n----------------\n💰 總金額：$${total}\n👉 每人應付：$${perPerson}\n\n匯款帳號：\n${bankAccount}`; if(secureCopy(text)) alert("複製成功！"); };

  return (
    <div className="p-4 space-y-5">
      <div className="bg-[#F0F4F5] p-4 rounded-2xl text-center border border-[#A8D8E2]/30"><div className="text-3xl font-black text-[#77ABC0] mb-1">${total}</div><div className="text-xs font-bold text-[#6E7F9B]">每人 <span className="text-lg text-[#725E77]">${perPerson}</span></div></div>
      <div className="space-y-3">
          <div className="flex gap-2">{[2, 3].map(h => <button key={h} onClick={() => setHours(h)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${hours === h ? 'bg-[#725E77] text-white' : 'bg-[#FDFBF7] text-[#C5B8BF]'}`}>{h}hr</button>)}<button onClick={() => setHasKB(!hasKB)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${hasKB ? 'bg-[#77ABC0] text-white' : 'bg-[#FDFBF7] text-[#C5B8BF]'}`}>KB {hasKB?'+':'-'}</button></div>
          <div><label className="text-[10px] font-bold text-[#C5B8BF] mb-2 block uppercase">出席確認 (連動日誌設定)</label><div className="flex flex-wrap gap-2">{members.map(m => (<button key={m.id} onClick={() => setSelectedIds(prev => prev.includes(m.id) ? prev.filter(i => i!==m.id) : [...prev, m.id])} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedIds.includes(m.id) ? 'bg-[#A8D8E2]/20 border-[#A8D8E2] text-[#5F8794]' : 'bg-white border-[#E0E0D9] text-[#C5B8BF]'}`}>{m.nickname}</button>))}</div></div>
          <div className="flex gap-2 items-center">
            <input className="w-full bg-[#FDFBF7] p-3 rounded-xl text-xs text-[#725E77] border border-transparent focus:border-[#77ABC0] outline-none" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} disabled={!editingBank} />
            {/* 權限控制：只有管理員或財務長可以編輯帳號 */}
            {(role.admin || role.finance) && !editingBank && <button onClick={()=>setEditingBank(true)}><Pencil size={16} className="text-[#C5B8BF]"/></button>}
            {editingBank && <button onClick={handleUpdateBank}><Check size={16} className="text-[#77ABC0]"/></button>}
          </div>
      </div>
      <button onClick={copyText} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition bg-[#77ABC0] text-white`}>{<Copy size={16}/>} 複製請款文</button>
    </div>
  );
};
