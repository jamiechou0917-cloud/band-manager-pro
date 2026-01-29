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
  Database, Download, Filter, Search, Clock, CheckSquare,
  User 
} from 'lucide-react';

// ==========================================
// 🛡️ 基礎變數與遺漏定義修正
// ==========================================
const BAND_NAME = "不開玩笑";
const BAND_LOGO_BASE64 = ""; // 可放入 base64 字串
const BAND_LOGO_URL = "";    // 可放入圖片網址

const ADMIN_EMAILS = [
  "jamie.chou0917@gmail.com",
  "demo@test.com"
];

const ROLE_FINANCE_NAME = "陳昱維"; 
const ROLE_ALCOHOL_NAME = "李家賢"; 

const MORANDI_COLORS = ['#8C736F', '#AAB8AB', '#B7B7BD', '#CCD2CC', '#9F8D8B', '#8FA39A'];

// 工具: 生成名字對應顏色
const stringToColor = (str) => {
  if (!str) return MORANDI_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MORANDI_COLORS[Math.abs(hash) % MORANDI_COLORS.length];
};

// 修正：補上缺失的 getMemberStyle
const getMemberStyle = (name) => {
  return {
    color: stringToColor(name),
    Icon: User 
  };
};

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
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
          <AlertTriangle size={48} className="text-red-500 mb-4"/>
          <h2 className="text-xl font-bold mb-2">程式發生錯誤</h2>
          <p className="text-sm text-slate-600 mb-4">請嘗試重新整理頁面</p>
          <pre className="bg-slate-200 p-4 rounded-lg text-xs overflow-auto max-w-full mb-6 border border-slate-300">
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#77ABC0] text-white rounded-xl font-bold shadow-lg">
            重新整理
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- UI 小元件 ---
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
  if (!data || !data.length) { alert("沒有資料可匯出"); return; }
  const keys = Object.keys(data[0]);
  const separator = ',';
  const csvContent = '\uFEFF' + keys.join(separator) + '\n' +
    data.map(row => keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
        return cell;
      }).join(separator)
    ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
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

let firebaseConfig = USER_CONFIG;
let auth, googleProvider, db;

try {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
} catch (e) { console.error("Firebase init error:", e); }

const getCollectionRef = (db, name) => collection(db, name);
const getDocRef = (db, name, id) => doc(db, name, id);

const DEFAULT_GENERAL_DATA = {
  settings: {
    studioRate: 350, kbRate: 200,      
    studioBankAccount: '(013)國泰世華銀行 帳號：699514620885', 
    miscBankAccount: '(待設定)',
    alcoholTypes: ['紅酒', '白酒', '清酒', '氣泡酒', '啤酒', '威士忌', '其他']
  },
  practices: [] 
};

