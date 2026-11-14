// 자원 노드: 나무 · 바위 · 채집물 (InstancedMesh 기반)
import * as THREE from 'three';
import { G, rng, rint, lerp, emit } from './util.js';
import { NODE_GEO, DECOR_GEO, MAT, FOLIAGE } from './geo.js';
import { heightAt, slopeAt, forestAt, SIZE } from './world.js';

const flat = (x, z, max = .55) => slopeAt(x, z) < max;
// drops: [아이템, 최소, 최대]
export const NODE_TYPES = {
  oak: { n: 250, r: .5, hp: 30, tool: 'axe', drops: [['wood', 3, 5], ['stick', 0, 2], ['sap', 0, 1]], respawn: 300, label: '참나무', xp: 5, s: [.85, 1.35], shadow: 1,
    rule: (x, z, h) => h > 1.8 && h < 17 && flat(x, z) && forestAt(x, z) > -.12 },
  pine: { n: 210, r: .45, hp: 26, tool: 'axe', drops: [['wood', 2, 4], ['stick', 0, 1], ['sap', 0, 2]], respawn: 300, label: '소나무', xp: 5, s: [.9, 1.5], shadow: 1,
    rule: (x, z, h) => h > 9 && h < 30 && flat(x, z, .8) && forestAt(x, z) > -.25 },
  rock: { n: 130, r: 1.1, hp: 40, tool: 'pick', req: 1, drops: [['stone', 3, 5], ['flint', 0, 1]], respawn: 360, label: '바위', xp: 6, s: [.7, 1.4], shadow: 1,
    rule: (x, z, h) => h > 1.2 && flat(x, z, .9) },
  ore: { n: 60, r: 1.0, hp: 60, tool: 'pick', req: 1, drops: [['ore', 2, 3], ['stone', 1, 2]], respawn: 480, label: '철광석', xp: 10, s: [.8, 1.2], shadow: 1,
    rule: (x, z, h) => h > 12 && flat(x, z, 1) },
  berry: { n: 90, r: .8, pick: 1, drops: [['berry', 2, 4]], respawn: 200, label: '열매 덤불', xp: 2, s: [1, 1.3], bush: 1,
    rule: (x, z, h) => h > 2 && h < 16 && flat(x, z) },
  stick: { n: 190, r: 0, pick: 1, drops: [['stick', 1, 1]], respawn: 150, label: '나뭇가지', xp: 1, s: [.9, 1.3], rule: (x, z, h) => h > 1.5 && h < 22 && flat(x, z) && forestAt(x, z) > -.3 },
  pebble: { n: 170, r: 0, pick: 1, drops: [['stone', 1, 1]], respawn: 150, label: '돌멩이', xp: 1, s: [.9, 1.4], rule: (x, z, h) => h > .5 && flat(x, z, .8) },
  flint: { n: 70, r: 0, pick: 1, drops: [['flint', 1, 1]], respawn: 240, label: '부싯돌', xp: 2, s: [1, 1.3], rule: (x, z, h) => (h > .4 && h < 2) || h > 12 },
  fiber: { n: 170, r: 0, pick: 1, drops: [['fiber', 1, 2], ['seed', 0, 1, .35]], respawn: 150, label: '억새풀', xp: 1, s: [1, 1.5], rule: (x, z, h) => h > 1.6 && h < 16 && flat(x, z) },
  mushroom: { n: 80, r: 0, pick: 1, drops: [['mushroom', 1, 2]], respawn: 240, label: '버섯', xp: 2, s: [1, 1.5], rule: (x, z, h) => h > 2 && h < 22 && forestAt(x, z) > .05 },
  herb: { n: 60, r: 0, pick: 1, drops: [['herb', 1, 1]], respawn: 260, label: '약초', xp: 2, s: [1, 1.4], rule: (x, z, h) => h > 2 && h < 24 && flat(x, z) },
};

export const nodes = [];
const meshes = {}, grid = new Map(), CELL = 8, active = new Set();
const key = (x, z) => ((Math.floor(x / CELL) + 512) << 10) | (Math.floor(z / CELL) + 512);
const d = new THREE.Object3D();
let bushMesh;

function setM(n, tilt = 0, sm = 1, wob = 0) {
  d.position.set(n.x, n.y, n.z); d.rotation.set(tilt, n.rot, wob, 'YXZ'); d.scale.setScalar(n.s * sm); d.updateMatrix();
  const im = meshes[n.t]; im.setMatrixAt(n.i, d.matrix); im.instanceMatrix.needsUpdate = true;
}

