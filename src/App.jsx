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
        setLoading(false);
        // 如果沒有 user (且不是在預覽環境使用 Custom Token 登入的情況下)，
        // 為了讓使用者體驗 UI，自動登入體驗帳號。
        // 注意：部署後若要強制 Google 登入，可移除這行 setTimeout
        if (!u && typeof __firebase_config !== 'undefined') {
            setTimeout(() => setUser({ uid: 'demo', displayName: '體驗帳號', photoURL: null }), 1000);
        }
      });

      // 優先使用 Token (預覽用)
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        signInWithCustomToken(auth, __initial_auth_token).catch(e => console.error("Token Auth Failed", e));
      }

      return () => unsubAuth();
    } else {
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
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (err) { 
      console.error("Login failed:", err);
      // 提供更詳細的錯誤指引
      alert(`登入失敗！\n錯誤代碼: ${err.code}\n\n請檢查以下兩點：\n1. 您的網站網址 (Vercel domain) 是否已加入 Firebase Console 的「Authorized domains」白名單？\n2. Authentication 的 Google 登入功能是否已啟用？`); 
    }
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
      case 'logs': return <SessionLogManager sessions={logs} scheduledDates={MOCK_DATA.currentMonthSessions} members={members} settings={MOCK_DATA.settings} appId={appId} db={db} />;
      case 'alcohol': return <AlcoholManager alcohols={alcohols} members={members} settings={MOCK_DATA.settings} appId={appId} db={db} />;
      case 'tech': return <TechView songs={songs} appId={appId} db={db} />;
      default: return <DashboardView members={members} nextPractice={MOCK_DATA.nextPractice} alcoholCount={alcohols.length} monthSessions={MOCK_DATA.currentMonthSessions} />;
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
           <p className="text-[#6E7F9B] font-bold mb-8">樂團專用管理系統</p>
           <button onClick={handleLogin} className="w-full bg-[#77ABC0] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#77ABC0]/30 active:scale-95 transition">
             <ShieldCheck size={20}/> Google 登入
           </button>
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
          <span className="text-xs font-bold text-[#CBABCA]">{user?.displayName}</span>
          <div className="w-8 h-8 bg-[#E5C3D3]/20 rounded-full flex items-center justify-center text-[#77ABC0] font-bold border-2 border-white shadow-sm">{user?.displayName?.[0] || 'U'}</div>
          {/* 登出按鈕 */}
          <button onClick={handleLogout} className="p-1.5 bg-[#FDFBF7] rounded-full text-[#BC8F8F] hover:bg-[#F2D7DD] transition">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">{renderContent()}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#CBABCA]/20 px-2 py-2 z-50 flex justify-around items-center pb-safe shadow-[0_-4px_20px_-10px_rgba(203,171,202,0.15)]">
        <NavBtn id="dashboard" icon={Users} label="團員" active={activeTab} set={setActiveTab} />
        <NavBtn id="logs" icon={ClipboardList} label="日誌" active={activeTab} set={setActiveTab} />
        <div className="relative -top-6">
          <button onClick={handlePrankClick} className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-4 border-[#FDFBF7] bg-[#F1CEBA] text-white transition-all duration-500 hover:rotate-12 active:scale-95" title="不要按我！">
            <Ghost size={24} />
          </button>
        </div>
        <NavBtn id="alcohol" icon={Beer} label="酒櫃" active={activeTab} set={setActiveTab} />
        <NavBtn id="tech" icon={Zap} label="資源" active={activeTab} set={setActiveTab} />
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

// --- Sub-Components ---
const DashboardView = ({ members, nextPractice, alcoholCount, monthSessions }) => {
  if (!nextPractice || !nextPractice.date) return <div className="p-4 text-center">資料載入中...</div>;
  const displayDate = new Date(nextPractice.date);
  const [expandedMember, setExpandedMember] = useState(null);
  const addToCalendarUrl = () => {
    const start = new Date(nextPractice.date).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = new Date(new Date(nextPractice.date).getTime() + 2*3600000).toISOString().replace(/-|:|\.\d\d\d/g, ""); 
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(nextPractice.title)}&dates=${start}/${end}&location=${encodeURIComponent(nextPractice.location)}`;
  };
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
      {/* 莫蘭迪倒數卡片 */}
      <div className="bg-gradient-to-br from-[#77ABC0] to-[#6E7F9B] rounded-[32px] p-6 text-white shadow-lg shadow-[#77ABC0]/20 relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-1">
            <h2 className="text-sm font-bold text-[#E0E7EA] uppercase tracking-widest">{nextPractice.title}</h2>
            <a href={addToCalendarUrl()} target="_blank" className="bg-white/20 hover:bg-white/30 p-2 rounded-full backdrop-blur-sm transition active:scale-95"><CalendarPlus size={18} className="text-white"/></a>
          </div>
          <div className="text-3xl font-bold mb-1 font-mono tracking-tight">倒數 3 天</div>
          <div className="text-sm text-[#E0E7EA] font-medium mb-4">{displayDate.toLocaleDateString()} {displayDate.getHours()}:00</div>
          <div className="flex items-center gap-2 bg-black/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10"><MapPin size={14} className="text-[#E0E7EA]"/><span className="text-xs font-bold">{nextPractice.location}</span></div>
        </div>
        <PartyPopper className="absolute -right-4 -bottom-4 text-white opacity-10 rotate-12" size={140} />
      </div>
      
      {/* 資訊卡 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#F0EEE6] p-4 rounded-2xl border border-[#F2D7DD] flex items-center gap-3 shadow-sm">
          <div className="bg-white p-2.5 rounded-full shadow-sm"><Beer size={20} className="text-[#C5A659]"/></div>
          <div><div className="text-[10px] font-bold text-[#857650] uppercase tracking-wide">酒櫃庫存</div><div className="text-xl font-black text-[#5C5142]">{alcoholCount} 瓶</div></div>
        </div>
        <div className="bg-[#E8F1E9] p-4 rounded-2xl border border-[#A8D8E2]/50 flex items-center gap-3 shadow-sm">
          <div className="bg-white p-2.5 rounded-full shadow-sm"><Check size={20} className="text-[#77ABC0]"/></div>
          <div><div className="text-[10px] font-bold text-[#6E7F9B] uppercase tracking-wide">下次出席</div><div className="text-xl font-black text-[#725E77]">4/5 人</div></div>
        </div>
      </div>

      {/* 點名表 */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2"><h3 className="font-bold text-xl text-[#725E77]">本月點名簿</h3></div>
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
                <div className="flex gap-1.5">
                  {(m.attendance || []).map(date => (
                    <div key={date} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border ${monthSessions.includes(date) ? 'bg-[#E8F1E9] text-[#5F7A61] border-[#CFE3D1]' : 'bg-[#F7F2F2] text-[#A69898] border-[#E8E0E0]'}`}>
                      {date.slice(5)} {monthSessions.includes(date) ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                    </div>
                  ))}
                </div>
              </div>
              {expandedMember === m.id && (
                <div className="mt-4 pt-3 border-t border-[#F2D7DD]/30 animate-in fade-in">
                  <div className="flex items-start gap-2 bg-[#FDFBF7] p-3 rounded-xl border border-[#E0E0D9]">
                    <MessageCircle size={16} className="text-[#CBABCA] shrink-0 mt-0.5"/>
                    <div><p className="text-[10px] font-bold text-[#C5B8BF] uppercase mb-0.5">管理者備註</p><p className="text-sm text-[#725E77] font-medium">{m.note}</p></div>
                  </div>
                  <div className="mt-2 flex justify-between items-center text-xs font-bold text-[#8B8C89] px-1">
                    <span className="flex items-center gap-1"><Calendar size={12}/> 生日: {m.birthday} ({getZodiac(m.birthday)})</span>
                    <button className="text-[#6D8A96] hover:text-[#50656e]">編輯資料</button>
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

// --- 2. 日誌管理器 ---
const SessionLogManager = ({ sessions, scheduledDates, members, settings, appId, db }) => {
  const [activeSessionId, setActiveSessionId] = useState(null);
  
  const existingDates = sessions.map(s => s.date);
  const pendingDates = scheduledDates.filter(d => !existingDates.includes(d)).sort();

  const handleCreate = async (date) => {
    // 建立新日誌到 Firestore
    if (!db) return alert("資料庫未連線");
    const newSession = {
      date: date,
      location: '未定地點',
      funNotes: '',
      tracks: [],
      miscExpenses: [],
      createdAt: serverTimestamp()
    };
    try {
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), newSession);
      setActiveSessionId(docRef.id);
    } catch(e) {
      alert("建立失敗: " + e.message);
    }
  };

  if (activeSessionId) {
    const session = sessions.find(s => s.id === activeSessionId) || sessions.find(s => s.id === activeSessionId); 
    if (!session) return <div className="p-10 text-center text-[#CBABCA]">正在建立檔案...</div>;
    return <SessionDetail session={session} members={members} settings={settings} onBack={() => setActiveSessionId(null)} db={db} appId={appId} />;
  }

  return (
    <div className="space-y-4 animate-in slide-in-from-right-8">
      <div className="flex justify-between items-end px-1">
        <h2 className="text-2xl font-bold text-[#725E77]">練團日誌</h2>
      </div>
      {pendingDates.map(date => (
        <button key={date} onClick={() => handleCreate(date)} className="w-full p-4 rounded-[28px] border-2 border-dashed border-[#CBABCA] bg-[#FDFBF7] flex items-center justify-between text-[#CBABCA] hover:bg-[#FFF5F7] transition group">
          <div className="flex items-center gap-3">
            <div className="bg-[#F2D7DD]/30 p-2 rounded-full group-hover:scale-110 transition text-[#CBABCA]"><Plus size={20}/></div>
            <div className="text-left"><div className="font-bold text-lg text-[#CBABCA]">{date.slice(5).replace('-','/')} 待補日誌</div><div className="text-xs opacity-70 text-[#C5B8BF]">點擊建立當日紀錄</div></div>
          </div>
          <ChevronDown className="-rotate-90 opacity-50 text-[#C5B8BF]" />
        </button>
      ))}
      {sessions.map(s => (
        <div key={s.id} onClick={() => setActiveSessionId(s.id)} className="bg-white p-5 rounded-[28px] shadow-sm border border-[#E0E0D9] cursor-pointer hover:border-[#77ABC0]/50 transition relative group">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="bg-[#A8D8E2]/20 text-[#6E7F9B] text-[10px] font-bold px-2 py-0.5 rounded border border-[#A8D8E2]/30">{s.date}</span>
              <h3 className="font-bold text-xl mt-1 text-[#725E77]">{s.tracks ? s.tracks.length : 0} 首歌</h3>
            </div>
            <div className="bg-[#FDFBF7] p-2 rounded-full text-[#C5B8BF] group-hover:bg-[#E5C3D3]/20 group-hover:text-[#CBABCA] transition"><ChevronDown className="-rotate-90" size={20}/></div>
          </div>
          {s.funNotes && <p className="text-xs text-[#C5B8BF] truncate">👻 {s.funNotes}</p>}
        </div>
      ))}
    </div>
  );
};

