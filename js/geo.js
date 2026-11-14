// 절차적 로우폴리 모델 생성기
import * as THREE from 'three';

const C = new THREE.Color(), C2 = new THREE.Color();
const V = (a) => Array.isArray(a) ? new THREE.Vector3(...a) : new THREE.Vector3(a, a, a);

// 지오메트리 한 조각: 변환 + 면 단위 색상(살짝 흔들림, 세로 그라데이션)
export function part(g, color, o = {}) {
  if (g.index) g = g.toNonIndexed();
  const m = new THREE.Matrix4().compose(V(o.p || [0, 0, 0]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.r || [0, 0, 0]))), V(o.s ?? 1));
  g.applyMatrix4(m);
  const pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 3);
  C.set(color); if (o.g) C2.set(o.g);
  g.computeBoundingBox();
  const y0 = g.boundingBox.min.y, yr = Math.max(1e-4, g.boundingBox.max.y - y0), j = o.j ?? 0.07;
  for (let i = 0; i < n; i += 3) {
    const k = 1 + (Math.random() * 2 - 1) * j;
    const t = o.g ? ((pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3 - y0) / yr : 0;
    const r = (o.g ? C.r + (C2.r - C.r) * t : C.r) * k, gg = (o.g ? C.g + (C2.g - C.g) * t : C.g) * k, b = (o.g ? C.b + (C2.b - C.b) * t : C.b) * k;
    for (let v = 0; v < 3; v++) { col[(i + v) * 3] = r; col[(i + v) * 3 + 1] = gg; col[(i + v) * 3 + 2] = b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
export function merge(parts) {
  let n = 0; for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const p of parts) { pos.set(p.attributes.position.array, o); col.set(p.attributes.color.array, o); o += p.attributes.position.count * 3; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
export const MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
// 바람에 흔들리는 식생용 재질 (인스턴스 위치로 위상을 달리한다)
export const windU = { value: 0 };
export const FOLIAGE = new THREE.MeshLambertMaterial({ vertexColors: true });
FOLIAGE.onBeforeCompile = (s) => {
  s.uniforms.uTime = windU;
  s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    #ifdef USE_INSTANCING
      float wph=instanceMatrix[3].x*.21+instanceMatrix[3].z*.17, wy=max(position.y-.9,0.), wk=wy*wy*.009+max(position.y-.1,0.)*.012;
      transformed.x+=sin(uTime*1.3+wph+position.y*.6)*wk; transformed.z+=cos(uTime*1.05+wph*1.4+position.y*.5)*wk*.8;
    #endif`);
};
export const hdr = (c, k = 2.6) => new THREE.Color(c).multiplyScalar(k);
export const mesh = (parts, shadow = true) => {
  const m = new THREE.Mesh(merge(parts), MAT); m.castShadow = shadow; m.receiveShadow = true; return m;
};

const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
const cyl = (a, b, h, s = 6) => new THREE.CylinderGeometry(a, b, h, s);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cone = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s);
const dod = (r) => new THREE.DodecahedronGeometry(r, 0);
const oct = (r) => new THREE.OctahedronGeometry(r, 0);

// ───── 자연물 ─────
export const NODE_GEO = {
  oak: () => merge([
    part(cyl(.2, .36, 2.6), '#7a5230', { p: [0, 1.3, 0] }),
    part(cyl(.07, .1, 1), '#7a5230', { p: [.45, 2.1, 0], r: [0, 0, -.9] }),
    part(ico(1.55, 1), '#3f9a45', { p: [0, 3.5, 0], s: [1, .85, 1], g: '#93d862', j: .1 }),
    part(ico(1.05, 1), '#3b9443', { p: [1.0, 2.9, .35], g: '#84cf5c', j: .1 }),
    part(ico(1.1, 1), '#3b9443', { p: [-.85, 3.0, -.5], g: '#8ad45e', j: .1 }),
    part(ico(.8, 0), '#449f48', { p: [.1, 3.0, 1.0], g: '#8ad45e', j: .1 }),
  ]),
  pine: () => merge([
    part(cyl(.16, .3, 2.2), '#6b4a2e', { p: [0, 1.1, 0] }),
    part(cone(1.5, 1.9, 7), '#256b49', { p: [0, 2.3, 0], g: '#3f9462', j: .1 }),
    part(cone(1.15, 1.7, 7), '#297551', { p: [0, 3.4, 0], g: '#4aa56c', j: .1 }),
    part(cone(.75, 1.5, 7), '#2f8058', { p: [0, 4.5, 0], g: '#63bb7c', j: .1 }),
  ]),
  rock: () => merge([
    part(dod(1), '#8e9197', { p: [0, .45, 0], s: [1.2, .85, 1], g: '#b4b7ba', j: .1 }),
    part(dod(.55), '#85888e', { p: [.9, .25, .5], g: '#a9acb0', j: .1 }),
  ]),
  ore: () => merge([
    part(dod(1), '#5f626d', { p: [0, .5, 0], s: [1.1, .95, 1], g: '#7d808a', j: .1 }),
    part(oct(.3), '#d98a4e', { p: [.55, .95, .45], j: .15 }), part(oct(.26), '#e09a5a', { p: [-.6, .7, .55], j: .15 }),
    part(oct(.28), '#cf7d44', { p: [.1, 1.2, -.3], j: .15 }), part(oct(.22), '#e09a5a', { p: [-.2, .5, .95], j: .15 }),
  ]),
  berry: () => merge([[.45, .75, .35], [-.4, .8, .3], [0, 1.05, 0], [.3, .6, -.5], [-.45, .55, -.35], [0, .7, .65], [-.1, .95, -.5]]
    .map(p => part(oct(.12), '#5b4fe0', { p, j: .2 }))),
  cactus: () => merge([
    part(cyl(.26, .3, 1.8, 7), '#3f9a5a', { p: [0, .9, 0], g: '#7ccf7a', j: .08 }), part(ico(.27, 0), '#6cc572', { p: [0, 1.8, 0] }),
    part(cyl(.13, .14, .6, 6), '#3f9a5a', { p: [.45, 1.0, 0], r: [0, 0, -Math.PI / 2] }), part(cyl(.13, .14, .6, 6), '#58b566', { p: [.68, 1.35, 0] }),
    part(cyl(.12, .13, .5, 6), '#3f9a5a', { p: [-.4, .75, 0], r: [0, 0, Math.PI / 2] }), part(cyl(.12, .13, .45, 6), '#58b566', { p: [-.6, 1.0, 0] }),
    part(oct(.1), '#ff7fb0', { p: [0, 2.08, 0], j: .1 }), part(oct(.08), '#ff9ac2', { p: [.68, 1.62, 0], j: .1 }),
  ]),
  stick: () => merge([
    part(cyl(.035, .045, .9, 5), '#8a6238', { p: [0, .05, 0], r: [0, 0, Math.PI / 2] }),
    part(cyl(.025, .03, .35, 5), '#8a6238', { p: [.15, .06, .12], r: [Math.PI / 2, 0, .6] }),
  ]),
  pebble: () => merge([part(dod(.2), '#9a9da2', { p: [0, .1, 0], s: [1.2, .7, 1] }), part(dod(.12), '#8d9095', { p: [.25, .06, .1] })]),
  flint: () => merge([part(oct(.2), '#3d4658', { p: [0, .12, 0], s: [1.3, .7, .8], g: '#6f8fb5', j: .15 })]),
  fiber: () => merge([0, 1, 2, 3, 4, 5].map(i => part(cone(.05, .7 + (i % 3) * .15, 4), '#8cc152', {
    p: [Math.cos(i * 1.05) * .14, .35, Math.sin(i * 1.05) * .14], r: [Math.sin(i * 1.05) * .35, 0, -Math.cos(i * 1.05) * .35], g: '#d4e88a',
  }))),
  mushroom: () => merge([
    part(cyl(.05, .07, .22), '#f1e6cf', { p: [0, .11, 0] }),
    part(new THREE.SphereGeometry(.17, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), '#d9534f', { p: [0, .2, 0], j: .1 }),
    part(cyl(.035, .05, .15), '#f1e6cf', { p: [.2, .07, .08] }),
    part(new THREE.SphereGeometry(.11, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), '#e0634f', { p: [.2, .14, .08], j: .1 }),
  ]),
  herb: () => merge([
    part(cone(.16, .35, 5), '#5fae5b', { p: [0, .17, 0], g: '#9bd68a' }),
    part(oct(.07), '#c9a0ff', { p: [.08, .4, 0] }), part(oct(.06), '#e0c2ff', { p: [-.07, .34, .06] }), part(oct(.06), '#c9a0ff', { p: [0, .36, -.09] }),
  ]),
};
export const DECOR_GEO = {
  bush: () => merge([
    part(ico(.65, 0), '#34853f', { p: [0, .55, 0], g: '#6dbb58', j: .1 }),
    part(ico(.5, 0), '#34853f', { p: [.45, .4, .2], g: '#6dbb58', j: .1 }),
    part(ico(.5, 0), '#34853f', { p: [-.4, .42, -.15], g: '#6dbb58', j: .1 }),
  ]),
  flower: () => merge([
    part(cyl(.015, .02, .3, 4), '#5d9e4a', { p: [0, .15, 0] }),
    part(oct(.085), '#ffffff', { p: [0, .33, 0], s: [1, .6, 1], j: .05 }),
    part(oct(.035), '#ffd24a', { p: [0, .37, 0], j: 0 }),
  ]),
  grass: () => merge([0, 1, 2, 3, 4, 5].map(i => {
    const g = new THREE.BufferGeometry(), a = i * 1.13, w = .045, h = .26 + (i % 3) * .1, c = Math.cos(a), s = Math.sin(a), d = .05 + (i % 2) * .09, ox = c * d, oz = s * d;
    const A = [ox - s * w, 0, oz + c * w], B = [ox + s * w, 0, oz - c * w], T = [ox + c * .1, h, oz + s * .1];
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...A, ...B, ...T]), 3));
    const p = part(g, '#ffffff', { j: 0 }), col = p.attributes.color.array;
    for (let k = 0; k < 6; k++) col[k] *= .62; // 밑동은 어둡게
    return p;
  })),
  cloud: () => merge([[0, 0, 0, 9], [8, 1, 2, 7], [-8, .5, -1, 6.5], [3, 3, -2, 6], [-3, 2.5, 2, 5.5], [14, 0, 0, 4.5], [-14, 0, 1, 4]]
    .map(([x, y, z, r]) => part(ico(r, 1), '#ffffff', { p: [x, y, z], s: [1, .55, 1], j: .02 }))),
};