export function createNodes() {
  const r = rng(4242), col = new THREE.Color();
  // 시작 지점 주변에는 튜토리얼용 자원을 확실히 배치
  const starter = [['stick', 3, 5], ['stick', -4, 7], ['stick', 6, 9], ['stick', -2, 11], ['pebble', 4, 2], ['pebble', -5, 3], ['pebble', 1, 8], ['pebble', 7, 5],
    ['fiber', -6, 8], ['fiber', 5, 12], ['fiber', -3, 5], ['berry', -8, 10], ['berry', 9, 12], ['flint', 2, 13], ['oak', -10, 4], ['oak', 11, 7], ['oak', 2, 16], ['rock', -9, 14]];
  const bushM = [];
  for (const t in NODE_TYPES) {
    const T = NODE_TYPES[t], im = new THREE.InstancedMesh(NODE_GEO[t](), ['oak', 'pine', 'berry', 'fiber', 'herb'].includes(t) ? FOLIAGE : MAT, T.n);
    im.castShadow = !!T.shadow; im.receiveShadow = true; im.frustumCulled = false;
    meshes[t] = im; G.scene.add(im);
    const st = starter.filter(s => s[0] === t);
    let n = 0, guard = 0;
    while (n < T.n && guard++ < T.n * 60) {
      let x, z; const s0 = st[n];
      if (s0) { x = s0[1]; z = s0[2]; } else { x = (r() - .5) * SIZE * .9; z = (r() - .5) * SIZE * .9; }
      const h = heightAt(x, z);
      if (!s0 && (!T.rule(x, z, h) || (T.r > 0 && Math.hypot(x, z - 4) < 7))) continue;
      const node = { id: nodes.length, t, i: n, x, y: h - (T.r > 0 ? .08 : 0), z, rot: r() * 6.28, s: lerp(T.s[0], T.s[1], r()), hp: T.hp || 1, dead: false, respawn: 0 };
      nodes.push(node); setM(node);
      const k = .88 + r() * .24; im.setColorAt(n, col.setRGB(k, k * (.96 + r() * .08), k));
      const gk = key(x, z); (grid.get(gk) || grid.set(gk, []).get(gk)).push(node);
      if (T.bush) bushM.push(node);
      n++;
    }
    im.count = n;
  }
  bushMesh = new THREE.InstancedMesh(DECOR_GEO.bush(), FOLIAGE, bushM.length);
  bushM.forEach((n, i) => { d.position.set(n.x, n.y, n.z); d.rotation.set(0, n.rot, 0); d.scale.setScalar(n.s); d.updateMatrix(); bushMesh.setMatrixAt(i, d.matrix); });
  bushMesh.castShadow = bushMesh.receiveShadow = true; bushMesh.frustumCulled = false; G.scene.add(bushMesh);
}

export function nodesNear(x, z, rad, out = []) {
  out.length = 0;
  const c = Math.ceil(rad / CELL), cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  for (let i = -c; i <= c; i++) for (let j = -c; j <= c; j++) {
    const a = grid.get(((cx + i + 512) << 10) | (cz + j + 512));
    if (a) for (const n of a) if (!n.dead) out.push(n);
  }
  return out;
}

// 나무·바위 등 자원 노드와의 원형 충돌 (플레이어·동물 공용: o.x, o.z). 밀려났으면 true
const pushBuf = [];
export function nodePush(o, rad) {
  let hit = false;
  for (const n of nodesNear(o.x, o.z, 4, pushBuf)) {
    const T = NODE_TYPES[n.t], R = T.r * (T.tool === 'pick' ? n.s : 1); if (!R) continue;
    const ex = o.x - n.x, ez = o.z - n.z, d = Math.hypot(ex, ez), rr = R + rad;
    if (d < rr) { hit = true; if (d > 1e-4) { o.x += ex / d * (rr - d); o.z += ez / d * (rr - d); } else o.x += rr; }
  }
  return hit;
}

// 반환: 획득한 드롭 목록 (없으면 null)
export function hitNode(n, power) {
  const T = NODE_TYPES[n.t];
  n.hp -= power;
  if (n.hp > 0) { n.shake = .3; active.add(n); return null; }
  n.dead = true; n.shake = 0; n.respawn = T.respawn * (.8 + Math.random() * .4);
  if (T.tool === 'axe') { n.fall = 0; n.fallDir = Math.random() * 6.28; } else setM(n, 0, 0);
  active.add(n);
  const drops = [];
  for (const [id, a, b, p] of T.drops) { if (p && Math.random() > p) continue; const k = rint(a, b); if (k > 0) drops.push([id, k]); }
  emit('node', n.t);
  return drops;
}

export function updateNodes(dt) {
  for (const n of active) {
    if (n.shake > 0) { n.shake -= dt; setM(n, 0, 1, n.shake > 0 ? Math.sin(n.shake * 50) * .06 * (n.shake / .3) : 0); if (n.shake <= 0 && !n.dead) active.delete(n); continue; }
    if (n.fall !== undefined) {
      n.fall += dt * 1.2;
      const save = n.rot; n.rot = n.fallDir; setM(n, Math.min(1.5, n.fall * n.fall * 1.6), n.fall > 1 ? Math.max(0, 1 - (n.fall - 1) * 3) : 1); n.rot = save;
      if (n.fall > 1.35) { delete n.fall; setM(n, 0, 0); }
      continue;
    }
    if (n.dead) {
      n.respawn -= dt;
      if (n.respawn <= 0 && Math.hypot(n.x - G.player.pos.x, n.z - G.player.pos.z) > 14 && !G.structs.some(s => Math.hypot(s.x - n.x, s.z - n.z) < 3)) { n.dead = false; n.hp = NODE_TYPES[n.t].hp || 1; n.grow = 0; }
      continue;
    }
    if (n.grow !== undefined) { n.grow += dt * .8; setM(n, 0, Math.min(1, n.grow)); if (n.grow >= 1) { delete n.grow; active.delete(n); } continue; }
    active.delete(n);
  }
}

export const saveNodes = () => nodes.filter(n => n.dead).map(n => [n.id, Math.round(n.respawn)]);
export function loadNodes(list) {
  for (const [id, t] of list || []) { const n = nodes[id]; if (!n) continue; n.dead = true; n.respawn = t; setM(n, 0, 0); active.add(n); }
}
