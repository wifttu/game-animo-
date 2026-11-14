// 공용 유틸리티 + 전역 게임 상태
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function angLerp(a, b, t) {
  const TAU = Math.PI * 2;
  const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
}

// 2D 펄린 노이즈
export function makeNoise(seed) {
  const r = rng(seed), p = new Uint8Array(512);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const X = Math.floor(x), Y = Math.floor(y);
    x -= X; y -= Y;
    const xi = X & 255, yi = Y & 255, u = fade(x), v = fade(y);
    const a = p[xi] + yi, b = p[xi + 1] + yi;
    return lerp(lerp(grad(p[a], x, y), grad(p[b], x - 1, y), u),
      lerp(grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1), u), v) * 1.5;
  };
}

// 이벤트 버스
const L = {};
export const on = (e, f) => (L[e] ??= []).push(f);
export const emit = (e, d) => (L[e] || []).forEach(f => f(d));

// 전역 상태 (모듈 간 공유)
export const G = {
  scene: null, camera: null, renderer: null,
  started: false, paused: true, dead: false,
  clock: 0,          // 누적 플레이 시간(초)
  tod: 0.32,         // 하루 중 시각 0..1 (0=자정, 0.5=정오)
  day: 1,
  night: 0,          // 0(낮)..1(밤)
  player: null,
  stats: { hp: 100, maxHp: 100, hunger: 100, thirst: 100, stamina: 100, maxStamina: 100, temp: 60, level: 1, xp: 0 },
  spawn: { x: 0, z: 4 },
  armor: null,
  structs: [], animals: [], pet: null,
  build: null,       // 건축 모드 상태
  target: null,
  settings: { sound: true, music: true, quality: 'high', joyFixed: false, btnScale: 1, layout: { land: {}, port: {} } },
  editing: false,
};
export const DAY_LEN = 540; // 하루 길이(초)
