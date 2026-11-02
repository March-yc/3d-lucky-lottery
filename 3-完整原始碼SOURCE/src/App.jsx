import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import LotteryScene3D from './components/LotteryScene3D';
import TopNav from './components/TopNav';
import HeaderTitle from './components/HeaderTitle';
import BottomControl from './components/BottomControl';
import WinnerCardModal from './components/WinnerCardModal';
import WinnerDrawer from './components/WinnerDrawer';
import GrandWinnersModal from './components/GrandWinnersModal';
import SettingsModal from './components/SettingsModal';
import FairnessModal from './components/FairnessModal';
import { defaultCandidates, defaultPrizes } from './data/defaultCandidates';
import { soundManager } from './utils/audio';
import { bgmManager } from './utils/bgm';
import { pickSecureRandomCandidate, getSecureRandomInt } from './utils/rng';
import { Trophy, LayoutGrid, Sparkles, ShieldCheck } from 'lucide-react';

const STORAGE_KEYS = {
  PRIZES: 'lotto_app_prizes_v2',
  CANDIDATES: 'lotto_app_candidates_v2',
  WINNERS: 'lotto_app_winners_v2',
  TITLE: 'lotto_app_title_v2',
  MUTED: 'lotto_app_muted_v2'
};

export default function App() {
  // 1. 本地儲存初始化與狀態
  const [isBgmEnabled, setIsBgmEnabled] = useState(() => bgmManager.isEnabled);

  // 監聽用戶首次手勢，遵守瀏覽器 Autoplay 規範並啟動 BGM
  useEffect(() => {
    const handleFirstUserGesture = () => {
      bgmManager.initContext();
      soundManager.init();
      if (bgmManager.isEnabled && !bgmManager.isPlayingBgm) {
        bgmManager.playBgm();
      }
    };
    window.addEventListener('pointerdown', handleFirstUserGesture, { once: true });
    window.addEventListener('keydown', handleFirstUserGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstUserGesture);
      window.removeEventListener('keydown', handleFirstUserGesture);
    };
  }, []);

  const handleToggleBgm = useCallback(() => {
    setIsBgmEnabled(prev => {
      const next = !prev;
      bgmManager.setBgmEnabled(next);
      return next;
    });
  }, []);
  const [prizes, setPrizes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRIZES);
      return saved ? JSON.parse(saved) : defaultPrizes;
    } catch {
      return defaultPrizes;
    }
  });

  const [currentPrizeId, setCurrentPrizeId] = useState(() => prizes[0]?.id || 'prize-4');

  const [candidates, setCandidates] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CANDIDATES);
      return saved ? JSON.parse(saved) : defaultCandidates;
    } catch {
      return defaultCandidates;
    }
  });

  const [winnersByPrize, setWinnersByPrize] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WINNERS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [title, setTitle] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.TITLE) || 'xxx欢乐抽奖';
  });

  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.MUTED) === 'true';
  });

  // UI 交互狀態
  const [isRolling, setIsRolling] = useState(false);
  const [isDecelerating, setIsDecelerating] = useState(false);
  const [isSpreadView, setIsSpreadView] = useState(false);
  const [drawnWinner, setDrawnWinner] = useState(null);
  const [collectingWinner, setCollectingWinner] = useState(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [isWinnerDrawerOpen, setIsWinnerDrawerOpen] = useState(false);
  const [isGrandWinnersOpen, setIsGrandWinnersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFairnessModalOpen, setIsFairnessModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 儲存至 LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(prizes));
    } catch (e) {
      console.error(e);
    }
  }, [prizes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates));
    } catch (e) {
      console.error(e);
    }
  }, [candidates]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WINNERS, JSON.stringify(winnersByPrize));
    } catch (e) {
      console.error(e);
    }
  }, [winnersByPrize]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TITLE, title);
  }, [title]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MUTED, isMuted ? 'true' : 'false');
    soundManager.toggleMute(isMuted);
  }, [isMuted]);

  // 當前選中的獎項資料物件
  const currentPrize = useMemo(() => {
    return prizes.find(p => p.id === currentPrizeId) || prizes[0];
  }, [prizes, currentPrizeId]);

  // 已中獎人員 ID 集合（抽中即離開獎池）
  const allWinnersIds = useMemo(() => {
    const ids = new Set();
    Object.values(winnersByPrize).forEach(list => {
      if (Array.isArray(list)) {
        list.forEach(w => ids.add(w.id));
      }
    });
    return ids;
  }, [winnersByPrize]);

  // 全體已獲獎人員扁平陣列（存入 3D 榮耀存球罐）
  const allWinners = useMemo(() => {
    return Object.values(winnersByPrize).flat();
  }, [winnersByPrize]);

  // 目前獎池剩餘候選名單
  const availableCandidates = useMemo(() => {
    return candidates.filter(c => !allWinnersIds.has(c.id));
  }, [candidates, allWinnersIds]);

  // 當前獎項已抽出的人數
  const currentPrizeWinners = useMemo(() => {
    return winnersByPrize[currentPrize?.id] || [];
  }, [winnersByPrize, currentPrize]);

  const isCurrentPrizeCompleted = currentPrize ? currentPrizeWinners.length >= currentPrize.quota : false;

  const autoStopTimerRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const holdStartTimeRef = useRef(0);
  const isSpaceDownRef = useRef(false);
  const pointerHandledRef = useRef(false);

  // 清理定時器
  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  // 是否為一等獎（終極大獎）
  const isFirstPrize = currentPrize?.id === 'prize-1' || currentPrize?.name?.includes('一等');

  // 當 3D 滑道球滾到前方接球座時觸發（中獎彈窗與記錄）
  const handleBallLanded = useCallback((targetWinner) => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    const winner = targetWinner || drawnWinner;
    if (!winner) return;

    // 播放中獎音樂（一等獎具備皇家震撼交響大調音效，常規獎具備勝利歡慶音樂）
    bgmManager.playWinCelebration(isFirstPrize);
    soundManager.playWinFanfare(isFirstPrize);

    // 彈出中獎光效卡片
    setShowWinnerModal(true);

    // 加入該獎項之中獎名單（避免重複寫入）
    setWinnersByPrize(prev => {
      const curList = prev[winner.prizeId] || [];
      if (curList.some(w => w.id === winner.id)) {
        return prev;
      }
      return {
        ...prev,
        [winner.prizeId]: [...curList, winner]
      };
    });
  }, [drawnWinner, isFirstPrize]);

  // 停止滾動並抽出 1 位中獎者（採用密碼學級真隨機 + 原子鎖死）
  const handleStopAndPickWinner = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }

    soundManager.stopRollSound();
    setIsRolling(false);
    setIsDecelerating(false);

    if (availableCandidates.length === 0) {
      return;
    }

    // 1. 密碼學級硬件熵真隨機抽取 (Web Crypto CSPRNG + 3x Fisher-Yates 洗牌 + 拒絕採樣零模偏差)
    const chosenCandidate = pickSecureRandomCandidate(availableCandidates);
    if (!chosenCandidate) return;

    // 2. 自然彩球色彩
    const palette = ['#d95338', '#228795', '#f5b722', '#2b6aa6', '#df7450', '#3da88c', '#8b5cf6', '#f43f5e', '#0ea5e9', '#d97706'];
    const chosenColor = palette[getSecureRandomInt(palette.length)];

    const chosenWinner = {
      ...chosenCandidate,
      wonAt: new Date().toLocaleTimeString(),
      prizeId: currentPrize.id,
      prizeName: currentPrize.name,
      ballColor: chosenColor
    };

    // 3. 【核心防競態保證】：同毫秒即刻原子鎖死，寫入已中獎名單，從候選池中立即剔除！杜絕任何重複中獎！
    setWinnersByPrize(prev => {
      const curList = prev[chosenWinner.prizeId] || [];
      if (curList.some(w => w.id === chosenWinner.id)) {
        return prev;
      }
      return {
        ...prev,
        [chosenWinner.prizeId]: [...curList, chosenWinner]
      };
    });

    // 4. 觸發 3D 出球滑道長動畫（約 3.2 秒滾動 + 0.7 秒懸念入座）
    setDrawnWinner(chosenWinner);

    // 雙重保證備用定時器：4.8 秒後若尚未觸發，強制喚起中獎彈窗
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => {
      handleBallLanded(chosenWinner);
    }, 4800);
  }, [availableCandidates, currentPrize, handleBallLanded]);

  // 切換平攤展示剩餘名單模式
  const handleToggleSpreadView = useCallback(() => {
    if (isRolling || isDecelerating || drawnWinner || collectingWinner) return;
    soundManager.playClickSound();
    setIsSpreadView(prev => !prev);
  }, [isRolling, isDecelerating, drawnWinner, collectingWinner]);

  // 開始搖獎（按住手搖把手、按鈕或空白鍵觸發）
  const handleStartRolling = useCallback(() => {
    // 嚴格防止出球動畫或入罐動畫期間連擊重抽
    if (isRolling || isDecelerating || drawnWinner || collectingWinner || showWinnerModal) return;

    // 檢查目前獎項是否已達名額
    if (isCurrentPrizeCompleted) {
      alert(`${currentPrize.name} 名额已全部抽取完毕！请选择上方其他奖项或点击「+加码」继续抽奖。`);
      return;
    }

    // 檢查獎池是否還有剩餘人員
    if (availableCandidates.length === 0) {
      alert('当前奖池已无剩余候选人！所有名单人员均已中奖。可在设置中添加名单或清空中奖。');
      return;
    }

    // 若當前處於平攤視角，開搖時自動收攏歸位
    if (isSpreadView) {
      setIsSpreadView(false);
    }

    holdStartTimeRef.current = Date.now();
    soundManager.playClickSound();

    setIsRolling(true);
    setIsDecelerating(false);
    setShowWinnerModal(false);
    soundManager.startRollSound(isFirstPrize);
    bgmManager.duck(); // 搖獎滾球時微降 BGM 音量，營造出球緊張懸念

    // 防呆保護：若持續按住超過 14 秒自動開獎
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    autoStopTimerRef.current = setTimeout(() => {
      handleStopAndPickWinner();
    }, 14000);
  }, [isRolling, isDecelerating, drawnWinner, collectingWinner, showWinnerModal, isCurrentPrizeCompleted, currentPrize, availableCandidates.length, isFirstPrize, handleStopAndPickWinner]);

  // 鬆手 / 放開觸發（長按鬆手後保留約 1.3 秒的慣性減速與懸念回旋再出球；快速單擊則自動翻滾後出球）
  const handleStopRollingAndDraw = useCallback(() => {
    if (!isRolling) return;
    const holdDuration = Date.now() - holdStartTimeRef.current;

    if (holdDuration >= 300) {
      // 達到長按搖獎門檻：鬆手後再旋轉 1.3~1.6 秒（帶著慣性減速與極致懸念），隨後開獎出球！
      setIsDecelerating(true);
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      autoStopTimerRef.current = setTimeout(() => {
        setIsDecelerating(false);
        handleStopAndPickWinner();
      }, isFirstPrize ? 1600 : 1300);
    } else {
      // 屬於快速點擊：保留精彩的 2.5 秒翻滾後自動出球
      const remainingTime = Math.max(2500 - holdDuration, 1200);
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = setTimeout(() => {
        setIsDecelerating(false);
        handleStopAndPickWinner();
      }, isFirstPrize ? remainingTime + 500 : remainingTime);
    }
  }, [isRolling, isFirstPrize, handleStopAndPickWinner]);

  // 處理游標按住與放開（避免與 onClick 衝突，並在出球動畫期間鎖定）
  const handleHoldStart = useCallback(() => {
    if (isDecelerating || drawnWinner || collectingWinner || showWinnerModal) return;
    pointerHandledRef.current = true;
    handleStartRolling();
  }, [isDecelerating, drawnWinner, collectingWinner, showWinnerModal, handleStartRolling]);

  const handleHoldEnd = useCallback(() => {
    handleStopRollingAndDraw();
    setTimeout(() => {
      pointerHandledRef.current = false;
    }, 150);
  }, [handleStopRollingAndDraw]);

  // 單擊按鈕備用觸發（未被 pointerdown 攔截時）
  const handleToggleDraw = useCallback(() => {
    if (pointerHandledRef.current) return;
    if (isDecelerating || drawnWinner || collectingWinner || showWinnerModal) return;
    soundManager.playClickSound();

    if (!isRolling) {
      handleStartRolling();
      const rollDuration = isFirstPrize ? 3000 : 2500;
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = setTimeout(() => {
        handleStopAndPickWinner();
      }, rollDuration);
    } else {
      handleStopAndPickWinner();
    }
  }, [isRolling, isDecelerating, drawnWinner, collectingWinner, showWinnerModal, handleStartRolling, handleStopAndPickWinner, isFirstPrize]);

  // 關閉中獎彈窗（滑入右側小名單，並啟動彩球飛入右側存球罐）
  const handleDismissWinnerModal = () => {
    setShowWinnerModal(false);
    bgmManager.resumeAfterWin(); // 恢復常規背景音樂
    if (drawnWinner) {
      setCollectingWinner(drawnWinner);
    }
  };

  // 彩球完成飛入右側存球罐後的落地回調
  const handleBallCollectedToJar = useCallback(() => {
    setDrawnWinner(null);
    setCollectingWinner(null);
  }, []);

  // 重抽（若中獎者不在場等情況，從已中名單撤銷）
  const handleRedrawWinner = () => {
    if (!drawnWinner) return;
    bgmManager.resumeAfterWin(); // 恢復常規背景音樂
    setWinnersByPrize(prev => {
      const curList = prev[drawnWinner.prizeId] || [];
      return {
        ...prev,
        [drawnWinner.prizeId]: curList.filter(w => w.id !== drawnWinner.id)
      };
    });
    setShowWinnerModal(false);
    setDrawnWinner(null);
    setCollectingWinner(null);
  };

  // 從名單中移除單一人員並放回獎池
  const handleRemoveWinner = (prizeId, winnerId) => {
    setWinnersByPrize(prev => {
      const curList = prev[prizeId] || [];
      return {
        ...prev,
        [prizeId]: curList.filter(w => w.id !== winnerId)
      };
    });
  };

  // 清空所有中獎記錄
  const handleResetWinners = () => {
    setWinnersByPrize({});
    setDrawnWinner(null);
    setCollectingWinner(null);
    setShowWinnerModal(false);
  };

  // 恢復初始資料（預設 32 人 + 預設四等~一等獎項）
  const handleResetAllToDefault = () => {
    setPrizes(defaultPrizes);
    setCurrentPrizeId(defaultPrizes[0].id);
    setCandidates(defaultCandidates);
    setWinnersByPrize({});
    setTitle('xxx欢乐抽奖');
    setDrawnWinner(null);
    setCollectingWinner(null);
    setShowWinnerModal(false);
  };

  // 切換獎項：切換時若有未完成暫態立即重置，右側存球罐自動同步為該獎項專屬中獎球（若該獎項未抽取則為空）
  const handleSelectPrize = (prizeId) => {
    if (isRolling) return;
    setCurrentPrizeId(prizeId);
    setDrawnWinner(null);
    setCollectingWinner(null);
    setShowWinnerModal(false);
    setIsSpreadView(false);
  };

  // 快速新增加碼獎項
  const handleAddCustomPrize = () => {
    const newId = `prize-extra-${Date.now()}`;
    const newPrize = {
      id: newId,
      name: '加码大奖',
      quota: 3,
      item: '加码红包500元',
      group: '1/1组',
      color: '#f59e0b'
    };
    setPrizes(prev => [...prev, newPrize]);
    setCurrentPrizeId(newId);
  };

  // 全螢幕切換
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  // 鍵盤空白鍵快速觸發抽獎（支援長按空白鍵搖獎、鬆手即刻出球）
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 若正在彈窗中輸入文字則不攔截空白鍵
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (showWinnerModal) {
          handleDismissWinnerModal();
          return;
        }
        if (isRolling || isDecelerating || drawnWinner || collectingWinner) {
          return;
        }
        if (!e.repeat && !isSpaceDownRef.current) {
          isSpaceDownRef.current = true;
          handleStartRolling();
        }
      } else if (e.code === 'Escape') {
        setShowWinnerModal(false);
        setIsWinnerDrawerOpen(false);
        setIsGrandWinnersOpen(false);
        setIsSettingsOpen(false);
        setIsFairnessModalOpen(false);
      }
    };

    const handleKeyUp = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      if (e.code === 'Space' && isSpaceDownRef.current) {
        e.preventDefault();
        isSpaceDownRef.current = false;
        handleStopRollingAndDraw();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleStartRolling, handleStopRollingAndDraw, showWinnerModal, isRolling, isDecelerating, drawnWinner, collectingWinner]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#131417] select-none font-sans text-stone-100">
      {/* 1. 頂部導航條 */}
      <TopNav
        prizes={prizes}
        currentPrizeId={currentPrizeId}
        onSelectPrize={handleSelectPrize}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(prev => !prev)}
        isBgmEnabled={isBgmEnabled}
        onToggleBgm={handleToggleBgm}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenWinnerDrawer={() => setIsWinnerDrawerOpen(true)}
        onOpenGrandWinners={() => setIsGrandWinnersOpen(true)}
        winnerCount={allWinnersIds.size}
        onAddCustomPrize={handleAddCustomPrize}
      />

      {/* 2. 頂部大標題與獎項標籤 */}
      <HeaderTitle
        title={title}
        currentPrize={currentPrize}
      />

      {/* 3. 核心 3D 物理碰撞模擬與舞台場景（包含右側 3D 榮耀水晶存球罐、手搖把手、拍打玻璃互動） */}
      <LotteryScene3D
        isRolling={isRolling}
        drawnWinner={drawnWinner}
        onBallLanded={handleBallLanded}
        isFirstPrize={isFirstPrize}
        candidates={availableCandidates}
        allWinners={currentPrizeWinners}
        collectingWinner={collectingWinner}
        onBallCollectedToJar={handleBallCollectedToJar}
        onHoldStart={handleHoldStart}
        onHoldEnd={handleHoldEnd}
        isSpreadView={isSpreadView}
        onToggleSpreadView={handleToggleSpreadView}
      />

      {/* 左側平攤剩餘名單懸浮徽飾 */}
      <div
        onClick={handleToggleSpreadView}
        title={isSpreadView ? "点击收拢彩球回到物理底座" : "点击在玻璃球内平摊展示当前所有剩余候选人名单"}
        className="absolute left-6 top-[28%] z-20 flex flex-col items-start cursor-pointer group select-none transition-all hover:scale-105 active:scale-95"
      >
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-md border shadow-[0_4px_24px_rgba(0,0,0,0.4)] text-xs font-bold transition-all ${
          isSpreadView
            ? 'bg-amber-500 text-stone-950 border-amber-300 ring-2 ring-amber-400/50 shadow-amber-500/30'
            : 'bg-stone-900/80 text-amber-200 border-amber-400/60 hover:border-amber-300 hover:text-amber-100'
        }`}>
          <LayoutGrid className={`w-3.5 h-3.5 ${isSpreadView ? 'text-stone-950 animate-pulse' : 'text-amber-400'}`} />
          <span>{isSpreadView ? '收拢彩球' : '平摊剩余名单'}</span>
          <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-black rounded-full font-mono text-[11px] shadow-sm">
            {availableCandidates.length}
          </span>
        </div>
        <div className="text-[10px] text-amber-300/80 mt-1 font-mono tracking-wider opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
          {isSpreadView ? '← 点击收拢入池' : '← 罐内平摊看剩余'}
        </div>
      </div>

      {/* 左側抽獎邏輯說明懸浮徽飾 */}
      <div
        onClick={() => setIsFairnessModalOpen(true)}
        title="点击查看抽奖逻辑算法说明与数学验证"
        className="absolute left-6 top-[37%] z-20 flex flex-col items-start cursor-pointer group select-none transition-all hover:scale-105 active:scale-95"
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-md border border-emerald-400/50 bg-stone-900/80 text-emerald-200 text-xs font-bold shadow-[0_4px_24px_rgba(16,185,129,0.2)] hover:border-emerald-300 hover:text-emerald-100 transition-all">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>抽奖逻辑说明</span>
          <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold rounded-full font-mono">
            真随机
          </span>
        </div>
        <div className="text-[10px] text-emerald-300/80 mt-1 font-mono tracking-wider opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
          点击查看逻辑原理 →
        </div>
      </div>

      {/* 平攤展示狀態提示橫幅 */}
      {isSpreadView && (
        <div className="absolute top-[17%] left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-900/90 border border-amber-400/80 text-amber-200 text-xs font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.7)] backdrop-blur-md animate-fade-in">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>已平摊展示奖池剩余 {availableCandidates.length} 位候选人 · 直接按住手柄或按钮即可开摇</span>
        </div>
      )}

      {/* 右側 3D 榮耀存球罐快捷懸浮徽飾（切換獎項即刻清空並對應當前獎項） */}
      <div
        onClick={() => setIsWinnerDrawerOpen(true)}
        title="点击展开已入罐中奖人员名单"
        className="absolute right-6 top-[28%] z-20 flex flex-col items-end cursor-pointer group select-none transition-all hover:scale-105 active:scale-95"
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-900/80 backdrop-blur-md border border-amber-400/60 shadow-[0_4px_24px_rgba(245,158,11,0.25)] text-xs font-bold text-amber-200 group-hover:border-amber-300 group-hover:text-amber-100 transition-colors">
          <Trophy className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>{currentPrize?.name || '本奖项'}存球罐</span>
          <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-black rounded-full font-mono text-[11px] shadow-sm">
            {currentPrizeWinners.length}
          </span>
        </div>
        <div className="text-[10px] text-amber-300/80 mt-1 font-mono tracking-wider opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
          查看入罐名单 →
        </div>
      </div>

      {/* 4. 底部控制欄（膠囊條 + 珊瑚紅按鈕，支援按住搖獎、鬆開減速出球） */}
      <BottomControl
        currentPrize={currentPrize}
        currentPrizeWinnersCount={currentPrizeWinners.length}
        poolRemainingCount={availableCandidates.length}
        isRolling={isRolling}
        isDecelerating={isDecelerating}
        isChuteAnimating={!!drawnWinner && !showWinnerModal}
        isCollecting={!!collectingWinner}
        onToggleDraw={handleToggleDraw}
        onHoldStart={handleHoldStart}
        onHoldEnd={handleHoldEnd}
        isCompleted={isCurrentPrizeCompleted}
        isFirstPrize={isFirstPrize}
        isSpreadView={isSpreadView}
        onToggleSpreadView={handleToggleSpreadView}
      />

      {/* 5. 璀璨中獎彈窗卡片（中央先跳出，隨後滑入小名單） */}
      {showWinnerModal && (
        <WinnerCardModal
          winner={drawnWinner}
          prize={currentPrize}
          onDismiss={handleDismissWinnerModal}
          onRedraw={handleRedrawWinner}
          isFirstPrize={isFirstPrize}
        />
      )}

      {/* 6. 側邊獲獎小名單抽屜 */}
      <WinnerDrawer
        isOpen={isWinnerDrawerOpen}
        onClose={() => setIsWinnerDrawerOpen(false)}
        prizes={prizes}
        winnersByPrize={winnersByPrize}
        onRemoveWinner={handleRemoveWinner}
        onOpenGrandWinners={() => setIsGrandWinnersOpen(true)}
      />

      {/* 7. 盛典榮耀總中獎名單奢華全屏大榜 */}
      <GrandWinnersModal
        isOpen={isGrandWinnersOpen}
        onClose={() => setIsGrandWinnersOpen(false)}
        prizes={prizes}
        winnersByPrize={winnersByPrize}
        title={title}
        totalCandidatesCount={candidates.length}
      />

      {/* 8. 設定控制台彈窗 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={title}
        onUpdateTitle={setTitle}
        prizes={prizes}
        onUpdatePrizes={setPrizes}
        candidates={candidates}
        onUpdateCandidates={setCandidates}
        onResetWinners={handleResetWinners}
        onResetAllToDefault={handleResetAllToDefault}
        winnersCount={allWinnersIds.size}
        isBgmEnabled={isBgmEnabled}
        onToggleBgm={handleToggleBgm}
      />

      {/* 9. 公平公正算法保證說明彈窗 */}
      <FairnessModal
        isOpen={isFairnessModalOpen}
        onClose={() => setIsFairnessModalOpen(false)}
        candidatesCount={candidates.length}
        candidates={availableCandidates.length > 0 ? availableCandidates : candidates}
      />
    </div>
  );
}
