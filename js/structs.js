// 설치물(건축) 시스템
import * as THREE from 'three';
import { G, emit } from './util.js';
import { STRUCT_GEO, mesh, merge, part, MAT } from './geo.js';
import { heightAt, slopeAt } from './world.js';

export const STRUCTS = {
  campfire: { label: '모닥불', r: .85, act: '요리' }, workbench: { label: '작업대', r: 1.0, act: '제작' }, furnace: { label: '화로', r: 1.15, act: '제련' },
  tent: { label: '텐트', r: 1.7, act: '잠자기' }, chest: { label: '보관 상자', r: .75, act: '열기' }, plot: { label: '텃밭', r: 0, act: '가꾸기', free: 1 },
  fence: { label: '울타리', seg: 1, snap: 1, free: 1 }, wall: { label: '나무 벽', seg: 1, snap: 1, free: 1 }, floor: { label: '나무 바닥', r: 0, snap: 1, free: 1, flat: 1 },
};
const flameMat = new THREE.MeshBasicMaterial({ color: '#ffb23e', transparent: true, opacity: .9 });
const flameMat2 = new THREE.MeshBasicMaterial({ color: '#ff6a2a', transparent: true, opacity: .85 });
const geoCache = {};
const cropGeo = () => geoCache.crop ??= merge([part(new THREE.ConeGeometry(.12, .5, 5), '#5fae5b', { p: [0, .25, 0], g: '#b5e06a' }), part(new THREE.ConeGeometry(.09, .2, 5), '#ff8f3a', { p: [0, .02, 0], r: [Math.PI, 0, 0] })]);

export function addStruct(type, x, z, rot, data) {
  const m = new THREE.Mesh(geoCache[type] ??= merge(STRUCT_GEO[type]()), MAT);
  m.castShadow = m.receiveShadow = true;
  const y = heightAt(x, z) + (type === 'floor' ? .05 : 0);
  m.position.set(x, y, z); m.rotation.y = rot;
  const s = { type, x, y, z, rot, mesh: m, data: data || {}, S: STRUCTS[type], r: STRUCTS[type].r || 1.1 };
  if (type === 'campfire') {
    s.flames = [flameMat2, flameMat].map((mt, i) => { const f = new THREE.Mesh(new THREE.ConeGeometry(.3 - i * .1, .9 - i * .2, 6), mt); f.position.y = .55 - i * .05; m.add(f); return f; });
    s.light = new THREE.PointLight('#ff9a4a', 30, 24, 1.5); s.light.position.y = 1.2; m.add(s.light);
  }
  if (type === 'furnace') { s.light = new THREE.PointLight('#ff7a3a', 8, 9, 1.5); s.light.position.set(0, .6, 1.4); m.add(s.light); }
  if (type === 'chest' && !s.data.slots) s.data.slots = Array(12).fill(null);
  if (type === 'plot') {
    s.crops = [];
    for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(cropGeo(), MAT); c.position.set((i % 3 - 1) * .6, .2, (Math.floor(i / 3) - 1) * .6); c.castShadow = true; c.visible = false; m.add(c); s.crops.push(c); }
    s.data.g ??= -1; // -1: 빈 밭, 0..1 성장
  }
  G.scene.add(m); G.structs.push(s);
  return s;
}
export function removeStruct(s) { G.scene.remove(s.mesh); G.structs.splice(G.structs.indexOf(s), 1); }

export function updateStructs(dt) {
  for (const s of G.structs) {
    if (s.flames) {
      s.flames.forEach((f, i) => { const k = 1 + Math.sin(G.clock * (11 + i * 5) + s.x) * .14; f.scale.set(k, 1 + Math.sin(G.clock * (8 + i * 6)) * .22, k); f.rotation.y += dt * 3; });
      s.light.intensity = 26 + Math.sin(G.clock * 13) * 5 + Math.sin(G.clock * 7.3) * 4;
    }
    if (s.crops) {
      const g = s.data.g;
      if (g >= 0 && g < 1) s.data.g = Math.min(1, g + dt / 300);
      for (const c of s.crops) { c.visible = g >= 0; if (g >= 0) c.scale.setScalar(.25 + g * .95); }
    }
  }
}

// 원/선분 충돌로 밀어내기 (플레이어·동물 공용: obj.x, obj.z)
export function structPush(o, rad) {
  for (const s of G.structs) {
    const S = s.S;
    if (S.seg) {
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
  const g = new THREE.Mesh(geoCache[type] ??= merge(STRUCT_GEO[type]()), ghostOk);
  G.scene.add(g); G.build = { type, slot, rot: 0, ghost: g, ok: false, x: 0, z: 0 };
  emit('build', true);
}
export function cancelBuild() { if (!G.build) return; G.scene.remove(G.build.ghost); G.build = null; emit('build', false); }
export function updateBuild() {
  const b = G.build; if (!b) return;
  const p = G.player, S = STRUCTS[b.type], d = (S.r || 1) + 1.9;
  let x = p.pos.x + Math.sin(p.rot) * d, z = p.pos.z + Math.cos(p.rot) * d;
  if (S.snap) { x = Math.round(x); z = Math.round(z); } else { x = Math.round(x * 2) / 2; z = Math.round(z * 2) / 2; }
  const h = heightAt(x, z);
  b.x = x; b.z = z;
  b.ok = h > .35 && slopeAt(x, z) < .7 && !G.structs.some(s => {
    const dd = Math.hypot(s.x - x, s.z - z);
    return (S.free && s.S.free) ? (dd < .4 && s.type === b.type) : dd < (s.S.r || .9) + (S.r || .9);
  });
  b.ghost.material = b.ok ? ghostOk : ghostNo;
  b.ghost.position.set(x, h + (b.type === 'floor' ? .05 : 0), z); b.ghost.rotation.y = b.rot;
}
