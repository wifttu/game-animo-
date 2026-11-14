// 동물 AI: 토끼 · 사슴 · 멧돼지 · 늑대 · 루미(길들이기 가능)
import * as THREE from 'three';
import { G, angLerp, emit, clamp } from './util.js';
import { animalModel } from './geo.js';
import { heightAt, slopeAt, HALF } from './world.js';
import { structPush } from './structs.js';
import { nodePush } from './nodes.js';
import { OUTPOSTS } from './world.js';

export const ANIMALS = {
  rabbit: { name: '토끼', hp: 18, walk: 1.8, run: 6.3, flee: 8, cap: 5, xp: 8, drops: [['meat', 1, 1], ['hide', 0, 1]] },
  deer: { name: '사슴', hp: 45, walk: 2, run: 7.4, flee: 12, cap: 3, xp: 15, drops: [['meat', 2, 2], ['hide', 1, 1]] },
  boar: { name: '멧돼지', hp: 70, walk: 1.6, run: 6.2, dmg: 12, cap: 2, xp: 22, drops: [['meat', 2, 3], ['hide', 1, 2]] },
  wolf: { name: '늑대', hp: 55, walk: 2.4, run: 6.9, dmg: 9, hostile: 1, cap: 3, xp: 25, drops: [['meat', 1, 1], ['hide', 1, 1]] },
  lumi: { name: '루미', hp: 60, walk: 1.8, run: 7.5, cap: 2, xp: 0, drops: [] },
};

export function spawnAnimal(kind, x, z, tamed) {
  const m = animalModel(kind), S = ANIMALS[kind];
  const a = { kind, S, x, z, y: heightAt(x, z), a: Math.random() * 6.28, hp: S.hp, state: 'idle', t: Math.random() * 3, mesh: m, ph: 0, cd: 0, hurt: 0, angry: 0, feed: 0, tamed: !!tamed, r: .6 };
  m.position.set(x, a.y, z); G.scene.add(m); G.animals.push(a);
  if (tamed) makePet(a);
  return a;
}
export function makePet(a) {
  a.tamed = true; G.pet = a;
  const l = new THREE.PointLight('#fff0a0', 0, 18, 1.5); l.position.set(0, 1.7, 0); a.mesh.add(l); a.light = l;
  a.mesh.scale.setScalar(1.1);
}
export function removeAnimal(a) { G.scene.remove(a.mesh); const i = G.animals.indexOf(a); if (i >= 0) G.animals.splice(i, 1); }

export function damageAnimal(a, dmg, fromX, fromZ) {
  if (a.dying || a.tamed) return;
  a.hp -= dmg; a.hurt = .25; a.angry = 14;
  const dx = a.x - fromX, dz = a.z - fromZ, d = Math.hypot(dx, dz) || 1;
  a.x += dx / d * .5; a.z += dz / d * .5;
  if (a.hp <= 0) { a.dying = .7; emit('kill', a); }
}

let spawnT = 0;
function trySpawn() {
  const p = G.player.pos, near = {};
  for (const a of G.animals) near[a.kind] = (near[a.kind] || 0) + 1;
  for (const k in ANIMALS) {
    let cap = ANIMALS[k].cap;
    if (k === 'wolf') cap = G.night > .6 ? (G.day > 2 ? 3 : 2) : 0;
    if (k === 'lumi' && G.pet) cap = 1;
    if ((near[k] || 0) >= cap) continue;
    const ang = Math.random() * 6.28, d = 42 + Math.random() * 40, x = p.x + Math.sin(ang) * d, z = p.z + Math.cos(ang) * d;
    if (Math.hypot(x, z) > HALF * .8) continue;
    const h = heightAt(x, z);
    if (h < 1.6 || slopeAt(x, z) > .6 || (k === 'boar' && h < 6) || (k !== 'wolf' && h > 24)) continue;
    spawnAnimal(k, x, z);
  }
}

const fireNear = (x, z, r) => G.structs.find(s => s.type === 'campfire' && Math.hypot(s.x - x, s.z - z) < r) || OUTPOSTS.find(o => Math.hypot(o.x - x, o.z - z) < r + 8);