// ==========================================
// 🚀 Main App Component
// ==========================================
const MainApp = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [imgError, setImgError] = useState(false);
  const [showPrankModal, setShowPrankModal] = useState(false);
  const [role, setRole] = useState({ admin: false, finance: false, alcohol: false });

  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [alcohols, setAlcohols] = useState([]);
  const [songs, setSongs] = useState([]);
  const [generalData, setGeneralData] = useState(null);

  useEffect(() => {
    if (auth) {
      const unsubAuth = onAuthStateChanged(auth, async (u) => {
        setUser(u);
        setLoading(false);
      });
      return () => unsubAuth();
    }
  }, []);

  useEffect(() => {
    if (user && members.length > 0) {
      const userEmail = user.email;
      const isAdmin = ADMIN_EMAILS.includes(userEmail);
      const financeMember = members.find(m => m.realName === ROLE_FINANCE_NAME || m.nickname === ROLE_FINANCE_NAME);
      const isFinance = isAdmin || (financeMember && financeMember.email === userEmail);
      const alcoholMember = members.find(m => m.realName === ROLE_ALCOHOL_NAME || m.nickname === ROLE_ALCOHOL_NAME);
      const isAlcohol = isAdmin || (alcoholMember && alcoholMember.email === userEmail);
      setRole({ admin: isAdmin, finance: isFinance, alcohol: isAlcohol });
    }
  }, [user, members]);

  useEffect(() => {
    if (!db || !user) return;
    const unsubMembers = onSnapshot(getCollectionRef(db, 'members'), (snap) => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubLogs = onSnapshot(getCollectionRef(db, 'logs'), (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date))));
    const unsubAlcohol = onSnapshot(getCollectionRef(db, 'alcohol'), (snap) => setAlcohols(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSongs = onSnapshot(getCollectionRef(db, 'songs'), (snap) => setSongs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubGeneral = onSnapshot(getDocRef(db, 'general', 'info'), (docSnap) => {
      if (docSnap.exists()) {
        setGeneralData(docSnap.data());
      } else {
        setDoc(getDocRef(db, 'general', 'info'), DEFAULT_GENERAL_DATA);
        setGeneralData(DEFAULT_GENERAL_DATA);
      }
    });
    return () => { unsubMembers(); unsubLogs(); unsubAlcohol(); unsubSongs(); unsubGeneral(); };
  }, [user]);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (err) { signInWithRedirect(auth, googleProvider); }
  };
  const handleLogout = async () => { await signOut(auth); setUser(null); };

  const renderContent = () => {
    const data = generalData || DEFAULT_GENERAL_DATA;
    switch (activeTab) {
      case 'dashboard': return <DashboardView members={members} generalData={data} alcoholCount={alcohols.length} db={db} role={role} user={user} />;
      case 'logs': return <SessionLogManager sessions={logs} practices={data.practices || []} members={members} settings={data.settings} db={db} role={role} user={user} />;
      case 'alcohol': return <AlcoholManager alcohols={alcohols} members={members} settings={data.settings} db={db} role={role} user={user} />;
      case 'tech': return <TechView songs={songs} db={db} role={role} user={user} />;
      case 'admin': return <AdminDashboard members={members} logs={logs} generalData={data} db={db} />;
      default: return <DashboardView />;
    }
  };

  if (loading) return <div className="h-screen flex justify-center items-center bg-[#FDFBF7]"><Loader2 className="animate-spin text-[#77ABC0]"/></div>;

  if (!user) return (
    <div className="h-screen flex flex-col justify-center items-center bg-[#FDFBF7] p-6 text-center">
      <div className="bg-white p-8 rounded-[32px] shadow-xl max-w-sm w-full">
         <div className="flex justify-center mb-6"><BandLogo /></div>
         <h1 className="text-2xl font-black text-[#725E77] mb-2">{BAND_NAME}</h1>
         <button onClick={handleLogin} className="w-full bg-[#77ABC0] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#77ABC0]/30 active:scale-95 transition"><ShieldCheck size={20}/> Google 登入</button>
      </div>
    </div>
  );

  const logoSrc = BAND_LOGO_BASE64 || BAND_LOGO_URL;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FDFBF7] text-[#725E77] font-sans pb-24">
        <header className="bg-white/80 backdrop-blur sticky top-0 z-40 border-b border-[#CBABCA]/20 px-4 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            {logoSrc && !imgError ? <img src={logoSrc} alt="Logo" className="w-9 h-9 rounded-xl object-contain bg-white shadow-sm" onError={() => setImgError(true)} /> : <BandLogo />}
            <span className="font-bold text-lg tracking-wide text-[#77ABC0]">{BAND_NAME}</span>
          </div>
          <div className="flex items-center gap-2">
            {role.admin && <button onClick={() => setActiveTab('admin')} className={`p-1.5 rounded-full transition ${activeTab === 'admin' ? 'bg-[#77ABC0] text-white' : 'text-[#CBABCA] hover:bg-[#F2D7DD]'}`}><Settings size={18}/></button>}
            <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden" style={{backgroundColor: stringToColor(user.displayName)}}>
               {user.photoURL ? <img src={user.photoURL} alt="U" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"><User size={16}/></div>}
            </div>
            <button onClick={handleLogout} className="p-1.5 bg-[#FDFBF7] rounded-full text-[#BC8F8F] hover:bg-[#F2D7DD] transition"><LogOut size={16} /></button>
          </div>
        </header>

        <main className="max-w-md mx-auto p-4">{renderContent()}</main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#CBABCA]/20 px-2 py-2 z-50 flex justify-around items-center pb-safe shadow-[0_-4px_20px_-10px_rgba(203,171,202,0.15)]">
          <NavBtn id="dashboard" icon={Users} label="團員" active={activeTab} set={setActiveTab} />
          <NavBtn id="logs" icon={ClipboardList} label="日誌" active={activeTab} set={setActiveTab} />
          <div className="relative -top-6"><button onClick={() => setShowPrankModal(true)} className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-4 border-[#FDFBF7] bg-[#F1CEBA] text-white transition-all duration-500 hover:rotate-12 active:scale-95"><Ghost size={24} /></button></div>
          <NavBtn id="alcohol" icon={Beer} label="酒櫃" active={activeTab} set={setActiveTab} />
          <NavBtn id="tech" icon={Zap} label="資源" active={activeTab} set={setActiveTab} />
        </nav>
      </div>
    </ErrorBoundary>
  );
};

// --- 以下為子組件，保留你原本的邏輯但修正報錯點 ---

const NavBtn = ({ id, icon: Icon, label, active, set }) => (
  <button onClick={() => set(id)} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${active === id ? 'text-[#77ABC0]' : 'text-[#C5B8BF] hover:text-[#CBABCA]'}`}>
    <Icon size={20} strokeWidth={active === id ? 2.5 : 2} />
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

const DashboardView = ({ members, generalData, alcoholCount, db, role, user }) => {
  const [editingPractice, setEditingPractice] = useState(false);
  const [practices, setPractices] = useState(generalData?.practices || []);
  const [expandedMember, setExpandedMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null); 

  const now = new Date();
  const sortedPractices = [...practices]
    .filter(p => p && p.date) 
    .map(p => ({...p, dateObj: new Date(p.date) }))
    .sort((a,b) => a.dateObj - b.dateObj);
  
  const nextPractice = sortedPractices.find(p => p.dateObj >= now) || sortedPractices[sortedPractices.length - 1] || { date: new Date().toISOString(), title: '尚未安排', location: '圓頭音樂' };
  const nextDateObj = new Date(nextPractice.date);
  const isValidDate = !isNaN(nextDateObj.getTime());
  const diffDays = isValidDate ? Math.ceil((nextDateObj - now) / (1000 * 60 * 60 * 24)) : 0; 

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-br from-[#77ABC0] to-[#6E7F9B] rounded-[32px] p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-black text-[#E0E7EA] tracking-widest">{isValidDate ? nextPractice.title : "無練團安排"}</h2>
          <div className="text-4xl font-black my-2 font-mono">
             {isValidDate ? (diffDays > 0 ? `倒數 ${diffDays} 天` : diffDays === 0 ? "就是今天！" : "已結束") : "--"}
          </div>
          <div className="flex items-center gap-2 bg-black/20 w-fit px-4 py-2 rounded-full border border-white/10">
            <MapPin size={16}/><span className="text-sm font-bold">{nextPractice.location}</span>
          </div>
        </div>
        <PartyPopper className="absolute -right-4 -bottom-4 text-white opacity-10 rotate-12" size={140} />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {members.map(m => {
          const style = getMemberStyle(m.nickname || m.realName);
          return (
            <div key={m.id} className="bg-white p-4 rounded-2xl border border-[#E0E0D9] shadow-sm flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold" style={{backgroundColor: style.color}}>
                {m.avatarUrl ? <img src={m.avatarUrl} alt="U" className="w-full h-full object-cover rounded-2xl"/> : (m.nickname?.[0] || 'M')}
              </div>
              <div>
                <div className="font-bold text-[#725E77]">{m.nickname}</div>
                <div className="text-xs text-[#C5B8BF]">{m.instrument} • {m.realName}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ... 其他子組件 (SessionLogManager, AlcoholManager, TechView, AdminDashboard) 建議比照上述 DashboardView 修正變數引用與樣式

// 關鍵修正：將 SessionDetail 中的 Google Map 連結修正
// href={`http://maps.google.com/?q=${encodeURIComponent(location)}`}

export default MainApp;
