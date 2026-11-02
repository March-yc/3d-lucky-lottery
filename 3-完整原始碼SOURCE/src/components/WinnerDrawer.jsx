import React from 'react';
import { X, Trophy, Download, Trash2, UserCheck, Sparkles, Crown } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function WinnerDrawer({
  isOpen,
  onClose,
  prizes,
  winnersByPrize,
  onRemoveWinner,
  onOpenGrandWinners
}) {
  if (!isOpen) return null;

  // 匯出得獎名單為 Excel 文件
  const handleExportExcel = () => {
    const exportData = [];
    prizes.forEach(prize => {
      const list = winnersByPrize[prize.id] || [];
      list.forEach((w, index) => {
        exportData.push({
          '奖项': prize.name,
          '奖品': prize.item || '',
          '顺位': index + 1,
          '姓名': w.name,
          '工号': w.id || '',
          '部门': w.department || '',
          '中奖时间': w.wonAt || new Date().toLocaleTimeString()
        });
      });
    });

    if (exportData.length === 0) {
      alert('暂无中奖数据可导出');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '获奖名单');
    XLSX.writeFile(wb, `抽奖系统_中奖名单_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const totalWinnersCount = Object.values(winnersByPrize).reduce(
    (acc, cur) => acc + (cur ? cur.length : 0),
    0
  );

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm pointer-events-auto select-none transition-all">
      {/* 點擊遮罩關閉 */}
      <div className="flex-1" onClick={onClose} />

      {/* 側邊高質感黑金抽屜主體 */}
      <div className="relative w-full max-w-md h-full bg-gradient-to-b from-stone-900 via-stone-950 to-black border-l border-amber-500/30 shadow-2xl flex flex-col p-6 text-stone-100 overflow-hidden">
        {/* 頂部光效飾條 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-amber-300" />

        {/* 標題欄 */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-amber-100 tracking-wide font-serif">
              获奖名单
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono">
              共 {totalWinnersCount} 人
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 匯出 Excel 按鈕 */}
            <button
              onClick={handleExportExcel}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 hover:text-white transition-all text-xs flex items-center gap-1 border border-white/15"
              title="导出Excel中奖表"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出</span>
            </button>

            {/* 關閉按鈕 */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-stone-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 獎項分組名單列表 */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 custom-scrollbar">
          {/* 奢華盛典總榜快捷橫幅 */}
          {onOpenGrandWinners && (
            <button
              onClick={() => {
                onClose();
                onOpenGrandWinners();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-amber-500/25 hover:from-amber-500/40 hover:to-yellow-500/30 border border-amber-400/50 flex items-center justify-between text-amber-200 transition-all group shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-300 fill-amber-300/40 animate-pulse" />
                <span className="text-xs font-bold font-serif">展开全屏盛典总中奖榜单</span>
              </div>
              <span className="text-[11px] text-amber-300/80 group-hover:translate-x-0.5 transition-transform font-mono">
                查看大屏版 →
              </span>
            </button>
          )}
          {prizes.map(prize => {
            const list = winnersByPrize[prize.id] || [];
            const isFull = list.length >= prize.quota;

            return (
              <div
                key={prize.id}
                className="rounded-2xl bg-white/[0.03] border border-amber-500/20 p-4 relative overflow-hidden backdrop-blur-md"
              >
                {/* 獎項卡片頭部 */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="font-bold text-amber-200 text-base">
                      {prize.name}
                    </span>
                    {prize.item && (
                      <span className="text-xs text-stone-400 font-normal">
                        ({prize.item})
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-amber-300/80">
                    已抽 <span className="font-bold text-amber-300">{list.length}</span> / {prize.quota} 人
                  </div>
                </div>

                {/* 該獎項獲獎者名冊 */}
                {list.length === 0 ? (
                  <div className="py-4 text-center text-xs text-stone-500 italic">
                    尚未抽出获奖者
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {list.map((winner, idx) => (
                      <div
                        key={winner.id || idx}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-amber-400/40 transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold font-mono">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="text-sm font-bold text-stone-100 flex items-center gap-1.5">
                              <span>{winner.name}</span>
                              <Sparkles className="w-3 h-3 text-amber-400 opacity-60" />
                            </div>
                            {winner.id && (
                              <div className="text-[11px] text-stone-400 font-mono">
                                工号: {winner.id}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 移除/放回按鈕 */}
                        {onRemoveWinner && (
                          <button
                            onClick={() => onRemoveWinner(prize.id, winner.id)}
                            title="从名单移除并放回奖池"
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-rose-500/20 text-stone-400 hover:text-rose-400 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
