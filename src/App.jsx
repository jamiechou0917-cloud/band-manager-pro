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
  User, StickyNote, ArrowRight, Calculator
} from 'lucide-react';

// ==========================================
// 🛡️ 錯誤邊界元件 (修復語法錯誤)
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
          <pre className="bg-slate-200 p-4 rounded-lg text-xs overflow-auto max-w-full mb-6 border border-slate-300 w-full">{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#77ABC0] text-white rounded-xl font-bold shadow-lg">重新整理</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 🔐 常數
// ==========================================
const ADMIN_EMAILS = ["jamie.chou0917@gmail.com", "demo@test.com"];
const ROLE_FINANCE_NAME = "陳昱維"; 
const ROLE_ALCOHOL_NAME = "李家賢"; 
const BAND_NAME = "不開玩笑";
const MORANDI_COLORS = ['#8C736F', '#AAB8AB', '#B7B7BD', '#CCD2CC', '#9F8D8B', '#8FA39A'];
const TIME_SLOTS = [];
for (let i = 8; i < 24; i++) {
  const h = i.toString().padStart(2, '0');
  TIME_SLOTS.push(`${h}:00`, `${h}:30`);
}

const stringToColor = (str) => {
  if (!str) return MORANDI_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return MORANDI_COLORS[Math.abs(hash) % MORANDI_COLORS.length];
};

const BandLogo = () => (
  <div className="w-9 h-9 bg-[#CBABCA] rounded-xl flex items-center justify-center text-white shadow-md shadow-[#CBABCA]/30 overflow-hidden relative">
    <Disc size={22} className="animate-spin" style={{animationDuration: '10s'}}/>
  </div>
);

// --- 工具函式 ---
const secureCopy = (text) => {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed"; textArea.style.left = "-9999px";
    document.body.appendChild(textArea); textArea.focus(); textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) { return false; }
};

// --- Firebase ---
const USER_CONFIG = {
  apiKey: "AIzaSyDb36ftpgHzZEH2IuYOsPmJEiKgeVhLWKk",
  authDomain: "bandmanager-a3049.firebaseapp.com",
  projectId: "bandmanager-a3049",
  storageBucket: "bandmanager-a3049.firebasestorage.app",
  messagingSenderId: "193559225053",
  appId: "1:193559225053:web:124fd5a7ab3cf1a854f134"
};
const DEFAULT_GENERAL_DATA = {
  settings: { studioRate: 350, kbRate: 200, studioBankAccount: '(013)國泰世華銀行 帳號：699514620885', miscBankAccount: '(待設定)', alcoholTypes: ['紅酒', '白酒', '清酒', '氣泡酒', '啤酒', '威士忌', '其他'] },
  practices: []
};

let auth, googleProvider, db;
try {
  const app = getApps().length > 0 ? getApp() : initializeApp(USER_CONFIG);
  auth = getAuth(app); db = getFirestore(app); googleProvider = new GoogleAuthProvider();
} catch (e) { console.error("Init Error", e); }

const getCollectionRef = (db, name) => collection(db, name);
const getDocRef = (db, name, id) => doc(db, name, id);

