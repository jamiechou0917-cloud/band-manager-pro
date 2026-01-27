import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signInWithCustomToken, signInAnonymously, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Music2, Mic2, Users, ClipboardList, Beer, Calendar, 
  Settings, LogOut, Menu, X, ShieldCheck, Plus, Loader2, 
  MessageCircle, ChevronDown, ChevronUp, Play, 
  ExternalLink, Smile, DollarSign, Copy, Check, Wine,
  MapPin, CalendarPlus, Cake, XCircle, CheckCircle2,
  Wallet, Receipt, Coffee, Gift, Zap, LayoutGrid, List,
  PartyPopper, Headphones, Speaker, Star, Image as ImageIcon, Disc,
  Ghost
} from 'lucide-react';

// --- 🎸 樂團專屬設定區 (最高隱私版) ---

// 方法 A: Base64 編碼 (最推薦！完全不外流)
const BAND_LOGO_BASE64 = ""; 

// 方法 B: 使用圖片網址 (Imgur 等圖床)
const BAND_LOGO_URL = ""; 

const BAND_NAME = "不開玩笑";

// --- 內建純程式碼 Logo (範例：一張黑膠唱片) ---
const BandLogo = () => (
  <div className="w-9 h-9 bg-[#CBABCA] rounded-xl flex items-center justify-center text-white shadow-md shadow-[#CBABCA]/30 overflow-hidden relative">
    {/* 這裡示範用 Icon 組合出一個 Logo，你可以自由發揮 */}
    <Disc size={22} className="animate-spin" style={{animationDuration: '10s'}}/>
    <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#F1CEBA] rounded-full opacity-90 border border-white/50"></div>
  </div>
);

// --- 實用工具：安全複製文字 ---
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

// --- 實用工具：星座計算 ---
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

// --- Firebase 初始化 ---

// 1. 你的真實設定 (已自動填入)
const USER_CONFIG = {
  apiKey: "AIzaSyDb36ftpgHzZEH2IuYOsPmJEiKgeVhLWKk",
  authDomain: "bandmanager-a3049.firebaseapp.com",
  projectId: "bandmanager-a3049",
  storageBucket: "bandmanager-a3049.firebasestorage.app",
  messagingSenderId: "193559225053",
  appId: "1:193559225053:web:124fd5a7ab3cf1a854f134"
};

// 2. 系統自動判斷：如果有環境變數(預覽中)則使用環境變數，否則使用你的設定(部署後)
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : USER_CONFIG;

let auth, googleProvider, db;
try {
  if (firebaseConfig) {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  }
} catch (e) { console.error("Firebase init error:", e); }

// --- 模擬資料 (Fallback) ---
const MOCK_DATA = {
  settings: {
    studioRate: 350, 
    kbRate: 200,     
    studioBankAccount: '(822) 1234-5678-9012 (電吉他手)',
    miscBankAccount: '(013) 9999-8888-7777 (貝斯手)' 
  },
  nextPractice: {
    date: '2026-02-21T20:00:00',
    title: '2月衝刺場',
    location: '強尼練團室 A'
  },
  currentMonthSessions: ['2026-02-21', '2026-02-28']
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [imgError, setImgError] = useState(false);
  const [showPrankModal, setShowPrankModal] = useState(false);

  // Real Data States
  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [alcohols, setAlcohols] = useState([]);
  const [songs, setSongs] = useState([]);
  
  const appId = USER_CONFIG.appId; 

  useEffect(() => {
    if (auth) {
      const unsubAuth = onAuthStateChanged(auth, u => {
        setUser(u);
        setLoading(false); // 登入狀態確認後關閉 loading
      });

      // 優先使用 Token (預覽用)
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        signInWithCustomToken(auth, __initial_auth_token).catch(e => console.error("Token Auth Failed", e));
      }

      return () => unsubAuth();
    } else {
      // 若 Firebase 初始化失敗 (例如 Config 設定錯誤)，停止 Loading 並停留在登入畫面
      // 不再自動登入體驗帳號，避免誤解
      setLoading(false);
    }
  }, []);

  // Firestore Listeners
  useEffect(() => {
    if (!db || !appId) return;

    const unsubMembers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'members'), (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => console.log(e));

    const unsubLogs = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date)));
    }, (e) => console.log(e));

    const unsubAlcohol = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'alcohol'), (snap) => {
      setAlcohols(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => console.log(e));

    const unsubSongs = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'songs'), (snap) => {
      setSongs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => console.log(e));

    return () => { unsubMembers(); unsubLogs(); unsubAlcohol(); unsubSongs(); };
  }, [user]);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (err) { alert("登入失敗，請檢查 Firebase Console Authentication 設定"); }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const renderContent = () => {
    // Pass real data from state instead of mock
    switch (activeTab) {
      case 'dashboard': return <DashboardView members={members} nextPractice={MOCK_DATA.nextPractice} alcoholCount={alcohols.length} monthSessions={MOCK_DATA.currentMonthSessions} />;
      case
