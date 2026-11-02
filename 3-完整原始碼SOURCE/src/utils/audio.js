// Web Audio API 程序化音效合成器（零外部資源依賴，保證100%可發聲）
class SoundController {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.rollInterval = null;
    this.chuteInterval = null;
    this.heartbeatOsc = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute(muted) {
    if (muted !== undefined) {
      this.isMuted = muted;
    } else {
      this.isMuted = !this.isMuted;
    }
    if (this.isMuted) {
      this.stopRollSound();
      this.stopChuteSound();
    }
    return this.isMuted;
  }

  // 滾球碰撞翻滾聲（高頻噪聲濾波與密集的撞擊微脈衝）
  startRollSound(isFirstPrize = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    this.stopRollSound();

    // 模擬壓克力/陶瓷彩球碰撞玻璃壁的清脆撞擊聲
    const playTumbleClick = () => {
      if (this.isMuted || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = isFirstPrize ? (600 + Math.random() * 1000) : (450 + Math.random() * 800);
      osc.type = isFirstPrize ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.35, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(isFirstPrize ? 0.12 : 0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    };

    // 一等獎專屬：深沉緊張的心跳震動低音 (Heartbeat)
    let heartbeatTick = 0;
    const playHeartbeat = () => {
      if (this.isMuted || !this.ctx || !isFirstPrize) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    };

    this.rollInterval = setInterval(() => {
      playTumbleClick();
      if (Math.random() > 0.35) {
        setTimeout(playTumbleClick, 15 + Math.random() * 25);
      }
      heartbeatTick++;
      if (isFirstPrize && heartbeatTick % 6 === 0) {
        playHeartbeat();
      }
    }, 45);
  }

  stopRollSound() {
    if (this.rollInterval) {
      clearInterval(this.rollInterval);
      this.rollInterval = null;
    }
  }

  // 彩球順著滑道長滾動與最終入座聲音（持續約 3.0 秒）
  playChuteRollSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    this.stopChuteSound();

    let rollStep = 0;
    const totalSteps = 24;
    const intervalMs = 120;

    // 滑道滾行中的微弱連續喀噠滑軌聲
    this.chuteInterval = setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      rollStep++;
      if (rollStep >= totalSteps) {
        this.stopChuteSound();
        // 最終落入托球杯的清脆雙擊入位聲
        this.playCupLandingSound();
        return;
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      // 隨著滑道滾動減速，頻率逐漸平緩
      const freq = 750 - rollStep * 15 + (Math.random() - 0.5) * 60;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.06 + Math.random() * 0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    }, intervalMs);
  }

  stopChuteSound() {
    if (this.chuteInterval) {
      clearInterval(this.chuteInterval);
      this.chuteInterval = null;
    }
  }

  // 球掉入金屬/透明底座杯的清脆入定位撞擊聲
  playCupLandingSound() {
    if (this.isMuted || !this.ctx) return;

    // 第一次撞擊
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.12);
    gain1.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start();
    osc1.stop(this.ctx.currentTime + 0.15);

    // 第二次微彈回彈音 (80ms 後)
    setTimeout(() => {
      if (!this.ctx) return;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.08);
      gain2.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start();
      osc2.stop(this.ctx.currentTime + 0.1);
    }, 80);
  }

  // 恭喜中獎慶典音樂（一等獎具備輝煌皇家和弦與琶音）
  playWinFanfare(isFirstPrize = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const normalNotes = [
      { f: 523.25, time: 0, dur: 0.15 },    // C5
      { f: 659.25, time: 0.1, dur: 0.15 },   // E5
      { f: 783.99, time: 0.2, dur: 0.15 },   // G5
      { f: 1046.50, time: 0.3, dur: 0.4 },  // C6
      { f: 1318.51, time: 0.45, dur: 0.7 }, // E6
      { f: 1567.98, time: 0.55, dur: 1.0 }  // G6
    ];

    // 一等獎：更恢弘的多重奏皇家大調和弦與長音延伸
    const grandNotes = [
      { f: 261.63, time: 0, dur: 1.5 },     // C4 base
      { f: 392.00, time: 0, dur: 1.5 },     // G4 base
      { f: 523.25, time: 0.08, dur: 0.2 },  // C5
      { f: 659.25, time: 0.18, dur: 0.2 },  // E5
      { f: 783.99, time: 0.28, dur: 0.2 },  // G5
      { f: 1046.50, time: 0.38, dur: 0.4 }, // C6
      { f: 1318.51, time: 0.52, dur: 0.5 }, // E6
      { f: 1567.98, time: 0.68, dur: 1.4 }, // G6
      { f: 2093.00, time: 0.85, dur: 1.8 }  // C7 終極閃耀高音
    ];

    const notes = isFirstPrize ? grandNotes : normalNotes;

    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isFirstPrize ? (n.time === 0 ? 'sawtooth' : 'triangle') : 'triangle';
      osc.frequency.setValueAtTime(n.f, this.ctx.currentTime + n.time);

      const targetGain = isFirstPrize ? (n.time === 0 ? 0.12 : 0.22) : 0.2;
      gain.gain.setValueAtTime(0.001, this.ctx.currentTime + n.time);
      gain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + n.time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + n.time + n.dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + n.time);
      osc.stop(this.ctx.currentTime + n.time + n.dur);
    });
  }

  // 按鈕點擊機械音
  playClickSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  // 彩球落入右側玻璃集球罐的清脆水晶撞擊音
  playJarClinkSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 高頻水晶敲擊音 (1400Hz -> 850Hz)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1450, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    // 輕微回彈玻璃共鳴音 (60ms 後)
    setTimeout(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1820, t);
      osc2.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
      gain2.gain.setValueAtTime(0.12, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t);
      osc2.stop(t + 0.1);
    }, 65);
  }

  // 輕敲大玻璃球壁的清脆撞擊音（拍打玻璃彈球時觸發）
  playGlassTapSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.08);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}

export const soundManager = new SoundController();
