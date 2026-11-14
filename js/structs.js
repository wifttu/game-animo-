// 설치물(건축) 시스템
import * as THREE from 'three';
import { G, emit } from './util.js';
import { STRUCT_GEO, CROP_GEO, merge, MAT, hdr } from './geo.js';
import { burst } from './fx.js';
import { heightAt, slopeAt } from './world.js';
import { ITEMS } from './items.js';

// snap: 'cell' = 2×2 칸 중앙(바닥·지붕) / 'edge' = 칸 가장자리(벽·문) / 1 = 1m 격자
// flat: 다른 설치물과 겹쳐도 되는 판(바닥·지붕) · seg: 선분 충돌 · lift: 기준 높이에서 띄우는 높이
export const STRUCTS = {
  campfire: { label: '모닥불', r: .85, act: '요리' }, workbench: { label: '작업대', r: 1.0, act: '제작' }, furnace: { label: '화로', r: 1.15, act: '제련' },
  tent: { label: '텐트', r: 1.7, act: '잠자기' }, bed: { label: '침대', r: .8, act: '잠자기' }, chest: { label: '보관 상자', r: .75, act: '열기' },
  plot: { label: '텃밭', r: 0, act: '가꾸기', free: 1 }, fence: { label: '울타리', seg: 1, snap: 1, free: 1 },
  floor: { label: '집 바닥', r: 0, snap: 'cell', free: 1, flat: 1 }, roof: { label: '지붕', r: 0, snap: 'cell', free: 1, flat: 1, lift: 2.55 },
  wall: { label: '나무 벽', seg: 1, snap: 'edge', free: 1 }, door: { label: '나무 문', seg: 1, snap: 'edge', free: 1, act: '여닫기' },
};
const flameMat = new THREE.MeshBasicMaterial({ color: hdr('#ffb23e', 3), transparent: true, opacity: .9 });
const flameMat2 = new THREE.MeshBasicMaterial({ color: hdr('#ff6a2a', 2.2), transparent: true, opacity: .85 });
const geoCache = {};
const geoOf = (k) => geoCache[k] ??= merge(STRUCT_GEO[k]());
const cropGeo = (seedId) => { const k = ITEMS[seedId]?.seed?.out || 'carrot'; return geoCache['crop_' + k] ??= CROP_GEO[k](); };

// 집 부품의 기준 높이: 근처에 바닥이 있으면 그 윗면, 없으면 지형 높이
const floorNear = (x, z) => G.structs.find(f => f.type === 'floor' && Math.abs(f.x - x) <= 1.05 && Math.abs(f.z - z) <= 1.05);
// 서 있는 곳의 바닥 윗면 높이 (바닥이 없으면 -Infinity)
export const floorTop = (x, z) => { const f = floorNear(x, z); return f ? f.y + .14 : -Infinity; };
export function baseY(type, x, z) {
  const S = STRUCTS[type];
  if (type === 'floor') { // 이어 붙이는 바닥은 이웃 바닥과 같은 높이로 (집이 평평해지도록)
    const nb = G.structs.find(f => f.type === 'floor' && Math.abs(f.x - x) <= 2.05 && Math.abs(f.z - z) <= 2.05); if (nb) return nb.y;
  }
  if (type === 'floor') return Math.max(heightAt(x, z), heightAt(x - 1, z - 1), heightAt(x + 1, z - 1), heightAt(x - 1, z + 1), heightAt(x + 1, z + 1)) + .06;
  const f = floorNear(x, z);
  return (f ? f.y + (S.flat || S.seg ? 0 : .14) : heightAt(x, z)) + (S.lift || 0);
}