// ==========================================
// 📱 App 主元件
// ==========================================
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [members, setMembers] = useState([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [logs, setLogs] = useState([]);
  const [alcohols, setAlcohols] = useState([]);
  const [songs, setSongs] = useState([]);
  const [generalData, setGeneralData] = useState(DEFAULT_GENERAL_DATA);
  const [role, setRole] = useState({ admin: false, finance: false, alcohol: false });

  // 1. Auth 監聽
  useEffect(() => {
    if (!auth) return;
    setPersistence(auth, browserLocalPersistence).then(() => {
      return onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (!u) setLoading(false);
      });
    });
  }, []);

  // 2. 資料監聽 (優化：合併判斷邏輯)
  useEffect(() => {
    if (!db || !user) return;
    const unsubs = [
      onSnapshot(getCollectionRef(db, 'members'), (snap) => {
        setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setMembersLoaded(true);
      }),
      onSnapshot(getCollectionRef(db, 'logs'), (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(getCollectionRef(db, 'alcohol'), (snap) => setAlcohols(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(getCollectionRef(db, 'songs'), (snap) => setSongs(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(getDocRef(db, 'general', 'info'), (docSnap) => {
        if (docSnap.exists()) setGeneralData(docSnap.data());
        setLoading(false);
      })
    ];
    return () => unsubs.forEach(fn => fn());
  }, [user]);

  // 3. 權限判斷 (修正：正規化判斷)
  useEffect(() => {
    if (user && membersLoaded) {
      const email = (user.email || '').toLowerCase().trim();
      const isAdmin = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email);
      const member = members.find(m => (m.email || '').toLowerCase().trim() === email);
      
      const isFinance = isAdmin || (member && (member.realName === ROLE_FINANCE_NAME || member.nickname === ROLE_FINANCE_NAME));
      const isAlcohol = isAdmin || (member && (member.realName === ROLE_ALCOHOL_NAME || member.nickname === ROLE_ALCOHOL_NAME));
      
      setRole({ admin: isAdmin, finance: !!isFinance, alcohol: !!isAlcohol });
    }
  }, [user, members, membersLoaded]);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (err) { alert("登入失敗，請嘗試使用 Safari/Chrome 並允許彈窗。"); }
  };

  // 4. 核心渲染 (🛡️ 強化防呆：確保 default 分支與 Props 傳遞穩定)
  const renderContent = () => {
    const data = generalData || DEFAULT_GENERAL_DATA;
    const commonProps = { members, db, role, user, settings: data.settings || DEFAULT_GENERAL_DATA.settings };

    switch (activeTab) {
      case 'dashboard': return <DashboardView {...commonProps} generalData={data} alcoholCount={alcohols.length} />;
      case 'logs': return <SessionLogManager {...commonProps} sessions={logs} practices={data.practices || []} />;
      case 'alcohol': return <AlcoholManager {...commonProps} alcohols={alcohols} />;
      case 'tech': return <TechView {...commonProps} songs={songs} />;
      case 'admin': return <AdminDashboard {...commonProps} logs={logs} generalData={data} />;
      default: return <DashboardView {...commonProps} generalData={data} alcoholCount={alcohols.length} />;
    }
  };

  if (loading) return <div className="h-screen flex justify-center items-center"><Loader2 className="animate-spin text-[#77ABC0]"/></div>;
  if (!user) return (
    <div className="h-screen flex flex-col justify-center items-center p-6 bg-[#FDFBF7]">
      <div className="bg-white p-8 rounded-[32px] shadow-xl w-full max-w-sm text-center">
        <BandLogo />
        <h1 className="text-2xl font-black mt-4 mb-6">{BAND_NAME} 管理系統</h1>
        <button onClick={handleLogin} className="w-full bg-[#77ABC0] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg"><ShieldCheck /> Google 登入</button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FDFBF7] text-[#725E77] pb-24">
        <header className="bg-white/80 backdrop-blur sticky top-0 z-40 border-b px-4 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2"><BandLogo /><span className="font-bold text-[#77ABC0]">{BAND_NAME}</span></div>
          <div className="flex items-center gap-2">
            {role.admin && <button onClick={() => setActiveTab('admin')} className={`p-1.5 rounded-full ${activeTab === 'admin' ? 'bg-[#77ABC0] text-white' : 'text-[#CBABCA]'}`}><Settings size={18}/></button>}
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden" style={{backgroundColor: stringToColor(user.displayName)}}>
              {user.photoURL ? <img src={user.photoURL} alt="U" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">{user.displayName?.[0]}</div>}
            </div>
            <button onClick={() => signOut(auth)} className="p-1.5 text-[#BC8F8F]"><LogOut size={18}/></button>
          </div>
        </header>

        <main className="max-w-md mx-auto p-4">{renderContent()}</main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 z-50 flex justify-around items-center shadow-lg">
          <NavBtn id="dashboard" icon={Users} label="團員" active={activeTab} set={setActiveTab} />
          <NavBtn id="logs" icon={ClipboardList} label="日誌" active={activeTab} set={setActiveTab} />
          <button className="w-12 h-12 bg-[#F1CEBA] rounded-full flex items-center justify-center text-white shadow-lg -mt-8"><Ghost size={24}/></button>
          <NavBtn id="alcohol" icon={Beer} label="酒櫃" active={activeTab} set={setActiveTab} />
          <NavBtn id="tech" icon={Zap} label="資源" active={activeTab} set={setActiveTab} />
        </nav>
      </div>
    </ErrorBoundary>
  );
};

const NavBtn = ({ id, icon: Icon, label, active, set }) => (
  <button onClick={() => set(id)} className={`flex flex-col items-center gap-1 p-2 transition ${active === id ? 'text-[#77ABC0]' : 'text-[#C5B8BF]'}`}>
    <Icon size={20} strokeWidth={active === id ? 2.5 : 2} />
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

// ==========================================
// 🏠 首頁元件
// ==========================================
const DashboardView = ({ members = [], generalData = {}, alcoholCount = 0, db, role = {}, user }) => {
  const [editingPractice, setEditingPractice] = useState(false);
  const [practices, setPractices] = useState(generalData.practices || []);
  const [expandedMember, setExpandedMember] = useState(null);

  useEffect(() => { setPractices(generalData.practices || []); }, [generalData.practices]);

  const now = new Date();
  const sortedPractices = practices
    .filter(p => p && p.date)
    .map(p => ({ ...p, dateObj: new Date(p.date) }))
    .sort((a, b) => a.dateObj - b.dateObj);

  const nextPractice = sortedPractices.find(p => p.dateObj >= now) || sortedPractices[sortedPractices.length-1] || { date: new Date().toISOString(), title: '尚未安排', location: '圓頭音樂' };
  const diffDays = Math.ceil((new Date(nextPractice.date) - now) / (1000 * 60 * 60 * 24));

  const toggleAttendance = async (memberId, dateStr) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    if (!role.admin && member.email !== user.email) return alert("只能修改自己的出席喔！");
    const newAtt = (member.attendance || []).includes(dateStr) ? member.attendance.filter(d => d !== dateStr) : [...(member.attendance || []), dateStr];
    await updateDoc(getDocRef(db, 'members', memberId), { attendance: newAtt });
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="bg-[#77ABC0] p-6 rounded-[32px] text-white shadow-lg relative overflow-hidden">
        <h2 className="text-xl font-bold opacity-80">{nextPractice.title}</h2>
        <div className="text-4xl font-black my-2">{diffDays > 0 ? `倒數 ${diffDays} 天` : diffDays === 0 ? "就是今天！" : "練完啦"}</div>
        <div className="flex items-center gap-2 text-sm font-bold"><MapPin size={16}/> {nextPractice.location}</div>
        {role.admin && <button onClick={() => setEditingPractice(true)} className="absolute top-4 right-4 bg-white/20 p-2 rounded-full"><Pencil size={16}/></button>}
      </div>

      <div className="bg-white p-4 rounded-2xl border">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Users size={18}/> 團員點名</h3>
        <div className="space-y-3">
          {members.map(m => (
            <div key={m.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{backgroundColor: stringToColor(m.nickname)}}>{m.nickname?.[0]}</div>
                <div><div className="font-bold text-sm">{m.nickname}</div><div className="text-[10px] text-slate-400">{m.instrument}</div></div>
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {sortedPractices.map(p => {
                  const d = p.date.split('T')[0];
                  const isAtt = (m.attendance || []).includes(d);
                  return <button key={d} onClick={() => toggleAttendance(m.id, d)} className={`w-8 h-8 rounded-lg text-[10px] font-bold border transition ${isAtt ? 'bg-green-100 border-green-200 text-green-600' : 'bg-white border-slate-200 text-slate-300'}`}>{new Date(p.date).getDate()}</button>
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* 🛡️ 加入行事曆彈窗與其他略... */}
    </div>
  );
};

// ==========================================
// 📝 日誌分頁 (🛡️ 強化防呆)
// ==========================================
const SessionLogManager = ({ sessions = [], practices = [], members = [], settings = {}, db, role, user }) => {
  const [activeSessionId, setActiveSessionId] = useState(null);
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  if (activeSessionId) {
    const session = safeSessions.find(s => s.id === activeSessionId);
    if (!session) return <button onClick={() => setActiveSessionId(null)}>返回列表</button>;
    return <SessionDetail session={session} members={members} settings={settings} onBack={() => setActiveSessionId(null)} db={db} role={role} user={user} />;
  }

  return (
    <div className="space-y-3 animate-in slide-in-from-right">
      <h2 className="text-xl font-bold px-1">練團日誌</h2>
      {safeSessions.map(s => (
        <div key={s.id} onClick={() => setActiveSessionId(s.id)} className="bg-white p-4 rounded-2xl border shadow-sm cursor-pointer hover:border-[#77ABC0]">
          <div className="flex justify-between items-center">
            <div><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold">{s.date}</span><h3 className="font-bold mt-1">{s.location || '圓頭音樂'}</h3></div>
            <ChevronRight className="text-slate-300" size={18}/>
          </div>
        </div>
      ))}
    </div>
  );
};

const SessionDetail = ({ session, members, settings, onBack, db, role, user }) => {
  const [tab, setTab] = useState('tracks');
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-bold text-slate-400 flex items-center gap-1"><ChevronLeft size={16}/> 返回列表</button>
      <div className="bg-white p-5 rounded-[28px] border shadow-sm">
        <h2 className="text-2xl font-black">{session.date}</h2>
        <p className="text-slate-400 text-sm font-bold flex items-center gap-1"><MapPin size={14}/> {session.location}</p>
      </div>
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button onClick={() => setTab('tracks')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${tab === 'tracks' ? 'bg-white shadow text-[#77ABC0]' : 'text-slate-400'}`}>曲目</button>
        <button onClick={() => setTab('fee')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${tab === 'fee' ? 'bg-white shadow text-[#77ABC0]' : 'text-slate-400'}`}>費用</button>
        <button onClick={() => setTab('misc')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${tab === 'misc' ? 'bg-white shadow text-[#77ABC0]' : 'text-slate-400'}`}>雜支</button>
      </div>
      <div className="bg-white p-2 rounded-3xl border min-h-[200px]">
        {tab === 'tracks' && <TrackList session={session} db={db} user={user} role={role} />}
        {tab === 'fee' && <PracticeFeeCalculator session={session} members={members} settings={settings} db={db} role={role} />}
        {tab === 'misc' && <MiscFeeCalculator session={session} members={members} db={db} />}
      </div>
    </div>
  );
};

// ==========================================
// 🛡️ 關鍵修正：費用計算機 (避免 undefined.nickname)
// ==========================================
const PracticeFeeCalculator = ({ session, members, settings, db, role }) => {
  const [ids, setIds] = useState(session.attendance || []);
  const hours = 2;
  const total = (hours * (settings.studioRate || 350)) + 200;
  const per = ids.length ? Math.ceil(total / ids.length) : 0;

  const handleCopy = () => {
    // ✅ 修正點：使用可選鏈 ?. 與 預設值
    const names = ids.map(id => members.find(m => m.id === id)?.nickname || '未知').join('、');
    const text = `📅 ${session.date} 練團費\n總額：$${total}\n分攤：${names}\n每人：$${per}`;
    if (secureCopy(text)) alert("複製成功！");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-slate-50 p-4 rounded-2xl text-center">
        <div className="text-3xl font-black text-[#77ABC0]">$${total}</div>
        <div className="text-xs text-slate-400">每人需付 ${per}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map(m => (
          <button key={m.id} onClick={() => setIds(prev => prev.includes(m.id) ? prev.filter(i => i!==m.id) : [...prev, m.id])} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${ids.includes(m.id) ? 'bg-[#77ABC0] text-white' : 'bg-white text-slate-400'}`}>{m.nickname}</button>
        ))}
      </div>
      <button onClick={handleCopy} className="w-full py-3 bg-[#77ABC0] text-white rounded-xl font-bold">複製請款資訊</button>
    </div>
  );
};

// 其他元件 (MiscFeeCalculator, AlcoholManager, TechView, AdminDashboard)
// 請務必在對 members.find 後加上 ?.nickname 以防崩潰。

export default App;
