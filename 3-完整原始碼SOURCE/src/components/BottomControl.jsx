import React from 'react';
import { Play, Square, CheckCircle2, Crown, Sparkles, LayoutGrid } from 'lucide-react';

export default function BottomControl({
  currentPrize,
  currentPrizeWinnersCount,
  poolRemainingCount,
  isRolling,
  isDecelerating = false,
  isChuteAnimating = false,
  isCollecting = false,
  onToggleDraw,
  onHoldStart,
  onHoldEnd,
  isCompleted,
  isFirstPrize = false,
  isSpreadView = false,
  onToggleSpreadView = null
}) {
  if (!currentPrize) return null;

  const quota = currentPrize.quota || 1;
  const currentPersonIndex = Math.min(currentPrizeWinnersCount + 1, quota);
  const isBusy = isChuteAnimating || isCollecting;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-20 flex flex-col items-center pointer-events-auto select-none px-4">
      {/* 資訊膠囊條 (1:1 還原參考圖之米白半透明面板) */}
      <div
        className={`flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-stone-800 text-xs sm:text-sm font-medium backdrop-blur-md transition-all shadow-[0_8px_25px_rgba(0,0,0,0.5)] ${
          isFirstPrize
            ? 'bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 border-2 border-amber-400 shadow-amber-500/20 ring-2 ring-amber-300/30'
            : 'bg-gradient-to-r from-amber-100/90 via-amber-50/95 to-amber-100/90 border border-amber-300/80'
        }`}
      >
        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/30 border border-amber-600/40 text-amber-950 font-black text-xs sm:text-sm shadow-sm">
          {isFirstPrize && '👑 '}
          {currentPrize.name}
        </span>
        <span className="text-stone-400">·</span>
        <span>
          奖品: <strong className="font-bold text-stone-900">{currentPrize.item || '精美大礼'}</strong>
        </span>
        <span className="text-stone-400">·</span>
        <span>
          第 <strong className="text-amber-800 font-semibold">{currentPrizeWinnersCount}/{quota}</strong> 人
        </span>
        <span className="text-stone-400">·</span>
        <span>
          本组 <strong className="text-stone-900">{quota}</strong> 人
        </span>
        <span className="text-stone-400">·</span>
        <div className="flex items-center gap-2">
          <span>
            奖池剩余 <strong className="text-amber-700 font-bold">{poolRemainingCount}</strong> 人
          </span>
          {onToggleSpreadView && (
            <button
              type="button"
              onClick={onToggleSpreadView}
              disabled={isRolling || isDecelerating || isBusy}
              title={isSpreadView ? "收拢彩球回到物理底座" : "平摊展示当前所有剩余彩球与名单"}
              className={`ml-1 px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
                isSpreadView
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 ring-2 ring-amber-300 shadow-amber-500/40'
                  : 'bg-stone-900/90 hover:bg-stone-800 text-amber-300 border border-amber-400/60 hover:border-amber-300 shadow'
              }`}
            >
              {isSpreadView ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>收拢彩球</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                  <span>平摊看剩余名单</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 大尺寸抽獎按鈕 (支援按住長搖、鬆手減速懸念開獎) */}
      <div className="mt-4 flex flex-col items-center">
        {isCompleted ? (
          <div className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-stone-800/80 border border-amber-500/40 text-amber-200 text-base font-semibold shadow-lg backdrop-blur-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>本奖项已全部抽完 ({quota}/{quota})</span>
          </div>
        ) : (
          <button
            onClick={isBusy ? undefined : onToggleDraw}
            onPointerDown={isBusy ? undefined : onHoldStart}
            onPointerUp={isBusy ? undefined : onHoldEnd}
            disabled={isBusy}
            className={`group relative flex items-center justify-center gap-3 px-10 sm:px-14 py-3 sm:py-3.5 rounded-2xl transition-all duration-300 transform shadow-[0_8px_24px_rgba(225,29,72,0.4)] ${
              isBusy
                ? 'bg-stone-800/90 text-stone-400 border-2 border-stone-600/60 cursor-not-allowed opacity-90'
                : isDecelerating
                ? 'bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 text-white border-2 border-yellow-300 animate-pulse active:scale-95 cursor-pointer'
                : isRolling
                ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white border-2 border-amber-300 animate-pulse active:scale-95 cursor-pointer'
                : isFirstPrize
                ? 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-500 hover:from-amber-500 hover:to-yellow-500 text-stone-950 font-black border-2 border-amber-300 shadow-[0_12px_36px_rgba(245,158,11,0.6)] active:scale-95 cursor-pointer'
                : 'bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 hover:from-rose-600 hover:to-rose-600 text-white border-2 border-amber-400/80 hover:shadow-[0_12px_32px_rgba(244,63,94,0.6)] hover:border-amber-300 active:scale-95 cursor-pointer'
            }`}
          >
            {/* 按鈕光暈外圈 */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-white/20 pointer-events-none" />

            {/* 一等獎皇冠標記 */}
            {isFirstPrize && !isRolling && !isBusy && (
              <Crown className="w-5 h-5 text-amber-900 fill-amber-300 animate-bounce" />
            )}

            {/* 按鈕文字 */}
            <span className="text-lg sm:text-xl font-bold tracking-wider drop-shadow-md">
              {isChuteAnimating
                ? '✨ 幸运球滚落中 · 即将揭晓...'
                : isCollecting
                ? '📥 荣耀彩球入罐中...'
                : isDecelerating
                ? '⚡ 惯性减速 · 即将揭晓幸运球...'
                : isRolling
                ? '🌀 摇奖中 · 松手减速出球'
                : (isFirstPrize ? '👑 按住或点击抽取一等奖' : '按住摇奖 · 松手出球')}
            </span>

            {/* 空白鍵提示膠囊 */}
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-mono border ${
                isBusy
                  ? 'bg-black/20 text-stone-400 border-white/10'
                  : isFirstPrize && !isRolling
                  ? 'bg-black/40 text-amber-200 border-amber-300/40'
                  : 'bg-black/25 text-amber-200/90 border-white/20'
              }`}
            >
              {isBusy ? '出球中' : isDecelerating ? '决选中' : isRolling ? '松开出球' : '长按空格'}
            </span>
          </button>
        )}

        {/* 底部副標提示文字 */}
        <p className="mt-2 text-[11px] sm:text-xs text-amber-100/70 tracking-wider font-light drop-shadow text-center">
          {isBusy
            ? '出球轨道滑行中 · 系统已原子锁定当前名额，绝对均等无重复'
            : isDecelerating
            ? '手柄已松开 · 机器正带着物理惯性缓缓减速，幸运号码即将入仓！'
            : isRolling
            ? '正在高速回旋摇奖中 · 松开手柄或按钮将顺畅减速开奖！亦可轻拍玻璃看彩球欢跃！'
            : isFirstPrize
            ? `👑 终极大奖 · 第 ${currentPersonIndex}/${quota} 位 · 密碼學 CSPRNG 真隨機無偏抽取`
            : `第 ${currentPersonIndex}/${quota} 位 · 可按住左侧金色手柄/按钮摇奖，松开出球 (亦可单击抽奖或按空格键)`}
        </p>
      </div>
    </div>
  );
}
