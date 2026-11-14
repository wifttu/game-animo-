// 마을(거점)과 상인: 섬 곳곳의 작은 장터. 코인으로 물건을 사고판다
import * as THREE from 'three';
import { G } from './util.js';
import { part, merge, MAT, hdr } from './geo.js';
import { OUTPOSTS, heightAt } from './world.js';

// buys: 상인이 사 주는 값(플레이어가 파는 값) · sells: 상인이 파는 값
export const SHOPS = {
  fish: { name: '물안개 나루', npc: '어부 미루', color: '#3f8fd6', hat: '#f2c14e',
    buys: { fish_carp: 8, fish_trout: 14, crayfish: 20, fish_gold: 130, grilled_fish: 14, grilled_trout: 24, steamed_crayfish: 32, fish_stew: 60 },
    sells: { rod: 25, torch: 12, bandage: 22, plank: 5, rope: 12, juice: 10 } },
  farm: { name: '볕뉘 농원', npc: '농부 다래', color: '#5fae5b', hat: '#e9dcc0',
    buys: { carrot: 6, potato: 7, pumpkin: 24, berry: 2, mushroom: 4, herb: 6, cactus_fruit: 7, baked_potato: 14, pumpkin_soup: 48, stew: 55 },
    sells: { seed: 5, seed_potato: 8, seed_pumpkin: 15, plot: 45, fence: 10, bandage: 20 } },
  lodge: { name: '서리봉 산장', npc: '대장장이 보람', color: '#c0563f', hat: '#55585e',
    buys: { stone: 2, flint: 6, ore: 11, ingot: 30, hide: 15, meat: 6, cooked_meat: 14, wood: 2 },
    sells: { pick_stone: 55, axe_stone: 55, sword_stone: 45, spear: 60, coat: 160, ingot: 48, torch: 10 } },
  bazaar: { name: '모래바람 장터', npc: '행상 누리', color: '#a25fd0', hat: '#ffd166',
    buys: { cactus_fruit: 9, hide: 13, sap: 5, fiber: 1, fish_gold: 150, ingot: 26, pumpkin: 20, gold_feast: 220 },
    sells: { seed_pumpkin: 12, juice: 8, rope: 10, chest: 60, bed: 90, roof: 14 } },
};

const box = (x, y, z) => new THREE.BoxGeometry(x, y, z), cyl = (a, b, h, s = 8) => new THREE.CylinderGeometry(a, b, h, s);
const L = (c) => new THREE.MeshLambertMaterial({ color: c });
function npcModel(shirt, hat) {
  const g = new THREE.Group(), add = (geo, mat, x, y, z, par = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; par.add(m); return m; };
  const skin = L('#f2c39b'), sh = L(shirt);
  add(new THREE.CapsuleGeometry(.27, .34, 4, 10), sh, 0, .98, 0); add(new THREE.CapsuleGeometry(.1, .3, 3, 8), L('#4a4a5a'), -.14, .36, 0); add(new THREE.CapsuleGeometry(.1, .3, 3, 8), L('#4a4a5a'), .14, .36, 0);
  add(box(.5, .45, .06), L('#e9dcc0'), 0, .92, .26); // 앞치마
  const head = add(new THREE.SphereGeometry(.31, 16, 12), skin, 0, 1.6, 0);
  add(cyl(.4, .46, .06, 14), L(hat), 0, .2, 0, head); add(cyl(.24, .27, .2, 12), L(hat), 0, .32, 0, head);
  for (const s of [-1, 1]) { add(new THREE.SphereGeometry(.038, 8, 6), L('#22222a'), s * .11, 0, .285, head); add(new THREE.CapsuleGeometry(.085, .3, 3, 8), sh, s * .37, 1.0, .05).rotation.z = s * .25; }
  g.userData.head = head; return g;
}