// --- 日誌詳情 (三頁籤) ---
const SessionDetail = ({ session, members, settings, onBack, db, appId }) => {
  const [tab, setTab] = useState('tracks'); 

  return (
    <div className="animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-1 text-[#C5B8BF] font-bold text-sm mb-4 hover:text-[#725E77]"><ChevronDown className="rotate-90" size={16}/> 返回列表</button>
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-[#E0E0D9] mb-6">
        <h1 className="text-3xl font-black text-[#725E77]">{session.date}</h1>
        <div className="flex items-center gap-2 text-[#C5B8BF] text-sm font-bold mt-1"><MapPin size={14}/> {session.location}</div>
        <div className="mt-4 bg-[#F2D7DD]/20 p-3 rounded-2xl border border-[#CBABCA]/20 flex gap-2 items-start">
          <Smile size={16} className="text-[#F1CEBA] shrink-0 mt-0.5"/>
          <textarea className="bg-transparent w-full text-xs font-bold text-[#725E77] outline-none resize-none h-auto" defaultValue={session.funNotes} placeholder="輸入不負責任備註..."/>
        </div>
      </div>

      <div className="flex bg-[#E0E0D9]/50 p-1 rounded-xl mb-6">
        <button onClick={() => setTab('tracks')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${tab === 'tracks' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}><Music2 size={14}/> 曲目</button>
        <button onClick={() => setTab('practice-fee')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${tab === 'practice-fee' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}><ShieldCheck size={14}/> 練團費</button>
        <button onClick={() => setTab('misc-fee')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${tab === 'misc-fee' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}><Coffee size={14}/> 雜支分攤</button>
      </div>

      <div className="bg-white rounded-[32px] border border-[#E0E0D9] p-2 min-h-[300px]">
        {tab === 'tracks' && <TrackList session={session} />}
        {tab === 'practice-fee' && <PracticeFeeCalculator session={session} members={members} settings={settings} />}
        {tab === 'misc-fee' && <MiscFeeCalculator session={session} members={members} settings={settings} />}
      </div>
    </div>
  );
};

const TrackList = ({ session }) => {
  const [expandedTrack, setExpandedTrack] = useState(null);
  const tracks = session.tracks || [];
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
                {t.comments.map((c, i) => <div key={i} className="text-xs bg-[#FDFBF7] p-2 rounded-lg text-[#6E7F9B]"><span className="font-bold text-[#725E77]">{c.user}:</span> {c.text}</div>)}
                <input className="w-full bg-[#FDFBF7] text-xs p-2 rounded-lg outline-none text-[#725E77]" placeholder="輸入留言..." />
              </div>
            </div>
          )}
        </div>
      ))}
      <button className="w-full py-3 text-[#77ABC0] font-bold text-xs flex items-center justify-center gap-1 border border-dashed border-[#77ABC0]/50 hover:bg-[#77ABC0]/5 rounded-2xl transition"><Plus size={14}/> 新增曲目</button>
    </div>
  );
};