// ───── 손에 드는 도구 ─────
export function toolModel(kind, tier) {
  const metal = tier === 2 ? '#c9d3dc' : tier === 0 ? '#c08a4e' : '#8d9096', hd = '#8a6238';
  const P = {
    axe: () => [part(cyl(.03, .035, .7), hd, { p: [0, .25, 0] }), part(box(.26, .2, .05), metal, { p: [.12, .52, 0] })],
    pick: () => [part(cyl(.03, .035, .75), hd, { p: [0, .27, 0] }), part(box(.6, .07, .07), metal, { p: [0, .62, 0] }),
      part(cone(.04, .14, 4), metal, { p: [.36, .62, 0], r: [0, 0, -Math.PI / 2] }), part(cone(.04, .14, 4), metal, { p: [-.36, .62, 0], r: [0, 0, Math.PI / 2] })],
    spear: () => [part(cyl(.025, .03, 1.7), hd, { p: [0, .5, 0] }), part(cone(.07, .3, 4), '#56617a', { p: [0, 1.5, 0] })],
    sword: () => [part(cyl(.03, .03, .22), '#5a3a25', { p: [0, .02, 0] }), part(box(.24, .04, .07), '#d9b45a', { p: [0, .14, 0] }), part(box(.09, .8, .025), metal, { p: [0, .56, 0], g: '#ffffff' })],
    rod: () => [part(cyl(.012, .03, 1.9, 5), '#9a6a3a', { p: [0, .75, 0] }), part(cyl(.05, .05, .09, 6), '#d9534f', { p: [0, .12, .05], r: [0, 0, Math.PI / 2] })],
    torch: () => [part(cyl(.03, .04, .6), hd, { p: [0, .2, 0] }), part(cyl(.06, .05, .12), '#3a2d22', { p: [0, .52, 0] })],
  };
  const m = mesh(P[kind]());
  m.rotation.x = Math.PI / 2;
  if (kind === 'torch') {
    const f = new THREE.Mesh(cone(.09, .3, 6), new THREE.MeshBasicMaterial({ color: hdr('#ffb347') })); f.position.y = .72; m.add(f);
    const l = new THREE.PointLight('#ffb060', 14, 16, 1.6); l.position.y = .8; m.add(l); m.userData.flame = f; m.userData.light = l;
  }
  return m;
}