export function createOutposts() {
  const wd = '#a9753f', wd2 = '#8a5c30';
  for (const o of OUTPOSTS) {
    const shop = o.shop = SHOPS[o.kind], g = new THREE.Group(), P = [];
    const c = Math.cos(o.rot), s = Math.sin(o.rot), W = (lx, lz) => [o.x + lx * c + lz * s, o.z - lx * s + lz * c]; // 로컬(+z = 물가 쪽) → 월드
    const solid = (lx, lz, r) => { const [x, z] = W(lx, lz); G.statics.push({ x, z, r }); };
    // 경사진 땅에서도 평평하도록 가장 높은 지점에 맞춘 흙 단을 쌓는다
    for (let i = 0; i < 12; i++) o.y = Math.max(o.y, heightAt(o.x + Math.sin(i * .524) * 7, o.z + Math.cos(i * .524) * 7));
    P.push(part(cyl(8.6, 9.6, 4, 24), '#c2a373', { p: [0, -1.95, 0], g: '#d6ba8a', j: .05 }));
    // 가판대: 기둥 · 판매대 · 줄무늬 차양
    P.push(part(box(3.2, .95, 1), wd, { p: [0, .48, -2] }), part(box(3.4, .1, 1.2), wd2, { p: [0, .98, -2] }));
    for (const [x, z] of [[-1.6, -1.4], [1.6, -1.4], [-1.6, -3.3], [1.6, -3.3]]) P.push(part(box(.14, 2.6, .14), wd2, { p: [x, 1.3, z] }));
    for (let i = 0; i < 7; i++) P.push(part(box(.52, .08, 2.5), i % 2 ? '#ffffff' : shop.color, { p: [-1.56 + i * .52, 2.62, -2.3], r: [.16, 0, 0], j: .03 }));
    solid(0, -2.2, 2.0);
    // 상자 · 통 · 깃발
    for (const [x, y, z, k] of [[3, .4, -2.6, .8], [3.7, .35, -1.8, .7], [3.1, 1.1, -2.5, .6]]) P.push(part(box(k, k, k), '#c8935a', { p: [x, y, z], r: [0, x, 0], j: .1 }));
    for (const [x, z] of [[-3, -2.8], [-3.7, -2]]) { P.push(part(cyl(.4, .36, .9, 10), '#9a6a3a', { p: [x, .45, z] }), part(cyl(.42, .42, .08, 10), '#55585e', { p: [x, .7, z] })); solid(x, z, .5); }
    solid(3.3, -2.3, .9);
    P.push(part(cyl(.07, .09, 4.4, 6), wd2, { p: [4.6, 2.2, 1.5] }), part(box(1.3, .8, .05), shop.color, { p: [5.3, 3.9, 1.5] }), part(box(.4, .8, .06), '#ffffff', { p: [5.0, 3.9, 1.5], j: 0 }));
    P.push(part(cyl(.07, .09, 3, 6), wd2, { p: [-4.4, 1.5, 1.2] }), part(box(.34, .4, .34), '#3a2d22', { p: [-4.4, 3.1, 1.2] })); solid(-4.4, 1.2, .3); solid(4.6, 1.5, .3);
    // 뒤쪽을 두르는 울타리
    for (let i = 0; i < 7; i++) { const a = Math.PI * (.62 + i * .13), x = Math.sin(a) * 7.6, z = Math.cos(a) * 7.6;
      P.push(part(box(.16, 1.2, .16), wd2, { p: [x, .6, z] }), part(box(3.2, .12, .08), wd, { p: [x, .9, z], r: [0, a + Math.PI / 2, 0] }), part(box(3.2, .12, .08), wd, { p: [x, .5, z], r: [0, a + Math.PI / 2, 0] })); }
    // 마을마다 다른 소품
    if (o.kind === 'fish') { // 물 쪽으로 뻗은 부두
      const dy = .55 - o.y;
      for (let i = 0; i < 9; i++) P.push(part(box(2.6, .16, 1.9), i % 2 ? wd : '#b98248', { p: [0, dy, 7 + i * 2] }));
      for (const z of [8, 14, 20, 24]) for (const x of [-1.2, 1.2]) P.push(part(cyl(.13, .13, 3.4, 6), wd2, { p: [x, dy - 1.2, z] }));
      P.push(part(box(.9, .5, .6), '#5f9fd8', { p: [1.9, .3, .8] }), part(cyl(.03, .03, 2.2, 5), wd2, { p: [2.4, 1.1, .2], r: [.5, 0, .2] }));
    } else if (o.kind === 'farm') {
      for (const [x, z] of [[-2.2, 3.4], [.6, 4.2]]) { P.push(part(box(2.2, .25, 2.2), '#6b4a2e', { p: [x, .1, z], j: .12 })); for (let i = 0; i < 9; i++) P.push(part(new THREE.ConeGeometry(.14, .5, 5), '#5fae5b', { p: [x + (i % 3 - 1) * .6, .45, z + (Math.floor(i / 3) - 1) * .6], g: '#b5e06a' })); }
      for (const [x, z] of [[3.4, 3.2], [4.2, 2.3]]) { P.push(part(cyl(.6, .6, .9, 12), '#e6c65a', { p: [x, .6, z], r: [0, 0, Math.PI / 2], j: .1 })); solid(x, z, .7); }
    } else if (o.kind === 'lodge') {
      P.push(part(cyl(.9, 1.05, 1.2, 8), '#8e9197', { p: [-2.4, .6, 3.4], g: '#b0b3b6', j: .1 }), part(new THREE.ConeGeometry(.95, .8, 8), '#7d8086', { p: [-2.4, 1.6, 3.4] }), part(box(.6, .45, .2), hdr('#ff8a3c', 1.6), { p: [-2.4, .45, 4.4], j: 0 }));
      P.push(part(box(1.1, .3, .5), '#55585e', { p: [1.6, .8, 3.4] }), part(box(.5, .65, .4), '#6e7177', { p: [1.6, .33, 3.4] })); solid(-2.4, 3.4, 1.2); solid(1.6, 3.4, .7);
    } else {
      for (const [x, z, col] of [[-2, 3.2, '#d9534f'], [.8, 4, '#3f8fd6'], [3.2, 3, '#f2c14e']]) P.push(part(box(2, .06, 1.4), col, { p: [x, .1, z], r: [0, x, 0], j: .08 }));
      for (const [x, z] of [[-2.3, 3.4], [-1.6, 2.9], [1, 4.1]]) P.push(part(cyl(.2, .28, .5, 8), '#c97b4a', { p: [x, .36, z] }));
    }
    const mesh = new THREE.Mesh(merge(P), MAT); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
    const lamp = new THREE.PointLight('#ffc27a', 0, 26, 1.5); lamp.position.set(-4.4, 3.1, 1.2); g.add(lamp);
    const glow = new THREE.Mesh(box(.26, .3, .26), new THREE.MeshBasicMaterial({ color: hdr('#ffd9a0', 1.5) })); glow.position.copy(lamp.position); g.add(glow);
    const npc = npcModel(shop.color, shop.hat); npc.position.set(0, 0, -3); g.add(npc);
    g.position.set(o.x, o.y, o.z); g.rotation.y = o.rot; G.scene.add(g);
    [o.nx, o.nz] = W(0, -3); o.npc = npc; o.lamp = lamp; o.S = { label: `${shop.npc} · 거래` }; o.g = g;
  }
}
export function updateOutposts() {
  const p = G.player.pos;
  for (const o of OUTPOSTS) {
    if (Math.hypot(o.x - p.x, o.z - p.z) > 90) continue;
    o.lamp.intensity = G.night * 34;
    o.npc.position.y = Math.sin(G.clock * 2 + o.x) * .02;
    // 가까이 오면 손님 쪽을 바라본다
    const want = Math.hypot(o.nx - p.x, o.nz - p.z) < 9 ? Math.atan2(p.x - o.nx, p.z - o.nz) - o.rot : 0;
    o.npc.rotation.y += (Math.atan2(Math.sin(want - o.npc.rotation.y), Math.cos(want - o.npc.rotation.y))) * .1;
  }
}
// 마을 흙 단 위에 서 있을 때의 바닥 높이 (아니면 -Infinity)
export const platformTop = (x, z) => { for (const o of OUTPOSTS) if (Math.hypot(o.x - x, o.z - z) < 8.5) return o.y + .05; return -Infinity; };
// 야생 동물이 꺼리는 안전 구역인지
export const inOutpost = (x, z, r = 15) => OUTPOSTS.some(o => Math.hypot(o.x - x, o.z - z) < r);