// --- 練團費計算機 ---
const PracticeFeeCalculator = ({ session, members, settings }) => {
  const [selectedIds, setSelectedIds] = useState(members.filter(m => m.attendance.includes(session.date)).map(m => m.id));
  const [hours, setHours] = useState(2);
  const [hasKB, setHasKB] = useState(true);
  const [bankAccount, setBankAccount] = useState(settings.studioBankAccount);
  const [copied, setCopied] = useState(false);

  const total = (hours * settings.studioRate) + (hasKB ? settings.kbRate : 0);
  const perPerson = selectedIds.length > 0 ? Math.ceil(total / selectedIds.length) : 0;

  const copyText = () => {
    const names = selectedIds.map(id => members.find(m => m.id === id)?.nickname).join('、');
    const text = `📅 ${session.date} 練團費用\n----------------\n⏱️ 時數：${hours}hr ($${settings.studioRate}/hr)\n🎹 KB租借：${hasKB?'有':'無'} ($${settings.kbRate})\n👥 分攤人：${names}\n----------------\n💰 總金額：$${total}\n👉 每人應付：$${perPerson}\n\n匯款帳號：\n${bankAccount}`;
    const success = secureCopy(text);
    if(success) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div className="p-4 space-y-5">
      <div className="bg-[#F0F4F5] p-4 rounded-2xl text-center border border-[#A8D8E2]/30">
        <div className="text-3xl font-black text-[#77ABC0] mb-1">${total}</div>
        <div className="text-xs font-bold text-[#6E7F9B]">每人 <span className="text-lg text-[#725E77]">${perPerson}</span></div>
      </div>
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
        <button onClick={copyText} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${copied ? 'bg-[#8DA399] text-white' : 'bg-[#77ABC0] text-white'}`}>{copied ? <Check size={16}/> : <Copy size={16}/>} 複製請款文</button>
      </div>
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

      <button onClick={copyText} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${copied ? 'bg-[#8DA399] text-white' : 'bg-[#CBABCA] text-white'}`}>{copied ? <Check size={16}/> : <Copy size={16}/>} 複製雜支明細</button>
    </div>
  );
};

