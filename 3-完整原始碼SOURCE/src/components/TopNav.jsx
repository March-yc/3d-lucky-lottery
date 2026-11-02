import React from 'react';
import { Volume2, VolumeX, Maximize, Minimize, Settings, Trophy, Sparkles, Plus, Crown, Music } from 'lucide-react';

export default function TopNav({
  prizes,
  currentPrizeId,
  onSelectPrize,
  isMuted,
  onToggleMute,
  isBgmEnabled,
  onToggleBgm,
  isFullscreen,
  onToggleFullscreen,
  onOpenSettings,
  onOpenWinnerDrawer,
  onOpenGrandWinners,
  winnerCount,
  onAddCustomPrize
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-auto backdrop-blur-[2px]">
      {/* 左側 Logo / 標題 */}
      <div className="flex items-center space-x-2 text-amber-200">
        <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
        <span className="text-lg font-semibold tracking-wider text-amber-100 font-serif drop-shadow-md">
          幸运摇奖机
        </span>
      </div>

      {/* 中央獎項切換按鈕群 (Pill風格，高還原度) */}
      <div className="flex items-center space-x-2 bg-black/50 p-1.5 rounded-full border border-amber-500/30 backdrop-blur-md shadow-lg shadow-black/40">
        {prizes.map((p) => {
          const isActive = p.id === currentPrizeId;
          const isFirst = p.id === 'prize-1' || p.name.includes('一等');
          return (
            <button
              key={p.id}
              onClick={() => onSelectPrize(p.id)}
              className={`px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base transition-all duration-300 relative flex items-center gap-2 ${
                isActive
                  ? 'bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 text-stone-950 shadow-md shadow-amber-300/40 scale-105 font-black ring-1 ring-amber-300'
                  : 'text-amber-100/80 hover:text-amber-100 hover:bg-white/10 font-semibold'
              }`}
            >
              {isFirst && <span className="text-sm">👑</span>}
              <span>{p.name}</span>
            </button>
          );
        })}

        {/* 快速加碼按鈕 */}
        <button
          onClick={onAddCustomPrize}
          title="新增自定義加碼獎項"
          className="px-3 py-1.5 rounded-full text-xs font-medium text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/20 border border-dashed border-amber-500/40 flex items-center gap-1 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>加码</span>
        </button>
      </div>

      {/* 右側操作群 */}
      <div className="flex items-center space-x-2.5">
        {/* BGM 音樂開關 */}
        <button
          onClick={onToggleBgm}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95 ${
            isBgmEnabled
              ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/50 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-black/50 hover:bg-black/70 border-amber-500/30 text-stone-400'
          }`}
          title={isBgmEnabled ? '背景音乐已开启，点击静音/暂停' : '背景音乐已暂停，点击播放'}
        >
          <Music className={`w-3.5 h-3.5 ${isBgmEnabled ? 'text-amber-300 animate-pulse' : 'text-stone-500'}`} />
          <span>{isBgmEnabled ? '音乐开' : '音乐关'}</span>
        </button>

        {/* 聲音開關 */}
        <button
          onClick={onToggleMute}
          className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-black/50 hover:bg-black/70 border border-amber-500/30 text-amber-100/90 flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span>音效关</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>音效开</span>
            </>
          )}
        </button>

        {/* 奢華榮耀總榜按鈕 */}
        <button
          onClick={onOpenGrandWinners}
          className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/35 via-yellow-500/25 to-amber-500/35 hover:from-amber-500/50 hover:to-yellow-500/40 border border-amber-400/60 text-amber-200 flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95 shadow-[0_2px_14px_rgba(245,158,11,0.3)] hover:border-amber-300 cursor-pointer"
          title="展开全屏奢华总中奖名册大榜"
        >
          <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300/40 animate-pulse" />
          <span>荣耀总榜</span>
        </button>

        {/* 中獎名單抽屜按鈕 */}
        <button
          onClick={onOpenWinnerDrawer}
          className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95 shadow-sm cursor-pointer"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>中奖名单</span>
          {winnerCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 bg-amber-500 text-stone-950 text-[10px] font-bold rounded-full font-mono">
              {winnerCount}
            </span>
          )}
        </button>

        {/* 全屏按鈕 */}
        <button
          onClick={onToggleFullscreen}
          className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-black/50 hover:bg-black/70 border border-amber-500/30 text-amber-100/90 flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95"
        >
          {isFullscreen ? (
            <>
              <Minimize className="w-3.5 h-3.5" />
              <span>还原</span>
            </>
          ) : (
            <>
              <Maximize className="w-3.5 h-3.5" />
              <span>全屏</span>
            </>
          )}
        </button>

        {/* 設置按鈕 */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 border border-amber-500/30 text-amber-100/90 backdrop-blur-md transition-all active:scale-95"
          title="系统设置"
        >
          <Settings className="w-4 h-4 text-amber-300" />
        </button>
      </div>
    </header>
  );
}
