import React from 'react';

export default function HeaderTitle({
  title,
  currentPrize
}) {
  return (
    <div className="fixed top-20 left-0 right-0 z-20 flex flex-col items-center pointer-events-none select-none">
      {/* 頂部英文字樣 */}
      <span className="text-[11px] tracking-[0.35em] text-amber-200/80 font-medium uppercase drop-shadow">
        LUCKY MOMENT
      </span>

      {/* 主活動標題 */}
      <h1 className="mt-1 text-4xl sm:text-5xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100 to-amber-200 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] font-sans">
        {title}
      </h1>

      {/* 當前抽取獎項標籤 Badge */}
      {currentPrize && (
        <div className="mt-3.5 px-8 py-2 rounded-full bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 border-2 border-amber-400/80 shadow-[0_6px_28px_rgba(245,158,11,0.45)] flex items-center gap-2.5 backdrop-blur-md">
          {currentPrize.id === 'prize-1' || currentPrize.name?.includes('一等') ? (
            <span className="text-xl sm:text-2xl animate-bounce">👑</span>
          ) : (
            <span className="text-amber-700 text-base sm:text-lg font-bold">★</span>
          )}
          <span className="text-xl sm:text-2xl font-black text-stone-950 tracking-wider font-sans drop-shadow-sm">
            {currentPrize.name}
          </span>
        </div>
      )}
    </div>
  );
}
