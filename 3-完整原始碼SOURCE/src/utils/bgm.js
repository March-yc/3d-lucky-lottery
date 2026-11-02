// Web Audio API 背景音樂與中獎慶典音樂管理器（零外部資源依賴，100%可發聲 + 支援自定義音訊）

const STORAGE_KEYS = {
  BGM_ENABLED: 'lotto_bgm_enabled_v1',
  BGM_VOLUME: 'lotto_bgm_volume_v1',
  SFX_VOLUME: 'lotto_sfx_volume_v1',
  CUSTOM_BGM_NAME: 'lotto_custom_bgm_name_v1'
};

class BgmController {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;
    this.winGain = null;
    this.masterGain = null;

    // 狀態
    this.isEnabled = true;
    this.bgmVolume = 0.5; // 0.0 ~ 1.0
    this.sfxVolume = 0.8; // 0.0 ~ 1.0
    this.isPlayingBgm = false;
    this.isDucked = false;

    // 自定義音訊
    this.customAudio = null;
    this.customAudioName = '';
    this.customAudioUrl = null;

    // 預設合成 BGM 定時排程
    this.bgmTimer = null;
    this.currentLoopStep = 0;
    this.tempo = 116; // BPM

    // 正在播放的試聽狀態 ('none' | 'default' | 'regular_win' | 'grand_win')
    this.previewState = 'none';
    this.activeNodes = [];