export function addStruct(type, x, z, rot, data, y) {
  const m = new THREE.Mesh(geoOf(type), MAT);
  m.castShadow = m.receiveShadow = true;
  y ??= baseY(type, x, z);
  m.position.set(x, y, z); m.rotation.y = rot;
  const s = { type, x, y, z, rot, mesh: m, data: data || {}, S: STRUCTS[type], r: STRUCTS[type].r || 1.1 };
  if (type === 'campfire') {
    s.flames = [flameMat2, flameMat].map((mt, i) => { const f = new THREE.Mesh(new THREE.ConeGeometry(.3 - i * .1, .9 - i * .2, 6), mt); f.position.y = .55 - i * .05; m.add(f); return f; });
    s.light = new THREE.PointLight('#ff9a4a', 30, 24, 1.5); s.light.position.y = 1.2; m.add(s.light);
  }
  if (type === 'furnace') { s.light = new THREE.PointLight('#ff7a3a', 8, 9, 1.5); s.light.position.set(0, .6, 1.4); m.add(s.light); }
  if (type === 'chest' && !s.data.slots) s.data.slots = Array(12).fill(null);
  if (type === 'door') { // 경첩(왼쪽 기둥)을 축으로 도는 문짝
    s.panel = new THREE.Group(); s.panel.position.x = -.8; m.add(s.panel);
    const pm = new THREE.Mesh(geoOf('doorPanel'), MAT); pm.castShadow = true; s.panel.add(pm);
    s.panel.rotation.y = s.data.open ? -1.6 : 0;
  }
  if (type === 'plot') {
    s.crops = [];
    for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(cropGeo(s.data.crop), MAT); c.position.set((i % 3 - 1) * .6, .2, (Math.floor(i / 3) - 1) * .6); c.castShadow = true; c.visible = false; m.add(c); s.crops.push(c); }
    s.data.g ??= -1; // -1: 빈 밭, 0..1 성장
  }
  G.scene.add(m); G.structs.push(s);
  return s;
}
export function removeStruct(s) { G.scene.remove(s.mesh); G.structs.splice(G.structs.indexOf(s), 1); }
export function plantCrop(s, seedId) { s.data.crop = seedId; s.data.g = 0; for (const c of s.crops) c.geometry = cropGeo(seedId); }
export function toggleDoor(s) { s.data.open = !s.data.open; }

export function updateStructs(dt) {
  const p = G.player.pos;
  // 지붕 아래에 있으면 실내: 카메라가 가리지 않도록 근처 지붕을 숨긴다
  G.indoor = G.structs.some(s => s.type === 'roof' && Math.abs(s.x - p.x) <= 1.1 && Math.abs(s.z - p.z) <= 1.1 && s.y > p.y);
  for (const s of G.structs) {
    if (s.flames) {
      s.flames.forEach((f, i) => { const k = 1 + Math.sin(G.clock * (11 + i * 5) + s.x) * .14; f.scale.set(k, 1 + Math.sin(G.clock * (8 + i * 6)) * .22, k); f.rotation.y += dt * 3; });
      s.light.intensity = 26 + Math.sin(G.clock * 13) * 5 + Math.sin(G.clock * 7.3) * 4;
      if (Math.random() < dt * 5) burst(s.x + (Math.random() - .5) * .4, s.y + .9, s.z + (Math.random() - .5) * .4, '#ffb23e', 1, 2.2, 3, .6);
    }
    if (s.type === 'roof') s.mesh.visible = !(G.indoor && Math.hypot(s.x - p.x, s.z - p.z) < 9);
    if (s.panel) s.panel.rotation.y += ((s.data.open ? -1.6 : 0) - s.panel.rotation.y) * Math.min(1, dt * 9);
    if (s.crops) {
      const g = s.data.g;
      if (g >= 0 && g < 1) s.data.g = Math.min(1, g + dt / (ITEMS[s.data.crop]?.seed?.time || 300));
      for (const c of s.crops) { c.visible = g >= 0; if (g >= 0) c.scale.setScalar(.2 + g * 1.0); }
    }
  }
}

