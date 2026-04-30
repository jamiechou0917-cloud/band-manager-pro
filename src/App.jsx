import React, { useState, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { CalendarPlus, ChevronDown, ChevronUp, Wine, Trash2 } from 'lucide-react';

// --- Firebase 初始化與設定 (請替換為你的 config) ---
// const firebaseConfig = { ... };
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);

// --- 模擬假資料 ---
const mockPracticeLogs = [
  { id: 1, date: '2026-04-29', title: '4月第2次練團', location: '圓頭音樂', targetSongs: "水星記、Save me...", isToday: true },
  { id: 2, date: '2026-04-26', title: '4月第1次練團', location: '圓頭音樂', songsCount: 2 },
  { id: 3, date: '2026-03-29', title: '3月第2次練團', location: '圓頭音樂', songsCount: 2 },
  { id: 4, date: '2026-02-28', title: '2月第2次練團', location: '圓頭音樂', songsCount: 7 },
  { id: 5, date: '2026-02-21', title: '2月第1次練團', location: '圓頭音樂', songsCount: 5 },
];

const mockWineHistory = [
  { id: 1, name: '坦博蘭 Pinot noir', type: '紅酒', status: 'empty', review: '家賢: 03/29喝完，請點評\n潔米: 本人覺得還不錯，不會太甜微酸' },
  { id: 2, name: 'Tramillon', type: '白酒', status: 'empty', review: '搭配上次的餐盒剛剛好，考慮回購！' }
];

