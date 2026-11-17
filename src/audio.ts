import type { CombatEffect } from './data';

// Original pentatonic miniature, synthesized locally; no audio downloads or samples.
export class AudioDirector {
  private context?: AudioContext; private gain?: GainNode; private timer?: ReturnType<typeof setInterval>; private step = 0;
  volume = 0.35; battle = false;
  start() {
    if (!this.context) {
      this.context = new AudioContext(); this.gain = this.context.createGain(); this.gain.gain.value = this.volume * 0.22; this.gain.connect(this.context.destination);
      this.timer = setInterval(() => this.tick(), 430); document.addEventListener('visibilitychange', () => { if (document.hidden) void this.context?.suspend(); else void this.context?.resume(); });
    }
    void this.context.resume();
  }
  setVolume(v: number) { this.volume = v; if (this.context && this.gain) this.gain.gain.setTargetAtTime(v * 0.22, this.context.currentTime, 0.1); }
  private note(freq: number, duration: number, type: OscillatorType = 'sine', strength = 0.3) {
    if (!this.context || !this.gain || this.context.state !== 'running') return;
    const t = this.context.currentTime; const osc = this.context.createOscillator(); const g = this.context.createGain(); osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(strength, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + duration); osc.connect(g); g.connect(this.gain); osc.onended = () => { osc.disconnect(); g.disconnect(); }; osc.start(t); osc.stop(t + duration + 0.02);
  }
  private tick() {
    const melody = [0, 7, 12, 14, 7, 4, 2, -1, 0, 4, 7, 12, 9, 7, 4, -1, 2, 7, 14, 12, 7, 4, 2, -1, 0, 4, 7, 4, 2, 0, -1, -1];
    const n = melody[this.step % melody.length]; if (n !== -1) this.note(220 * 2 ** (n / 12), this.battle ? 0.45 : 1.8, 'sine', 0.22);
    if (this.step % 8 === 0) { const root = [110, 82.407, 130.813, 97.999][Math.floor(this.step / 8) % 4]; this.note(root, 3.2, 'triangle', 0.14); this.note(root * 1.5, 3, 'sine', 0.08); }
    if (this.battle && this.step % 2 === 0) this.note(65, 0.15, 'triangle', 0.3); this.step++;
  }
  combat(kind: CombatEffect | 'break', phase: 'cast' | 'impact' = 'impact') {
    if (!this.context || !this.gain || this.context.state !== 'running') return;
    const t = this.context.currentTime;
    const duration = phase === 'cast' ? 0.2 : kind === 'resonance' ? 0.6 : 0.3;
    const frequencies: Record<CombatEffect | 'break', [number, number]> = {
      slash: [phase === 'cast' ? 850 : 190, 55], fire: [180, 45], star: [880, 1760],
      resonance: [220, 880], heal: [523, 1046], break: [1400, 180],
    };
    const [from, to] = frequencies[kind]; const osc = this.context.createOscillator();
    const gain = this.context.createGain(); osc.type = kind === 'slash' || kind === 'fire' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(from, t); osc.frequency.exponentialRampToValueAtTime(to, t + duration);
    gain.gain.setValueAtTime(0.001, t); gain.gain.exponentialRampToValueAtTime(phase === 'cast' ? 0.2 : 0.48, t + 0.012); gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain); gain.connect(this.gain); osc.onended = () => { osc.disconnect(); gain.disconnect(); }; osc.start(t); osc.stop(t + duration + 0.02);
    if (phase === 'impact' && ['star', 'heal', 'resonance'].includes(kind)) this.note(to * 1.5, 0.45, 'sine', 0.18);
  }
  effect(kind: 'confirm' | 'heal' | 'win' | 'light') {
    if (kind === 'heal' || kind === 'light') { [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => this.note(f, 0.8, 'sine', 0.3), i * 90)); }
    else if (kind === 'win') [392, 523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => this.note(f, 1.2, 'triangle', 0.22), i * 140));
    else this.note(659.25, 0.15, 'sine', 0.15);
  }
}
