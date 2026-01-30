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
  User, StickyNote, ArrowRight
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
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
          <AlertTriangle size={48} className="text-red-500 mb-4"/>
          <h2 className="text-xl font-bold mb-2">程式發生錯誤</h2>
          <pre className="bg-slate-200 p-4 rounded-lg text-xs overflow-auto max-w-full mb-6 border border-slate-300">{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#77ABC0] text-white rounded-xl font-bold shadow-lg">重新整理</button>
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
  practices: [] 
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
    // ⚠️ 修正：移除 forceLoad timeout。
    // 我們必須等待 Firestore 真正的回傳，不能因為網路慢就塞預設值，這會導致資料被覆蓋。
    // 如果網路真的很慢，畫面會停在 Loading，這比資料遺失好。
    
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
        setGeneralData(data);
      } else {
        // 只有在確定文件真的不存在時才初始化，避免誤判
        setDoc(getDocRef(db, 'general', 'info'), DEFAULT_GENERAL_DATA);
        setGeneralData(DEFAULT_GENERAL_DATA);
      }
      setLoading(false); // 只有拿到資料才解除 Loading
    });
    return () => { unsubMembers(); unsubLogs(); unsubAlcohol(); unsubSongs(); unsubGeneral(); };
  }, [user]);

  const handleLogin = async () => {
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (err) { 
      console.error("Popup failed", err);
      alert("登入彈窗被阻擋，請允許彈出