// 원/선분 충돌로 밀어내기 (플레이어·동물 공용: obj.x, obj.z)
export function structPush(o, rad) {
  for (const s of G.structs) {
    const S = s.S;
    if (S.seg) {
      if (s.data.open) continue; // 열린 문은 통과
      const c = Math.cos(s.rot), sn = Math.sin(s.rot), lx = (o.x - s.x) * c - (o.z - s.z) * sn, lz = (o.x - s.x) * sn + (o.z - s.z) * c;
      const px = Math.max(-1, Math.min(1, lx)), ddx = lx - px, d = Math.hypot(ddx, lz), R = rad + .12;
      if (d < R && d > 1e-4) { const k = (R - d) / d, ox = ddx * k, oz = lz * k; o.x += ox * c + oz * sn; o.z += -ox * sn + oz * c; }
    } else if (S.r) {
      const dx = o.x - s.x, dz = o.z - s.z, d = Math.hypot(dx, dz), R = S.r + rad;
      if (d < R && d > 1e-4) { o.x += dx / d * (R - d); o.z += dz / d * (R - d); }
    }
  }
}
export const stationNear = (type, rad = 6) => G.structs.some(s => s.type === type && Math.hypot(s.x - G.player.pos.x, s.z - G.player.pos.z) < rad);

// ── 건축 모드
const ghostOk = new THREE.MeshBasicMaterial({ color: '#7dffb0', transparent: true, opacity: .55, depthWrite: false });
const ghostNo = new THREE.MeshBasicMaterial({ color: '#ff6b6b', transparent: true, opacity: .55, depthWrite: false });
export function startBuild(type, slot) {
  cancelBuild();
  const g = new THREE.Mesh(geoOf(type), ghostOk);
  if (type === 'door') g.add(new THREE.Mesh(geoOf('doorPanel'), ghostOk)).position.x = -.8;
  G.scene.add(g); G.build = { type, slot, rot: 0, ghost: g, ok: false, x: 0, y: 0, z: 0 };
  emit('build', true);
}
export function cancelBuild() { if (!G.build) return; G.scene.remove(G.build.ghost); G.build = null; emit('build', false); }
export function rotateBuild() { const b = G.build; if (b) b.rot += typeof STRUCTS[b.type].snap === 'string' ? Math.PI / 2 : Math.PI / 4; }
export function updateBuild() {
  const b = G.build; if (!b) return;
  const p = G.player, S = STRUCTS[b.type], d = S.snap === 'cell' ? 2.2 : (S.r || 1) + 1.9, r2 = (v) => Math.round(v / 2) * 2;
  let x = p.pos.x + Math.sin(p.rot) * d, z = p.pos.z + Math.cos(p.rot) * d;
  if (S.snap === 'cell') { x = r2(x); z = r2(z); }
  else if (S.snap === 'edge') { // 벽이 놓이는 방향에 따라 칸의 위·아래 또는 좌·우 가장자리에 붙인다
    if (Math.round(b.rot / (Math.PI / 2)) % 2 === 0) { x = r2(x); z = r2(z - 1) + 1; } else { x = r2(x - 1) + 1; z = r2(z); }
  } else if (S.snap) { x = Math.round(x); z = Math.round(z); } else { x = Math.round(x * 2) / 2; z = Math.round(z * 2) / 2; }
  const y = baseY(b.type, x, z), onFloor = !!floorNear(x, z);
  b.x = x; b.y = y; b.z = z;
  b.ok = heightAt(x, z) > .35 && (onFloor || slopeAt(x, z) < .7) && !(b.type === 'roof' && !onFloor) && !G.structs.some(s => {
    const dd = Math.hypot(s.x - x, s.z - z);
    if (S.flat || s.S.flat) return s.type === b.type && dd < .4;
    if (S.seg && s.S.seg) return dd < .4 && S.snap === s.S.snap;
    return (S.free && s.S.free) ? (dd < .4 && s.type === b.type) : dd < (s.S.r || .5) + (S.r || .5);
  });
  b.ghost.material = b.ok ? ghostOk : ghostNo; if (b.ghost.children[0]) b.ghost.children[0].material = b.ghost.material;
  b.ghost.position.set(x, y, z); b.ghost.rotation.y = b.rot;
}
