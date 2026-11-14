// WebAudio 합성 효과음 (외부 에셋 없음)
import { G } from './util.js';
let ctx, noiseBuf;
function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(f, f2, dur, type = 'sine', vol = .15, delay = 0) {
  const c = ac(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur);
}
function noise(dur, freq, vol = .2, q = 1) {
  const c = ac(), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
  s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(f).connect(g).connect(c.destination); s.start(t); s.stop(t + dur);
}
const S = {
  chop: () => { noise(.12, 900, .35, 2); tone(160, 70, .12, 'triangle', .25); },
  mine: () => { noise(.08, 3200, .3, 4); tone(900, 500, .07, 'square', .06); },
  pick: () => { tone(520, 880, .09, 'sine', .14); },
  hit: () => { noise(.1, 500, .4, 1); tone(120, 50, .15, 'sawtooth', .12); },
  hurt: () => { tone(300, 110, .25, 'sawtooth', .16); },
  eat: () => { noise(.07, 1400, .2, 3); setTimeout(() => noise(.07, 1100, .2, 3), 110); },
  drink: () => { tone(300, 600, .12, 'sine', .12); tone(350, 700, .12, 'sine', .12, .14); },
  craft: () => { tone(660, 660, .1, 'triangle', .14); tone(880, 880, .12, 'triangle', .14, .09); tone(1320, 1320, .2, 'triangle', .12, .18); },
  place: () => { tone(200, 90, .15, 'triangle', .3); noise(.1, 600, .2, 1); },
  quest: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .22, 'triangle', .13, i * .1)),
  level: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, f, .3, 'sine', .14, i * .09)),
  tame: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, f * 1.02, .25, 'sine', .12, i * .12)),
  ui: () => tone(700, 900, .05, 'sine', .07),
  err: () => tone(180, 140, .15, 'square', .06),
  swing: () => noise(.12, 1800, .08, .7),
  step: () => noise(.05, 300 + Math.random() * 200, .05, 1),
  splash: () => noise(.25, 800, .15, .5),
};
export function sfx(name) { if (!G.settings.sound) return; try { S[name]?.(); } catch { /* 오디오 미지원 환경 */ } }