export default function BandDashboard() {
  const [activeTab, setActiveTab] = useState('practice'); // 'practice' | 'wine'
  const [wineTab, setWineTab] = useState('history'); // 'stock' | 'history' | 'calc'
  const [googleToken, setGoogleToken] = useState(null);

  // === 1. Google 登入與 Calendar API 授權 ===
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // 加入存取日曆的權限
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      setGoogleToken(credential.accessToken);
      alert('授權成功！現在可以直接將練團加入你的 Google 日曆了。');
    } catch (error) {
      console.error("登入失敗", error);
      alert('登入授權失敗，請重試。');
    }
  };

  const handleAddEvent = async (log) => {
    if (!googleToken) {
      alert('請先點擊頂部授權 Google 日曆！');
      // 若尚未登入，可以直接觸發登入
      // await handleGoogleLogin(); return;
      return;
    }

    const event = {
      summary: `不開玩笑練團：${log.title}`,
      location: log.location,
      description: log.targetSongs || '準備來練團囉！',
      start: {
        dateTime: `${log.date}T19:00:00+08:00`, 
        timeZone: 'Asia/Taipei',
      },
      end: {
        dateTime: `${log.date}T21:00:00+08:00`,
        timeZone: 'Asia/Taipei',
      },
    };

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        alert('✅ 已成功加入你的 Google 行事曆！');
      } else {
        alert('❌ Token 可能已過期，請重新登入授權。');
        setGoogleToken(null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // === 2. 練團日誌群組化與手風琴狀態 ===
  // 依據 YYYY-MM 群組資料
  const groupedLogs = useMemo(() => {
    return mockPracticeLogs.reduce((acc, log) => {
      const month = log.date.substring(0, 7); // 擷取 "2026-04"
      if (!acc[month]) acc[month] = [];
      acc[month].push(log);
      return acc;
    }, {});
  }, []);

  // 取得最新月份，預設展開
  const latestMonth = Object.keys(groupedLogs).sort().reverse()[0];
  const [openMonths, setOpenMonths] = useState({ [latestMonth]: true });

  const toggleMonth = (month) => {
    setOpenMonths(prev => ({ ...prev, [month]: !prev[month] }));
  };

  // --- 畫面渲染 ---
  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FDFBF7] pb-20 text-[#5A5A5A] font-sans">
      {/* 頂部切換與授權狀態 */}
      <div className="p-4 flex justify-between items-center bg-white shadow-sm">
        <h1 className="text-xl font-bold tracking-wider text-[#79838E]">樂團管家 Pro</h1>
        {!googleToken ? (
          <button onClick={handleGoogleLogin} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-200">
            授權 Google 日曆
          </button>
        ) : (
          <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">已授權日曆</span>
        )}
      </div>

      <div className="flex gap-4 px-4 mt-6 mb-4">
        <button 
          onClick={() => setActiveTab('practice')}
          className={`flex-1 py-2 rounded-xl font-medium transition ${activeTab === 'practice' ? 'bg-[#79838E] text-white' : 'bg-[#EAEAEA] text-gray-500'}`}
        >
          練團日誌
        </button>
        <button 
          onClick={() => setActiveTab('wine')}
          className={`flex-1 py-2 rounded-xl font-medium transition ${activeTab === 'wine' ? 'bg-[#79838E] text-white' : 'bg-[#EAEAEA] text-gray-500'}`}
        >
          酒櫃管理
        </button>
      </div>

      {/* --- 練團日誌區塊 --- */}
      {activeTab === 'practice' && (
        <div className="px-4 space-y-4">
          {Object.entries(groupedLogs)
            .sort(([a], [b]) => b.localeCompare(a)) // 年月反向排序 (最新在上)
            .map(([month, logs]) => (
              <div key={month} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <button 
                  onClick={() => toggleMonth(month)}
                  className="w-full flex justify-between items-center p-4 bg-[#F8F9FA] hover:bg-gray-100 transition"
                >
                  <span className="font-bold text-[#8BA6B9]">{month.replace('-', ' 年 ')} 月份</span>
                  {openMonths[month] ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>
                
                {openMonths[month] && (
                  <div className="p-4 space-y-3">
                    {logs.map(log => (
                      <div key={log.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl bg-white">
                        <div>
                          <div className="text-xs text-[#8BA6B9] bg-blue-50 px-2 py-1 rounded mb-2 inline-block">{log.date}</div>
                          <h3 className="font-bold text-lg text-[#5A5A5A]">{log.title}</h3>
                          <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <span>📍 {log.location}</span>
                            {log.songsCount && <span>・{log.songsCount} 首歌</span>}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleAddEvent(log)}
                          className="p-2 text-[#CBABCA] hover:bg-[#FDFBF7] rounded-full transition"
                          title="加入 Google 日曆"
                        >
                          <CalendarPlus size={24} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
          ))}
        </div>
      )}

      {/* --- 酒櫃區塊 (含三頁籤) --- */}
      {activeTab === 'wine' && (
        <div className="px-4">
          <div className="flex bg-[#EAEAEA] rounded-xl p-1 mb-6">
            <button 
              onClick={() => setWineTab('stock')}
              className={`flex-1 py-1.5 text-sm rounded-lg transition ${wineTab === 'stock' ? 'bg-white shadow-sm text-[#79838E] font-bold' : 'text-gray-500'}`}
            >庫存中</button>
            <button 
              onClick={() => setWineTab('history')}
              className={`flex-1 py-1.5 text-sm rounded-lg transition ${wineTab === 'history' ? 'bg-white shadow-sm text-[#79838E] font-bold' : 'text-gray-500'}`}
            >歷史評價</button>
            <button 
              onClick={() => setWineTab('calc')}
              className={`flex-1 py-1.5 text-sm rounded-lg transition ${wineTab === 'calc' ? 'bg-white shadow-sm text-[#79838E] font-bold' : 'text-gray-500'}`}
            >補貨計算</button>
          </div>

          {wineTab === 'history' && (
             <div className="space-y-4">
               <h2 className="text-[#A29A8C] font-bold mb-3 flex items-center gap-2">
                 <Trash2 size={18} /> 已喝完 / 歷史評價
               </h2>
               {mockWineHistory.map(wine => (
                 <div key={wine.id} className="bg-white p-4 border border-[#EBEBEB] rounded-2xl shadow-sm">
                   <div className="flex items-center gap-4 mb-3">
                     <div className="w-12 h-16 bg-[#F6F4EB] rounded flex items-center justify-center text-[#C4B69E]">
                       <Wine size={24} />
                     </div>
                     <div>
                       <h3 className="font-bold text-[#6D6176] text-lg">{wine.name}</h3>
                       <span className="text-xs text-gray-400">{wine.type}</span>
                     </div>
                   </div>
                   <div className="bg-[#FDFBF7] p-3 rounded-lg text-sm text-gray-600 whitespace-pre-wrap leading-relaxed border border-[#F2EFE8]">
                     {wine.review}
                   </div>
                 </div>
               ))}
             </div>
          )}

          {wineTab === 'stock' && <div className="text-center text-gray-400 py-10">（庫存列表介面...）</div>}
          {wineTab === 'calc' && <div className="text-center text-gray-400 py-10">（補貨計算機介面...）</div>}
        </div>
      )}
    </div>
  );
}
