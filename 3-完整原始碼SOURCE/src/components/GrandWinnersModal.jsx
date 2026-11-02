import React, { useState, useMemo } from 'react';
import {
  X,
  Trophy,
  Crown,
  Sparkles,
  Download,
  Copy,
  Printer,
  Check,
  Search,
  LayoutGrid,
  List,
  Clock,
  Award,
  Users,
  Gift,
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function GrandWinnersModal({
  isOpen,
  onClose,
  prizes = [],
  winnersByPrize = {},
  title = 'xxx欢乐抽奖',
  totalCandidatesCount = 0
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('GRID'); // 'GRID' | 'TABLE'
  const [copied, setCopied] = useState(false);

  // 整理扁平得獎總名單
  const allWinnersList = useMemo(() => {
    const list = [];
    prizes.forEach(prize => {
      const prizeWinners = winnersByPrize[prize.id] || [];
      prizeWinners.forEach((w, idx) => {
        list.push({
          ...w,
          prizeId: prize.id,
          prizeName: prize.name,
          prizeItem: prize.item || '精美大礼',
          prizeColor: prize.color || '#f59e0b',
          orderInPrize: idx + 1,
          totalInPrize: prize.quota || 1
        });
      });
    });
    return list;
  }, [prizes, winnersByPrize]);

  // 總名額統計
  const totalQuota = useMemo(() => {
    return prizes.reduce((acc, p) => acc + (p.quota || 1), 0);
  }, [prizes]);

  // 已開獎獎項數
  const drawnPrizesCount = useMemo(() => {
    return prizes.filter(p => (winnersByPrize[p.id] || []).length > 0).length;
  }, [prizes, winnersByPrize]);

  // 依篩選標籤與搜尋關鍵字過濾
  const filteredWinners = useMemo(() => {
    return allWinnersList.filter(w => {
      const matchCategory = selectedCategory === 'ALL' || w.prizeId === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        (w.name && String(w.name).toLowerCase().includes(q)) ||
        (w.id && String(w.id).toLowerCase().includes(q)) ||
        (w.department && String(w.department).toLowerCase().includes(q)) ||
        (w.prizeName && String(w.prizeName).toLowerCase().includes(q));
      return matchCategory && matchSearch;
    });
  }, [allWinnersList, selectedCategory, searchQuery]);

  // 一鍵匯出 Excel
  const handleExportExcel = () => {
    if (allWinnersList.length === 0) {
      alert('暂无中奖名单可导出');
      return;
    }

    const exportRows = allWinnersList.map((w, index) => ({
      '总序号': index + 1,
      '奖项名称': w.prizeName,
      '奖品内容': w.prizeItem,
      '顺位': `第 ${w.orderInPrize}/${w.totalInPrize} 位`,
      '员工工号': w.id || '',
      '员工姓名': w.name,
      '所属部门': w.department || '未录入',
      '中奖时间': w.wonAt || new Date().toLocaleTimeString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '盛典总中奖榜单');
    XLSX.writeFile(wb, `${title}_中奖总名册_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 一鍵複製文字戰報（格式排版，便於直接貼入企業微信/釘釘/飛書群）
  const handleCopyTextReport = () => {
    if (allWinnersList.length === 0) {
      alert('暂无中奖数据可复制');
      return;
    }

    let text = `🎉【${title} · 盛典荣耀总中奖榜单】🎉\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👑 累计揭晓: ${allWinnersList.length} 位幸运得主\n`;
    text += `📅 生成时间: ${new Date().toLocaleString()}\n\n`;

    prizes.forEach(p => {
      const list = winnersByPrize[p.id] || [];
      if (list.length > 0) {
        text += `🏆【${p.name}】（奖品：${p.item || '精美大礼'} · 共 ${list.length}/${p.quota} 人）\n`;
        list.forEach((w, idx) => {
          text += `  ${idx + 1}. 工号：${w.id || '无'} | 姓名：${w.name} ${w.department ? `(${w.department})` : ''} — 抽出时间: ${w.wonAt || ''}\n`;
        });
        text += `\n`;
      }
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `祝贺所有中奖的幸运同仁！恭喜大家！`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }).catch(() => {
      alert('复制失败，请手动选取文字复制');
    });
  };

  // 一鍵列印
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl pointer-events-auto select-none overflow-hidden">
      {/* 奢華流金外邊框主容器 */}
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[960px] bg-gradient-to-b from-[#1c1917] via-[#141416] to-[#0c0a09] border-2 border-amber-500/40 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.25)] flex flex-col overflow-hidden text-stone-100">
        
        {/* 頂部奢華金芒裝飾線 */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-yellow-200 via-amber-500 via-rose-400 to-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]" />

        {/* 1. 頂部抬頭與盛典儀表板 */}
        <div className="relative px-6 sm:px-8 py-5 border-b border-amber-500/20 bg-gradient-to-r from-stone-900/60 via-stone-900/30 to-stone-900/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* 左側標題組 */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-[0_4px_16px_rgba(245,158,11,0.4)] border border-amber-200/50">
              <Trophy className="w-6 h-6 text-stone-950 fill-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-300 font-serif">
                  {title} · 荣耀总中奖名册
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold">
                  LIVE HALL OF FAME
                </span>
              </div>
              <p className="text-xs text-amber-200/60 mt-0.5 font-light tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                盛典荣誉见证 · 幸运之星全景展台 · 实时同步更新
              </p>
            </div>
          </div>

          {/* 右側四大統計指標膠囊與關閉鈕 */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* 統計指標 */}
            <div className="flex items-center gap-2 bg-black/40 px-3.5 py-1.5 rounded-xl border border-amber-500/20 text-xs">
              <span className="text-stone-400">已揭晓:</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {allWinnersList.length}
              </span>
              <span className="text-stone-500">/</span>
              <span className="font-mono text-stone-300">{totalQuota}人</span>
            </div>

            <div className="flex items-center gap-2 bg-black/40 px-3.5 py-1.5 rounded-xl border border-amber-500/20 text-xs">
              <span className="text-stone-400">开奖进度:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {drawnPrizesCount}/{prizes.length}
              </span>
              <span className="text-stone-400">项</span>
            </div>

            {/* 關閉按鈕 */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-stone-300 hover:text-white transition-all active:scale-95 cursor-pointer"
              title="关闭 (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. 工具操作與篩選欄 */}
        <div className="px-6 sm:px-8 py-3.5 bg-black/30 border-b border-white/5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* 獎項過濾標籤 */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-amber-400 text-stone-950 font-bold shadow-sm shadow-amber-400/40'
                  : 'bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              全部奖项 ({allWinnersList.length})
            </button>

            {prizes.map(p => {
              const count = (winnersByPrize[p.id] || []).length;
              const isSelected = selectedCategory === p.id;
              const isFirst = p.id === 'prize-1' || p.name.includes('一等');

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedCategory(p.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? isFirst
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-bold shadow-md shadow-amber-500/30'
                        : 'bg-amber-300 text-stone-950 font-bold shadow-sm shadow-amber-300/30'
                      : 'bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  {isFirst && <span>👑</span>}
                  <span>{p.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-black/20 text-stone-950' : 'bg-white/10 text-stone-400'
                    }`}
                  >
                    {count}/{p.quota}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 右側：搜尋框、視圖切換與動作按鈕 */}
          <div className="flex items-center gap-2.5 flex-wrap justify-between lg:justify-end">
            {/* 搜尋框 */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索姓名 / 工号 / 部门..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-stone-900/90 border border-white/10 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400/60 w-44 sm:w-56 transition-colors font-sans"
              />
            </div>

            {/* 視圖切換按鈕組 */}
            <div className="flex items-center bg-stone-900/90 p-0.5 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'GRID'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'text-stone-400 hover:text-white'
                }`}
                title="展台卡片视图"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'text-stone-400 hover:text-white'
                }`}
                title="尊享大表视图"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* 一鍵複製文字戰報 */}
            <button
              onClick={handleCopyTextReport}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all active:scale-95 cursor-pointer ${
                copied
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-stone-900 hover:bg-stone-800 border-amber-500/30 text-amber-200 hover:text-amber-100'
              }`}
              title="一键复制战报文字，可粘贴发送至大群"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>已复制战报!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>复制全榜</span>
                </>
              )}
            </button>

            {/* 匯出 Excel 按鈕 */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition-all active:scale-95 border border-amber-300/40 cursor-pointer"
              title="导出包含工号、部门、时间的标准Excel报表"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出Excel</span>
            </button>
          </div>
        </div>

        {/* 3. 主展示區塊（可滾動） */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 custom-scrollbar">
          {allWinnersList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-500">
              <Trophy className="w-16 h-16 text-stone-700 stroke-1 mb-3" />
              <p className="text-base font-semibold text-stone-400 font-serif">
                盛典盛大开启，中奖总榜静候揭晓
              </p>
              <p className="text-xs text-stone-600 mt-1">
                点击屏幕下方摇奖按钮或转动金色手柄，开启今天的幸运盛宴！
              </p>
            </div>
          ) : filteredWinners.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-500">
              <Search className="w-12 h-12 text-stone-700 stroke-1 mb-3" />
              <p className="text-base font-semibold text-stone-400">
                未找到匹配「{searchQuery}」的中奖人员
              </p>
              <p className="text-xs text-stone-600 mt-1">请尝试其他关键词或切换上方奖项筛选标签</p>
            </div>
          ) : viewMode === 'GRID' ? (
            /* 視圖 A：奢華展台卡片網格模式 */
            <div className="space-y-8">
              {prizes
                .filter(p => selectedCategory === 'ALL' || selectedCategory === p.id)
                .map(prize => {
                  const pWinners = filteredWinners.filter(w => w.prizeId === prize.id);
                  const isFirst = prize.id === 'prize-1' || prize.name.includes('一等');
                  const quota = prize.quota || 1;
                  const emptySlotsCount = Math.max(quota - (winnersByPrize[prize.id] || []).length, 0);

                  if (searchQuery && pWinners.length === 0) return null;

                  return (
                    <div
                      key={prize.id}
                      className={`rounded-3xl p-5 sm:p-6 transition-all ${
                        isFirst
                          ? 'bg-gradient-to-b from-amber-500/10 via-stone-900/60 to-stone-950/80 border-2 border-amber-400/50 shadow-[0_8px_32px_rgba(245,158,11,0.15)]'
                          : 'bg-stone-900/40 border border-white/10'
                      }`}
                    >
                      {/* 獎項分類表頭 */}
                      <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-black shadow-inner ${
                              isFirst
                                ? 'bg-gradient-to-tr from-amber-400 to-yellow-200 text-stone-950'
                                : 'bg-white/10 text-amber-300 border border-white/10'
                            }`}
                          >
                            {isFirst ? '👑' : '★'}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-amber-100 font-serif tracking-wide">
                                {prize.name}
                              </h3>
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-black/40 border border-amber-400/30 text-amber-300/90 font-mono">
                                奖品: {prize.item || '精美大礼'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-stone-400">已开出:</span>
                          <span className="font-bold text-amber-300 text-sm">
                            {(winnersByPrize[prize.id] || []).length}/{quota}
                          </span>
                          <span className="text-stone-500">位</span>
                        </div>
                      </div>

                      {/* 卡片網格 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {/* 已中獎者卡片 */}
                        {pWinners.map((w) => {
                          const ballHex = w.ballColor || (isFirst ? '#f59e0b' : '#d95338');

                          return (
                            <div
                              key={w.id}
                              className={`group relative rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 shadow-lg ${
                                isFirst
                                  ? 'bg-gradient-to-br from-amber-950/40 via-stone-900/90 to-black border border-amber-400/50 hover:border-amber-300 hover:shadow-amber-500/20'
                                  : 'bg-gradient-to-br from-stone-900/80 to-stone-950 border border-white/10 hover:border-amber-400/40 hover:shadow-black/60'
                              }`}
                            >
                              {/* 順位右上角角標 */}
                              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/50 border border-white/10 text-[10px] font-mono text-amber-300/80">
                                <span>第</span>
                                <strong className="font-bold text-amber-200">{w.orderInPrize}</strong>
                                <span>位</span>
                              </div>

                              <div className="flex items-center gap-3.5">
                                {/* 3D 質感彩球小圖標（帶專屬配色與工號） */}
                                <div
                                  className="relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-md border-2 border-white/20"
                                  style={{
                                    backgroundColor: ballHex,
                                    boxShadow: `0 4px 14px ${ballHex}66`
                                  }}
                                >
                                  {/* 球體高光 */}
                                  <div className="absolute top-1 left-2 w-3 h-1.5 rounded-full bg-white/50 blur-[0.5px] pointer-events-none" />
                                  
                                  {/* 白底號碼徽章（杜絕紅字，曜石深黑姓名） */}
                                  <div className="w-7.5 h-7.5 rounded-full bg-white flex flex-col items-center justify-center shadow-inner border border-stone-300">
                                    <span className="text-[8px] font-mono font-bold text-slate-700 leading-tight">
                                      {String(w.id || '').slice(-3) || '★'}
                                    </span>
                                    <span className="text-[7px] font-bold text-slate-900 leading-tight truncate max-w-[24px]">
                                      {String(w.name || '').slice(0, 2)}
                                    </span>
                                  </div>
                                </div>

                                {/* 姓名與工號 */}
                                <div className="flex-1 min-w-0">
                                  <div className="text-base font-black text-stone-100 truncate group-hover:text-amber-200 transition-colors font-sans">
                                    {w.name}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[11px] font-mono text-amber-300 font-semibold">
                                      {w.id || '无工号'}
                                    </span>
                                    {w.department && (
                                      <span className="text-[10px] text-stone-400 truncate max-w-[70px]">
                                        {w.department}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 底部中獎時間戳 */}
                              <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                                <span className="flex items-center gap-1 text-stone-400">
                                  <Clock className="w-3 h-3 text-stone-500" />
                                  {w.wonAt || '现场开出'}
                                </span>
                                <span className="text-emerald-400/90 font-sans font-medium flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  已入册
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* 未抽取空槽位插槽（若未滿額） */}
                        {!searchQuery &&
                          Array.from({ length: emptySlotsCount }).map((_, slotIdx) => (
                            <div
                              key={`empty-${prize.id}-${slotIdx}`}
                              className="rounded-2xl p-4 border border-dashed border-white/10 bg-white/[0.015] flex flex-col items-center justify-center text-center min-h-[108px] text-stone-600 select-none"
                            >
                              <Gift className="w-6 h-6 text-stone-700 mb-1 stroke-1" />
                              <span className="text-xs font-serif text-stone-500">
                                虚位以待 · 第 {pWinners.length + slotIdx + 1} 位
                              </span>
                              <span className="text-[10px] text-stone-600 font-mono mt-0.5">
                                待摇号揭晓
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            /* 視圖 B：尊享大表模式（Executive Table View） */
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-stone-900/50 shadow-xl backdrop-blur-md">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-amber-500/20 bg-stone-900/90 text-amber-200/90 font-serif text-xs">
                    <th className="py-3.5 px-4 w-16">序号</th>
                    <th className="py-3.5 px-4">奖项</th>
                    <th className="py-3.5 px-4">奖品内容</th>
                    <th className="py-3.5 px-4">员工工号</th>
                    <th className="py-3.5 px-4">获奖姓名</th>
                    <th className="py-3.5 px-4">所属部门</th>
                    <th className="py-3.5 px-4 text-right">揭晓时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {filteredWinners.map((w, idx) => {
                    const isTopThree = idx < 3;
                    const isFirstPrize = w.prizeId === 'prize-1' || w.prizeName?.includes('一等');

                    return (
                      <tr
                        key={w.id}
                        className={`transition-colors hover:bg-white/[0.04] ${
                          isFirstPrize ? 'bg-amber-500/[0.03]' : ''
                        }`}
                      >
                        {/* 序號 */}
                        <td className="py-3.5 px-4 font-mono font-bold text-stone-400">
                          {isTopThree ? (
                            <span className="text-amber-400">★ {idx + 1}</span>
                          ) : (
                            idx + 1
                          )}
                        </td>

                        {/* 獎項 */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              isFirstPrize
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                                : 'bg-white/10 text-stone-200 border border-white/10'
                            }`}
                          >
                            {isFirstPrize && <span>👑</span>}
                            <span>{w.prizeName}</span>
                          </span>
                        </td>

                        {/* 獎品內容 */}
                        <td className="py-3.5 px-4 text-stone-300 font-medium font-sans">
                          {w.prizeItem}
                        </td>

                        {/* 工號 */}
                        <td className="py-3.5 px-4 font-mono text-amber-300/90 font-semibold">
                          <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10">
                            {w.id || '无工号'}
                          </span>
                        </td>

                        {/* 姓名 */}
                        <td className="py-3.5 px-4 font-bold text-stone-100 text-base font-sans">
                          {w.name}
                        </td>

                        {/* 部門 */}
                        <td className="py-3.5 px-4 text-stone-400 text-xs">
                          {w.department || '—'}
                        </td>

                        {/* 中獎時間 */}
                        <td className="py-3.5 px-4 font-mono text-stone-400 text-xs text-right">
                          {w.wonAt || '现场开出'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4. 底部版權與列印快捷欄 */}
        <div className="px-6 sm:px-8 py-3.5 bg-black/60 border-t border-white/10 flex items-center justify-between text-xs text-stone-500 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>年终庆典抽奖系统 · 官方荣誉见证</span>
            <span>·</span>
            <span>共录入候选池 {totalCandidatesCount} 人</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印本页战报</span>
            </button>
            <span>·</span>
            <span>按 ESC 键可快速返回抽奖舞台</span>
          </div>
        </div>
      </div>
    </div>
  );
}
