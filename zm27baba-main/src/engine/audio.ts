import { createRng } from './rng';

// Ses gürültüsü için sabit tohumlu akış (Math.random kullanılmaz).
const noise = createRng('zm27-audio-noise');
class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  public menuMusicEnabled = true;
  public musicVolume = 0.55;
  public sfxVolume = 0.75;

  // Menu music state
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicPlaying = false;

  // Matchday continuous crowd ambience nodes
  private crowdGain: GainNode | null = null;
  private crowdFilter: BiquadFilterNode | null = null;
  private crowdSource: AudioBufferSourceNode | null = null;
  private crowdLfo: OscillatorNode | null = null;

  private ensureCtx(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureCtx();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopMenuMusic();
      this.stopCrowdAmbience();
    }
  }

  public setVolumes(musicVolume: number, sfxVolume: number) {
    this.musicVolume = Math.max(0, Math.min(1, musicVolume));
    this.sfxVolume = Math.max(0, Math.min(1, sfxVolume));
    if (this.crowdGain && this.ctx) {
      this.crowdGain.gain.setTargetAtTime(0.055 * this.sfxVolume, this.ctx.currentTime, 0.1);
    }
  }

  /**
   * Warm, soothing ambient felt-piano & atmospheric pad chord loop for menu/club HQ.
   * Replaces harsh sawtooth arpeggios with soft lowpassed sine/triangle harmonics.
   */
  public startMenuMusic() {
    if (this.muted || !this.menuMusicEnabled || this.musicPlaying || typeof window === 'undefined') return;
    const ctx = this.ensureCtx();
    if (!ctx) return;

    this.musicPlaying = true;
    this.musicStep = 0;

    // Gentle Dmaj9 -> Bm9 -> Gmaj7 -> A6 atmospheric ambient progression
    const chords = [
      [146.83, 220.0, 277.18, 329.63], // Dmaj9
      [123.47, 185.0, 220.0, 277.18],  // Bm9
      [98.0, 146.83, 185.0, 246.94],   // Gmaj7
      [110.0, 164.81, 220.0, 277.18],  // A6
    ];
    // Sparse, delicate felt-piano motif
    const feltNotes = [
      587.33, null, 440.0, null,
      493.88, null, 369.99, null,
      587.33, 493.88, null, 440.0,
      369.99, null, 329.63, null,
    ];

    const playStep = () => {
      if (!this.musicPlaying || this.muted || !this.menuMusicEnabled || this.musicVolume <= 0.01) return;
      const ac = this.ensureCtx();
      if (!ac || ac.state === 'suspended') return;

      const step = this.musicStep % 16;
      const bar = Math.floor(step / 4);
      const now = ac.currentTime;
      const mv = this.musicVolume;

      // Soft ambient pad swell once per bar (every ~4.4s)
      if (step % 4 === 0) {
        chords[bar].forEach((freq, idx) => {
          const osc = ac.createOscillator();
          const filter = ac.createBiquadFilter();
          const gain = ac.createGain();
          osc.type = idx === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, now);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(380, now);
          const targetGain = (idx === 0 ? 0.022 : 0.014) * mv;
          gain.gain.setValueAtTime(0.0005, now);
          gain.gain.linearRampToValueAtTime(targetGain, now + 0.9);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 4.3);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ac.destination);
          osc.start(now);
          osc.stop(now + 4.4);
        });
      }

      // Delicate felt-piano drop
      const motif = feltNotes[step];
      if (motif) {
        const pOsc = ac.createOscillator();
        const pFilter = ac.createBiquadFilter();
        const pGain = ac.createGain();
        pOsc.type = 'sine';
        pOsc.frequency.setValueAtTime(motif, now);
        pFilter.type = 'lowpass';
        pFilter.frequency.setValueAtTime(920, now);
        pGain.gain.setValueAtTime(0.0005, now);
        pGain.gain.linearRampToValueAtTime(0.02 * mv, now + 0.05);
        pGain.gain.exponentialRampToValueAtTime(0.0005, now + 1.6);
        pOsc.connect(pFilter);
        pFilter.connect(pGain);
        pGain.connect(ac.destination);
        pOsc.start(now);
        pOsc.stop(now + 1.7);
      }

      this.musicStep++;
    };

    playStep();
    this.musicTimer = window.setInterval(playStep, 1100);
  }

  public stopMenuMusic() {
    this.musicPlaying = false;
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public startCrowdAmbience() {
    if (this.muted || this.crowdSource || this.sfxVolume <= 0.01) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = noise() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.05) * 0.65;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 460;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.055 * this.sfxVolume, ctx.currentTime + 0.8);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.28;
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    lfo.start();

    this.crowdSource = src;
    this.crowdFilter = filter;
    this.crowdGain = gain;
    this.crowdLfo = lfo;
  }

  public boostCrowdAmbience(intensity: 'SHOT' | 'GOAL') {
    const ctx = this.ctx;
    if (!ctx || !this.crowdGain || !this.crowdFilter || this.muted) return;
    const now = ctx.currentTime;
    const sv = this.sfxVolume;
    const peakGain = (intensity === 'GOAL' ? 0.16 : 0.1) * sv;
    const peakFreq = intensity === 'GOAL' ? 880 : 650;
    const hold = intensity === 'GOAL' ? 1.4 : 0.55;

    this.crowdGain.gain.cancelScheduledValues(now);
    this.crowdGain.gain.setValueAtTime(this.crowdGain.gain.value, now);
    this.crowdGain.gain.linearRampToValueAtTime(Math.max(0.001, peakGain), now + 0.12);
    this.crowdGain.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.055 * sv), now + hold);

    this.crowdFilter.frequency.cancelScheduledValues(now);
    this.crowdFilter.frequency.setValueAtTime(this.crowdFilter.frequency.value, now);
    this.crowdFilter.frequency.linearRampToValueAtTime(peakFreq, now + 0.15);
    this.crowdFilter.frequency.linearRampToValueAtTime(460, now + hold);
  }

  public stopCrowdAmbience() {
    try {
      this.crowdSource?.stop();
      this.crowdLfo?.stop();
    } catch {
      // Ignore if already stopped
    }
    this.crowdSource?.disconnect();
    this.crowdFilter?.disconnect();
    this.crowdGain?.disconnect();
    this.crowdLfo?.disconnect();
    this.crowdSource = null;
    this.crowdFilter = null;
    this.crowdGain = null;
    this.crowdLfo = null;
  }

  public playClick() {
    if (this.sfxVolume <= 0.01) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(340, ctx.currentTime + 0.045);
    gain.gain.setValueAtTime(0.055 * this.sfxVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.055);
  }

  public playKick(power = 1) {
    if (this.sfxVolume <= 0.01) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const baseFreq = 135 + noise() * 25;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(42, ctx.currentTime + 0.11);
    gain.gain.setValueAtTime(Math.min(0.16, 0.09 * power) * this.sfxVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  }

  public playPostHit() {
    if (this.sfxVolume <= 0.01) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const partials = [395, 742, 1210];
    partials.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.94, now + 0.35);
      gain.gain.setValueAtTime((idx === 0 ? 0.16 : 0.08) * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (idx === 0 ? 0.38 : 0.26));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    });
  }

  public playNetRip() {
    if (this.sfxVolume <= 0.01) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dur = 0.28;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (noise() * 2 - 1) * Math.exp(-i / (len * 0.38));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1400, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.16 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  public playWhistle(long = false) {
    if (this.sfxVolume <= 0.01) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const dur = long ? 0.45 : 0.18;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2850, ctx.currentTime);
    lfo.frequency.setValueAtTime(38, ctx.currentTime);
    lfoGain.gain.setValueAtTime(110, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.09 * this.sfxVolume, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    lfo.start();
    osc.stop(ctx.currentTime + dur + 0.02);
    lfo.stop(ctx.currentTime + dur + 0.02);
  }

  public playSubWhistle() {
    if (this.sfxVolume <= 0.01) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    [587.33, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + idx * 0.09;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.075 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  public playGoalRoar() {
    if (this.sfxVolume <= 0.01) return;
    this.playNetRip();
    this.boostCrowdAmbience('GOAL');
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const dur = 0.95;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (noise() * 2 - 1) * 0.65;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(920, ctx.currentTime + 0.35);
    filter.Q.value = 1.3;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2 * this.sfxVolume, ctx.currentTime + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  public playReject() {
    if (this.sfxVolume <= 0.01) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(125, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.06 * this.sfxVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  public playSuccess() {
    if (this.sfxVolume <= 0.01) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = ctx.currentTime + idx * 0.065;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.065 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }
}

export const soundEngine = new SoundEngine();