// ───── 설치물 ─────
const wd = '#a9753f', wd2 = '#8a5c30', st = '#8e9197';
export const STRUCT_GEO = {
  campfire: () => [...Array(8)].map((_, i) => part(dod(.2), st, { p: [Math.cos(i * .785) * .62, .1, Math.sin(i * .785) * .62], s: [1, .7, 1], g: '#b0b3b6' }))
    .concat([0, 1, 2].map(i => part(cyl(.07, .08, 1, 5), '#5c3d22', { p: [0, .22, 0], r: [Math.PI / 2 - .35, i * 2.09, 0] }))),
  workbench: () => [part(box(1.7, .14, .9), wd, { p: [0, .9, 0] }), part(box(1.5, .08, .7), wd2, { p: [0, .3, 0] }),
    ...[[-.75, -.35], [.75, -.35], [-.75, .35], [.75, .35]].map(([x, z]) => part(box(.12, .9, .12), wd2, { p: [x, .45, z] })),
    part(box(.3, .12, .2), '#8d9096', { p: [-.4, 1.03, 0] }), part(cyl(.03, .03, .5), '#5c3d22', { p: [.3, 1.0, .1], r: [0, .5, Math.PI / 2] })],
  furnace: () => [part(cyl(.85, 1, 1.3, 8), st, { p: [0, .65, 0], g: '#b0b3b6', j: .1 }), part(cone(.9, .8, 8), '#7d8086', { p: [0, 1.7, 0], j: .1 }),
    part(cyl(.2, .25, .7, 6), '#6e7177', { p: [0, 2.2, 0] }), part(box(.6, .5, .2), '#ff8a3c', { p: [0, .45, .92], j: .02 }), part(box(.8, .12, .3), '#55585e', { p: [0, .76, .92] })],
  tent: () => [part(cyl(.01, 1.9, 1.9, 4, 1), '#efe2c4', { p: [0, .95, 0], r: [0, Math.PI / 4, 0], s: [1, 1, 1.25], g: '#fff6e0', j: .04 }),
    part(cone(.55, 1.2, 3), '#3d3327', { p: [0, .6, 1.42], r: [-.34, Math.PI, 0], s: [1, 1, .1], j: 0 }),
    part(cyl(.035, .035, 2.2, 5), wd2, { p: [0, 1.1, 0] }), part(box(.5, .06, .5), '#d96b4a', { p: [0, 1.95, 0], r: [0, .78, 0] })],
  chest: () => [part(box(1, .5, .65), wd, { p: [0, .25, 0] }), part(box(1.06, .22, .7), wd2, { p: [0, .6, 0] }),
    part(box(.12, .75, .72), '#6e7177', { p: [-.32, .36, 0] }), part(box(.12, .75, .72), '#6e7177', { p: [.32, .36, 0] }), part(box(.14, .16, .08), '#e3c15a', { p: [0, .48, .34] })],
  plot: () => [part(box(2, .22, 2), '#6b4a2e', { p: [0, .08, 0], g: '#7d5837', j: .12 }),
    ...[[0, 1, 2.1, .12], [0, -1, 2.1, .12], [1, 0, .12, 2.1], [-1, 0, .12, 2.1]].map(([x, z, sx, sz]) => part(box(sx, .3, sz), wd, { p: [x, .13, z] }))],
  fence: () => [part(box(.14, 1.2, .14), wd2, { p: [-.9, .6, 0] }), part(box(.14, 1.2, .14), wd2, { p: [.9, .6, 0] }),
    part(box(2, .12, .07), wd, { p: [0, .9, 0] }), part(box(2, .12, .07), wd, { p: [0, .45, 0] })],
  // 집 부품: 한 칸 = 2×2. 원점 높이가 바닥 윗면(= 집의 기준 높이)
  floor: () => [...[-.75, -.25, .25, .75].map((x, i) => part(box(.49, .14, 2), i % 2 ? wd : '#b98248', { p: [x, .07, 0] })),
    part(box(1.96, 1.7, 1.96), '#7b7e84', { p: [0, -.86, 0], g: '#a3a6aa', j: .1 })],
  wall: () => [...[-.75, -.25, .25, .75].map((x, i) => part(box(.48, 2.5, .16), i % 2 ? wd : '#b98248', { p: [x, 1.25, 0] })),
    part(box(2.06, .14, .22), wd2, { p: [0, 2.43, 0] }), part(box(2.06, .14, .22), wd2, { p: [0, .12, 0] })],
  door: () => [part(box(.22, 2.5, .22), wd2, { p: [-.92, 1.25, 0] }), part(box(.22, 2.5, .22), wd2, { p: [.92, 1.25, 0] }), part(box(2.06, .3, .22), wd2, { p: [0, 2.35, 0] })],
  doorPanel: () => [...[.28, .8, 1.32].map((x, i) => part(box(.5, 2.15, .1), i % 2 ? '#c8935a' : '#b98248', { p: [x, 1.12, 0] })),
    part(box(1.58, .12, .13), wd2, { p: [.8, 1.7, 0] }), part(box(1.58, .12, .13), wd2, { p: [.8, .5, 0] }), part(oct(.07), '#e3c15a', { p: [1.42, 1.1, .1] })],
  roof: () => [part(box(2.3, .16, 2.3), '#c9a35c', { p: [0, .08, 0], g: '#e2c27a', j: .12 }),
    ...[-.9, -.3, .3, .9].map(x => part(box(.12, .1, 2.34), '#a9843f', { p: [x, .2, 0] })), part(box(2.34, .12, .14), wd2, { p: [0, -.04, 1.1] }), part(box(2.34, .12, .14), wd2, { p: [0, -.04, -1.1] })],
  bed: () => [part(box(1.1, .28, 1.9), wd2, { p: [0, .2, 0] }), part(box(1, .2, 1.8), '#f1ead8', { p: [0, .42, 0] }), part(box(1, .08, 1.15), '#5f9fd8', { p: [0, .54, .3], g: '#86bdea' }),
    part(box(.7, .14, .36), '#ffffff', { p: [0, .58, -.62] }), part(box(1.14, .7, .12), wd, { p: [0, .5, -.94] }), part(box(1.14, .4, .1), wd, { p: [0, .35, .94] })],
};