// --- 4. Alcohol Manager (補貨計算機) ---
const AlcoholManager = ({ alcohols, members, settings }) => {
  const [tab, setTab] = useState('list'); // list, calculator
  return (
    <div className="space-y-4 animate-in slide-in-from-right-8">
      <div className="flex bg-[#E0E0D9] p-1 rounded-xl mb-2">
        <button onClick={() => setTab('list')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${tab === 'list' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}>庫存清單</button>
        <button onClick={() => setTab('calculator')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${tab === 'calculator' ? 'bg-white shadow text-[#77ABC0]' : 'text-[#C5B8BF]'}`}>補貨計算</button>
      </div>

      {tab === 'list' ? (
        <div className="space-y-3">
          {alcohols.map(a => (
            <div key={a.id} className="bg-white p-5 rounded-[28px] border border-[#E0E0D9] shadow-sm flex gap-4 items-start">
              <div className="bg-[#F0EEE6] w-16 h-20 rounded-2xl flex items-center justify-center shrink-0"><Wine className="text-[#D6C592]" size={32} /></div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-[#725E77]">{a.name}</h3>
                  <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} size={12} className={i < a.rating ? "fill-[#D6C592] text-[#D6C592]" : "text-[#E0E0D9]"} />)}</div>
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
  const [bankAccount, setBankAccount] = useState(settings.miscBankAccount);
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
const TechView = ({ songs }) => {
  const [viewMode, setViewMode] = useState('list'); // list, grid
  const [filter, setFilter] = useState('all'); // all, cover, tech, gear

  const filteredSongs = filter === 'all' ? songs : songs.filter(s => s.type.toLowerCase() === filter);

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

export default App;
