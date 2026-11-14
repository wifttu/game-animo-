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

// ───── 배경음악 (생성형 앰비언트) + 환경음 ─────
// 낮: 밝은 장조 패드와 맑은 선율 / 밤: 느리고 낮은 단조. 외부 음원 없이 실시간 합성한다.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const PROG = {
  day: [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 62]],   // Cmaj7 · Am7 · Fmaj7 · G
  night: [[45, 52, 60, 64], [41, 48, 57, 60], [38, 50, 57, 65], [40, 47, 55, 59]], // Am · F · Dm · Em
};
const SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];
let M = null;

function buildMusic() {
  const c = ac(), out = c.createGain(), wet = c.createGain(), dl = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter();
  out.gain.value = 0; out.connect(c.destination);
  dl.delayTime.value = .46; fb.gain.value = .42; lp.type = 'lowpass'; lp.frequency.value = 2400; wet.gain.value = .5;
  wet.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(out);
  M = { out, wet, next: c.currentTime + .3, step: 0, mel: 4, timer: 0, amb: 0 };
}
function voice(freq, t, dur, vol, type, attack, dest, detune = 0) {
  const c = ctx, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq; o.detune.value = detune;
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05);
}
function scheduleStep(t) {
  const night = G.night > .5, prog = night ? PROG.night : PROG.day, stepLen = night ? .62 : .5;
  const chord = prog[Math.floor(M.step / 16) % 4], s = M.step % 16;
  if (s === 0) { // 패드 + 베이스
    const len = stepLen * 16 + 3;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = night ? 700 : 1100; f.connect(M.out);
    for (const n of chord) { voice(NOTE(n), t, len, .05, 'triangle', 2.5, f, -6); voice(NOTE(n), t, len, .04, 'sine', 3, f, 7); }
    voice(NOTE(chord[0] - 12), t, len * .8, .09, 'sine', 1.2, M.out);
  }
  // 선율: 화음 구성음 쪽으로 끌리는 랜덤 워크
  if (Math.random() < (night ? .26 : s % 2 === 0 ? .5 : .22)) {
    M.mel = Math.max(0, Math.min(SCALE.length - 1, M.mel + Math.floor(Math.random() * 5) - 2));
    let n = SCALE[M.mel] - (night ? 12 : 0);
    if (Math.random() < .5) { const ct = chord[1 + Math.floor(Math.random() * 3)] + 12; if (Math.abs(ct - n) < 5) n = ct; }
    const g = ctx.createGain(); g.gain.value = 1; g.connect(M.out); g.connect(M.wet);
    voice(NOTE(n), t, 1.6, .07, 'sine', .012, g); voice(NOTE(n) * 2, t, .5, .018, 'triangle', .008, g);
  }
  if (s % 8 === 4 && Math.random() < .5) voice(NOTE(chord[2] + 12), t, 2.2, .03, 'sine', .3, M.wet);
  M.step++; M.next = t + stepLen;
}
function ambience(t) {
  const c = ctx;
  if (G.night > .6) { // 귀뚜라미
    const f = 3900 + Math.random() * 600;
    for (let i = 0; i < 3; i++) voice(f, t + i * .07, .05, .012, 'sine', .01, c.destination);
    M.amb = t + .5 + Math.random() * 1.6;
  } else if (G.night < .2) { // 새소리
    const base = 2200 + Math.random() * 1800, k = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < k; i++) {
      const o = c.createOscillator(), g = c.createGain(), tt = t + i * .13;
      o.frequency.setValueAtTime(base * (1 + Math.random() * .2), tt); o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * .4), tt + .09);
      g.gain.setValueAtTime(.0001, tt); g.gain.linearRampToValueAtTime(.022, tt + .02); g.gain.exponentialRampToValueAtTime(.0001, tt + .11);
      o.connect(g); g.connect(c.destination); o.start(tt); o.stop(tt + .13);
    }
    M.amb = t + 2.5 + Math.random() * 7;
  } else M.amb = t + 2;
}
function tick() {
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (M.next < now - 1) M.next = now + .1;
  if (G.settings.music) while (M.next < now + .5) scheduleStep(M.next); else M.next = now + .2;
  if (G.settings.sound && G.started && now > M.amb) ambience(now + .05);
}
// 사용자 입력(시작 버튼) 이후에 호출해야 브라우저가 재생을 허용한다
export function startMusic() {
  try {
    if (!M) { buildMusic(); M.timer = setInterval(tick, 150); document.addEventListener('visibilitychange', () => { if (document.hidden) ctx.suspend(); else ctx.resume(); }); }
    setMusic(G.settings.music);
  } catch { /* 오디오 미지원 환경 */ }
}
export function setMusic(on) {
  if (!M) { if (on) startMusic(); return; }
  const t = ctx.currentTime; M.out.gain.cancelScheduledValues(t); M.out.gain.setTargetAtTime(on ? .55 : 0, t, on ? 1.2 : .3);
}
