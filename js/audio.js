/**
 * Web Audio API 기반 효과음 (외부 파일 없음)
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = 0.45;
    this._loadMute();
  }

  _loadMute() {
    try {
      const saved = localStorage.getItem('et_mute');
      if (saved === '1') this.enabled = false;
    } catch {
      /* ignore */
    }
  }

  _saveMute() {
    try {
      localStorage.setItem('et_mute', this.enabled ? '0' : '1');
    } catch {
      /* ignore */
    }
  }

  async unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore */
      }
    }
  }

  setEnabled(on) {
    this.enabled = on;
    this._saveMute();
    if (on) this.unlock();
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  _tone(freq, duration, type = 'square', gain = 0.12, slideTo = null) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
    }
    const vol = gain * this.master;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  _noise(duration, gain = 0.08, filterFreq = 1200) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    const vol = gain * this.master;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.ctx.destination);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  _chord(freqs, duration, type = 'triangle', gain = 0.07) {
    for (const f of freqs) this._tone(f, duration, type, gain);
  }

  uiClick() {
    this._tone(660, 0.06, 'square', 0.06);
  }

  select() {
    this._tone(520, 0.07, 'triangle', 0.08);
    setTimeout(() => this._tone(780, 0.08, 'triangle', 0.07), 40);
  }

  cancel() {
    this._tone(300, 0.09, 'square', 0.05, 160);
  }

  move() {
    this._noise(0.05, 0.05, 900);
    this._tone(240, 0.08, 'triangle', 0.05, 180);
  }

  attack(isMagic = false) {
    if (isMagic) {
      this._tone(440, 0.12, 'sine', 0.07, 880);
      this._tone(660, 0.14, 'sine', 0.05, 990);
      this._noise(0.1, 0.04, 2000);
    } else {
      this._noise(0.07, 0.1, 700);
      this._tone(180, 0.09, 'sawtooth', 0.07, 90);
    }
  }

  hit() {
    this._noise(0.08, 0.1, 500);
    this._tone(140, 0.1, 'square', 0.08, 70);
  }

  miss() {
    this._tone(420, 0.05, 'sine', 0.05);
    setTimeout(() => this._tone(280, 0.1, 'sine', 0.04, 180), 50);
  }

  defeat() {
    this._tone(500, 0.08, 'triangle', 0.07, 700);
    setTimeout(() => this._tone(700, 0.1, 'triangle', 0.06, 900), 60);
    setTimeout(() => this._noise(0.12, 0.06, 800), 90);
  }

  phasePlayer() {
    this._chord([392, 494, 587], 0.22, 'triangle', 0.06);
  }

  phaseEnemy() {
    this._chord([220, 277, 330], 0.25, 'sawtooth', 0.045);
  }

  win() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => setTimeout(() => this._tone(n, 0.18, 'triangle', 0.08), i * 90));
  }

  clearAll() {
    const notes = [523, 659, 784, 988, 1175, 1318];
    notes.forEach((n, i) => setTimeout(() => this._tone(n, 0.2, 'triangle', 0.075), i * 100));
  }

  lose() {
    this._tone(392, 0.2, 'sawtooth', 0.07, 260);
    setTimeout(() => this._tone(311, 0.28, 'sawtooth', 0.06, 180), 160);
    setTimeout(() => this._tone(220, 0.4, 'triangle', 0.05), 320);
  }

  startBattle() {
    this._chord([330, 415, 494], 0.2, 'triangle', 0.07);
    setTimeout(() => this._tone(660, 0.15, 'triangle', 0.06), 120);
  }

  endTurn() {
    this._tone(360, 0.08, 'square', 0.05);
    setTimeout(() => this._tone(280, 0.1, 'square', 0.045), 70);
  }

  wait() {
    this._tone(300, 0.06, 'triangle', 0.04);
  }
}

export const sfx = new SoundManager();