export function updateAnimals(dt) {
  if ((spawnT -= dt) < 0) { spawnT = 1.5; trySpawn(); }
  const p = G.player.pos;
  for (let i = G.animals.length - 1; i >= 0; i--) {
    const a = G.animals[i], S = a.S, m = a.mesh;
    const dx = p.x - a.x, dz = p.z - a.z, dist = Math.hypot(dx, dz);
    if (a.dying) {
      a.dying -= dt; m.rotation.z = Math.min(1.5, (0.7 - a.dying) * 5); m.scale.setScalar(clamp(a.dying * 3, .01, 1));
      if (a.dying <= 0) removeAnimal(a); continue;
    }
    if (!a.tamed && dist > 135) { removeAnimal(a); continue; }
    a.t -= dt; a.cd -= dt; a.angry -= dt; a.hurt -= dt;
    let speed = 0, want = a.a;
    const toP = Math.atan2(dx, dz), away = toP + Math.PI;

    if (a.tamed) {
      // 펫: 적을 발견하면 싸우고, 아니면 주인을 따라다닌다
      let foe = null, fd = 13;
      for (const b of G.animals) if (!b.dying && (b.kind === 'wolf' || (b.kind === 'boar' && b.angry > 0))) { const d2 = Math.hypot(b.x - p.x, b.z - p.z); if (d2 < fd) { fd = d2; foe = b; } }
      if (dist > 45) { a.x = p.x - Math.sin(G.player.rot) * 2; a.z = p.z - Math.cos(G.player.rot) * 2; }
      else if (foe) {
        const d2 = Math.hypot(foe.x - a.x, foe.z - a.z); want = Math.atan2(foe.x - a.x, foe.z - a.z);
        if (d2 > 1.2) speed = S.run; else if (a.cd <= 0) { a.cd = .8; foe.tamed = false; damagePet(foe, a); }
      } else if (dist > 3.2) { want = toP; speed = dist > 8 ? S.run : 3.2; }
      if (a.light) a.light.intensity = 1.5 + G.night * 7;
    } else if (S.hostile || (a.kind === 'boar' && a.angry > 0)) {
      const fire = a.kind === 'wolf' && fireNear(a.x, a.z, 9);
      if (a.kind === 'wolf' && G.night < .3) { want = away; speed = S.run; if (dist > 60) { removeAnimal(a); continue; } }
      else if (fire) { want = Math.atan2(a.x - fire.x, a.z - fire.z); speed = S.walk * 1.5; }
      else if (dist < 26 && !G.dead) {
        want = toP;
        if (dist > 1.5) speed = S.run; else if (a.cd <= 0) { a.cd = 1.3; a.lunge = .3; emit('hurt', { dmg: S.dmg, by: S.name }); }
      } else wander(a);
    } else if (S.flee && (dist < S.flee || a.angry > 9)) { want = away + Math.sin(G.clock * 2 + a.ph) * .5; speed = S.run; a.state = 'idle'; a.t = 1; }
    else if (a.kind === 'lumi' && a.angry > 9) { want = away; speed = S.run; }
    else wander(a);

    if (a.state === 'wander' && speed === 0 && !a.tamed) { speed = S.walk; want = a.wa; }
    a.a = angLerp(a.a, want, Math.min(1, dt * 7));
    if (speed > 0) {
      const nx = a.x + Math.sin(a.a) * speed * dt, nz = a.z + Math.cos(a.a) * speed * dt, h = heightAt(nx, nz);
      if (h > .5 && Math.hypot(nx, nz) < HALF * .9) { a.x = nx; a.z = nz; } else { a.a += Math.PI * .7; a.wa = a.a; }
      a.ph += dt * speed * 3.2;
    }
    // 바위·나무·설치물을 통과하지 못하게 밀어낸다 (넉백·스폰 위치 포함). 막히면 옆으로 돌아간다
    const cr = a.kind === 'rabbit' || a.kind === 'lumi' ? .3 : .5;
    if (nodePush(a, cr) && speed > 0) { a.blk = (a.blk || 0) + dt; if (a.state === 'wander' && a.blk > .4) { a.wa = a.a + (Math.random() < .5 ? 1.4 : -1.4); a.blk = 0; } } else a.blk = 0;
    structPush(a, cr);
    a.y = heightAt(a.x, a.z);
    // 애니메이션
    const hop = a.kind === 'rabbit' || a.kind === 'lumi';
    const sw = speed > 0 ? Math.sin(a.ph) : 0, L = m.userData.legs;
    L[0].rotation.x = L[3].rotation.x = sw * .8; L[1].rotation.x = L[2].rotation.x = -sw * .8;
    m.position.set(a.x, a.y + (speed > 0 ? Math.abs(Math.sin(a.ph * (hop ? .5 : 1))) * (hop ? .28 : .05) : 0), a.z);
    m.rotation.set(a.lunge > 0 ? -.3 : 0, a.a, 0); if (a.lunge > 0) a.lunge -= dt;
    const sc = (a.tamed ? 1.1 : 1) * (a.hurt > 0 ? 1 + Math.sin(a.hurt * 25) * .12 : 1); m.scale.setScalar(sc);
    if (m.userData.orb) m.userData.orb.scale.setScalar(1 + Math.sin(G.clock * 4 + a.ph) * .15);
  }
}
function wander(a) {
  if (a.t > 0) return;
  if (a.state === 'idle') { a.state = 'wander'; a.wa = Math.random() * 6.28; a.t = 2 + Math.random() * 4; }
  else { a.state = 'idle'; a.t = 1.5 + Math.random() * 4; }
}
function damagePet(foe, pet) { damageAnimal(foe, 9, pet.x, pet.z); }

export const savePet = () => G.pet ? { x: G.pet.x, z: G.pet.z } : null;
