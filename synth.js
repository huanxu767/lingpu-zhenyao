export class GameAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.bgmTimer = 0;
    this.bgmOn = false;
    this.bgmStep = 0;
  }

  resume() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.22;
  }

  tone(freq, duration, type = 'sine', when = 0, gain = 1, slide = 0) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + duration);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(0.9 * gain, t + 0.018);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  noise(duration, when = 0, gain = 0.3) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime + when;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const amp = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  plant() {
    this.tone(262, 0.08, 'triangle', 0, 0.4);
    this.tone(392, 0.1, 'sine', 0.04, 0.3);
  }

  shoot() {
    this.tone(500, 0.07, 'square', 0, 0.16, -200);
  }

  hit() {
    this.tone(176, 0.08, 'square', 0, 0.2);
  }

  sun() {
    this.tone(660, 0.1, 'sine', 0, 0.5);
    this.tone(880, 0.12, 'sine', 0.06, 0.4);
    this.tone(1320, 0.16, 'triangle', 0.12, 0.3);
  }

  boom() {
    this.noise(0.35, 0, 0.45);
    this.tone(140, 0.32, 'sawtooth', 0, 0.4, -80);
  }

  mower() {
    this.noise(0.55, 0, 0.32);
    this.tone(96, 0.5, 'sawtooth', 0, 0.28);
  }

  deny() {
    this.tone(180, 0.1, 'square', 0, 0.22);
    this.tone(140, 0.12, 'square', 0.08, 0.18);
  }

  shovel() {
    this.tone(300, 0.08, 'triangle', 0, 0.22);
    this.noise(0.12, 0, 0.12);
  }

  groan() {
    this.tone(108, 0.3, 'sawtooth', 0, 0.16, -28);
  }

  wave() {
    this.tone(392, 0.18, 'triangle', 0, 0.38);
    this.tone(494, 0.22, 'triangle', 0.14, 0.38);
    this.tone(330, 0.3, 'triangle', 0.3, 0.32);
  }

  win() {
    [392, 494, 587, 784].forEach((freq, i) => this.tone(freq, 0.28, 'triangle', i * 0.12, 0.48));
  }

  lose() {
    this.tone(349, 0.22, 'triangle', 0, 0.32);
    this.tone(277, 0.28, 'triangle', 0.16, 0.28);
    this.tone(196, 0.42, 'sine', 0.32, 0.32);
  }

  startBgm() {
    this.bgmOn = true;
    this.bgmStep = 0;
    this.bgmTimer = 0;
  }

  stopBgm() {
    this.bgmOn = false;
  }

  tickBgm(dt) {
    if (!this.bgmOn || this.muted || !this.ctx) return;
    this.bgmTimer -= dt;
    if (this.bgmTimer > 0) return;
    const melody = [392, 440, 494, 392, 587, 494, 440, 330, 392, 494, 440, 392];
    const bass = [196, 196, 247, 165, 196, 247, 220, 165, 196, 247, 220, 196];
    const i = this.bgmStep % melody.length;
    this.tone(melody[i], 0.28, 'sine', 0, 0.11);
    this.tone(bass[i], 0.34, 'triangle', 0, 0.07);
    this.bgmTimer = i % 4 === 3 ? 0.72 : 0.48;
    this.bgmStep += 1;
  }
}
