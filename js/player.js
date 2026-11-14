// 플레이어 캐릭터: 모델 · 이동 · 카메라
import * as THREE from 'three';
import { G, clamp, lerp, angLerp } from './util.js';
import { toolModel } from './geo.js';
import { heightAt, HALF } from './world.js';
import { nodePush } from './nodes.js';
import { structPush } from './structs.js';
import { input } from './input.js';
import { equipped, ITEMS } from './items.js';

const L = (c) => new THREE.MeshLambertMaterial({ color: c });
export function createPlayer() {
  const g = new THREE.Group(), add = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const skin = L('#ffd0a6'), shirt = L('#3fb0a5'), pants = L('#46557a'), hair = L('#5b3a24'), pack = L('#d08f4c'), dark = L('#22222a'), boot = L('#6b4a2e');
  add(new THREE.CapsuleGeometry(.25, .32, 4, 10), shirt, 0, .98, 0);
  add(new THREE.BoxGeometry(.52, .09, .36), pack, 0, .74, 0);
  const head = add(new THREE.SphereGeometry(.31, 16, 12), skin, 0, 1.6, 0);
  add(new THREE.SphereGeometry(.33, 16, 10, 0, Math.PI * 2, 0, Math.PI * .52), hair, 0, .03, -.02, head).rotation.x = -.25;
  add(new THREE.SphereGeometry(.12, 8, 6), hair, 0, .3, -.12, head);
  for (const s of [-1, 1]) { add(new THREE.SphereGeometry(.038, 8, 6), dark, s * .11, 0, .285, head); add(new THREE.SphereGeometry(.05, 6, 5), L('#ffb3a0'), s * .19, -.08, .23, head); }
  add(new THREE.BoxGeometry(.4, .46, .2), pack, 0, 1.02, -.3); add(new THREE.BoxGeometry(.3, .14, .08), L('#b87a3c'), 0, .95, -.42);
  add(new THREE.CapsuleGeometry(.07, .3, 3, 6), L('#e9dcc0'), 0, 1.28, -.32).rotation.z = Math.PI / 2;
  const limb = (x, y, mat, len, r, end) => {
    const piv = new THREE.Group(); piv.position.set(x, y, 0); g.add(piv);
    add(new THREE.CapsuleGeometry(r, len, 3, 8), mat, 0, -len / 2 - r * .5, 0, piv);
    add(new THREE.SphereGeometry(r * 1.15, 8, 6), end, 0, -len - r * 1.4, 0, piv); return piv;
  };
  const armL = limb(-.36, 1.22, shirt, .3, .085, skin), armR = limb(.36, 1.22, shirt, .3, .085, skin);
  const legL = limb(-.14, .62, pants, .3, .1, boot), legR = limb(.14, .62, pants, .3, .1, boot);
  const hand = new THREE.Group(); hand.position.set(0, -.44, .04); armR.add(hand);
  G.scene.add(g);
  G.player = { g, pos: g.position, rot: 0, vy: 0, grounded: true, vel: new THREE.Vector2(), speed: 0, ph: 0, swing: 0, armL, armR, legL, legR, head, hand, heldId: null, swim: false, sprint: false,
    cam: { yaw: 0, pitch: .5, dist: 9.5 } };
  g.position.set(G.spawn.x, heightAt(G.spawn.x, G.spawn.z), G.spawn.z);
  return G.player;
}

function syncHeld(p) {
  const s = equipped(), id = s && s.tool ? s.id : null;
  if (id === p.heldId) return;
  p.heldId = id; p.hand.clear(); p.held = null;
  if (id) { p.held = toolModel(s.tool.kind, s.tier); p.hand.add(p.held); }
}