    this.loadSettings();
  }

  loadSettings() {
    try {
      const savedEnabled = localStorage.getItem(STORAGE_KEYS.BGM_ENABLED);
      if (savedEnabled !== null) {
        this.isEnabled = savedEnabled === 'true';
      }
      const savedBgmVol = localStorage.getItem(STORAGE_KEYS.BGM_VOLUME);
      if (savedBgmVol !== null) {
        this.bgmVolume = Math.min(1, Math.max(0, parseFloat(savedBgmVol) || 0.5));
      }
      const savedSfxVol = localStorage.getItem(STORAGE_KEYS.SFX_VOLUME);
      if (savedSfxVol !== null) {
        this.sfxVolume = Math.min(1, Math.max(0, parseFloat(savedSfxVol) || 0.8));
      }
      const savedName = localStorage.getItem(STORAGE_KEYS.CUSTOM_BGM_NAME);
      if (savedName) {
        this.customAudioName = savedName;
      }
    } catch (e) {
      console.error(e);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.BGM_ENABLED, this.isEnabled ? 'true' : 'false');
      localStorage.setItem(STORAGE_KEYS.BGM_VOLUME, String(this.bgmVolume));
      localStorage.setItem(STORAGE_KEYS.SFX_VOLUME, String(this.sfxVolume));
      if (this.customAudioName) {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_BGM_NAME, this.customAudioName);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CUSTOM_BGM_NAME);
      }
    } catch (e) {
      console.error(e);
    }
  }

  initContext() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();

        // 總增益節點
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // BGM 增益節點
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);

        // 中獎慶典音樂增益節點
        this.winGain = this.ctx.createGain();
        this.winGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.winGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setBgmEnabled(enabled) {
    this.isEnabled = enabled;
    this.saveSettings();
    if (!enabled) {
      this.stopBgm();
      this.stopPreview();
    } else {
      this.playBgm();
    }
    return this.isEnabled;
  }

  setBgmVolume(volume) {
    this.bgmVolume = Math.min(1, Math.max(0, volume));
    this.saveSettings();
    if (this.bgmGain && this.ctx) {
      const targetVol = this.isDucked ? this.bgmVolume * 0.25 : this.bgmVolume;
      this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmGain.gain.linearRampToValueAtTime(targetVol, this.ctx.currentTime + 0.05);
    }
    if (this.customAudio) {
      this.customAudio.volume = this.isDucked ? this.bgmVolume * 0.25 : this.bgmVolume;
    }
  }

  setSfxVolume(volume) {
    this.sfxVolume = Math.min(1, Math.max(0, volume));
    this.saveSettings();
    if (this.winGain && this.ctx) {
      this.winGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.winGain.gain.linearRampToValueAtTime(this.sfxVolume, this.ctx.currentTime + 0.05);
    }
  }

  // 設定自定義音訊檔案 (Blob 或 File)
  setCustomAudioFile(file) {
    if (!file) {
      this.clearCustomAudio();
      return;
    }
    this.customAudioName = file.name;
    if (this.customAudioUrl) {
      URL.revokeObjectURL(this.customAudioUrl);
    }
    this.customAudioUrl = URL.createObjectURL(file);
    if (!this.customAudio) {
      this.customAudio = new Audio();
      this.customAudio.loop = true;
    }
    this.customAudio.src = this.customAudioUrl;
    this.customAudio.volume = this.bgmVolume;
    this.saveSettings();

    // 若當前正在播放，切換為自定義音訊
    if (this.isPlayingBgm) {
      this.stopDefaultSynthesizer();
      this.customAudio.play().catch(e => console.log('Autoplay deferred:', e));
    }
  }

  clearCustomAudio() {
    if (this.customAudio) {
      this.customAudio.pause();
      this.customAudio = null;
    }
    if (this.customAudioUrl) {
      URL.revokeObjectURL(this.customAudioUrl);
      this.customAudioUrl = null;
    }
    this.customAudioName = '';
    this.saveSettings();

    if (this.isPlayingBgm && this.isEnabled) {
      this.startDefaultSynthesizer();
    }
  }

  // 開始播放默認 BGM
  playBgm() {
    if (!this.isEnabled) return;
    this.initContext();
    this.isPlayingBgm = true;

    if (this.customAudio) {
      this.customAudio.volume = this.isDucked ? this.bgmVolume * 0.25 : this.bgmVolume;
      this.customAudio.play().catch(e => console.log('Autoplay deferred:', e));
    } else {
      this.startDefaultSynthesizer();
    }
  }

  // 暫停 BGM
  stopBgm() {
    this.isPlayingBgm = false;
    if (this.customAudio) {
      this.customAudio.pause();
    }
    this.stopDefaultSynthesizer();
  }

  // 智能音量避讓 (Audio Ducking)：開球搖獎時調低音量
  duck() {
    if (!this.isPlayingBgm) return;
    this.isDucked = true;
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmGain.gain.linearRampToValueAtTime(this.bgmVolume * 0.2, this.ctx.currentTime + 0.3);
    }
    if (this.customAudio) {
      this.customAudio.volume = this.bgmVolume * 0.2;
    }
  }

  // 恢復音量
  unduck() {
    this.isDucked = false;
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmGain.gain.linearRampToValueAtTime(this.bgmVolume, this.ctx.currentTime + 0.5);
    }
    if (this.customAudio) {
      this.customAudio.volume = this.bgmVolume;
    }
  }

  // 抽中獎項時：暫停常規 BGM 並播放中獎音樂
  playWinCelebration(isFirstPrize = false) {
    this.initContext();
    // 暫停常規背景音樂
    if (this.customAudio && !this.customAudio.paused) {
      this.customAudio.pause();
    }
    this.stopDefaultSynthesizer();

    if (isFirstPrize) {
      this.playGrandPrizeWinMusic();
    } else {
      this.playRegularWinMusic();
    }
  }

  // 中獎彈窗關閉後：平滑恢復常規 BGM
  resumeAfterWin() {
    if (!this.isEnabled) return;
    this.initContext();
    this.isPlayingBgm = true;
    this.isDucked = false;

    // 平滑淡入
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.bgmGain.gain.linearRampToValueAtTime(this.bgmVolume, this.ctx.currentTime + 0.8);
    }

    if (this.customAudio) {
      this.customAudio.volume = this.bgmVolume;
      this.customAudio.play().catch(e => console.log('Autoplay:', e));
    } else {
      this.startDefaultSynthesizer();
    }
  }

  // ==========================================
  // 1. 預設合成 BGM 引擎（歡快喜慶活動氛圍樂）
  // ==========================================
  startDefaultSynthesizer() {
    this.stopDefaultSynthesizer();
    if (!this.ctx) return;

    // 歡慶 4 小節和弦循環 (C -> G -> Am -> F)
    // 溫暖的電鋼琴/馬林巴音色 + 輕快律動貝斯與節拍
    const chords = [
      // C major: C4, E4, G4, B4 (Cmaj7)
      { root: 130.81, notes: [261.63, 329.63, 392.00, 493.88] },
      // G major: G3, B3, D4, G4
      { root: 98.00, notes: [246.94, 293.66, 392.00, 587.33] },
      // A minor: A3, C4, E4, G4 (Am7)
      { root: 110.00, notes: [261.63, 329.63, 392.00, 523.25] },
      // F major: F3, A3, C4, E4 (Fmaj7)
      { root: 87.31, notes: [220.00, 261.63, 329.63, 440.00] }
    ];

    const secondsPerBeat = 60 / this.tempo;
    const barDuration = secondsPerBeat * 4;
    let chordIndex = 0;

    const playBar = () => {
      if (!this.isPlayingBgm || !this.ctx || this.customAudio) return;
      const now = this.ctx.currentTime;
      const currentChord = chords[chordIndex % chords.length];
      chordIndex++;

      // 貝斯根音（柔和三角波，帶有彈性）
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(currentChord.root, now);

      bassGain.gain.setValueAtTime(0.001, now);
      bassGain.gain.linearRampToValueAtTime(0.18, now + 0.04);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + barDuration * 0.95);

      bassOsc.connect(bassGain);
      bassGain.connect(this.bgmGain);
      bassOsc.start(now);
      bassOsc.stop(now + barDuration);

      // 和弦琶音與輕快旋律（仿馬林巴/暖心鍵盤音色）
      currentChord.notes.forEach((freq, idx) => {
        const noteTime = now + idx * (secondsPerBeat * 0.75);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        // 溫和清澈的敲擊包絡
        gain.gain.setValueAtTime(0.001, noteTime);
        gain.gain.linearRampToValueAtTime(0.12, noteTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(noteTime);
        osc.stop(noteTime + 0.5);
      });

      // 輕快律動打擊節拍（輕柔閉合踏鈸 / 響木微脈衝）
      for (let b = 0; b < 4; b++) {
        const beatTime = now + b * secondsPerBeat;
        const tickOsc = this.ctx.createOscillator();
        const tickGain = this.ctx.createGain();
        tickOsc.type = 'triangle';
        tickOsc.frequency.setValueAtTime(b % 2 === 0 ? 900 : 1200, beatTime);
        tickOsc.frequency.exponentialRampToValueAtTime(200, beatTime + 0.03);

        tickGain.gain.setValueAtTime(0.04, beatTime);
        tickGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.035);

        tickOsc.connect(tickGain);
        tickGain.connect(this.bgmGain);
        tickOsc.start(beatTime);
        tickOsc.stop(beatTime + 0.04);
      }
    };

    playBar();
    this.bgmTimer = setInterval(playBar, barDuration * 1000);
  }

  stopDefaultSynthesizer() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  // ==========================================
  // 2. 常規中獎慶典音樂 (Regular Win Music)
  // 二等、三等、四等獎、加碼獎適用（明快、歡騰、祝賀）
  // ==========================================
  playRegularWinMusic() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 勝利號角與歡慶琶音序列 (約 3.5 秒)
    // 旋律：G4 -> C5 -> E5 -> G5 -> A5 -> G5 -> C6
    const fanfareNotes = [
      { f: 392.00, time: 0, dur: 0.16, vol: 0.25 },     // G4
      { f: 523.25, time: 0.14, dur: 0.16, vol: 0.28 },  // C5
      { f: 659.25, time: 0.28, dur: 0.18, vol: 0.28 },  // E5
      { f: 783.99, time: 0.44, dur: 0.35, vol: 0.32 },  // G5
      { f: 880.00, time: 0.78, dur: 0.2, vol: 0.28 },   // A5
      { f: 783.99, time: 0.98, dur: 0.2, vol: 0.28 },   // G5
      { f: 1046.50, time: 1.18, dur: 0.9, vol: 0.38 }   // C6 (高潮延伸)
    ];

    fanfareNotes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.time);

      gain.gain.setValueAtTime(0.001, now + n.time);
      gain.gain.linearRampToValueAtTime(n.vol, now + n.time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

      osc.connect(gain);
      gain.connect(this.winGain);
      osc.start(now + n.time);
      osc.stop(now + n.time + n.dur);
    });

    // 伴奏大和弦底音 (C大調大三和弦)
    const chords = [
      { f: 261.63, time: 1.18, dur: 1.6, vol: 0.2 }, // C4
      { f: 329.63, time: 1.18, dur: 1.6, vol: 0.2 }, // E4
      { f: 392.00, time: 1.18, dur: 1.6, vol: 0.2 }, // G4
      { f: 523.25, time: 1.18, dur: 1.6, vol: 0.22 } // C5
    ];

    chords.forEach(c => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(c.f, now + c.time);

      gain.gain.setValueAtTime(0.001, now + c.time);
      gain.gain.linearRampToValueAtTime(c.vol, now + c.time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + c.time + c.dur);

      osc.connect(gain);
      gain.connect(this.winGain);
      osc.start(now + c.time);
      osc.stop(now + c.time + c.dur);
    });

    // 歡慶星星閃耀音效 (Sparkle Arpeggios)
    const sparkles = [1318.51, 1567.98, 1760.00, 2093.00, 2637.02];
    sparkles.forEach((freq, idx) => {
      const sparkleTime = now + 1.4 + idx * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, sparkleTime);

      gain.gain.setValueAtTime(0.001, sparkleTime);
      gain.gain.linearRampToValueAtTime(0.12, sparkleTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, sparkleTime + 0.35);

      osc.connect(gain);
      gain.connect(this.winGain);
      osc.start(sparkleTime);
      osc.stop(sparkleTime + 0.4);
    });
  }

  // ==========================================
  // 3. 一等獎終極大獎專屬音樂 (Grand Prize Royal Fanfare)
  // 皇家號角交響大調、震撼鼓鳴、璀璨高音琶音（氣勢磅礴，現場儀式感拉滿，約 5.5 秒）
  // ==========================================
  playGrandPrizeWinMusic() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. 震撼低音大鼓/定音鼓開場 (Timpani & Sub Kick)
    const timpaniOsc = this.ctx.createOscillator();
    const timpaniGain = this.ctx.createGain();
    timpaniOsc.type = 'sine';
    timpaniOsc.frequency.setValueAtTime(110, now);
    timpaniOsc.frequency.exponentialRampToValueAtTime(38, now + 0.35);

    timpaniGain.gain.setValueAtTime(0.55, now);
    timpaniGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    timpaniOsc.connect(timpaniGain);
    timpaniGain.connect(this.winGain);
    timpaniOsc.start(now);
    timpaniOsc.stop(now + 0.75);

    // 2. 皇家號角三重奏 (Majestic Herald Trumpets)
    // 前奏進行：C4 -> G4 -> C5 -> G5 -> 輝煌三和弦爆發 -> 攀升至 C7 頂峰
    const heraldMelody = [
      { f: 261.63, time: 0.1, dur: 0.35, type: 'sawtooth', vol: 0.28 }, // C4
      { f: 392.00, time: 0.4, dur: 0.35, type: 'sawtooth', vol: 0.3 },  // G4
      { f: 523.25, time: 0.7, dur: 0.45, type: 'sawtooth', vol: 0.35 }, // C5
      { f: 659.25, time: 1.1, dur: 0.3, type: 'sawtooth', vol: 0.35 },  // E5
      { f: 783.99, time: 1.35, dur: 0.3, type: 'sawtooth', vol: 0.38 }, // G5
      { f: 1046.50, time: 1.6, dur: 0.6, type: 'sawtooth', vol: 0.42 }, // C6 (長音和弦引導)
      // 第二段高潮攀升
      { f: 1174.66, time: 2.15, dur: 0.25, type: 'triangle', vol: 0.35 }, // D6
      { f: 1318.51, time: 2.38, dur: 0.3, type: 'triangle', vol: 0.38 },  // E6
      { f: 1567.98, time: 2.65, dur: 0.35, type: 'triangle', vol: 0.42 }, // G6
      { f: 2093.00, time: 2.95, dur: 2.2, type: 'triangle', vol: 0.45 }   // C7 (終極閃耀頂點，延伸 2 秒)
    ];

    heraldMelody.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.f, now + n.time);

      gain.gain.setValueAtTime(0.001, now + n.time);
      gain.gain.linearRampToValueAtTime(n.vol, now + n.time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

      osc.connect(gain);
      gain.connect(this.winGain);
      osc.start(now + n.time);
      osc.stop(now + n.time + n.dur);
    });

    // 3. 輝煌交響和弦底座 (壯麗的皇家 C 大調四重奏伴奏，從 1.6 秒持續到 4.8 秒)
    const grandOrchestraChords = [
      { f: 130.81, time: 1.6, dur: 3.2, vol: 0.3 },  // C3 (深沉大提琴)
      { f: 196.00, time: 1.6, dur: 3.2, vol: 0.25 }, // G3
      { f: 261.63, time: 1.6, dur: 3.2, vol: 0.25 }, // C4
      { f: 329.63, time: 1.6, dur: 3.2, vol: 0.22 }, // E4
      { f: 392.00, time: 1.6, dur: 3.2, vol: 0.22 }, // G4
      { f: 523.25, time: 2.95, dur: 2.0, vol: 0.28 }, // C5 頂峰和弦疊加
      { f: 659.25, time: 2.95, dur: 2.0, vol: 0.28 }  // E5
    ];

    grandOrchestraChords.forEach(c => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(c.f, now + c.time);

      gain.gain.setValueAtTime(0.001, now + c.time);
      gain.gain.linearRampToValueAtTime(c.vol, now + c.time + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + c.time + c.dur);

      osc.connect(gain);
      gain.connect(this.winGain);
      osc.start(now + c.time);
      osc.stop(now + c.time + c.dur);
    });

    // 4. 金色香檳煙火琶音瀑布 (Cascading Golden Harps & Fireworks Chimes)
    // 璀璨的高頻晶瑩琶音，營造金幣灑落、煙火綻放的極致奢華感
    const harpNotes = [
      523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00, 2637.02, 3135.96
    ];

    // 兩波瀑布：第一波在 1.7s，第二波在 3.0s
    [1.7, 3.0].forEach(cascadeStartTime => {
      harpNotes.forEach((freq, i) => {
        const t = now + cascadeStartTime + i * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.14, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.winGain);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    });
  }

  // ==========================================
  // 4. 設定視窗中的即時試聽功能
  // ==========================================
  previewTrack(type) {
    this.stopPreview();
    this.initContext();

    this.previewState = type;

    if (type === 'default') {
      this.startDefaultSynthesizer();
      this.isPlayingBgm = true;
    } else if (type === 'regular_win') {
      this.playRegularWinMusic();
      setTimeout(() => {
        if (this.previewState === 'regular_win') {
          this.previewState = 'none';
        }
      }, 3500);
    } else if (type === 'grand_win') {
      this.playGrandPrizeWinMusic();
      setTimeout(() => {
        if (this.previewState === 'grand_win') {
          this.previewState = 'none';
        }
      }, 5500);
    }
  }

  stopPreview() {
    this.previewState = 'none';
    this.stopDefaultSynthesizer();
    if (this.customAudio) {
      this.customAudio.pause();
    }
  }
}

export const bgmManager = new BgmController();
