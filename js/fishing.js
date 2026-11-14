// 낚시: 낚싯대를 들고 물가에서 행동 → 찌가 가라앉을 때 다시 누르면 낚는다
import * as THREE from 'three';
import { G, emit } from './util.js';
import { heightAt } from './world.js';
import { equipped } from './items.js';
import { floatText, burst } from './fx.js';
import { sfx } from './audio.js';

// [아이템, 낮 가중치, 밤 가중치]
const FISH = [['fish_carp', 55, 45], ['fish_trout', 28, 28], ['crayfish', 11, 13], ['fish_gold', 5, 14]];
let bob, line, lastPress = -9;
const hand = new THREE.Vector3();

function ensure() {
  if (bob) return;
  bob = new THREE.Group();
  const top = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8, 0, 6.3, 0, 1.6), new THREE.MeshLambertMaterial({ color: '#e64a45' }));
  const bot = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8, 0, 6.3, 1.6, 1.6), new THREE.MeshLambertMaterial({ color: '#ffffff' }));
  bob.add(top, bot);
  line = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .7 }));
  line.frustumCulled = false;
}
// 캐릭터 앞쪽에서 찌를 던질 물 위치를 찾는다
function spot() {
  const p = G.player;
  for (let d = 2.5; d <= 8; d += .5) { const x = p.pos.x + Math.sin(p.rot) * d, z = p.pos.z + Math.cos(p.rot) * d; if (heightAt(x, z) < -.3) return [x + Math.sin(p.rot), z + Math.cos(p.rot)]; }
  return null;
}
export const hasRod = () => equipped()?.tool?.kind === 'rod';
export const canFish = () => hasRod() && !G.player.swim && !!spot();
export function fishHint() {
  const f = G.fish;
  if (f) return f.phase === 'bite' ? ['❗', '당기기!'] : ['⏳', '입질 대기'];
  return canFish() ? ['🎣', '낚시'] : null;
}
function stop(msg) {
  if (!G.fish) return;
  G.scene.remove(bob, line); G.fish = null; G.player.fishing = false;
  if (msg) floatText(G.player.pos.x, G.player.pos.y + 2.1, G.player.pos.z, msg, '#ffe9a8');
}
// 행동 버튼 처리. 낚시와 관련된 입력이면 true (onCatch: 잡았을 때 호출)
export function fishAction(onCatch) {
  const f = G.fish, held = G.clock - lastPress < .3; lastPress = G.clock; // 버튼을 누르고 있는 반복 입력은 무시
  if (f) {
    if (f.phase === 'bite' && !held) {
      const night = G.night > .5; let r = Math.random() * FISH.reduce((a, x) => a + x[night ? 2 : 1], 0), id = FISH[0][0];
      for (const x of FISH) { r -= x[night ? 2 : 1]; if (r <= 0) { id = x[0]; break; } }
      burst(f.x, .2, f.z, '#bfe9ff', 12, 3); sfx('splash'); G.player.swing = .38;
      stop(); onCatch(id); emit('fish', id);
    }
    return true;
  }
  if (!hasRod() || G.target) return false;
  const s = spot(); if (!s || G.player.swim) return false;
  ensure();
  G.fish = { phase: 'wait', t: 2.2 + Math.random() * 4.5, x: s[0], z: s[1] };
  G.player.fishing = true; G.player.swing = .38;
  bob.position.set(s[0], 0, s[1]); G.scene.add(bob, line); sfx('splash'); burst(s[0], .1, s[1], '#bfe9ff', 5, 2);
  return true;
}
export function updateFishing(dt) {
  const f = G.fish; if (!f) return;
  const p = G.player;
  if (p.speed > 1 || !hasRod() || G.dead || G.build) return stop(p.speed > 1 ? '낚시를 그만뒀습니다' : '');
  p.rot = Math.atan2(f.x - p.pos.x, f.z - p.pos.z);
  f.t -= dt;
  if (f.phase === 'wait' && f.t <= 0) { f.phase = 'bite'; f.t = 1.25; sfx('splash'); burst(f.x, .1, f.z, '#ffffff', 8, 2.5); floatText(f.x, .8, f.z, '❗', '#ffd166'); }
  else if (f.phase === 'bite' && f.t <= 0) return stop('놓쳤습니다…');
  bob.position.y = f.phase === 'bite' ? -.12 + Math.sin(G.clock * 30) * .05 : .03 + Math.sin(G.clock * 2.2) * .03;
  p.hand.getWorldPosition(hand);
  const a = line.geometry.attributes.position;
  a.setXYZ(0, hand.x + Math.sin(p.rot) * 1.1, hand.y + 1.25, hand.z + Math.cos(p.rot) * 1.1); a.setXYZ(1, f.x, bob.position.y + .1, f.z); a.needsUpdate = true;
}