export function updatePlayer(dt) {
  const p = G.player, st = G.stats, cam = p.cam;
  syncHeld(p);
  // 카메라 기준 이동 방향
  let mx = input.mx, my = input.my; const mag = Math.min(1, Math.hypot(mx, my));
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  let dx = fx * my + rx * mx, dz = fz * my + rz * mx;
  const ground = heightAt(p.pos.x, p.pos.z);
  p.swim = ground < -.95 && p.pos.y <= -.9;
  p.sprint = (input.sprint || mag > .97) && mag > .5 && st.stamina > 1 && !p.swim && !G.dead;
  const max = G.dead ? 0 : p.swim ? 2.6 : p.sprint ? 8.2 : 5;
  const tv = mag > .08 ? max * mag : 0, l = Math.hypot(dx, dz) || 1;
  p.vel.x = lerp(p.vel.x, dx / l * tv, Math.min(1, dt * 10)); p.vel.y = lerp(p.vel.y, dz / l * tv, Math.min(1, dt * 10));
  p.speed = p.vel.length();
  if (p.speed > .3) p.rot = angLerp(p.rot, Math.atan2(p.vel.x, p.vel.y), Math.min(1, dt * 12));
  const o = { x: p.pos.x + p.vel.x * dt, z: p.pos.z + p.vel.y * dt };
  // 충돌: 자원 노드 · 설치물 · 맵 경계
  nodePush(o, .35);
  structPush(o, .35);
  const dc = Math.hypot(o.x, o.z), lim = HALF * .93; if (dc > lim) { o.x *= lim / dc; o.z *= lim / dc; }
  p.pos.x = o.x; p.pos.z = o.z;
  // 점프 · 중력 · 수영
  const gy = Math.max(heightAt(o.x, o.z), -.95);
  if (input.jump && p.grounded && !p.swim && !G.dead && st.stamina > 6) { p.vy = 7.6; p.grounded = false; st.stamina -= 6; }
  input.jump = false;
  p.vy -= 22 * dt; p.pos.y += p.vy * dt;
  if (p.pos.y <= gy) { p.pos.y = gy; p.vy = 0; p.grounded = true; } else if (p.pos.y > gy + .25) p.grounded = false;
  // 애니메이션
  p.ph += dt * p.speed * 2.1;
  const sw = Math.sin(p.ph) * clamp(p.speed / 5, 0, 1.25), idle = Math.sin(G.clock * 2) * .03;
  p.legL.rotation.x = sw * .9; p.legR.rotation.x = -sw * .9;
  p.armL.rotation.x = -sw * .8; p.armL.rotation.z = -.12 - idle;
  if (p.swing > 0) { p.swing -= dt; const k = 1 - p.swing / .38; p.armR.rotation.x = -2.4 + Math.sin(k * Math.PI * .9) * 2.7; p.armR.rotation.z = .1; }
  else { p.armR.rotation.x = (p.held ? -.5 : 0) + sw * (p.held ? .3 : .8); p.armR.rotation.z = .12 + idle; }
  p.g.rotation.y = p.rot;
  p.g.rotation.x = G.dead ? -1.45 : p.swim ? .9 : lerp(p.g.rotation.x, clamp(p.speed / 30, 0, .22), .2);
  p.head.position.y = 1.6 + idle; p.g.children[0].scale.y = 1 + idle;
  if (p.held?.userData.flame) { const f = p.held.userData.flame; f.scale.setScalar(1 + Math.sin(G.clock * 17) * .2); p.held.userData.light.intensity = 12 + Math.sin(G.clock * 11) * 3; }
}

const tgt = new THREE.Vector3(), want = new THREE.Vector3();
export function updateCamera(dt, snap) {
  const p = G.player, c = p.cam;
  c.yaw -= input.lookX * .0052; c.pitch = clamp(c.pitch + input.lookY * .004, .06, 1.35); input.lookX = input.lookY = 0;
  c.dist = clamp(c.dist * (1 + input.zoom), 4.5, 17); input.zoom = 0;
  tgt.set(p.pos.x, p.pos.y + 1.55, p.pos.z);
  const cp = Math.cos(c.pitch);
  want.set(tgt.x + Math.sin(c.yaw) * cp * c.dist, tgt.y + Math.sin(c.pitch) * c.dist, tgt.z + Math.cos(c.yaw) * cp * c.dist);
  want.y = Math.max(want.y, heightAt(want.x, want.z) + .7, .5);
  G.camera.position.lerp(want, snap ? 1 : Math.min(1, dt * 14));
  G.camera.lookAt(tgt);
}
