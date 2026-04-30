import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
// v6.4 核心修正：酒櫃升級 3.0，導入「歷史酒單 (軟刪除)」機制，喝光的酒會被封存並保留留言心得
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signInWithCustomToken, 
  signOut, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence, 
  inMemoryPersistence 
} from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
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
  User, StickyNote, ArrowRight, Calculator, Link as LinkIcon, Youtube,
  BookOpen, FileJson, UploadCloud, Library, Share, ArrowUp, ArrowDown, Wrench, RefreshCw, FileText, CheckCircle, Archive, BookMarked
} from 'lucide-react';

// ==========================================
// 🛡️ 錯誤邊界元件
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
          <p className="text-sm text-slate-500 mb-4">別擔心，這通常只是暫時的資料問題。</p>
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
const ROLE_ALCOHOL_EMAILS = ["sean760404@gmail.com"]; 

const BAND_NAME = "不開玩笑";
const BAND_LOGO_BASE64 = ""; 
const MORANDI_COLORS = ['#8C736F', '#AAB8AB', '#B7B7BD', '#CCD2CC', '#9F8D8B', '#8FA39A'];

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
    return { color: stringToColor(name), Icon: User };
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
  // 強制每次登入都重新選擇帳號
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
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
  const [repertoire, setRepertoire] = useState([]);
  const [generalData, setGeneralData] = useState(null);
  
  const appId = USER_CONFIG.appId; 

  // 偵測 In-App Browser
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    if (/Line|FBAN|FBAV|Instagram|Twitter|LinkedIn|SAMSUNG|wv/i.test(ua)) {
      setIsInAppBrowser(true);
    }
  }, []);

  // Auth 監聽
  useEffect(() => {
    if (auth) {
      const initAuth = async () => {
        try {
          await setPersistence(auth, browserLocalPersistence);
        } catch (e) {
          console.warn("Local persistence failed (likely ITP/Safari), failing back to Session...", e);
          try {
            await setPersistence(auth, browserSessionPersistence);
          } catch (e2) {
             console.warn("Session persistence failed, using in-memory:", e2);
             await setPersistence(auth, inMemoryPersistence);
          }
        }

        const unsub = onAuthStateChanged(auth, async (u) => {
           setUser(u);
           if (!u && IS_CANVAS) setTimeout(() => setUser({ uid: 'demo', displayName: '體驗帳號', email: 'demo@test.com' }), 1000);
        });

        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
             signInWithCustomToken(auth, __initial_auth_token).catch(e => console.error(e));
        }

        return unsub;
      };

      let unsubscribe;
      initAuth().then(unsub => unsubscribe = unsub);
      
      return () => { if (unsubscribe) unsubscribe(); };
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
       const isAlcohol = isAdmin || (alcoholMember && normalize(alcoholMember.email) === userEmail) || ROLE_ALCOHOL_EMAILS.includes(userEmail);

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
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (a.order || 0) - (b.order || 0));
        setMembers(data);
        setMembersLoaded(true);
    }, (e) => console.warn(e));
    const unsubLogs = onSnapshot(getCollectionRef(db, 'logs'), (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date))));
    const unsubAlcohol = onSnapshot(getCollectionRef(db, 'alcohol'), (snap) => setAlcohols(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSongs = onSnapshot(getCollectionRef(db, 'songs'), (snap) => setSongs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubRepertoire = onSnapshot(getCollectionRef(db, 'repertoire'), (snap) => setRepertoire(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const unsubGeneral = onSnapshot(getDocRef(db, 'general', 'info'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.nextPractice && !data.practices) data.practices = [data.nextPractice];
        if (!data.settings?.alcoholTypes) data.settings = { ...DEFAULT_GENERAL_DATA.settings, ...(data.settings || {}) };
        
        if (!Array.isArray(data.practices)) data.practices = [];
        if (data.settings && !Array.isArray(data.settings.alcoholTypes)) {
            data.settings.alcoholTypes = DEFAULT_GENERAL_DATA.settings.alcoholTypes;
        }
        setGeneralData(data);
      } else {
        console.log("No general data found, using default for display.");
        setGeneralData(DEFAULT_GENERAL_DATA);
      }
      setLoading(false);
      setMembersLoaded(true);
    });
    return () => { unsubMembers(); unsubLogs(); unsubAlcohol(); unsubSongs(); unsubRepertoire(); unsubGeneral(); };
  }, [user]);

  const handleLogin = async () => {
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (err) { 
      console.error("Popup failed", err);
      if (err.message.includes("missing initial state")) {
          alert("Safari 登入錯誤：請關閉「防止跨網站追蹤」\n\n設定 > Safari > 隱私權與安全性 > 關閉「防止跨網站追蹤」");
      } else if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
          alert("登入彈窗被阻擋。\n\n請點擊「允許彈出式視窗」，或改用 Chrome / Safari 開啟本頁面。");
      } else {
          alert("登入錯誤：" + err.message + "\n\n建議：\n1. 點擊下方的「重置登入」按鈕\n2. 關閉無痕模式\n3. 檢查網路\n4. 若在 Line/FB 內，請按右下角改用 Safari 開啟");
      }
    }
  };
  
  const handleLogout = async () => { await signOut(auth); setUser(null); };

  const handleResetLogin = () => {
      if(confirm("這將清除瀏覽器的暫存資料並重新整理頁面，確定嗎？")) {
          sessionStorage.clear();
          localStorage.clear();
          window.location.reload();
      }
  };

  const renderContent = () => {
    const data = generalData || DEFAULT_GENERAL_DATA;
    const safePractices = Array.isArray(data.practices) ? data.practices : [];
    
    switch (activeTab) {
      case 'dashboard': return <DashboardView members={members} generalData={data} alcoholCount={alcohols.length} db={db} role={role} user={user} />;
      case 'logs': return <SessionLogManager sessions={logs} practices={safePractices} members={members} settings={data.settings} db={db} role={role} user={user} />;
      case 'alcohol': return <AlcoholManager alcohols={alcohols} members={members} settings={data.settings} db={db} role={role} user={user} />;
      case 'library': return <LibraryView songs={songs} repertoire={repertoire} db={db} role={role} user={user} />;
      case 'admin': 
        return <AdminDashboard 
          members={members} 
          logs={logs} 
          generalData={data} 
          alcohols={alcohols}
          songs={songs}
          repertoire={repertoire}
          db={db} 
        />;
      default: return <DashboardView members={members} generalData={data} alcoholCount={alcohols.length} db={db} role={role} user={user} />;
    }
  };

  if (isInAppBrowser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-100 text-center font-sans">
        <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-sm border border-slate-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <Share className="text-red-500 w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">請更換瀏覽器</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Line 或 Facebook 的內建瀏覽器會阻擋 Google 登入功能，導致畫面空白或錯誤。
          </p>
          
          <div className="bg-blue-50 p-4 rounded-xl text-left text-sm text-blue-800 mb-6">
            <p className="font-bold mb-2 flex items-center gap-2"><ArrowRight size={16}/> 如何開啟：</p>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>點擊右上角/右下角的 <span className="font-bold">...</span> 或 <span className="font-bold">分享</span> 圖示</li>
              <li>選擇 <strong>以預設瀏覽器開啟</strong> (Safari/Chrome)</li>
            </ol>
          </div>

          <button 
             onClick={() => {
                const url = window.location.href;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).then(() => alert("連結已複製！請切換到 Safari 或 Chrome 貼上開啟。"));
                } else {
                    prompt("請複製下方連結去瀏覽器開啟：", url);
                }
             }}
             className="w-full py-3 bg-[#77ABC0] text-white rounded-xl font-bold shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
          >
             <Copy size={16}/> 複製連結
          </button>
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
           <div className="space-y-3 w-full">
               <button onClick={handleLogin} className="w-full bg-[#77ABC0] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"><ShieldCheck size={20}/> Google 登入</button>
               <button onClick={handleResetLogin} className="w-full bg-slate-100 text-slate-500 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-xs hover:bg-slate-200 transition"><RefreshCw size={14}/> 重置登入狀態 (解決錯誤)</button>
           </div>
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
            <span className="text-[9px] bg-[#E8F1E9] text-[#5F7A61] px-1.5 py-0.5 rounded-full font-bold ml-1">v6.4</span>
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
          <NavBtn id="library" icon={Library} label="資料庫" active={activeTab} set={setActiveTab} />
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
  const sortedPractices = [...practices]
    .filter(p => p && p.date) 
    .map(p => ({...p, dateObj: new Date(p.date), endObj: p.endTime ? new Date(p.endTime) : new Date(new Date(p.date).getTime() + 2*60*60*1000) }))
    .sort((a,b) => a.dateObj - b.dateObj);
  
  // 改用 endObj (結束時間) 來判斷，確保練團正在進行中時不會提早切換成下一場
  const nextPractice = sortedPractices.find(p => p.endObj >= now) || sortedPractices[sortedPractices.length - 1] || { date: new Date().toISOString(), title: '尚未安排', location: '圓頭音樂' };
  
  const nextDateObj = new Date(nextPractice.date);
  const isValidDate = !isNaN(nextDateObj.getTime());
  
  // 修正倒數計時：抹去時間，純粹比較「日曆天」，解決負數進位變成 -0 的 Bug
  let diffDays = 0;
  if (isValidDate) {
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const practiceMidnight = new Date(nextDateObj.getFullYear(), nextDateObj.getMonth(), nextDateObj.getDate());
      diffDays = Math.round((practiceMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
  }

  const handleUpdatePractices = async () => { 
      if (!db) return; 
      await setDoc(getDocRef(db, 'general', 'info'), { practices }, { merge: true }); 
      setEditingPractice(false); 
  };
  
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
  
  const moveMember = async (index, direction) => {
      if (!role.admin) return;
      const newMembers = [...members];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= newMembers.length) return;
      
      [newMembers[index], newMembers[targetIndex]] = [newMembers[targetIndex], newMembers[index]];
      
      const batch = writeBatch(db);
      newMembers.forEach((m, idx) => {
          const ref = getDocRef(db, 'members', m.id);
          batch.update(ref, { order: idx });
      });
      await batch.commit();
  };

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
                  <a href={generateCalendarUrl(p)} target="_blank" className="p-2 text-[#C5B8BF] hover:text-[#77ABC0] hover:bg-[#77ABC0]/10 rounded-lg transition" title="加入行事曆">
                     <CalendarPlus size={18}/>
                  </a>
               </div>
            ))}
            {sortedPractices.length === 0 && <div className="text-xs text-slate-400 text-center py-2">本月尚無安排</div>}
         </div>
      </div>
      <div>
        <div className="flex items-center justify-between px-1 mb-2"><h3 className="font-bold text-xl text-[#725E77]">本月練團點名</h3>{role.admin && <button onClick={() => setEditingMember({})} className="text-xs font-bold text-[#77ABC0] bg-[#F0F4F5] px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus size={14}/> 新增團員</button>}</div>
        <div className="grid grid-cols-1 gap-3">
          {members.map((m, index) => {
            const style = getMemberStyle(m.nickname || m.realName);
            return (
            <div key={m.id} onClick={() => setExpandedMember(expandedMember === m.id ? null : m.id)} className={`bg-white p-4 rounded-2xl border shadow-sm transition-all cursor-pointer ${expandedMember === m.id ? 'border-[#CBABCA] ring-1 ring-[#CBABCA]/30' : 'border-[#E0E0D9]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1 mr-2">
                     {role.admin && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); moveMember(index, -1); }} className="p-0.5 hover:bg-slate-100 rounded text-slate-400"><ArrowUp size={12}/></button>
                          <button onClick={(e) => { e.stopPropagation(); moveMember(index, 1); }} className="p-0.5 hover:bg-slate-100 rounded text-slate-400"><ArrowDown size={12}/></button>
                        </>
                     )}
                  </div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-sm overflow-hidden" style={{backgroundColor: style.color}}>
                    {m.avatarText || m.nickname?.[0] || 'M'}
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
        <input className="w-full bg-[#FDFBF7] p-3 rounded-xl text-sm" placeholder="頭像文字 (預設為暱稱首字)" value={form.avatarText || ''} onChange={e => setForm({...form, avatarText: e.target.value})} />
        <input className="w-full bg-[#FDFBF7] p-3 rounded-xl text-sm" placeholder="樂器 (Vocal, Bass...)" value={form.instrument || ''} onChange={e => setForm({...form, instrument: e.target.value})} />
        <input type="date" className="w-full bg-[#FDFBF7] p-3 rounded-xl text-sm" value={form.birthday || ''} onChange={e => setForm({...form, birthday: e.target.value})} />
        <textarea className="w-full bg-[#FDFBF7] p-3 rounded-xl text-sm h-20" placeholder="備註 (僅管理員可見)" value={form.note || ''} onChange={e => setForm({...form, note: e.target.value})} />
        <div className="flex gap-2 pt-2"><button onClick={onClose} className="flex-1 p-3 rounded-xl text-[#C5B8BF] font-bold">取消</button><button onClick={() => onSave(form)} className="flex-1 p-3 rounded-xl bg-[#77ABC0] text-white font-bold shadow-lg shadow-[#77ABC0]/20">儲存</button></div>
      </div>
    </div>
  );
};

const SessionLogManager = ({ sessions = [], practices = [], members = [], settings = {}, db, appId, role = {}, user }) => {
  const [activeSessionId, setActiveSessionId] = useState(null);
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  
  const pendingPractices = (Array.isArray(practices) ? practices : []).filter(p => {
      if(!p || !p.date) return false;
      const dateStr = String(p.date); 
      const pDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr; 
      const existingDates = safeSessions.map(s => s.date);
      return !existingDates.includes(pDate);
  }).sort((a,b) => new Date(a.date) - new Date(b.date));

  const [showManualCreate, setShowManualCreate] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  // ✅ 功能一：練團日誌群組化與手風琴狀態
  const groupedLogs = useMemo(() => {
    return safeSessions.reduce((acc, s) => {
      if (!s.date) return acc;
      const month = s.date.substring(0, 7); // "YYYY-MM"
      if (!acc[month]) acc[month] = [];
      acc[month].push(s);
      return acc;
    }, {});
  }, [safeSessions]);

  const latestMonth = Object.keys(groupedLogs).sort().reverse()[0] || '';
  const [openMonths, setOpenMonths] = useState({ [latestMonth]: true });

  const toggleMonth = (month) => {
    setOpenMonths(prev => ({ ...prev, [month]: !prev[month] }));
  };

  const handleCreate = async (dateStr, location = '圓頭音樂', preFilledAttendance = []) => {
    if (!db) return;
    
    const newSession = { 
      date: dateStr, 
      location: location, 
      funNotes: '', 
      tracks: [], 
      miscExpenses: [], 
      attendance: preFilledAttendance, 
      createdAt: serverTimestamp() 
    };
    
    try {
      const docRef = await addDoc(getCollectionRef(db, 'logs'), newSession);
      setActiveSessionId(docRef.id);
      setShowManualCreate(false);
    } catch(e) { alert("Error: " + e.message); }
  };
  
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
        <button 
          onClick={() => setShowManualCreate(true)} 
          className="text-xs font-bold text-[#77ABC0] bg-[#F0F4F5] px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#E0E7EA]"
        >
          <FilePlus size={14}/> 自訂日誌
        </button>
      </div>
      
      {pendingPractices.map(p => {
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

      {/* ✅ 實裝：練團日誌手風琴列表 */}
      <div className="space-y-4">
        {Object.entries(groupedLogs)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([month, monthLogs]) => (
            <div key={month} className="space-y-3">
               <button
                 onClick={() => toggleMonth(month)}
                 className="w-full flex justify-between items-center py-2 px-1 text-[#8BA6B9] font-bold tracking-widest transition hover:text-[#6D8A96]"
               >
                 <span>{month.replace('-', ' 年 ')} 月份</span>
                 {openMonths[month] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
               </button>

               {openMonths[month] && (
                 <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                   {monthLogs.map(s => (
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
               )}
            </div>
        ))}
        {safeSessions.length === 0 && <div className="text-center text-[#C5B8BF] text-sm py-8">尚無過往日誌</div>}
      </div>
    </div>
  );
};

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
              <button key={m.id} onClick={() => toggleSessionAttendance(m.id)} className={`px-2 py-1 rounded-lg text-xs font-bold border transition ${session.attendance?.includes(m.id) ? 'bg-[#77ABC0] text-white border-[#77ABC0]' : 'bg-white text-[#C5B8BF] border-[#E0E0D9]'}`}>{m.nickname}</button>))} 
          </div>
        </div>
      </div>
      <div className="flex bg-[#E0E0D9]/50 p-1 rounded-xl mb-6">
        {['tracks', 'practice-fee', 'misc-fee'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${tab === t ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}>{t === 'tracks' ? '曲目' : t === 'practice-fee' ? '練團費' : '雜支'}</button>
        ))}
      </div>
      <div className="bg-white rounded-[32px] border border-[#E0E0D9] p-2 min-h-[300px]">
        {tab === 'tracks' && <TrackList session={session} db={db} user={user} role={role} members={members} />}
        {tab === 'practice-fee' && <PracticeFeeCalculator session={session} members={members} settings={settings} role={role} db={db} />}
        {tab === 'misc-fee' && <MiscFeeCalculator session={session} members={members} db={db} />}
      </div>
    </div>
  );
};

const TrackList = ({ session, db, user, role, members }) => {
  const [expandedTrack, setExpandedTrack] = useState(null);
  const [newTrackName, setNewTrackName] = useState("");
  const [newComment, setNewComment] = useState("");
  
  const [editingLinksId, setEditingLinksId] = useState(null);
  const [tempLinks, setTempLinks] = useState([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");

  const tracks = Array.isArray(session.tracks) ? session.tracks : [];

  const handleAddTrack = async () => { if (!newTrackName.trim() || !db) return; const newTrack = { id: Date.now(), title: newTrackName, status: 'new', links: [], comments: [] }; await updateDoc(getDocRef(db, 'logs', session.id), { tracks: [...tracks, newTrack] }); setNewTrackName(""); };
  
  const handleAddComment = async (trackId) => { 
      if (!newComment.trim()) return; 
      
      const currentMember = members.find(m => (m.email || '').toLowerCase() === (user.email || '').toLowerCase());
      const authorName = currentMember ? currentMember.nickname : (user.displayName || '團員');

      const updatedTracks = tracks.map(t => { 
          if (t.id === trackId) { 
              return { 
                  ...t, 
                  comments: [
                      ...(t.comments || []), 
                      { 
                          text: newComment, 
                          user: authorName, 
                          uid: user?.uid, 
                          email: user?.email, 
                          timestamp: Date.now() 
                      }
                  ] 
              }; 
          } 
          return t; 
      }); 
      await updateDoc(getDocRef(db, 'logs', session.id), { tracks: updatedTracks }); 
      setNewComment(""); 
  };
  
  const checkPermission = (commentUid) => {
      if (user?.uid === commentUid || role.admin) return true;
      return false;
  };

  const handleDeleteComment = async (trackId, comment, commentIdx) => { 
      if (!checkPermission(comment.uid)) return;
      if (!confirm("刪除留言?")) return; 
      
      const updatedTracks = tracks.map(t => { if (t.id === trackId) { const newComments = [...t.comments]; newComments.splice(commentIdx, 1); return { ...t, comments: newComments }; } return t; }); 
      await updateDoc(getDocRef(db, 'logs', session.id), { tracks: updatedTracks }); 
  };

  const handleEditComment = async (trackId, comment, commentIdx) => {
      if (!checkPermission(comment.uid)) return;
      
      const newVal = prompt("編輯留言", comment.text);
      if (newVal === null || newVal === comment.text) return; 

      const updatedTracks = tracks.map(t => { if (t.id === trackId) { const newComments = [...t.comments]; newComments[commentIdx].text = newVal; return { ...t, comments: newComments }; } return t; }); 
      await updateDoc(getDocRef(db, 'logs', session.id), { tracks: updatedTracks }); 
  };

  const openLinkManager = (track) => {
      setEditingLinksId(track.id);
      let currentLinks = Array.isArray(track.links) ? track.links : [];
      if (track.link && currentLinks.length === 0) currentLinks = [{ url: track.link, label: "連結" }];
      setTempLinks(currentLinks);
      setNewLinkUrl("");
      setNewLinkLabel("");
  };

  const addLinkToTemp = () => {
      if (!newLinkUrl.trim()) { alert("請輸入連結！"); return; }
      const label = newLinkLabel.trim() || "連結";
      setTempLinks([...tempLinks, { url: newLinkUrl.trim(), label }]);
      setNewLinkUrl("");
      setNewLinkLabel("");
  };

  const removeLinkFromTemp = (idx) => {
      const newArr = [...tempLinks];
      newArr.splice(idx, 1);
      setTempLinks(newArr);
  };

  const saveAllLinks = async (trackId) => {
      let finalLinks = [...tempLinks];
      if (newLinkUrl.trim()) {
          finalLinks.push({ url: newLinkUrl.trim(), label: newLinkLabel.trim() || "連結" });
      }

      const updatedTracks = tracks.map(t => {
          if (t.id === trackId) {
              return { ...t, links: finalLinks, link: finalLinks.length > 0 ? finalLinks[0].url : "" };
          }
          return t;
      });
      await updateDoc(getDocRef(db, 'logs', session.id), { tracks: updatedTracks });
      setEditingLinksId(null);
      setNewLinkUrl("");
      setNewLinkLabel("");
  };

  return (
    <div className="p-3 space-y-3">
      {tracks.map(t => {
          let displayLinks = Array.isArray(t.links) ? t.links : [];
          if (t.link && displayLinks.length === 0) displayLinks = [{ url: t.link, label: "連結" }];

          return (
            <div key={t.id} className="border border-[#E0E0D9] rounded-2xl overflow-hidden">
              <div className="bg-[#FAFAF9] p-4 flex justify-between items-center cursor-pointer" onClick={() => setExpandedTrack(expandedTrack === t.id ? null : t.id)}>
                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                    <span className="font-bold text-[#725E77] truncate">{t.title}</span>
                    {displayLinks.length > 0 && (
                        <a href={displayLinks[0].url} target="_blank" onClick={e=>e.stopPropagation()} className="text-[#77ABC0] hover:text-[#50656e] bg-white p-1 rounded-full shadow-sm flex-shrink-0"><ExternalLink size={14}/></a>
                    )}
                    {displayLinks.length > 1 && <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 rounded-full">+{displayLinks.length-1}</span>}
                </div>
                <ChevronDown size={16} className={`text-[#C5B8BF] ${expandedTrack === t.id ? 'rotate-180' : ''} flex-shrink-0 ml-2`}/>
              </div>
              
              {expandedTrack === t.id && (
                <div className="p-4 bg-white border-t border-[#E0E0D9] space-y-3">
                  
                  {editingLinksId === t.id ? (
                      <div className="bg-[#F0F4F5] p-3 rounded-xl border border-[#77ABC0] space-y-2">
                          <h4 className="text-xs font-bold text-[#77ABC0] mb-1">編輯連結</h4>
                          {tempLinks.map((link, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-[#E0E0D9]">
                                  <div className="flex-1 min-w-0 flex flex-col">
                                      <span className="text-[10px] font-bold text-slate-500">{link.label}</span>
                                      <span className="text-[10px] text-slate-400 truncate">{link.url}</span>
                                  </div>
                                  <button onClick={() => removeLinkFromTemp(idx)} className="text-red-400 p-1 hover:bg-red-50 rounded"><X size={14}/></button>
                              </div>
                          ))}
                          <div className="flex gap-2 items-center mt-2">
                              <input className="flex-1 bg-white p-2 rounded-lg text-xs outline-none" placeholder="網址 (https://...)" value={newLinkUrl} onChange={e=>setNewLinkUrl(e.target.value)} />
                              <input className="w-20 bg-white p-2 rounded-lg text-xs outline-none" placeholder="名稱" value={newLinkLabel} onChange={e=>setNewLinkLabel(e.target.value)} />
                              <button onClick={addLinkToTemp} className="bg-[#77ABC0] text-white p-2 rounded-lg"><Plus size={14}/></button>
                          </div>
                          <div className="flex gap-2 pt-2 mt-2 border-t border-white/50">
                              <button onClick={() => { setEditingLinksId(null); setNewLinkUrl(""); setNewLinkLabel(""); }} className="flex-1 py-1.5 text-xs text-slate-500 bg-white rounded-lg">取消</button>
                              <button onClick={() => saveAllLinks(t.id)} className="flex-1 py-1.5 text-xs text-white bg-[#77ABC0] rounded-lg">儲存變更</button>
                          </div>
                      </div>
                  ) : (
                      <div className="bg-[#F0F4F5] p-2 rounded-xl flex flex-wrap gap-2 items-center">
                          {displayLinks.length === 0 && <span className="text-xs text-[#C5B8BF] italic ml-1">尚無連結</span>}
                          {displayLinks.map((link, idx) => (
                              <a key={idx} href={link.url} target="_blank" className="flex items-center gap-1 bg-white border border-[#E0E0D9] px-2 py-1 rounded-lg text-xs text-[#725E77] hover:border-[#77ABC0] hover:text-[#77ABC0] transition">
                                  <LinkIcon size={12}/> {link.label || "連結"}
                              </a>
                          ))}
                          <button onClick={() => openLinkManager(t)} className="px-2 py-1 rounded-lg text-xs bg-[#E0E0D9]/50 text-[#725E77] hover:bg-[#E0E0D9] flex items-center gap-1 ml-auto">
                              <Settings size={12}/> 管理連結
                          </button>
                      </div>
                  )}

                  <div className="space-y-2 mt-2">
                      {(t.comments || []).map((c, i) => {
                          let displayName = '團員';
                          if (c.uid) {
                              const found = members.find(m => m.id === c.uid);
                              if (found) displayName = found.nickname;
                              else displayName = c.user || '團員';
                          } else {
                              displayName = c.user || '團員';
                          }
                          
                          return (
                          <div key={i} className="text-xs bg-[#FDFBF7] p-2 rounded-lg flex justify-between items-start">
                              <div><span className="font-bold text-[#725E77]">{displayName}:</span> {c.text}</div>
                              {checkPermission(c.uid) && (
                                <div className="flex gap-1">
                                    <button onClick={() => handleEditComment(t.id, c, i)} className="text-[#77ABC0] p-1 rounded hover:bg-white"><Pencil size={12}/></button>
                                    <button onClick={() => handleDeleteComment(t.id, c, i)} className="text-[#BC8F8F] p-1 rounded hover:bg-white"><Trash2 size={12}/></button>
                                </div>
                              )}
                          </div>
                      )})}
                  </div>
                  <div className="flex gap-2"><input className="w-full bg-[#FDFBF7] text-xs p-2 rounded-lg outline-none text-[#725E77]" placeholder="輸入留言..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment(t.id)} /><button onClick={() => handleAddComment(t.id)} className="text-[#77ABC0]"><Check size={16}/></button></div>
                </div>
              )}
            </div>
          );
      })}
      <div className="flex gap-2"><input className="flex-1 bg-[#FDFBF7] border border-[#E0E0D9] rounded-xl px-3 text-xs outline-none" placeholder="輸入新歌名..." value={newTrackName} onChange={e => setNewTrackName(e.target.value)} /><button onClick={handleAddTrack} className="px-4 py-3 bg-[#77ABC0]/10 text-[#77ABC0] font-bold text-xs flex items-center justify-center gap-1 border border-dashed border-[#77ABC0]/50 hover:bg-[#77ABC0]/20 rounded-2xl transition"><Plus size={14}/> 新增</button></div>
    </div>
  );
};

const PracticeFeeCalculator = ({ session, members = [], settings = {}, role = {}, db }) => { 
  const [selectedIds, setSelectedIds] = useState(Array.isArray(session.attendance) ? session.attendance : []); 
  const [hours, setHours] = useState(2);
  const [hasKB, setHasKB] = useState(true);
  
  const safeMembers = Array.isArray(members) ? members : [];

  useEffect(() => {
      if (Array.isArray(session.attendance)) {
          setSelectedIds(session.attendance);
      }
  }, [session.attendance]);

  const defaultBank = "(013)國泰世華銀行 帳號：699514620885";
  const [bankAccount, setBankAccount] = useState(settings?.studioBankAccount || defaultBank);
  const [editingBank, setEditingBank] = useState(false);
  
  const studioRate = Number(settings?.studioRate) || 350;
  const kbRate = Number(settings?.kbRate) || 200;

  const total = (hours * studioRate) + (hasKB ? kbRate : 0);
  
  const validSelectedIds = selectedIds.filter(id => safeMembers.some(m => m.id === id));
  const perPerson = validSelectedIds.length > 0 ? Math.ceil(total / validSelectedIds.length) : 0;
  
  const handleUpdateBank = async () => { if(!db) return; await updateDoc(getDocRef(db, 'general', 'info'), { settings: { ...settings, studioBankAccount: bankAccount } }); setEditingBank(false); };
  
  const toggleSelection = async (memberId) => {
      const ref = getDocRef(db, 'logs', session.id);
      if (selectedIds.includes(memberId)) {
          await updateDoc(ref, { attendance: arrayRemove(memberId) });
      } else {
          await updateDoc(ref, { attendance: arrayUnion(memberId) });
      }
  };

  const copyText = () => { 
      const validNames = validSelectedIds
          .map(id => safeMembers.find(m => m.id === id)) 
          .filter(m => m) 
          .map(m => m.nickname); 
          
      const namesStr = validNames.length > 0 ? validNames.join('、') : '(無)';

      const text = `📅 ${session.date} 練團費用\n----------------\n⏱️ 時數：${hours}hr\n🎹 KB租借：${hasKB?'有':'無'}\n👥 分攤人：${namesStr}\n----------------\n💰 總金額：$${total}\n👉 每人應付：$${perPerson}\n\n匯款帳號：\n${bankAccount}`; 
      if(secureCopy(text)) alert("複製成功！"); 
  };

  return (
    <div className="p-4 space-y-5">
      <div className="bg-[#F0F4F5] p-4 rounded-2xl text-center border border-[#A8D8E2]/30"><div className="text-3xl font-black text-[#77ABC0] mb-1">${total}</div><div className="text-xs font-bold text-[#6E7F9B]">每人 <span className="text-lg text-[#725E77]">${perPerson}</span></div></div>
      <div className="space-y-3">
          <div className="flex gap-2">{[2, 3].map(h => <button key={h} onClick={() => setHours(h)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${hours === h ? 'bg-[#725E77] text-white' : 'bg-[#FDFBF7] text-[#C5B8BF]'}`}>{h}hr</button>)}<button onClick={() => setHasKB(!hasKB)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${hasKB ? 'bg-[#77ABC0] text-white' : 'bg-[#FDFBF7] text-[#C5B8BF]'}`}>KB {hasKB?'+':'-'}</button></div>
          
          <div><label className="text-[10px] font-bold text-[#C5B8BF] mb-2 block uppercase">分攤名單 (與日誌同步)</label><div className="flex flex-wrap gap-2">{safeMembers.map(m => (
              <button key={m.id} onClick={() => toggleSelection(m.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedIds.includes(m.id) ? 'bg-[#A8D8E2]/20 border-[#A8D8E2] text-[#5F8794]' : 'bg-white border-[#E0E0D9] text-[#C5B8BF]'}`}>{m.nickname}</button>
          ))}</div></div>

          <div className="flex gap-2 items-center">
            <input className="w-full bg-[#FDFBF7] p-3 rounded-xl text-xs text-[#725E77] border border-transparent focus:border-[#77ABC0] outline-none" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} disabled={!editingBank} />
            {(role?.admin || role?.finance) && !editingBank && <button onClick={()=>setEditingBank(true)}><Pencil size={16} className="text-[#C5B8BF]"/></button>}
            {editingBank && <button onClick={handleUpdateBank}><Check size={16} className="text-[#77ABC0]"/></button>}
          </div>
      </div>
      <button onClick={copyText} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition bg-[#77ABC0] text-white`}>{<Copy size={16}/>} 複製請款文</button>
    </div>
  );
};

const MiscFeeCalculator = ({ session, members = [], db }) => {
  const [items, useState] = React.useState(session.miscExpenses || []); 
  const [newItem, setNewItem] = React.useState({ item: '', amount: '', payerId: '', splitters: [] });
  const [showDetails, setShowDetails] = React.useState(false); 
  
  const safeMembers = Array.isArray(members) ? members : [];

  const handleUpdate = async (newItems) => { setItems(newItems); if (db) await updateDoc(getDocRef(db, 'logs', session.id), { miscExpenses: newItems }); };
  const handleAdd = () => { if(newItem.item) handleUpdate([...items, { ...newItem, id: Date.now(), isSettled: false }]); };
  const handleToggleSettle = (idx) => { const newItems = [...items]; newItems[idx].isSettled = !newItems[idx].isSettled; handleUpdate(newItems); };
  const handleDelete = (idx) => { if (confirm("刪除此筆雜支？")) handleUpdate(items.filter((_, i) => i !== idx)); };
  const toggleSplitter = (memberId) => { const current = newItem.splitters || []; if (current.includes(memberId)) setNewItem({...newItem, splitters: current.filter(id => id !== memberId)}); else setNewItem({...newItem, splitters: [...current, memberId]}); };
  
  const calculateDebt = () => {
      const balance = {}; 
      items.filter(i => !i.isSettled).forEach(item => { 
          const validSplitters = (item.splitters || []).filter(id => safeMembers.some(m => m.id === id));
          if (validSplitters.length === 0) return;
          const splitAmount = item.amount / validSplitters.length; 
          
          if (safeMembers.some(m => m.id === item.payerId)) {
             balance[item.payerId] = (balance[item.payerId] || 0) + parseInt(item.amount); 
          }

          validSplitters.forEach(sid => { 
              balance[sid] = (balance[sid] || 0) - splitAmount; 
          }); 
      });
      
      const result = []; 
      Object.keys(balance).forEach(id => { 
          const net = Math.round(balance[id]); 
          const member = safeMembers.find(m => m.id === id);
          if (!member) return; 

          if (net < 0) result.push(`${member.nickname} 應付 $${Math.abs(net)}`); 
          else if (net > 0) result.push(`${member.nickname} 應收 $${net}`); 
      }); 
      return result;
  };

  const generateDetailedLogs = () => {
      const logs = {}; 
      safeMembers.forEach(m => { logs[m.id] = { name: m.nickname, paid: [], split: [], net: 0 }; });

      items.filter(i => !i.isSettled).forEach(item => {
          const validSplitters = (item.splitters || []).filter(id => safeMembers.some(m => m.id === id));
          if (validSplitters.length === 0) return;
          
          const rawSplitAmount = item.amount / validSplitters.length;

          if (logs[item.payerId]) {
              logs[item.payerId].paid.push({ item: item.item, amount: parseInt(item.amount) });
              logs[item.payerId].net += parseInt(item.amount);
          }

          validSplitters.forEach(sid => {
              if (logs[sid]) {
                  logs[sid].split.push({ item: item.item, amount: rawSplitAmount });
                  logs[sid].net -= rawSplitAmount;
              }
          });
      });
      return logs;
  };

  const copyText = () => { let text = `🍱 ${session.date} 雜支明細\n----------------\n`; items.filter(i => !i.isSettled).forEach(i => { text += `🔹 ${i.item} ($${i.amount}) - 墊付:${(safeMembers.find(m=>m.id===i.payerId)?.nickname || '未知')}\n`; }); secureCopy(text); };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E0E0D9] space-y-3">
         <div className="flex gap-2"><input className="flex-1 bg-white p-2 rounded-xl text-xs outline-none" placeholder="項目" value={newItem.item} onChange={e=>setNewItem({...newItem, item: e.target.value})}/><input className="w-20 bg-white p-2 rounded-xl text-xs outline-none" type="number" placeholder="$" value={newItem.amount} onChange={e=>setNewItem({...newItem, amount: e.target.value})}/></div>
         <div className="flex items-center gap-2 overflow-x-auto pb-1"><span className="text-[10px] font-bold text-[#C5B8BF] shrink-0">墊付:</span>{safeMembers.map(m => (<button key={m.id} onClick={()=>setNewItem({...newItem, payerId: m.id})} className={`px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${newItem.payerId === m.id ? 'bg-[#F1CEBA] text-white border-[#F1CEBA]' : 'bg-white text-[#C5B8BF] border-[#E0E0D9]'}`}>{m.nickname}</button>))}</div>
         <div className="flex items-center gap-2 overflow-x-auto pb-1"><span className="text-[10px] font-bold text-[#C5B8BF] shrink-0">分攤:</span>{safeMembers.map(m => (<button key={m.id} onClick={()=>toggleSplitter(m.id)} className={`px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${newItem.splitters?.includes(m.id) ? 'bg-[#725E77] text-white border-[#725E77]' : 'bg-white text-[#C5B8BF] border-[#E0E0D9]'}`}>{m.nickname}</button>))}</div>
         <button onClick={handleAdd} className="w-full bg-[#725E77] text-white text-xs font-bold py-2 rounded-xl">加入清單</button>
      </div>
      <div className="bg-[#E8F1E9] p-3 rounded-xl border border-[#CFE3D1]"><h4 className="text-xs font-bold text-[#5F7A61] mb-2 flex items-center gap-1"><Wallet size={12}/> 結算建議 (未結清項目)</h4><div className="space-y-1">{calculateDebt().map((res, i) => (<div key={i} className="text-xs text-[#5F7A61]">{res}</div>))}{calculateDebt().length === 0 && <div className="text-[10px] text-[#A6B5A7]">無待結算項目</div>}</div></div>
      
      <button onClick={() => setShowDetails(!showDetails)} className="w-full py-2 bg-white border border-[#E0E0D9] text-[#C5B8BF] rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#FDFBF7]">{showDetails ? '隱藏計算明細' : '查看計算明細'} <FileText size={14}/></button>
      
      {showDetails && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              {Object.values(generateDetailedLogs()).map((log, idx) => {
                  if (log.paid.length === 0 && log.split.length === 0) return null; 
                  return (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-[#E0E0D9] text-xs">
                          <div className="font-bold text-[#725E77] mb-1 flex justify-between">
                              <span>🧑 {log.name}</span>
                              <span className={Math.round(log.net) > 0 ? "text-green-600" : Math.round(log.net) < 0 ? "text-red-500" : "text-slate-400"}>
                                  {Math.round(log.net) > 0 ? `應收 $${Math.round(log.net)}` : Math.round(log.net) < 0 ? `應付 $${Math.abs(Math.round(log.net))}` : "平"}
                              </span>
                          </div>
                          <div className="space-y-0.5 pl-2 border-l-2 border-[#F0F4F5]">
                              {log.paid.map((p, i) => <div key={i} className="text-green-600">(墊) {p.item}: +${p.amount}</div>)}
                              {log.split.map((s, i) => <div key={i} className="text-red-400">(攤) {s.item}: -${Math.round(s.amount)}</div>)}
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

      <div className="space-y-2">{items.map((it, idx) => (
         <div key={idx} className={`bg-white border border-[#E0E0D9] p-3 rounded-xl flex justify-between items-center text-xs ${it.isSettled ? 'opacity-50' : ''}`}>
             <div><div className={`font-bold text-[#725E77] ${it.isSettled ? 'line-through' : ''}`}>{it.item} <span className="text-[#F1CEBA]">${it.amount}</span></div><div className="text-[#C5B8BF]">墊付: {(safeMembers.find(m=>m.id===it.payerId)?.nickname || '未知')}</div></div>
             <div className="flex gap-2"><button onClick={() => handleToggleSettle(idx)} className={it.isSettled ? "text-green-500" : "text-[#C5B8BF]"} title="結清請打勾"><CheckSquare size={16}/></button><button onClick={() => handleDelete(idx)} className="text-[#BC8F8F]"><Trash2 size={16}/></button></div>
         </div>
      ))}</div>
      <button onClick={copyText} className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-[#8DA399] text-white"><Copy size={16}/> 複製未結清明細</button>
    </div>
  );
};

const AlcoholFeeCalculator = ({ members = [], settings = {} }) => {
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState('');
  const [splitters, setSplitters] = useState([]);
  
  const safeMembers = Array.isArray(members) ? members : [];
  const perPerson = splitters.length > 0 ? Math.ceil(parseInt(amount || 0) / splitters.length) : 0;
  
  const toggleSplitter = (id) => {
    if (splitters.includes(id)) setSplitters(splitters.filter(s => s !== id));
    else setSplitters([...splitters, id]);
  };

  const copyResult = () => {
    if (!amount || !payerId || splitters.length === 0) return alert("請完整填寫資訊");
    const payerName = safeMembers.find(m => m.id === payerId)?.nickname || '未知';
    const text = `🍺 酒水補貨\n----------------\n💰 總金額：$${amount}\n👑 墊付人：${payerName}\n👥 分攤人：${splitters.map(id => (safeMembers.find(m => m.id === id)?.nickname || '未知')).join('、')}\n----------------\n👉 每人應付：$${perPerson}\n給 ${payerName}`;
    if(secureCopy(text)) alert("複製成功！");
  };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white p-5 rounded-[28px] border border-[#E0E0D9] shadow-sm space-y-4">
        <h3 className="font-bold text-[#725E77] flex items-center gap-2"><Calculator size={20}/> 補貨計算機</h3>
        <div className="space-y-1">
           <label className="text-[10px] font-bold text-[#C5B8BF] uppercase">總金額</label>
           <input type="number" className="w-full bg-[#FDFBF7] p-3 rounded-xl text-lg font-bold text-[#725E77] outline-none" placeholder="$" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1">
           <label className="text-[10px] font-bold text-[#C5B8BF] uppercase">誰先墊錢？</label>
           <div className="flex flex-wrap gap-2">
             {safeMembers.map(m => (
               <button key={m.id} onClick={() => setPayerId(m.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${payerId === m.id ? 'bg-[#F1CEBA] text-white border-[#F1CEBA]' : 'bg-white text-[#C5B8BF] border-[#E0E0D9]'}`}>{m.nickname}</button>
             ))}
           </div>
        </div>
        <div className="space-y-1">
           <label className="text-[10px] font-bold text-[#C5B8BF] uppercase">誰要分攤？</label>
           <div className="flex flex-wrap gap-2">
             {safeMembers.map(m => (
               <button key={m.id} onClick={() => toggleSplitter(m.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${splitters.includes(m.id) ? 'bg-[#77ABC0] text-white border-[#77ABC0]' : 'bg-white text-[#C5B8BF] border-[#E0E0D9]'}`}>{m.nickname}</button>
             ))}
           </div>
        </div>
        {perPerson > 0 && (
          <div className="bg-[#F0F4F5] p-3 rounded-xl text-center">
            <div className="text-xs text-[#6E7F9B] mb-1">每人應付</div>
            <div className="text-2xl font-black text-[#725E77]">${perPerson}</div>
          </div>
        )}
        <button onClick={copyResult} className="w-full py-3 bg-[#77ABC0] text-white rounded-xl font-bold shadow-lg active:scale-95 transition">複製結算結果</button>
      </div>
    </div>
  );
};

// 🛡️ ✅ 功能二：酒櫃改為三個頁籤 (庫存、歷史、計算機)
const AlcoholManager = ({ alcohols = [], members = [], settings = {}, db, role = {}, user }) => {
  const [tab, setTab] = useState('list'); 
  const [showAdd, setShowAdd] = useState(false);
  const [editingComment, setEditingComment] = useState({ alcoholId: null, index: null, text: '' });
  const [newCommentMap, setNewCommentMap] = useState({});

  const today = new Date().toISOString().split('T')[0];
  const [batchDate, setBatchDate] = useState(today);
  const [batchItems, setBatchItems] = useState([
      { name: '', type: '啤酒', level: 100, rating: 5, note: '' }
  ]);
  const [isInventoryMode, setIsInventoryMode] = useState(false);
  const [isSavingInventory, setIsSavingInventory] = useState(false);

  const alcoholOptions = Array.isArray(settings?.alcoholTypes) ? settings.alcoholTypes : ['紅酒', '白酒', '清酒', '氣泡酒', '啤酒', '威士忌', '其他'];
  const safeAlcohols = Array.isArray(alcohols) ? alcohols : [];

  // --- 資料分群邏輯 ---
  const historyAlcohols = safeAlcohols.filter(a => a.isEmptied === true);
  const activeAlcohols = safeAlcohols.filter(a => a.isEmptied !== true);
  const archivedAlcohols = activeAlcohols.filter(a => a.date === 'archived');
  const currentBatchAlcohols = activeAlcohols.filter(a => a.date !== 'archived');

  const groupedAlcohols = currentBatchAlcohols.reduce((acc, curr) => {
      const d = curr.date || '未知日期';
      if (!acc[d]) acc[d] = [];
      acc[d].push(curr);
      return acc;
  }, {});
  
  const sortedDates = Object.keys(groupedAlcohols).sort((a, b) => new Date(b) - new Date(a));

  const handleAddBatchItem = () => {
      setBatchItems([...batchItems, { name: '', type: '啤酒', level: 100, rating: 5, note: '' }]);
  };

  const handleRemoveBatchItem = (index) => {
      const newItems = [...batchItems];
      newItems.splice(index, 1);
      setBatchItems(newItems);
  };

  const handleUpdateBatchItem = (index, field, value) => {
      const newItems = [...batchItems];
      newItems[index][field] = value;
      setBatchItems(newItems);
  };

  const handleSaveBatch = async () => {
      if (!db) return;
      const validItems = batchItems.filter(item => item.name.trim() !== '');
      if (validItems.length === 0) {
          alert("請至少輸入一支酒的名稱");
          return;
      }

      try {
          const batch = writeBatch(db);
          validItems.forEach(item => {
              const finalType = item.type === '其他' ? (item.customType || '其他') : item.type;
              const docRef = doc(getCollectionRef(db, 'alcohol')); 
              batch.set(docRef, {
                  name: item.name,
                  type: finalType,
                  level: parseInt(item.level),
                  note: item.note,
                  date: batchDate, 
                  isEmptied: false, 
                  comments: [],
                  createdAt: serverTimestamp()
              });
          });

          await batch.commit();
          setShowAdd(false);
          setBatchItems([{ name: '', type: '啤酒', level: 100, rating: 5, note: '' }]);
      } catch (error) {
          console.error(error);
          alert("❌ 儲存失敗：" + error.message);
      }
  };

  const [inventoryState, setInventoryState] = useState({}); 

  const startInventory = () => {
      const initialState = {};
      activeAlcohols.forEach(a => {
          initialState[a.id] = { level: a.level, toEmpty: false };
      });
      setInventoryState(initialState);
      setIsInventoryMode(true);
  };

  const cancelInventory = () => {
      setIsInventoryMode(false);
      setInventoryState({});
  };

  const saveInventory = async () => {
      if (!db) return;
      setIsSavingInventory(true);

      try {
          const batch = writeBatch(db);
          Object.keys(inventoryState).forEach(id => {
              const state = inventoryState[id];
              const docRef = getDocRef(db, 'alcohol', id);
              
              if (state.toEmpty || state.level <= 0) {
                  batch.update(docRef, { 
                      isEmptied: true, 
                      level: 0,
                      date: 'history' 
                  });
              } else {
                  batch.update(docRef, { 
                      level: state.level,
                      date: 'archived' 
                  });
              }
          });

          await batch.commit();
          setIsInventoryMode(false);
      } catch (error) {
          console.error(error);
          alert("❌ 盤點失敗：" + error.message);
      } finally {
          setIsSavingInventory(false);
      }
  };

  const handleHardDelete = async (id) => { if (!db || !confirm("⚠️ 確定要永久刪除此酒品與所有留言？此操作無法復原。")) return; await deleteDoc(getDocRef(db, 'alcohol', id)); };
  
  const handleAddComment = async (id) => { 
      const text = newCommentMap[id];
      if(!text?.trim()) return; 
      
      const memberInfo = members.find(m => (m.email || '').toLowerCase() === (user.email || '').toLowerCase());
      const displayName = memberInfo ? memberInfo.nickname : (user.displayName || '團員');
      
      const currentComments = alcohols.find(a => a.id === id)?.comments || [];
      const newComment = { user: displayName, text, uid: user.uid }; 
      
      await updateDoc(getDocRef(db, 'alcohol', id), { comments: [...currentComments, newComment] }); 
      setNewCommentMap({ ...newCommentMap, [id]: '' });
  };
  const checkPermission = (commentUid) => { return user?.uid === commentUid || role.admin; };
  const handleDeleteComment = async (alcoholId, comment, commentIdx) => { 
      if (!checkPermission(comment.uid)) return;
      if(!confirm("刪除留言？")) return; 
      const alcohol = alcohols.find(a => a.id === alcoholId);
      const newComments = [...(alcohol.comments || [])]; 
      newComments.splice(commentIdx, 1); 
      await updateDoc(getDocRef(db, 'alcohol', alcoholId), { comments: newComments }); 
  };
  const startEditComment = (alcoholId, comment, index) => {
      if (!checkPermission(comment.uid)) return;
      setEditingComment({ alcoholId, index, text: comment.text });
  };
  const saveEditedComment = async () => {
      const { alcoholId, index, text } = editingComment;
      const alcohol = alcohols.find(a => a.id === alcoholId);
      const newComments = [...(alcohol.comments || [])];
      newComments[index].text = text;
      await updateDoc(getDocRef(db, 'alcohol', alcoholId), { comments: newComments });
      setEditingComment({ alcoholId: null, index: null, text: '' });
  };

  const renderAlcoholCard = (a) => (
      <div key={a.id} className={`bg-white p-5 rounded-[28px] border shadow-sm flex flex-col gap-3 relative group transition-all ${a.isEmptied ? 'border-slate-200 opacity-80' : 'border-[#E0E0D9]'}`}>
         <div className="flex gap-4 items-start">
            <div className={`w-16 h-20 rounded-2xl flex items-center justify-center shrink-0 ${a.isEmptied ? 'bg-slate-100 grayscale' : 'bg-[#F0EEE6]'}`}>
                <Wine className={a.isEmptied ? "text-slate-400" : "text-[#D6C592]"} size={32} />
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-lg ${a.isEmptied ? 'text-slate-500 line-through decoration-slate-300' : 'text-[#725E77]'}`}>{a.name}</h3>
                    {a.isEmptied && <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold">已喝光</span>}
                </div>
                <p className={`text-xs font-bold mb-1 ${a.isEmptied ? 'text-slate-400' : 'text-[#8B8C89]'}`}>{a.type}</p>
                
                {!a.isEmptied && (
                    <div className="w-full h-1.5 bg-[#F0F4F5] rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-[#D6C592]" style={{width: `${a.level}%`}}></div>
                    </div>
                )}
                <div className={`text-xs ${a.isEmptied ? 'text-slate-400' : 'text-[#6E7F9B]'}`}>{a.note}</div>
            </div>
            
            {role.admin && a.isEmptied && (
                <button onClick={() => handleHardDelete(a.id)} className="text-red-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
            )}
            {role.alcohol && !a.isEmptied && (
                <button onClick={() => handleHardDelete(a.id)} className="text-[#BC8F8F] opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
            )}
         </div>
         
         <div className={`pt-2 border-t ${a.isEmptied ? 'border-slate-100' : 'border-[#F0F4F5]'}`}>
            {(a.comments || []).map((c, idx) => (
                <div key={idx} className="mb-2 group/comment">
                    {editingComment.alcoholId === a.id && editingComment.index === idx ? (
                        <div className="flex gap-2 items-center bg-[#F0F4F5] p-2 rounded-lg">
                            <input className="w-full bg-transparent text-sm text-[#725E77] outline-none" value={editingComment.text} autoFocus onChange={(e) => setEditingComment({...editingComment, text: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') saveEditedComment(); else if(e.key === 'Escape') setEditingComment({ alcoholId: null, index: null, text: '' }); }} />
                            <button onClick={saveEditedComment} className="text-[#77ABC0] hover:bg-white p-1 rounded"><Check size={16}/></button>
                            <button onClick={() => setEditingComment({ alcoholId: null, index: null, text: '' })} className="text-[#BC8F8F] hover:bg-white p-1 rounded"><X size={16}/></button>
                        </div>
                    ) : (
                        <div className={`text-sm flex justify-between items-start ${a.isEmptied ? 'text-slate-500' : 'text-[#6E7F9B]'}`}>
                            <span className="leading-snug"><span className="font-bold">{c.user}:</span> {c.text}</span>
                            {checkPermission(c.uid) && (
                                <div className="flex gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                    <button onClick={() => startEditComment(a.id, c, idx)} className="text-[#77ABC0] p-0.5"><Pencil size={12}/></button>
                                    <button onClick={() => handleDeleteComment(a.id, c, idx)} className="text-[#BC8F8F] p-0.5"><Trash2 size={12}/></button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
            <div className="flex gap-2 mt-3 items-center">
              <input className={`w-full p-2 rounded-xl text-sm outline-none border border-transparent focus:border-[#77ABC0]/30 transition ${a.isEmptied ? 'bg-slate-50 placeholder-slate-400 text-slate-600' : 'bg-[#FDFBF7]'}`} placeholder="寫下品飲心得..." value={newCommentMap[a.id] || ''} onChange={(e) => setNewCommentMap({ ...newCommentMap, [a.id]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleAddComment(a.id)} />
              <button onClick={() => handleAddComment(a.id)} className={`p-2 rounded-xl transition ${newCommentMap[a.id] ? 'bg-[#77ABC0] text-white shadow-md' : 'bg-[#F0F4F5] text-[#C5B8BF]'}`} disabled={!newCommentMap[a.id]}><ArrowRight size={18} /></button>
            </div>
         </div>
      </div>
  );

  return (
    <div className="space-y-4 animate-in slide-in-from-right-8">
      {/* 三個頁籤切換 */}
      <div className="flex bg-[#E0E0D9] p-1 rounded-xl mb-4">
          <button onClick={() => setTab('list')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${tab === 'list' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}><Wine size={14}/> 庫存中</button>
          <button onClick={() => setTab('history')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${tab === 'history' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}><Archive size={14}/> 歷史評價</button>
          <button onClick={() => setTab('calculator')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${tab === 'calculator' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}><Calculator size={14}/> 補貨計算</button>
      </div>

      {tab === 'list' && (
        <div className="space-y-4">
          {role.alcohol && !isInventoryMode && (
              <div className="flex gap-2">
                  <button onClick={() => { setShowAdd(!showAdd); setBatchDate(today); setBatchItems([{ name: '', type: '啤酒', level: 100, rating: 5, note: '' }]); }} className="flex-1 py-3 bg-white text-[#77ABC0] font-bold text-xs flex items-center justify-center gap-1 border border-[#77ABC0] rounded-2xl hover:bg-[#F0F4F5] transition"><Plus size={14}/> 批次進貨</button>
                  {activeAlcohols.length > 0 && <button onClick={startInventory} className="flex-1 py-3 bg-[#725E77] text-white font-bold text-xs flex items-center justify-center gap-1 rounded-2xl shadow-md hover:bg-[#5a4a5e] transition"><ClipboardList size={14}/> 進行盤點</button>}
              </div>
          )}

          {showAdd && !isInventoryMode && (
              <div className="bg-white p-5 rounded-[28px] border-2 border-[#77ABC0] shadow-lg space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="flex justify-between items-center">
                      <h3 className="font-bold text-[#725E77]">📦 批次進貨</h3>
                      <input type="date" className="bg-[#FDFBF7] p-2 rounded-lg text-sm border border-[#E0E0D9] text-[#725E77] font-bold outline-none" value={batchDate} onChange={e => setBatchDate(e.target.value)} />
                  </div>
                  
                  <div className="space-y-3">
                      {batchItems.map((item, index) => (
                          <div key={index} className="bg-[#F0F4F5] p-3 rounded-xl relative border border-[#A8D8E2]/50">
                              {batchItems.length > 1 && <button onClick={() => handleRemoveBatchItem(index)} className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full p-1"><X size={14}/></button>}
                              <div className="flex gap-2 mb-2">
                                  <input className="flex-1 bg-white p-2 rounded-lg text-sm outline-none" placeholder="酒名 (必填)" value={item.name} onChange={e => handleUpdateBatchItem(index, 'name', e.target.value)} />
                                  <select className="w-24 bg-white p-2 rounded-lg text-sm outline-none" value={item.type} onChange={e => handleUpdateBatchItem(index, 'type', e.target.value)}>
                                      {alcoholOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                              </div>
                              {item.type === '其他' && <input className="w-full bg-white p-2 rounded-lg text-sm mb-2 outline-none" placeholder="輸入自訂種類" value={item.customType || ''} onChange={e => handleUpdateBatchItem(index, 'customType', e.target.value)} />}
                              <div className="flex items-center gap-2 text-xs text-[#725E77] font-bold mb-2">
                                  <span>剩餘量: {item.level}%</span>
                                  <input type="range" min="0" max="100" className="flex-1" value={item.level} onChange={e => handleUpdateBatchItem(index, 'level', e.target.value)} />
                              </div>
                              <input className="w-full bg-white p-2 rounded-lg text-sm outline-none" placeholder="備註 (選填)..." value={item.note} onChange={e => handleUpdateBatchItem(index, 'note', e.target.value)} />
                          </div>
                      ))}
                  </div>

                  <button onClick={handleAddBatchItem} className="w-full py-3 border-2 border-dashed border-[#77ABC0]/50 text-[#77ABC0] rounded-xl font-bold flex justify-center items-center gap-1 hover:bg-[#F0F4F5] transition"><Plus size={14}/> 新增下一支</button>
                  <div className="flex gap-2 pt-2"><button onClick={() => setShowAdd(false)} className="flex-1 p-3 rounded-xl text-[#C5B8BF] font-bold hover:bg-slate-50">取消</button><button onClick={handleSaveBatch} className="flex-1 p-3 bg-[#77ABC0] text-white rounded-xl font-bold shadow-lg hover:bg-[#6699af]">全部儲存</button></div>
              </div>
          )}

          {isInventoryMode && (
              <div className="bg-[#FFF9DB] p-5 rounded-[28px] border-2 border-[#D6C592] shadow-lg animate-in fade-in">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-[#8C7A35] flex items-center gap-2"><ClipboardList size={20}/> 快速盤點模式</h3>
                      <span className="text-xs bg-white text-[#8C7A35] px-2 py-1 rounded-lg font-bold shadow-sm">{activeAlcohols.length} 支</span>
                  </div>
                  <div className="space-y-2 mb-4 max-h-[60vh] overflow-y-auto pr-1">
                      {activeAlcohols.map(a => {
                          const state = inventoryState[a.id];
                          if (!state) return null;
                          const isEmptied = state.toEmpty || state.level <= 0;

                          return (
                              <div key={a.id} className={`bg-white p-3 rounded-xl border flex items-center gap-3 transition-all ${isEmptied ? 'opacity-70 border-slate-300 bg-slate-50' : 'border-[#E0E0D9]'}`}>
                                  <div className="flex-1 min-w-0">
                                      <div className={`font-bold text-sm truncate ${isEmptied ? 'line-through text-slate-500' : 'text-[#725E77]'}`}>{a.name}</div>
                                      {!isEmptied && (
                                          <div className="flex items-center gap-2 mt-1">
                                              <span className="text-[10px] text-[#C5B8BF] font-bold w-8">{state.level}%</span>
                                              <input type="range" min="0" max="100" step="5" value={state.level} onChange={(e) => setInventoryState({...inventoryState, [a.id]: { ...state, level: parseInt(e.target.value) }})} className="flex-1 accent-[#D6C592]" />
                                          </div>
                                      )}
                                      {isEmptied && <div className="text-[10px] text-slate-500 font-bold mt-1">盤點後將移至歷史酒單</div>}
                                  </div>
                                  <button onClick={() => setInventoryState({...inventoryState, [a.id]: { ...state, toEmpty: !state.toEmpty }})} className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 transition ${isEmptied ? 'bg-slate-700 text-white shadow-inner' : 'bg-[#F0F4F5] text-[#C5B8BF] hover:bg-slate-200 hover:text-slate-700'}`}>
                                      <Wine size={18}/>
                                      <span className="text-[9px] font-bold mt-0.5">喝光</span>
                                  </button>
                              </div>
                          );
                      })}
                  </div>
                  <div className="flex gap-2">
                      <button onClick={cancelInventory} disabled={isSavingInventory} className="flex-1 p-3 rounded-xl bg-white text-[#C5B8BF] font-bold border border-[#E0E0D9] hover:bg-slate-50 transition disabled:opacity-50">返回 (不儲存)</button>
                      <button onClick={saveInventory} disabled={isSavingInventory} className="flex-[2] p-3 rounded-xl bg-[#8C7A35] text-white font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-[#7a6a2e] transition disabled:opacity-75">
                          {isSavingInventory ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                          {isSavingInventory ? '儲存中...' : '💾 儲存並返回清單'}
                      </button>
                  </div>
              </div>
          )}

          {!isInventoryMode && (
              <div className="space-y-6">
                  {sortedDates.map(date => (
                      <div key={date} className="space-y-3">
                          <div className="flex items-center gap-2 pl-2">
                              <Calendar size={16} className="text-[#77ABC0]"/>
                              <h3 className="font-bold text-sm text-[#77ABC0] tracking-wider">{date} 新增</h3>
                          </div>
                          <div className="grid gap-3">
                              {groupedAlcohols[date].map(renderAlcoholCard)}
                          </div>
                      </div>
                  ))}

                  {archivedAlcohols.length > 0 && (
                      <div className="space-y-3 pt-4 border-t-2 border-dashed border-[#E0E0D9]">
                          <div className="flex items-center gap-2 pl-2">
                              <Archive size={16} className="text-[#D6C592]"/>
                              <h3 className="font-bold text-sm text-[#8C7A35] tracking-wider">🍾 寄酒 / 庫存中</h3>
                          </div>
                          <div className="grid gap-3">
                              {archivedAlcohols.map(renderAlcoholCard)}
                          </div>
                      </div>
                  )}

                  {activeAlcohols.length === 0 && !showAdd && (
                      <div className="text-center py-10 border-2 border-dashed border-[#E0E0D9] rounded-[28px] text-[#C5B8BF]">
                          <Wine size={40} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-bold">酒櫃目前空空如也</p>
                      </div>
                  )}
              </div>
          )}
        </div>
      )}

      {/* 獨立歷史評價頁籤 */}
      {tab === 'history' && (
         <div className="space-y-4 animate-in fade-in">
             <div className="flex justify-between items-center px-2 mb-2">
                <h3 className="font-bold text-[#8B8C89] tracking-wider flex items-center gap-2"><BookMarked size={18}/> 已喝光清單</h3>
                <span className="text-xs bg-[#E0E0D9] text-[#725E77] px-3 py-1 rounded-full font-bold">共 {historyAlcohols.length} 支</span>
             </div>
             
             {historyAlcohols.length > 0 ? (
                 <div className="grid gap-4">
                     {historyAlcohols.map(renderAlcoholCard)}
                 </div>
             ) : (
                 <div className="text-center py-12 border-2 border-dashed border-[#E0E0D9] rounded-[28px] text-[#C5B8BF] bg-white/50">
                     <Archive size={40} className="mx-auto mb-3 opacity-30" />
                     <p className="text-sm font-bold">目前沒有歷史紀錄喔！</p>
                 </div>
             )}
         </div>
      )}

      {tab === 'calculator' && <AlcoholFeeCalculator members={members} settings={settings} />}
    </div>
  );
};

const TechView = ({ songs = [], db, role, user }) => {
  const [viewMode, setViewMode] = useState('list'); 
  const [filter, setFilter] = useState('all'); 
  const [showAdd, setShowAdd] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', artist: '', link: '', type: 'cover' });
  const [editingSongId, setEditingSongId] = useState(null);
  const [editForm, setEditForm] = useState({});
  
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");

  const safeSongs = Array.isArray(songs) ? songs : [];
  const filteredSongs = filter === 'all' ? safeSongs : safeSongs.filter(s => String(s.type || 'cover').toLowerCase() === filter);
  
  const handleAdd = async () => { 
      if (!newSong.title || !db) return; 
      
      let finalLinks = [...(newSong.links || [])];
      // v6.1 防呆修正：自動收納尚未點擊 + 號的連結
      if (newLinkUrl.trim()) {
          finalLinks.push({ url: newLinkUrl.trim(), label: newLinkLabel.trim() || '連結' });
      }

      await addDoc(getCollectionRef(db, 'songs'), { 
          ...newSong, 
          links: finalLinks,
          link: finalLinks.length > 0 ? finalLinks[0].url : "",
          user: user.displayName, 
          uid: user.uid 
      }); 
      setShowAdd(false); 
      setNewSong({ title: '', artist: '', link: '', type: 'cover', links: [] }); 
      setNewLinkUrl("");
      setNewLinkLabel("");
  };

  const handleDelete = async (id) => { if (!db || !confirm("刪除此資源？")) return; await deleteDoc(getDocRef(db, 'songs', id)); };
  
  const startEdit = (song) => {
    if (role.admin || song.uid === user.uid) {
        setEditingSongId(song.id);
        let currentLinks = Array.isArray(song.links) ? song.links : [];
        if (song.link && currentLinks.length === 0) {
            currentLinks = [{ url: song.link, label: "連結" }];
        }
        setEditForm({ ...song, links: currentLinks });
        setNewLinkUrl("");
        setNewLinkLabel("");
    } else {
        alert("只能修改自己上傳的資源喔！");
    }
  };

  const cancelEdit = () => {
    setEditingSongId(null);
    setEditForm({});
    setNewLinkUrl("");
    setNewLinkLabel("");
  };

  const saveEdit = async () => {
    if (!editForm.title || !db) return;
    
    let finalLinks = [...(editForm.links || [])];
    // v6.1 防呆修正：自動收納尚未點擊 + 號的連結
    if (newLinkUrl.trim()) {
        finalLinks.push({ url: newLinkUrl.trim(), label: newLinkLabel.trim() || '連結' });
    }

    await updateDoc(getDocRef(db, 'songs', editingSongId), {
        ...editForm,
        links: finalLinks,
        link: finalLinks.length > 0 ? finalLinks[0].url : ""
    });
    setEditingSongId(null);
    setNewLinkUrl("");
    setNewLinkLabel("");
  };

  const addLinkToEditForm = () => {
      if (!newLinkUrl?.trim()) { alert("請輸入連結！"); return; }
      const label = newLinkLabel?.trim() || "連結";
      setEditForm({ 
          ...editForm, 
          links: [...(editForm.links || []), { url: newLinkUrl.trim(), label }],
      });
      setNewLinkUrl("");
      setNewLinkLabel("");
  };

  const removeLinkFromEditForm = (idx) => {
      const newLinks = [...(editForm.links || [])];
      newLinks.splice(idx, 1);
      setEditForm({ ...editForm, links: newLinks });
  };

  const addLinkToState = (isEditMode) => {
      if (!newLinkUrl.trim()) { alert("請輸入連結！"); return; }
      const label = newLinkLabel.trim() || "連結";
      const newLinkObj = { url: newLinkUrl.trim(), label };
      
      if (isEditMode) {
          setEditForm({ ...editForm, links: [...(editForm.links || []), newLinkObj] });
      } else {
          setNewSong({ ...newSong, links: [...(newSong.links || []), newLinkObj] });
      }
      setNewLinkUrl("");
      setNewLinkLabel("");
  };
  
  const removeLinkFromState = (idx, isEditMode) => {
      if (isEditMode) {
          const newLinks = [...(editForm.links || [])];
          newLinks.splice(idx, 1);
          setEditForm({ ...editForm, links: newLinks });
      } else {
          const newLinks = [...(newSong.links || [])];
          newLinks.splice(idx, 1);
          setNewSong({ ...newSong, links: newLinks });
      }
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-right-8">
      <div className="flex justify-between items-center px-1"><h2 className="text-2xl font-bold text-[#725E77]">資源分享</h2><div className="flex bg-[#E0E0D9]/50 p-1 rounded-lg"><button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white text-[#725E77]' : 'text-[#C5B8BF]'}`}><List size={16}/></button><button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white text-[#725E77]' : 'text-[#C5B8BF]'}`}><LayoutGrid size={16}/></button></div></div>
      <div className="flex gap-2 overflow-x-auto pb-1">{['all', 'cover', 'tech', 'gear'].map(f => (<button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition ${filter === f ? 'bg-[#77ABC0] text-white' : 'bg-white border border-[#E0E0D9] text-[#C5B8BF]'}`}>{f}</button>))}</div>
      <button onClick={() => setShowAdd(true)} className="w-full py-3 text-[#77ABC0] font-bold text-xs flex items-center justify-center gap-1 border border-dashed border-[#77ABC0]/50 hover:bg-[#77ABC0]/5 rounded-2xl transition"><Plus size={14}/> 分享資源</button>
      {showAdd && (<div className="bg-white p-4 rounded-[24px] border border-[#77ABC0] space-y-3"><input className="w-full bg-[#FDFBF7] p-2 rounded-lg text-sm" placeholder="標題" value={newSong.title} onChange={e=>setNewSong({...newSong, title: e.target.value})} /><input className="w-full bg-[#FDFBF7] p-2 rounded-lg text-sm" placeholder="說明" value={newSong.artist} onChange={e=>setNewSong({...newSong, artist: e.target.value})} /><select className="w-full bg-[#FDFBF7] p-2 rounded-lg text-sm" value={newSong.type} onChange={e=>setNewSong({...newSong, type: e.target.value})}><option value="cover">Cover</option><option value="tech">Tech</option><option value="gear">Gear</option></select>
          <div className="bg-[#FDFBF7] p-2 rounded-lg space-y-2">
                 <div className="text-xs font-bold text-[#C5B8BF] mb-1">連結列表</div>
                 {(newSong.links || []).map((l, i) => (
                     <div key={i} className="flex justify-between items-center text-xs bg-white p-1 rounded border">
                         <span className="truncate flex-1">{l.label}: {l.url}</span>
                         <button onClick={() => removeLinkFromState(i, false)}><X size={12} className="text-red-400"/></button>
                     </div>
                 ))}
                 <div className="flex gap-1 items-center">
                     <input className="flex-1 bg-white p-1.5 text-xs border rounded outline-none" placeholder="網址..." value={newLinkUrl} onChange={e=>setNewLinkUrl(e.target.value)}/>
                     <input className="w-16 bg-white p-1.5 text-xs border rounded outline-none" placeholder="名稱" value={newLinkLabel} onChange={e=>setNewLinkLabel(e.target.value)}/>
                     <button onClick={() => addLinkToState(false)} className="bg-[#77ABC0] text-white p-1.5 rounded"><Plus size={14}/></button>
                 </div>
          </div>
          <div className="flex gap-2"><button onClick={() => setShowAdd(false)} className="flex-1 p-2 text-xs text-slate-400">取消</button><button onClick={handleAdd} className="flex-1 p-2 bg-[#77ABC0] text-white rounded-lg text-xs font-bold">發布</button></div></div>)}
      
      <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-3" : "space-y-3"}>
        {filteredSongs.map(s => {
            const isEditing = editingSongId === s.id;
            const canEdit = role.admin || s.uid === user.uid;
            
            let displayLinks = Array.isArray(s.links) ? s.links : [];
            if (s.link && displayLinks.length === 0) displayLinks = [{ url: s.link, label: "連結" }];

            if (isEditing) {
                return (
                    <div key={s.id} className="bg-white p-4 rounded-[24px] border border-[#77ABC0] space-y-2 shadow-md">
                        <input className="w-full bg-[#FDFBF7] p-2 rounded-lg text-sm" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="標題" />
                        <input className="w-full bg-[#FDFBF7] p-2 rounded-lg text-sm" value={editForm.artist} onChange={e => setEditForm({...editForm, artist: e.target.value})} placeholder="說明" />
                        <select className="w-full bg-[#FDFBF7] p-2 rounded-lg text-sm" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})}>
                            <option value="cover">Cover</option><option value="tech">Tech</option><option value="gear">Gear</option>
                        </select>
                        
                        <div className="bg-[#FDFBF7] p-2 rounded-lg space-y-2">
                             <div className="text-xs font-bold text-[#C5B8BF] mb-1">連結列表</div>
                             {(editForm.links || []).map((l, i) => (
                                 <div key={i} className="flex justify-between items-center text-xs bg-white p-1 rounded border">
                                     <span className="truncate flex-1">{l.label}: {l.url}</span>
                                     <button onClick={() => removeLinkFromEditForm(i)}><X size={12} className="text-red-400"/></button>
                                 </div>
                             ))}
                             <div className="flex gap-1 items-center">
                                 <input className="flex-1 bg-white p-1.5 text-xs border rounded outline-none" placeholder="網址 (https://...)" value={newLinkUrl} onChange={e=>setNewLinkUrl(e.target.value)}/>
                                 <input className="w-16 bg-white p-1.5 text-xs border rounded outline-none" placeholder="名稱" value={newLinkLabel} onChange={e=>setNewLinkLabel(e.target.value)}/>
                                 <button onClick={addLinkToEditForm} className="bg-[#77ABC0] text-white p-1.5 rounded"><Plus size={14}/></button>
                             </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={saveEdit} className="flex-1 p-2 bg-[#77ABC0] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"><Check size={14}/> 儲存</button>
                            <button onClick={cancelEdit} className="flex-1 p-2 bg-[#FDFBF7] text-[#BC8F8F] rounded-lg text-xs font-bold flex items-center justify-center gap-1"><X size={14}/> 取消</button>
                        </div>
                    </div>
                );
            }

            return (
                <div key={s.id} className={`bg-white p-4 rounded-[24px] border border-[#E0E0D9] shadow-sm hover:shadow-md transition block relative group ${viewMode === 'list' ? 'flex items-center gap-4' : ''}`}>
                    <div className="flex justify-between items-start">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${s.type === 'cover' ? 'bg-[#FDF2F2] text-[#BC8F8F]' : s.type === 'tech' ? 'bg-[#F0F4F5] text-[#6D8A96]' : 'bg-[#FFF9DB] text-[#D6C592]'}`}>
                            {s.type === 'cover' ? <Headphones size={20}/> : s.type === 'tech' ? <Zap size={20}/> : <Gift size={20}/>}
                        </div>
                        {canEdit && (
                            <div className="flex gap-1">
                                 <button onClick={() => startEdit(s)} className="text-[#77ABC0] bg-white/80 p-1.5 rounded-full hover:bg-white shadow-sm transition"><Pencil size={14}/></button>
                                 <button onClick={() => handleDelete(s.id)} className="text-[#BC8F8F] bg-white/80 p-1.5 rounded-full hover:bg-white shadow-sm transition"><Trash2 size={14}/></button>
                            </div>
                        )}
                    </div>
                    
                    <div className="min-w-0 pr-2">
                        <h4 className="font-bold text-[#725E77] truncate">{s.title}</h4>
                        <p className="text-xs text-[#8B8C89]">{s.artist}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-1">
                        {displayLinks.length === 0 && <span className="text-xs text-[#C5B8BF] italic">無連結</span>}
                        {displayLinks.map((l, i) => (
                            <a key={i} href={l.url} target="_blank" className="text-[10px] bg-[#F0F4F5] text-[#725E77] px-2 py-1 rounded-full flex items-center gap-1 hover:bg-[#E0E7EA] hover:text-[#77ABC0] transition border border-transparent hover:border-[#77ABC0]/30">
                                <LinkIcon size={10}/> {l.label || '連結'}
                            </a>
                        ))}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

const LibraryView = ({ songs = [], repertoire = [], db, role, user }) => {
    const [subTab, setSubTab] = useState('repertoire');
    
    return (
        <div className="space-y-4 animate-in slide-in-from-right-8">
            <div className="flex justify-between items-center px-1">
                <h2 className="text-2xl font-bold text-[#725E77]">樂團資料庫</h2>
            </div>
            <div className="flex bg-[#E0E0D9] p-1 rounded-xl mb-4">
                <button 
                    onClick={() => setSubTab('repertoire')} 
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${subTab === 'repertoire' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}
                >
                    <BookOpen size={16}/> 練團曲庫
                </button>
                <button 
                    onClick={() => setSubTab('resources')} 
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${subTab === 'resources' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}
                >
                    <UploadCloud size={16}/> 資源分享
                </button>
            </div>
            
            {subTab === 'repertoire' ? (
                <RepertoireManager repertoire={repertoire} db={db} role={role} user={user} />
            ) : (
                <TechView songs={songs} db={db} role={role} user={user} />
            )}
        </div>
    );
};

const RepertoireManager = ({ repertoire = [], db, role, user }) => {
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [editingSong, setEditingSong] = useState(null);
    const [form, setForm] = useState({ title: '', artist: '', key: '', links: [], tags: '' });
    
    const [newLinkUrl, setNewLinkUrl] = useState("");
    const [newLinkLabel, setNewLinkLabel] = useState("");

    const safeRepertoire = Array.isArray(repertoire) ? repertoire : [];
    const filteredSongs = safeRepertoire.filter(s => 
        s.title?.toLowerCase().includes(search.toLowerCase()) || 
        s.artist?.toLowerCase().includes(search.toLowerCase()) ||
        s.tags?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSave = async () => {
        if (!form.title || !db) return;
        
        // v6.1 防呆修正：自動收納尚未點擊 + 號的連結
        let finalLinks = [...(form.links || [])];
        if (newLinkUrl.trim()) {
            finalLinks.push({ url: newLinkUrl.trim(), label: newLinkLabel.trim() || '連結' });
        }
        const dataToSave = { ...form, links: finalLinks };

        try {
            if (editingSong) {
                await updateDoc(getDocRef(db, 'repertoire', editingSong.id), dataToSave);
            } else {
                await addDoc(getCollectionRef(db, 'repertoire'), {
                    ...dataToSave,
                    createdBy: user.displayName,
                    uid: user.uid, 
                    createdAt: serverTimestamp()
                });
            }
            setShowAdd(false);
            setEditingSong(null);
            setForm({ title: '', artist: '', key: '', links: [], tags: '' });
            setNewLinkUrl("");
            setNewLinkLabel("");
        } catch (e) {
            console.error(e);
            alert("儲存失敗");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("確定要刪除這首歌嗎？")) return;
        await deleteDoc(getDocRef(db, 'repertoire', id));
    };
    
    const startEdit = (song) => {
        setEditingSong(song);
        let initLinks = Array.isArray(song.links) ? song.links : [];
        if (initLinks.length === 0) {
            if (song.youtube) initLinks.push({ label: 'YouTube', url: song.youtube });
            if (song.sheet) initLinks.push({ label: '樂譜', url: song.sheet });
        }
        setForm({ ...song, links: initLinks });
        setShowAdd(true);
    };

    const addLinkToForm = () => {
        if (!newLinkUrl.trim()) { alert("請輸入連結！"); return; }
        const label = newLinkLabel.trim() || "連結";
        setForm({ ...form, links: [...(form.links || []), { url: newLinkUrl.trim(), label }] });
        setNewLinkUrl("");
        setNewLinkLabel("");
    };

    const removeLinkFromForm = (idx) => {
        const newLinks = [...(form.links || [])];
        newLinks.splice(idx, 1);
        setForm({ ...form, links: newLinks });
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C5B8BF]" size={16} />
                <input 
                    className="w-full bg-white border border-[#E0E0D9] pl-10 pr-4 py-3 rounded-xl text-sm outline-none focus:border-[#77ABC0]"
                    placeholder="搜尋歌名、歌手或標籤..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <button onClick={() => { setEditingSong(null); setForm({ title: '', artist: '', key: '', links: [], tags: '' }); setShowAdd(true); }} className="w-full py-3 text-[#77ABC0] font-bold text-xs flex items-center justify-center gap-1 border border-dashed border-[#77ABC0]/50 hover:bg-[#77ABC0]/5 rounded-2xl transition"><Plus size={14}/> 新增曲目</button>
            
            {showAdd && (
                <div className="bg-white p-4 rounded-[24px] border border-[#77ABC0] space-y-3 animate-in fade-in slide-in-from-top-2">
                    <h3 className="font-bold text-[#725E77] text-sm">{editingSong ? '編輯曲目' : '新增曲目'}</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <input className="bg-[#FDFBF7] p-2 rounded-lg text-sm" placeholder="歌名" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                        <input className="bg-[#FDFBF7] p-2 rounded-lg text-sm" placeholder="原唱" value={form.artist} onChange={e => setForm({...form, artist: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         <input className="bg-[#FDFBF7] p-2 rounded-lg text-sm" placeholder="Key (Ex: Gm)" value={form.key} onChange={e => setForm({...form, key: e.target.value})} />
                         <input className="bg-[#FDFBF7] p-2 rounded-lg text-sm" placeholder="標籤 (Ex: #新歌)" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} />
                    </div>
                    
                    <div className="bg-[#FDFBF7] p-2 rounded-lg space-y-2">
                        <div className="text-xs font-bold text-[#C5B8BF] mb-1">相關連結</div>
                        {(form.links || []).map((l, i) => (
                             <div key={i} className="flex justify-between items-center text-xs bg-white p-1 rounded border">
                                 <div className="flex-1 truncate"><span className="font-bold">{l.label}:</span> {l.url}</div>
                                 <button onClick={() => removeLinkFromForm(i)}><X size={12} className="text-red-400"/></button>
                             </div>
                        ))}
                        <div className="flex gap-1 items-center">
                             <input className="flex-1 bg-white p-1.5 text-xs border rounded outline-none" placeholder="網址 (https://...)" value={newLinkUrl} onChange={e=>setNewLinkUrl(e.target.value)}/>
                             <input className="w-16 bg-white p-1.5 text-xs border rounded outline-none" placeholder="名稱" value={newLinkLabel} onChange={e=>setNewLinkLabel(e.target.value)}/>
                             <button onClick={addLinkToForm} className="bg-[#77ABC0] text-white p-1.5 rounded"><Plus size={14}/></button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => setShowAdd(false)} className="flex-1 p-2 text-xs text-slate-400">取消</button>
                        <button onClick={handleSave} className="flex-1 p-2 bg-[#77ABC0] text-white rounded-lg text-xs font-bold">儲存</button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {filteredSongs.map(s => {
                    let displayLinks = Array.isArray(s.links) ? s.links : [];
                    if (displayLinks.length === 0) {
                        if (s.youtube) displayLinks.push({ label: 'YouTube', url: s.youtube });
                        if (s.sheet) displayLinks.push({ label: '樂譜', url: s.sheet });
                    }

                    return (
                        <div key={s.id} className="bg-white p-4 rounded-[20px] border border-[#E0E0D9] shadow-sm flex flex-col gap-2 group relative">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-[#725E77] truncate text-lg">{s.title}</h4>
                                        {s.key && <span className="bg-[#F0F4F5] text-[#6E7F9B] text-[10px] font-bold px-1.5 py-0.5 rounded">{s.key}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-[#C5B8BF]">
                                        <span>{s.artist}</span>
                                        {s.tags && <span>• {s.tags}</span>}
                                    </div>
                                </div>
                                
                                <div className="flex gap-1 shrink-0 ml-2">
                                    <button onClick={() => startEdit(s)} className="p-1.5 text-[#77ABC0] bg-white/80 rounded-full hover:bg-white shadow-sm transition"><Pencil size={14}/></button>
                                    <button onClick={() => handleDelete(s.id)} className="p-1.5 text-[#BC8F8F] bg-white/80 rounded-full hover:bg-white shadow-sm transition"><Trash2 size={14}/></button>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-1">
                                {displayLinks.length === 0 && <span className="text-xs text-[#C5B8BF] italic">無連結</span>}
                                {displayLinks.map((l, i) => (
                                    <a key={i} href={l.url} target="_blank" className="text-[10px] bg-[#F0F4F5] text-[#725E77] px-2 py-1 rounded-full flex items-center gap-1 hover:bg-[#E0E7EA] hover:text-[#77ABC0] transition border border-transparent hover:border-[#77ABC0]/30">
                                        {l.label === 'YouTube' ? <Youtube size={12}/> : l.label.includes('譜') ? <BookOpen size={12}/> : <LinkIcon size={12}/>}
                                        {l.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {filteredSongs.length === 0 && <div className="text-center text-[#C5B8BF] text-xs py-8">沒有找到相關歌曲</div>}
            </div>
        </div>
    );
};

const AdminDashboard = ({ members = [], logs = [], generalData = {}, db, alcohols = [], songs = [], repertoire = [] }) => {
  const [tab, setTab] = useState('members');
  const [alcoholTypes, setAlcoholTypes] = useState(Array.isArray(generalData.settings?.alcoholTypes) ? generalData.settings.alcoholTypes : []);
  const [prankMessage, setPrankMessage] = useState(""); 

  useEffect(() => {
    if (generalData?.settings?.alcoholTypes && Array.isArray(generalData.settings.alcoholTypes)) {
      setAlcoholTypes(generalData.settings.alcoholTypes);
    }
    if (generalData?.prankMessage) {
        setPrankMessage(generalData.prankMessage);
    } else {
        setPrankMessage("👻 抓到了！"); 
    }
  }, [generalData]);

  const handleUpdateSettings = async () => { await updateDoc(getDocRef(db, 'general', 'info'), { settings: { ...generalData.settings, alcoholTypes }, prankMessage }); alert("設定已更新"); };
  
  const handleExport = () => { 
      const dataToExport = tab === 'members' ? members : logs; 
      const formattedData = dataToExport.map(item => { if (tab === 'members') return { 暱稱: item.nickname, 本名: item.realName, 樂器: item.instrument, 生日: item.birthday, Email: item.email || '' }; else { const attendeesCount = members.filter(m => m.attendance?.includes(item.date)).length; const trackDetails = item.tracks?.map(t => `${t.title} ${t.comments?.length ? '(' + t.comments.map(c => c.user + ':' + c.text).join('/') + ')' : ''}`).join('; '); return { 日期: item.date, 地點: item.location, 出席人數: attendeesCount, 練習曲目: trackDetails, 備註: item.funNotes }; } }); 
      exportToCSV(formattedData, `Band_${tab}_export.csv`); 
  };
  
  const handleFullBackup = () => {
      const backupData = {
          version: "2.0",
          timestamp: new Date().toISOString(),
          members,
          logs,
          alcohols,
          songs,
          repertoire,
          generalData
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `band_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleRestore = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if (!confirm("⚠️ 警告：還原操作可能會覆蓋現有的同名資料。\n建議先進行備份。\n確定要繼續嗎？")) {
          e.target.value = '';
          return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const data = JSON.parse(event.target.result);
              console.log("Restoring data...", data);
              
              const restoreCollection = async (colName, items) => {
                  if (!Array.isArray(items)) return;
                  const promises = items.map(item => {
                      const { id, ...rest } = item;
                      if (id) return setDoc(getDocRef(db, colName, id), rest); 
                      else return addDoc(getCollectionRef(db, colName), rest);
                  });
                  await Promise.all(promises);
              };

              await restoreCollection('members', data.members);
              await restoreCollection('logs', data.logs);
              await restoreCollection('alcohol', data.alcohols);
              await restoreCollection('songs', data.songs);
              await restoreCollection('repertoire', data.repertoire);
              
              if (data.generalData) {
                  await setDoc(getDocRef(db, 'general', 'info'), data.generalData);
              }
              
              alert("✅ 資料還原成功！請重新整理頁面。");
          } catch (err) {
              console.error(err);
              alert("❌ 還原失敗：檔案格式錯誤或網路問題。");
          }
      };
      reader.readAsText(file);
  };

  const handleDelete = async (collectionName, id) => { if (confirm("⚠️ 警告：這將永久刪除此筆資料！確定嗎？")) await deleteDoc(getDocRef(db, collectionName, id)); };
  
  const safeMembers = Array.isArray(members) ? members : [];
  const safeLogs = Array.isArray(logs) ? logs : [];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 pb-20">
      <div className="bg-white p-5 rounded-[32px] border border-[#E0E0D9] shadow-sm">
        <h2 className="text-xl font-black text-[#725E77] flex items-center gap-2 mb-4"><Database size={24}/> 後台管理</h2>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button onClick={() => setTab('members')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${tab === 'members' ? 'bg-[#77ABC0] text-white' : 'bg-[#F0F4F5]'}`}>成員</button>
            <button onClick={() => setTab('logs')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${tab === 'logs' ? 'bg-[#77ABC0] text-white' : 'bg-[#F0F4F5]'}`}>紀錄</button>
            <button onClick={() => setTab('settings')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${tab === 'settings' ? 'bg-[#77ABC0] text-white' : 'bg-[#F0F4F5]'}`}>設定</button>
            <button onClick={() => setTab('data')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${tab === 'data' ? 'bg-[#77ABC0] text-white' : 'bg-[#F0F4F5]'}`}>資料維護</button>
        </div>
        
        {tab === 'settings' && (
            <div className="space-y-3">
                <h3 className="font-bold text-[#725E77]">酒櫃分類</h3>
                <textarea className="w-full h-24 p-3 bg-[#FDFBF7] rounded-xl text-xs" value={alcoholTypes.join(',')} onChange={e => setAlcoholTypes(e.target.value.split(','))} />
                <h3 className="font-bold text-[#725E77]">惡作劇訊息</h3>
                <input className="w-full p-3 bg-[#FDFBF7] rounded-xl text-xs" value={prankMessage} onChange={e => setPrankMessage(e.target.value)} />
                <button onClick={handleUpdateSettings} className="w-full py-2 bg-[#77ABC0] text-white rounded-xl text-xs font-bold">儲存設定</button>
            </div>
        )}
        
        {tab === 'data' && (
            <div className="space-y-4">
                <div className="bg-[#F0F4F5] p-4 rounded-xl border border-[#E0E0D9]">
                    <h3 className="font-bold text-[#725E77] mb-2 flex items-center gap-2"><Download size={16}/> 備份資料</h3>
                    <p className="text-xs text-slate-500 mb-3">將所有樂團資料下載為 JSON 檔案妥善保存。</p>
                    <button onClick={handleFullBackup} className="w-full py-2 bg-[#725E77] text-white rounded-lg text-xs font-bold">下載全站備份</button>
                </div>
                <div className="bg-[#FFF5F7] p-4 rounded-xl border border-[#F2D7DD]">
                    <h3 className="font-bold text-[#BC8F8F] mb-2 flex items-center gap-2"><UploadCloud size={16}/> 還原資料</h3>
                    <p className="text-xs text-slate-500 mb-3">從備份檔還原。注意：可能會覆蓋現有資料。</p>
                    <label className="w-full py-2 bg-[#BC8F8F] text-white rounded-lg text-xs font-bold text-center block cursor-pointer">
                        選擇備份檔並還原
                        <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                    </label>
                </div>
            </div>
        )}

        {(tab === 'members' || tab === 'logs') && (
            <button onClick={handleExport} className="w-full py-3 bg-[#E8F1E9] text-[#5F7A61] rounded-xl text-xs font-bold flex items-center justify-center gap-2"><Download size={16}/> 匯出 CSV</button>
        )}
      </div>
      
      {(tab === 'members' || tab === 'logs') && (
          <div className="bg-white rounded-[24px] border border-[#E0E0D9] overflow-hidden p-4">
              <table className="w-full text-left text-xs">
                  <thead><tr><th className="p-2">名稱/日期</th><th className="p-2">詳情</th><th className="p-2 text-right">操作</th></tr></thead>
                  <tbody>
                      {(tab === 'members' ? safeMembers : safeLogs).map(i => (
                          <tr key={i.id} className="border-t">
                              <td className="p-2 font-bold">{tab === 'members' ? i.nickname : i.date}</td>
                              <td className="p-2 text-slate-500">{tab === 'members' ? i.instrument : i.location}</td>
                              <td className="p-2 text-right"><button onClick={() => handleDelete(tab === 'members' ? 'members' : 'logs', i.id)} className="text-[#BC8F8F]"><Trash2 size={14}/></button></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}
    </div>
  );
};

export default App;
