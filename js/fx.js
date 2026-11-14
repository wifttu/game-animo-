// 파티클(타격 파편) + 화면 위 떠오르는 텍스트
import * as THREE from 'three';
import { G } from './util.js';
const pool = [], live = [], geo = new THREE.TetrahedronGeometry(.09), v = new THREE.Vector3();
// glow: 색을 HDR로 밝혀 블룸에 반응 · grav: 중력 배율(불티는 천천히 떨어진다)
export function burst(x, y, z, color, n = 7, up = 3, glow = 1, grav = 1) {
  for (let i = 0; i < n; i++) {
    const m = pool.pop() || new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    m.material.color.set(color).multiplyScalar(glow); m.userData.g = grav; m.position.set(x, y, z); m.scale.setScalar(.6 + Math.random());
    m.userData.v = [(Math.random() - .5) * 4, up + Math.random() * 3, (Math.random() - .5) * 4]; m.userData.t = grav < 1 ? 1.1 : .7; if (grav < 1) m.scale.multiplyScalar(.5);
    G.scene.add(m); live.push(m);
  }
}
export function updateFx(dt) {
  for (let i = live.length - 1; i >= 0; i--) {
    const m = live[i], u = m.userData; u.v[1] -= 14 * dt * u.g; u.t -= dt;
    m.position.x += u.v[0] * dt; m.position.y += u.v[1] * dt; m.position.z += u.v[2] * dt; m.rotation.x += dt * 9; m.rotation.y += dt * 7;
    if (u.t <= 0) { G.scene.remove(m); live.splice(i, 1); pool.push(m); }
  }
}
export function project(x, y, z) {
  v.set(x, y, z).project(G.camera);
  return v.z > 1 ? null : [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight];
}
const fl = () => document.getElementById('float');
export function floatText(x, y, z, text, color = '#fff') {
  const s = project(x, y, z); if (!s) return;
  const d = document.createElement('div'); d.className = 'ft'; d.textContent = text; d.style.cssText = `left:${s[0]}px;top:${s[1]}px;color:${color}`;
  fl().appendChild(d); setTimeout(() => d.remove(), 1000);
}
