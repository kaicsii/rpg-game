import type { CombatEffect } from './data';
import type { StorySound } from './story-direction';

const scores = {
  journey: { melody: [0, 7, 12, 14, 7, 4, 2, -1, 0, 4, 7, 12, 9, 7, 4, -1, 2, 7, 14, 12, 7, 4, 2, -1, 0, 4, 7, 4, 2, 0, -1, -1], roots: [110, 82.407, 130.813, 97.999], beat: 430 },
  forest: { melody: [12, -1, 19, 16, 14, -1, 9, 7, 9, 14, -1, 16, 19, -1, 14, -1, 12, 16, 21, -1, 19, 16, 14, -1, 9, 12, 14, 7, 4, -1, 0, -1], roots: [110, 146.832, 130.813, 97.999], beat: 480 },
  guardian: { melody: [0, 0, 3, -1, 7, 5, 3, 0, -2, -2, 0, 3, 5, -1, 3, 0, 0, 7, 12, 10, 7, 5, 3, -1, -2, 5, 10, 8, 7, 3, 2, -1], roots: [55, 49, 55, 65.406], beat: 260 },
};
type Score = keyof typeof scores;

// Original music and effects synthesized locally.
export class AudioDirector {
  private context?: AudioContext; private gain?: GainNode; private timer?: ReturnType<typeof setInterval>; private step = 0;
  private music?: GainNode;
  private score: Score = 'journey'; private battle = false;
  volume = 0.35;
  start() {
    if (!this.context) {
      this.context = new AudioContext(); this.gain = this.context.createGain(); this.gain.gain.value = this.volume * 0.22; this.gain.connect(this.context.destination);
      this.music = this.context.createGain(); this.music.connect(this.gain);
      this.timer = setInterval(() => this.tick(), scores[this.score].beat); document.addEventListener('visibilitychange', () => { if (document.hidden) void this.context?.suspend(); else void this.context?.resume(); });
    }
    void this.context.resume();
  }
  setScore(score: Score, battle: boolean) {
    this.battle = battle;
    if (this.score === score) return;
    this.score = score; this.step = 0;
    if (!this.context) return;
    clearInterval(this.timer);
    this.tick(); this.timer = setInterval(() => this.tick(), scores[score].beat);
  }
  setVolume(v: number) { this.volume = v; if (this.context && this.gain) this.gain.gain.setTargetAtTime(v * 0.22, this.context.currentTime, 0.1); }
  private note(freq: number, duration: number, type: OscillatorType = 'sine', strength = 0.3, output = this.gain, delay = 0) {
    if (!this.context || !output || this.context.state !== 'running') return;
    const t = this.context.currentTime + delay; const osc = this.context.createOscillator(); const g = this.context.createGain(); osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(strength, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + duration); osc.connect(g); g.connect(output); osc.onended = () => { osc.disconnect(); g.disconnect(); }; osc.start(t); osc.stop(t + duration + 0.02);
  }
  private tick() {
    const { melody, roots } = scores[this.score];
    const guardian = this.score === 'guardian';
    const n = melody[this.step % melody.length];
    if (n !== -1) this.note((guardian ? 110 : 220) * 2 ** (n / 12), this.battle || guardian ? 0.38 : 1.8, guardian ? 'triangle' : 'sine', 0.22, this.music);
    if (this.step % 8 === 0) { const root = roots[Math.floor(this.step / 8) % roots.length]; this.note(root, guardian ? 1.6 : 3.2, 'triangle', 0.14, this.music); this.note(root * 1.5, 2.5, 'sine', 0.08, this.music); }
    if ((this.battle || guardian) && this.step % 2 === 0) this.note(65, 0.15, 'triangle', 0.3, this.music);
    this.step++;
  }
  stageStory(active: boolean, cue?: StorySound) {
    if (this.music && this.context) {
      const now = this.context.currentTime;
      this.music.gain.cancelScheduledValues(now);
      this.music.gain.setTargetAtTime(cue === 'hush' || cue === 'fracture' ? 0.08 : active ? 0.42 : 1, now, 0.16);
    }
    if (cue === 'distant') {
      this.note(110, 2.1, 'triangle', 0.36); this.note(329.6, 1.8, 'sine', 0.18);
    } else if (cue === 'recall') {
      this.note(293.66, 1.5, 'sine', 0.22); this.note(587.33, 1.8, 'sine', 0.2, this.gain, 0.17);
    } else if (cue === 'reply') {
      this.note(392, 0.7, 'sine', 0.25); this.note(587.33, 1.15, 'sine', 0.22, this.gain, 0.19);
    } else if (cue === 'fracture') {
      this.note(53, 0.9, 'triangle', 0.55); this.note(117, 0.65, 'sawtooth', 0.1); this.note(123, 0.7, 'triangle', 0.2);
    } else if (cue === 'sunrise') {
      this.effect('bell');
      [392, 523.25, 659.25, 783.99].forEach((freq, i) => this.note(freq, 1.7, 'sine', 0.22, this.gain, 0.16 + i * 0.12));
    }
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
  effect(kind: 'confirm' | 'heal' | 'win' | 'light' | 'bell') {
    if (kind === 'bell') { this.note(196, 2.6, 'triangle', 0.42); this.note(588, 1.8, 'sine', 0.18); this.note(831, 1.2, 'sine', 0.12); }
    else if (kind === 'heal' || kind === 'light') { [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => this.note(f, 0.8, 'sine', 0.3), i * 90)); }
    else if (kind === 'win') [392, 523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => this.note(f, 1.2, 'triangle', 0.22), i * 140));
    else this.note(659.25, 0.15, 'sine', 0.15);
  }
}
