import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, ArrowRight, RotateCcw, Crown, Star } from 'lucide-react';

// 晶瑩剔透的水晶展示罐（內置中獎幸運彩球與工號姓名印記）
function ShowcaseJar({ winner, isFirstPrize }) {
  const ballColor = winner.ballColor || '#d95338';

  // 解析顏色以生成逼真的 3D 球體光影階調
  const hex = ballColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 217;
  const g = parseInt(hex.substring(2, 4), 16) || 83;
  const b = parseInt(hex.substring(4, 6), 16) || 56;

  const light = `rgb(${Math.min(255, r + 75)}, ${Math.min(255, g + 75)}, ${Math.min(255, b + 75)})`;
  const dark = `rgb(${Math.max(0, r - 75)}, ${Math.max(0, g - 75)}, ${Math.max(0, b - 75)})`;

  return (
    <div className="relative my-3 sm:my-4 flex flex-col items-center justify-center">
      {/* 玻璃罩展示台主體 */}
      <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
        {/* 頂部金球頂飾 / 把手 */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-600 via-amber-300 to-yellow-100 shadow-[0_2px_8px_rgba(245,158,11,0.7)] border border-amber-200" />
          <div className="w-2.5 h-1.5 bg-gradient-to-b from-amber-400 to-amber-600 rounded-b-sm" />
        </div>

        {/* 晶瑩剔透的水晶圓頂玻璃罩 */}
        <div className="relative w-36 h-38 sm:w-38 sm:h-40 rounded-t-[72px] rounded-b-2xl border-2 border-white/60 bg-gradient-to-b from-white/30 via-white/10 to-amber-500/10 shadow-[inset_0_0_24px_rgba(255,255,255,0.45),0_12px_36px_rgba(0,0,0,0.6)] backdrop-blur-[2px] overflow-hidden flex items-center justify-center">
          {/* 左側玻璃曲面反光高光條 */}
          <div className="absolute top-4 left-2.5 w-2.5 h-24 sm:h-28 rounded-full bg-gradient-to-b from-white/85 via-white/35 to-transparent blur-[0.5px] pointer-events-none" />

          {/* 右側微弱次高光 */}
          <div className="absolute top-8 right-2.5 w-1 h-18 sm:h-20 rounded-full bg-gradient-to-b from-white/45 via-white/10 to-transparent blur-[0.5px] pointer-events-none" />

          {/* 頂部圓弧反光 */}
          <div className="absolute top-2 left-6 right-6 h-3 rounded-t-full border-t border-white/80 pointer-events-none" />

          {/* 玻璃罐內部：懸浮發光的真實 3D 中獎彩球 */}
          <div className="relative z-10 flex flex-col items-center justify-center animate-pulse">
            {/* 彩球本體 (超逼真高光漸層) */}
            <div
              className="w-22 h-22 sm:w-24 sm:h-24 rounded-full relative flex items-center justify-center transition-transform duration-300 hover:scale-105"
              style={{
                background: `radial-gradient(circle at 32% 26%, #ffffff 0%, ${light} 24%, ${ballColor} 62%, ${dark} 100%)`,
                boxShadow: `inset -5px -6px 14px rgba(0,0,0,0.6), inset 4px 5px 8px rgba(255,255,255,0.7), 0 10px 25px rgba(0,0,0,0.55)`
              }}
            >
              {/* 球頂晶亮鏡面高光斑 */}
              <div className="absolute top-2 left-3 w-5 h-3 rounded-full bg-white/70 rotate-[-25deg] blur-[0.6px] pointer-events-none" />

              {/* 球中央白色工號與姓名印記 (與 3D 機台球體完全吻合) */}
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-amber-400 shadow-md flex flex-col items-center justify-center text-center p-0.5 select-none">
                <span className="text-[10px] sm:text-[11px] font-black font-mono text-stone-700 leading-tight">
                  {winner.id || 'NO.88'}
                </span>
                <span className="text-xs sm:text-sm font-black text-stone-950 truncate max-w-[48px] sm:max-w-[52px] leading-tight">
                  {winner.name}
                </span>
              </div>
            </div>

            {/* 球底投射在底座上的柔和陰影 */}
            <div className="w-14 h-2.5 rounded-full bg-black/40 blur-sm mt-1 pointer-events-none" />
          </div>
        </div>

        {/* 罐體黃銅底座 (雙層圓盤底座) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none">
          {/* 上層黃銅托盤邊緣 */}
          <div className="w-36 sm:w-40 h-2.5 rounded-full bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600 border border-amber-200/90 shadow-sm" />
          {/* 下層重磅暗金底座 */}
          <div className="w-40 sm:w-44 h-3 -mt-0.5 rounded-full bg-gradient-to-r from-stone-900 via-amber-800 to-stone-900 border-t border-amber-400/80 shadow-md" />
        </div>
      </div>

      {/* 罐子下方精緻說明徽飾標籤 */}
      <div className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-mono tracking-widest text-amber-300/90 bg-amber-950/50 px-3.5 py-0.5 rounded-full border border-amber-400/40 shadow-sm">
        <Sparkles className="w-3 h-3 text-amber-300" />
        <span>幸运号球 · 专属荣耀封存</span>
        <Sparkles className="w-3 h-3 text-amber-300" />
      </div>
    </div>
  );
}

export default function WinnerCardModal({
  winner,
  prize,
  onDismiss,
  onRedraw,
  isFirstPrize = false
}) {
  const [isSlidingOut, setIsSlidingOut] = useState(false);

  useEffect(() => {
    if (!winner) return;

    // 觸發璀璨金色慶典紙花
    const duration = (isFirstPrize ? 4.0 : 2.5) * 1000;
    const animationEnd = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: isFirstPrize ? 5 : 3,
        angle: 60,
        spread: 65,
        origin: { x: 0, y: 0.65 },
        colors: isFirstPrize
          ? ['#ffd700', '#f59e0b', '#fbbf24', '#ffffff']
          : ['#ffd700', '#facc15', '#f43f5e', '#ffffff']
      });
      confetti({
        particleCount: isFirstPrize ? 5 : 3,
        angle: 120,
        spread: 65,
        origin: { x: 1, y: 0.65 },
        colors: isFirstPrize
          ? ['#ffd700', '#f59e0b', '#fbbf24', '#ffffff']
          : ['#ffd700', '#facc15', '#38bdf8', '#ffffff']
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // 中央大煙花爆破
    confetti({
      particleCount: isFirstPrize ? 140 : 80,
      spread: 100,
      origin: { y: 0.45 },
      colors: isFirstPrize
        ? ['#ffd700', '#fbbf24', '#f59e0b', '#ffffff', '#e11d48']
        : ['#f59e0b', '#fbbf24', '#ec4899', '#3b82f6', '#10b981']
    });

    // 自動優雅滑入右側小名單（一等獎多停留2秒讓全場歡呼）
    const timer = setTimeout(() => {
      handleSlideIntoList();
    }, isFirstPrize ? 7000 : 5000);

    return () => clearTimeout(timer);
  }, [winner, isFirstPrize]);

  const handleSlideIntoList = () => {
    setIsSlidingOut(true);
    setTimeout(() => {
      onDismiss();
      setIsSlidingOut(false);
    }, 550);
  };

  if (!winner) return null;

  return (
    // 半透明磨砂玻璃背板：弱化暗度（bg-black/35），微模糊（backdrop-blur-[2px]），讓後方 3D 出球機台與出球座上的彩球清晰可見！
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-[2px] pointer-events-auto select-none transition-all duration-300">
      {/* 3D 浮空卡片本體 */}
      <div
        className={`relative w-full ${isFirstPrize ? 'max-w-lg' : 'max-w-md'} transform transition-all duration-500 ease-out ${
          isSlidingOut
            ? 'translate-x-[90vw] translate-y-[-20vh] scale-25 opacity-0'
            : 'scale-100 opacity-100'
        }`}
      >
        {/* 外圈金色動態光環 (一等獎具備強烈耀金烈焰) */}
        <div
          className={`absolute -inset-1.5 rounded-3xl opacity-75 blur-2xl animate-pulse ${
            isFirstPrize
              ? 'bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-400'
              : 'bg-gradient-to-r from-amber-400 via-rose-500 to-amber-300'
          }`}
        />

        {/* 卡片主框：半透明黑金煙燻玻璃 (bg-stone-950/80 backdrop-blur-2xl) */}
        <div
          className={`relative overflow-hidden rounded-3xl bg-stone-950/80 backdrop-blur-2xl border-2 shadow-[0_25px_70px_rgba(0,0,0,0.85)] p-6 sm:p-7 text-center ${
            isFirstPrize ? 'border-amber-300 ring-2 ring-amber-400/50' : 'border-amber-400/80'
          }`}
        >
          {/* 一等獎背景金色光芒放射底紋 */}
          {isFirstPrize && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/25 via-amber-950/20 to-transparent pointer-events-none" />
          )}

          {/* 頂部徽章標籤 */}
          <div
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-2 shadow-lg ${
              isFirstPrize
                ? 'bg-gradient-to-r from-amber-500/30 via-yellow-500/40 to-amber-500/30 border border-amber-300 text-amber-200'
                : 'bg-amber-500/20 border border-amber-400/50 text-amber-300'
            }`}
          >
            {isFirstPrize ? (
              <>
                <Crown className="w-4 h-4 text-amber-300 animate-bounce" />
                <span>👑 荣耀巅峰 · 一等奖诞生 👑</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                <span>幸运降临 · 恭喜中奖</span>
              </>
            )}
          </div>

          {/* 獎項名稱與獎品 */}
          <div
            className={`font-semibold drop-shadow ${
              isFirstPrize ? 'text-amber-100 text-lg sm:text-xl tracking-wider' : 'text-amber-200 text-base sm:text-lg'
            }`}
          >
            {prize ? prize.name : '幸运大奖'}
            {prize?.item && (
              <span className={`ml-2 font-normal ${isFirstPrize ? 'text-amber-300 font-bold' : 'text-stone-300 text-sm'}`}>
                ({prize.item})
              </span>
            )}
          </div>

          {/* 核心亮點：晶瑩剔透的水晶展示罐（內置中獎彩球、工號與姓名） */}
          <ShowcaseJar winner={winner} isFirstPrize={isFirstPrize} />

          {/* 中獎者姓名 (一等獎超大字號與金箔浮雕陰影) */}
          <div className="my-3 sm:my-4 relative">
            {isFirstPrize && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <Star className="w-4.5 h-4.5 fill-amber-300" />
                <Star className="w-3.5 h-3.5 fill-amber-400" />
              </div>
            )}
            <h2
              className={`font-black tracking-wider text-transparent bg-clip-text drop-shadow-[0_6px_16px_rgba(251,191,36,0.6)] ${
                isFirstPrize
                  ? 'text-5xl sm:text-6xl bg-gradient-to-b from-white via-yellow-200 to-amber-400 scale-105'
                  : 'text-4xl sm:text-5xl bg-gradient-to-b from-white via-amber-100 to-amber-300'
              }`}
            >
              {winner.name}
            </h2>

            {/* 工號與部門標識 */}
            <div className="mt-2 text-sm sm:text-base text-amber-200/80 font-mono tracking-widest">
              {winner.id ? `工号: ${winner.id}` : ''}
              {winner.department && winner.department !== '员工' ? ` · ${winner.department}` : ''}
            </div>
          </div>

          {/* 底部按鈕操作 */}
          <div className="mt-6 flex items-center justify-center gap-3">
            {/* 收入小名單按鈕 */}
            <button
              onClick={handleSlideIntoList}
              className={`flex-1 py-3 px-5 rounded-xl font-bold text-base shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                isFirstPrize
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-amber-300 hover:to-yellow-200 text-stone-950 shadow-amber-400/40 text-lg'
                  : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 shadow-amber-500/30'
              }`}
            >
              <span>{isFirstPrize ? '加冕入榜' : '收入名单'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* 若有意外不在場，支援重新抽取 */}
            {onRedraw && (
              <button
                onClick={onRedraw}
                title="不在现场？放回奖池重新抽取"
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-stone-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重抽</span>
              </button>
            )}
          </div>

          {/* 自動收納倒數提示 */}
          <p className="mt-2.5 text-[11px] text-stone-400">
            {isFirstPrize
              ? '✦ 终极大奖诞生！即将自动滑入荣誉榜，或点击按钮立即收入'
              : '即将自动滑入右侧名单，或点击按钮立即收入'}
          </p>
        </div>
      </div>
    </div>
  );
}
