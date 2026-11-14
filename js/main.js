// 부트스트랩 + 메인 루프
import * as THREE from 'three';
import { G, DAY_LEN, on } from './util.js';
import { initPost, resizePost, renderPost, hasPost } from './post.js';
import { createWorld, updateWorld, setQuality } from './world.js';
import { createNodes, updateNodes } from './nodes.js';
import { createPlayer, updatePlayer, updateCamera } from './player.js';
import { updateAnimals } from './animals.js';
import { updateStructs, updateBuild, cancelBuild, rotateBuild } from './structs.js';
import { updateFishing } from './fishing.js';
import { initInput, input } from './input.js';
import { initUI, updateHUD, openPanel, closePanel, panelOpen, refreshHotbar, toast } from './ui.js';
import { doAction, findTarget, updateStats, gain } from './actions.js';
import { addStruct } from './structs.js';
import { spawnAnimal } from './animals.js';
import { updateFx } from './fx.js';
import { inv, HOTBAR } from './items.js';
import { save, load, hasSave, clearSave, loadSettings } from './save.js';
import { sfx, startMusic } from './audio.js';
import './quests.js';
import { initLayout } from './layout.js';

const VERSION = 8; // 배포할 때마다 올린다 (타이틀 화면에 표시)
const $ = (id) => document.getElementById(id);
$('ver').textContent = '버전 ' + VERSION;
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
loadSettings();
const canvas = $('c');
const renderer = G.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
G.scene = new THREE.Scene();
G.camera = new THREE.PerspectiveCamera(55, 1, .3, 3000);
let usePost = false;
const resize = () => { renderer.setSize(innerWidth, innerHeight, false); resizePost(innerWidth, innerHeight, renderer.getPixelRatio()); G.camera.aspect = innerWidth / innerHeight; G.camera.fov = innerWidth < innerHeight ? 68 : 55; G.camera.updateProjectionMatrix(); };
addEventListener('resize', resize);

createWorld(); initPost();
on('quality', (q) => { usePost = q === 'high' && hasPost(); resize(); });
setQuality(G.settings.quality);
createNodes(); createPlayer();
initUI(); initLayout();
initInput(doAction, (code) => {
  if (!G.started) return;
  if (code.startsWith('Digit')) { const i = +code.slice(5) - 1; if (i >= 0 && i < HOTBAR) { inv.sel = i; refreshHotbar(); } }
  if (code === 'KeyI' || code === 'Tab') panelOpen() ? closePanel() : openPanel('inv');
  if (code === 'KeyC') panelOpen() ? closePanel() : openPanel('craft');
  if (code === 'KeyQ') panelOpen() ? closePanel() : openPanel('quest');
  if (code === 'Escape') { if (G.build) cancelBuild(); else panelOpen() ? closePanel() : openPanel('menu'); }
  if (code === 'KeyR') rotateBuild();
});

function start(cont) {
  if (cont) { if (!load()) toast('저장 데이터를 불러오지 못해 새로 시작합니다', 'warn'); } else clearSave();
  $('title').classList.add('hidden'); $('hud').classList.remove('hidden');
  G.started = true; G.paused = false; refreshHotbar(); sfx('quest'); startMusic();
  if (!cont) { gain('rod', 1); toast('🌴 낯선 섬에 도착했습니다', 'big'); setTimeout(() => toast('🎣 낚싯대를 들고 물가로 가서 낚시를 해 보세요'), 1500); }
}
$('loading').classList.add('hidden');
$('btnContinue').classList.toggle('hidden', !hasSave());
$('btnContinue').addEventListener('click', () => start(true));
$('btnNew').addEventListener('click', () => start(false));
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('pagehide', save);

const clock = new THREE.Clock(); let saveT = 0, tgtT = 0, stepPh = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05), p = G.player;
  if (!G.started) { p.cam.yaw += dt * .06; G.clock += dt; updateCamera(dt, true); updateWorld(dt, p.pos); draw(dt); return; }
  if (!G.paused) {
    G.clock += dt; G.tod += dt / DAY_LEN; if (G.tod >= 1) { G.tod -= 1; G.day++; }
    if (input.action && !G.build) doAction();
    updatePlayer(dt); updateStats(dt); updateAnimals(dt); updateNodes(dt); updateStructs(dt); updateBuild(); updateFishing(dt); updateFx(dt);
    if ((tgtT -= dt) < 0) { tgtT = .08; G.target = G.dead ? null : findTarget(); }
    if (p.grounded && p.speed > 1 && Math.floor(p.ph / Math.PI) !== stepPh) { stepPh = Math.floor(p.ph / Math.PI); sfx(p.swim ? 'splash' : 'step'); }
    if ((saveT += dt) > 20) { saveT = 0; save(); }
  } else { input.lookX = input.lookY = 0; }
  updateCamera(dt); updateWorld(dt, p.pos); updateHUD(dt);
  draw(dt);
}
const draw = (dt) => usePost ? renderPost(dt) : renderer.render(G.scene, G.camera);
frame();
if (location.search.includes('debug')) window.__G = G, window.__dbg = { gain, openPanel, addStruct, spawnAnimal, doAction, findTarget }; // 디버그용