// ───── 동물 ─────
// 작물 (다 자랐을 때의 모양)
export const CROP_GEO = {
  carrot: () => merge([part(cone(.12, .5, 5), '#5fae5b', { p: [0, .25, 0], g: '#b5e06a' }), part(cone(.09, .2, 5), '#ff8f3a', { p: [0, .02, 0], r: [Math.PI, 0, 0] })]),
  potato: () => merge([part(ico(.2, 0), '#4f9a52', { p: [0, .2, 0], s: [1, .8, 1], g: '#9bd68a' }), part(ico(.1, 0), '#4f9a52', { p: [.12, .34, .05] }), part(dod(.08), '#c9a56a', { p: [.16, .03, .1] }), part(dod(.07), '#c9a56a', { p: [-.14, .03, -.06] })]),
  pumpkin: () => merge([part(ico(.24, 1), '#f08a24', { p: [0, .2, 0], s: [1, .78, 1], g: '#ffb04a', j: .1 }), part(cyl(.03, .04, .12, 5), '#5d8a3a', { p: [0, .42, 0] }), part(cone(.16, .1, 5), '#4f9a52', { p: [.22, .05, .1] })]),
};

export const ANIMAL_CFG = {
  rabbit: { body: [.28, .26, .42], y: .3, col: '#e9dfd0', col2: '#fff8ee', head: .17, legH: .18, legR: .045, ear: 'long', tail: 'puff' },
  deer: { body: [.42, .46, 1.0], y: .95, col: '#b98454', col2: '#e5c9a0', head: .22, legH: .75, legR: .06, ear: 'antler', tail: 'puff', neck: .45 },
  boar: { body: [.52, .5, .9], y: .62, col: '#5c4636', col2: '#77604c', head: .3, legH: .38, legR: .08, ear: 'small', tusk: true },
  wolf: { body: [.36, .4, .95], y: .68, col: '#6c7280', col2: '#a7adb8', head: .24, legH: .5, legR: .06, ear: 'point', tail: 'long', snout: true },
  lumi: { body: [.34, .34, .4], y: .36, col: '#9ae8dc', col2: '#f2fffb', head: .27, legH: .16, legR: .06, ear: 'leaf', tail: 'orb' },
};
export function animalModel(kind) {
  const c = ANIMAL_CFG[kind], [bw, bh, bl] = c.body, g = new THREE.Group();
  const hz = bl * .5 + c.head * .5, hy = c.y + bh * .3 + (c.neck || 0);
  const P = [
    part(ico(1, 1), c.col, { p: [0, c.y, 0], s: [bw, bh, bl * .62], g: c.col2, j: .05 }),
    part(ico(c.head, 1), c.col, { p: [0, hy, hz], g: c.col2, j: .05 }),
    part(oct(.03 + c.head * .08), '#1d1d24', { p: [c.head * .5, hy + c.head * .2, hz + c.head * .78], j: 0 }),
    part(oct(.03 + c.head * .08), '#1d1d24', { p: [-c.head * .5, hy + c.head * .2, hz + c.head * .78], j: 0 }),
  ];
  if (c.neck) P.push(part(cyl(c.head * .55, c.head * .75, c.neck + .3, 6), c.col, { p: [0, c.y + bh * .3 + c.neck * .4, bl * .42], r: [.5, 0, 0] }));
  if (c.snout) P.push(part(box(.16, .13, .24), c.col2, { p: [0, hy - .05, hz + .25] }), part(oct(.045), '#1d1d24', { p: [0, hy - .01, hz + .38], j: 0 }));
  if (c.tusk) P.push(part(box(.26, .2, .2), c.col2, { p: [0, hy - .08, hz + .26] }), part(cone(.035, .16, 4), '#fff', { p: [.14, hy - .05, hz + .3] }), part(cone(.035, .16, 4), '#fff', { p: [-.14, hy - .05, hz + .3] }));
  const E = { long: [.05, .34, .02, '#e9c7c0'], point: [.08, .2, .1, c.col], small: [.08, .12, .12, c.col], leaf: [.1, .38, .16, '#6fd18b'] }[c.ear];
  if (E) for (const s of [-1, 1]) P.push(part(cone(E[0], E[1], 4), E[3], { p: [s * (c.head * .55), hy + c.head * .8 + E[1] * .3, hz - .04], r: [0, 0, -s * (E[2] * 3 + .12)], g: c.ear === 'leaf' ? '#c6f5a0' : undefined }));
  if (c.ear === 'antler') for (const s of [-1, 1]) P.push(part(cyl(.02, .03, .4, 4), '#e8d9b8', { p: [s * .14, hy + .35, hz - .05], r: [0, 0, -s * .4] }), part(cyl(.015, .02, .22, 4), '#e8d9b8', { p: [s * .25, hy + .5, hz - .05], r: [0, 0, -s * 1.1] }));
  if (c.tail === 'puff') P.push(part(ico(.09, 0), '#fff', { p: [0, c.y + bh * .3, -bl * .6] }));
  if (c.tail === 'long') P.push(part(cone(.09, .5, 5), c.col, { p: [0, c.y + .1, -bl * .7], r: [-2.2, 0, 0], g: c.col2 }));
  const body = mesh(P); g.add(body);
  const legGeo = merge([part(cyl(c.legR, c.legR * .8, c.legH, 5), c.col, { p: [0, -c.legH / 2, 0], g: c.col2 })]);
  const legs = [];
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const l = new THREE.Mesh(legGeo, MAT); l.position.set(x * bw * .55, c.legH, z * bl * .32); l.castShadow = true; g.add(l); legs.push(l);
  }
  if (c.tail === 'orb') {
    const orb = new THREE.Mesh(ico(.11, 1), new THREE.MeshBasicMaterial({ color: hdr('#fff3a8', 1.7) }));
    orb.position.set(0, c.y + .42, -.4); g.add(orb); g.userData.orb = orb;
  }
  g.userData.body = body; g.userData.legs = legs;
  return g;
}
