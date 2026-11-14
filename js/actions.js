// 게임 로직: 상호작용 · 제작 · 전투 · 스탯
import { G, emit, on, clamp, lerp, rint } from './util.js';
import { ITEMS, inv, HOTBAR, invAdd, invRemove, invCount, equipped, canCraft } from './items.js';
import { nodesNear, hitNode, NODE_TYPES } from './nodes.js';
import { damageAnimal, makePet } from './animals.js';
import { addStruct, removeStruct, startBuild, cancelBuild, stationNear, STRUCTS, plantCrop, toggleDoor } from './structs.js';
import { fishAction, fishHint } from './fishing.js';
import { heightAt, biomeAt, OUTPOSTS } from './world.js';
import { toast, refreshHotbar, openPanel, closePanel, showDeath } from './ui.js';
import { burst, floatText } from './fx.js';
import { sfx } from './audio.js';
import { save } from './save.js';

export const xpNeed = (l) => Math.round(40 * Math.pow(l, 1.4));
export function addXp(n) {
  const st = G.stats; st.xp += n;
  while (st.xp >= xpNeed(st.level)) {
    st.xp -= xpNeed(st.level); st.level++; st.maxHp += 10; st.maxStamina += 5; st.hp = st.maxHp;
    toast(`⭐ 레벨 ${st.level} 달성! 최대 체력이 늘었습니다`, 'big'); sfx('level');
  }
}
export function gain(id, n = 1, dur) {
  const it = ITEMS[id], left = invAdd(id, n, dur), got = n - left;
  if (got > 0) { toast(`${it.icon} ${it.name} +${got}`); emit('gain', { id, n: got }); }
  if (left > 0) toast('가방이 가득 찼어요!', 'warn');
  refreshHotbar();
}
export function damagePlayer(dmg, by) {
  if (G.dead) return;
  if (G.armor) dmg *= 1 - ITEMS[G.armor].armor.def;
  G.stats.hp -= dmg; sfx('hurt');
  const v = document.getElementById('vignette'); v.classList.add('hurt'); setTimeout(() => v.classList.remove('hurt'), 160);
  if (G.stats.hp <= 0) die(`${by}에게 당했습니다.`);
}
export function die(msg) { if (G.dead) return; G.dead = true; G.stats.hp = 0; cancelBuild(); closePanel(); showDeath(msg); }
export function respawn() {
  const st = G.stats, p = G.player;
  p.pos.set(G.spawn.x, heightAt(G.spawn.x, G.spawn.z), G.spawn.z);
  st.hp = st.maxHp * .6; st.hunger = Math.max(st.hunger, 50); st.thirst = Math.max(st.thirst, 50); st.temp = 60; st.stamina = st.maxStamina;
  G.dead = false; save();
}
on('hurt', (e) => damagePlayer(e.dmg, e.by));
on('kill', (a) => {
  for (const [id, lo, hi] of a.S.drops) { const k = rint(lo, hi); if (k) gain(id, k); }
  addXp(a.S.xp); burst(a.x, a.y + .6, a.z, '#ffffff', 10);
});

// ── 대상 탐색
const near = [];
export function findTarget() {
  const p = G.player, px = p.pos.x, pz = p.pos.z, fx = Math.sin(p.rot), fz = Math.cos(p.rot), tool = equipped()?.tool;
  const reach = tool?.reach || 2.5; let best = null, bs = 1e9;
  const consider = (kind, o, x, z, r, bonus, rc = reach) => {
    const dx = x - px, dz = z - pz, d = Math.hypot(dx, dz), e = d - r;
    if (e > rc) return;
    const dot = d > .01 ? (dx * fx + dz * fz) / d : 1;
    if (e > .6 && dot < .15) return;
    const sc = e - dot * 1.3 + bonus;
    if (sc < bs) { bs = sc; best = { kind, o, x, z }; }
  };
  for (const n of nodesNear(px, pz, 6, near)) consider('node', n, n.x, n.z, NODE_TYPES[n.t].r * .8, 0, 2.3);
  for (const a of G.animals) if (!a.dying && !a.tamed) consider('animal', a, a.x, a.z, .5, -.8);
  for (const o of OUTPOSTS) { consider('npc', o, o.nx, o.nz, .4, -1.2, 3.1); if (o.port) consider('port', o, o.port.boat[0], o.port.boat[1], 1.4, -1.2, 3.2); }
  for (const s of G.structs) consider('struct', s, s.x, s.z, s.S.r || .6, s.S.act ? -.3 : .8, 2.2);
  return best;
}
const nearWater = () => { const p = G.player; return p.pos.y < .25 || heightAt(p.pos.x + Math.sin(p.rot) * 1.6, p.pos.z + Math.cos(p.rot) * 1.6) < -.05; };

export function actionHint() {
  const t = G.target, eq = equipped();
  if (G.build) return ['✅', '설치'];
  if (G.fish || !t) { const fh = fishHint(); if (fh) return fh; }
  if (t?.kind === 'node') { const T = NODE_TYPES[t.o.t]; return T.pick ? ['✋', '줍기'] : T.tool === 'axe' ? ['🪓', '벌목'] : ['⛏️', '채광']; }
  if (t?.kind === 'animal') return t.o.kind === 'lumi' && invCount('berry') ? ['🫐', '먹이 주기'] : ['⚔️', '공격'];
  if (t?.kind === 'npc') return ['🪙', '거래'];
  if (t?.kind === 'port') return ['⛵', '배 타기'];
  if (t?.kind === 'struct' && t.o.S.act) return ['🤚', t.o.S.act];
  if (nearWater()) return ['💧', '마시기'];
  if (eq?.food) return [eq.icon, eq.id === 'bandage' ? '사용' : '먹기'];
  return ['✋', '행동'];
}

function wear() {
  const s = inv.slots[inv.sel]; if (!s || !ITEMS[s.id].tool?.dur) return;
  if (--s.dur <= 0) { toast(`${ITEMS[s.id].icon} ${ITEMS[s.id].name}이(가) 부서졌습니다`, 'warn'); inv.slots[inv.sel] = null; sfx('err'); }
  refreshHotbar();
}
let lastWarn = 0;
const warn = (m) => { if (G.clock - lastWarn > 1.5) { lastWarn = G.clock; toast(m, 'warn'); sfx('err'); } };

export function doAction() {
  if (!G.started || G.paused || G.dead) return;
  if (G.build) return placeBuild();
  if (fishAction((id) => { gain(id, 1); addXp(id === 'fish_gold' ? 40 : 8); wear(); })) return;
  const p = G.player; if (p.swing > .06) return;
  const t = G.target, eq = equipped(), tool = eq?.tool;
  if (t) p.rot = Math.atan2(t.x - p.pos.x, t.z - p.pos.z);
  if (!t) {
    if (nearWater()) { p.swing = .38; G.stats.thirst = Math.min(100, G.stats.thirst + 22); sfx('drink'); emit('drink'); floatText(p.pos.x, p.pos.y + 2, p.pos.z, '💧+22', '#9fdcff'); return; }
    if (eq?.food) return useSlot(inv.sel);
    p.swing = .38; sfx('swing'); return;
  }
  p.swing = .38;
  if (t.kind === 'npc') return openPanel('trade', t.o);
  if (t.kind === 'port') return openPanel('map', t.o);
  if (t.kind === 'node') {
    const n = t.o, T = NODE_TYPES[n.t];
    if (T.pick) { const dr = hitNode(n, 99); sfx('pick'); for (const [id, k] of dr) gain(id, k); addXp(T.xp); return; }
    const right = tool?.kind === T.tool;
    // 채굴 등급: 바위는 곡괭이(나무 이상), 철광석은 돌곡괭이 이상이 있어야 캘 수 있다
    if (T.req && !(right && tool.lvl >= T.req)) return warn(T.req >= 2 ? (right ? '⛏️ 나무 곡괭이로는 못 캡니다. 돌곡괭이가 필요합니다' : '⛏️ 철광석은 돌곡괭이 이상으로 캡니다') : '⛏️ 바위는 곡괭이로 캡니다. 작업대에서 나무 곡괭이를 만드세요');
    const dr = hitNode(n, right ? tool.power : 5);
    sfx(T.tool === 'axe' ? 'chop' : 'mine');
    burst(n.x, n.y + 1.2, n.z, T.tool === 'axe' ? '#b98248' : '#b4b7ba', 6);
    if (right) wear(); else if (T.tool === 'axe' && Math.random() < .1) toast('🪓 도끼가 있으면 훨씬 빨라요');
    if (dr) { for (const [id, k] of dr) gain(id, k); addXp(T.xp); if (T.tool === 'axe') burst(n.x, n.y + 3, n.z, '#6dbb58', 14, 2); }
  } else if (t.kind === 'animal') {
    const a = t.o;
    if (a.kind === 'lumi' && invCount('berry')) {
      invRemove('berry', 1); refreshHotbar(); a.feed++; a.angry = 0; sfx('eat');
      floatText(a.x, a.y + 1.3, a.z, a.feed >= 3 ? '💖' : '💗 ' + a.feed + '/3', '#ffb3d9');
      if (a.feed >= 3) { makePet(a); sfx('tame'); toast('💖 루미와 친구가 되었습니다!', 'big'); emit('tame'); addXp(30); }
      return;
    }
    const dmg = tool?.dmg || 5;
    damageAnimal(a, dmg, p.pos.x, p.pos.z); sfx('hit');
    floatText(a.x, a.y + 1.2, a.z, '-' + dmg, '#ffd166'); burst(a.x, a.y + .6, a.z, '#ff8f8f', 5);
    if (tool) wear();
  } else interact(t.o);
}

function interact(s) {
  const d = s.data;
  if (s.type === 'campfire') openPanel('craft', 'food');
  else if (s.type === 'workbench') openPanel('craft', 'tool');
  else if (s.type === 'furnace') openPanel('craft', 'mat');
  else if (s.type === 'chest') openPanel('inv', s);
  else if (s.type === 'tent' || s.type === 'bed') sleep(s);
  else if (s.type === 'door') { toggleDoor(s); sfx('place'); }
  else if (s.type === 'plot') {
    if (d.g < 0) { // 손에 든 씨앗을 먼저, 없으면 가방에 있는 아무 씨앗
      const held = equipped()?.seed ? equipped().id : null, id = held || Object.keys(ITEMS).find(k => ITEMS[k].seed && invCount(k));
      if (id && invRemove(id, 1)) { plantCrop(s, id); sfx('place'); toast(`${ITEMS[id].icon} ${ITEMS[id].name}을(를) 심었습니다`); refreshHotbar(); }
      else warn('🌱 씨앗이 필요합니다 (억새풀을 뜯으면 가끔 나와요)');
    }
    else if (d.g < 1) toast(`🌱 ${ITEMS[ITEMS[d.crop || 'seed'].seed.out].name} 자라는 중… ${Math.floor(d.g * 100)}%`);
    else { const id = d.crop || 'seed', sd = ITEMS[id].seed; d.g = -1; gain(sd.out, rint(sd.min, sd.max)); gain(id, rint(1, 2)); addXp(12); sfx('pick'); emit('harvest'); }
  }
}
function sleep(s) {
  const bed = s.type === 'bed';
  G.spawn = bed ? { x: s.x + Math.cos(s.rot) * 1.4, z: s.z - Math.sin(s.rot) * 1.4 } : { x: s.x + Math.sin(s.rot) * 2.6, z: s.z + Math.cos(s.rot) * 2.6 };
  if (!(G.tod > .7 || G.tod < .24)) return toast(`${bed ? '🛏️' : '⛺'} 부활 지점을 저장했습니다. 잠은 저녁부터 잘 수 있어요`);
  if (!(bed && G.indoor) && G.animals.some(a => a.kind === 'wolf' && Math.hypot(a.x - s.x, a.z - s.z) < 14)) return warn('🐺 근처에 늑대가 있어 잠들 수 없습니다');
  const f = document.getElementById('fade'); f.classList.add('on'); G.paused = true;
  setTimeout(() => {
    if (G.tod > .5) G.day++;
    G.tod = .27; const st = G.stats;
    st.hp = bed ? st.maxHp : Math.min(st.maxHp, st.hp + 40); st.stamina = st.maxStamina; st.hunger = Math.max(5, st.hunger - 18); st.thirst = Math.max(5, st.thirst - 18); st.temp = 60;
    f.classList.remove('on'); G.paused = false; toast(`☀️ ${G.day}일차 아침이 밝았습니다`, 'big'); emit('sleep'); save();
  }, 1100);
}

export function demolish() {
  const t = G.target; if (t?.kind !== 'struct') return;
  const s = t.o;
  if (s.type === 'chest') for (const c of s.data.slots) if (c) gain(c.id, c.n, c.dur);
  removeStruct(s); gain(s.type, 1); sfx('place'); G.target = null;
}

function placeBuild() {
  const b = G.build; if (!b.ok) return warn('이곳에는 설치할 수 없습니다');
  if (!invRemove(b.type, 1)) return cancelBuild();
  addStruct(b.type, b.x, b.z, b.rot, null, b.y); sfx('place'); burst(b.x, heightAt(b.x, b.z) + .3, b.z, '#e9dcc0', 10, 2);
  emit('place', b.type); addXp(5); refreshHotbar();
  if (!invCount(b.type)) cancelBuild();
}

export function useSlot(i) {
  const s = inv.slots[i]; if (!s || G.dead) return;
  const it = ITEMS[s.id], st = G.stats;
  if (it.food) {
    const f = it.food;
    if (f.hp > 0 && !f.hunger && st.hp >= st.maxHp) return toast('체력이 이미 가득합니다');
    st.hunger = clamp(st.hunger + (f.hunger || 0), 0, 100); st.thirst = clamp(st.thirst + (f.thirst || 0), 0, 100); st.hp = clamp(st.hp + (f.hp || 0), 1, st.maxHp);
    if (--s.n <= 0) inv.slots[i] = null;
    sfx(f.thirst > 20 ? 'drink' : 'eat'); if (s.id !== 'bandage') emit('eat', s.id);
    toast(`${it.icon} ${it.name}${f.hp < 0 ? ' — 배탈이 났습니다…' : ' 사용'}`, f.hp < 0 ? 'warn' : '');
  } else if (it.place) { closePanel(); startBuild(s.id, i); }
  else if (it.armor) { const old = G.armor; G.armor = s.id; inv.slots[i] = old ? { id: old, n: 1 } : null; sfx('craft'); toast(`${it.icon} ${it.name} 착용`); }
  else if (it.tool) { if (i >= HOTBAR) { [inv.slots[i], inv.slots[inv.sel]] = [inv.slots[inv.sel], inv.slots[i]]; } else inv.sel = i; sfx('ui'); }
  refreshHotbar();
}
export function unequipArmor() { if (G.armor && invAdd(G.armor, 1) === 0) { G.armor = null; refreshHotbar(); } }

// ── 배편: 항구에서 다른 항구로 이동
export function sail(dest) {
  closePanel();
  const f = document.getElementById('fade'); f.classList.add('on'); G.paused = true; sfx('splash');
  setTimeout(() => {
    const p = G.player, [x, z] = dest.port.arrive;
    p.pos.set(x, .64, z); p.vy = 0; p.rot = dest.rot + Math.PI; p.cam.yaw = dest.rot;
    G.tod += .04; if (G.tod >= 1) { G.tod -= 1; G.day++; } // 항해에 한 시간쯤 걸린다
    f.classList.remove('on'); G.paused = false; G.target = null;
    toast(`⛵ ${dest.isleName} · ${dest.shop.name}에 도착했습니다`, 'big'); emit('sail'); save();
  }, 1000);
}

// ── 거래
export function sellItem(shop, id, n) {
  n = Math.min(n, invCount(id)); const price = shop.buys[id]; if (!n || !price) return;
  invRemove(id, n); G.stats.coins += price * n; sfx('pick'); toast(`🪙 +${price * n} (${ITEMS[id].name} ×${n})`); emit('sell', id); refreshHotbar();
}
export function buyItem(shop, id) {
  const price = shop.sells[id]; if (!price) return;
  if (G.stats.coins < price) return warn('🪙 코인이 부족합니다');
  if (invAdd(id, 1) > 0) return warn('가방이 가득 찼어요!');
  G.stats.coins -= price; sfx('craft'); toast(`${ITEMS[id].icon} ${ITEMS[id].name} 구매 (🪙 -${price})`); emit('buy', id); refreshHotbar();
}

export function craft(r) {
  if (r.station && !stationNear(r.station)) return warn('근처에 필요한 시설이 없습니다');
  if (!canCraft(r)) return;
  for (const k in r.need) invRemove(k, r.need[k]);
  gain(r.out, r.n); sfx('craft'); emit('craft', r.out); addXp(4);
}

// ── 생존 스탯
const flags = {};
function warnOnce(key, cond, msg) { if (cond && !flags[key]) { flags[key] = 1; toast(msg, 'warn'); } else if (!cond) flags[key] = 0; }
export function updateStats(dt) {
  const st = G.stats, p = G.player; if (G.dead) return;
  const moving = p.speed > .5;
  st.hunger = Math.max(0, st.hunger - dt * (.075 + (p.sprint ? .06 : 0)));
  const [snow, desert] = biomeAt(p.pos.x, p.pos.z);
  st.thirst = Math.max(0, st.thirst - dt * (.1 + (p.sprint ? .08 : 0)) * (1 + desert * (1 - G.night) * .8));
  if (p.sprint && moving) st.stamina -= dt * 13; else if (p.swim) st.stamina -= dt * 6; else st.stamina += dt * (st.hunger > 10 ? 20 : 8);
  st.stamina = clamp(st.stamina, 0, st.maxStamina);
  // 체온
  let tg = lerp(64, 24, G.night) - Math.max(0, p.pos.y - 20) * 1.3;
  tg += -snow * 24 + desert * (16 * (1 - G.night) - 8 * G.night); // 설원은 춥고, 사막은 낮에 덥고 밤에 춥다
  if (p.swim) tg -= 20;
  if (G.armor) tg += ITEMS[G.armor].armor.warm;
  if (equipped()?.id === 'torch') tg += 14;
  let fire = 0; for (const s of G.structs) if (s.type === 'campfire' || s.type === 'furnace') fire = Math.max(fire, 1 - Math.hypot(s.x - p.pos.x, s.z - p.pos.z) / 8);
  tg += fire * 55; G.nearFire = fire > 0;
  if (G.indoor) tg += 20; // 지붕 아래는 따뜻하다
  st.temp = clamp(st.temp + (clamp(tg, 0, 100) - st.temp) * dt * .11, 0, 100);
  // 피해 · 회복
  let dmg = 0, why = '';
  if (st.hunger <= 0) { dmg += .8; why = '굶주림으로 쓰러졌습니다.'; }
  if (st.thirst <= 0) { dmg += 1.1; why = '갈증으로 쓰러졌습니다.'; }
  if (st.temp < 18) { dmg += 1; why = '추위에 얼어붙었습니다.'; }
  if (p.swim && st.stamina <= 0) { dmg += 7; why = '물에 빠졌습니다.'; }
  if (dmg) { st.hp -= dmg * dt; if (st.hp <= 0) die(why); }
  else if (st.hunger > 35 && st.thirst > 35) st.hp = Math.min(st.maxHp, st.hp + dt * .7);
  warnOnce('bs', snow > .6, '❄️ 설원에 들어섰습니다. 몸을 따뜻하게 하세요'); warnOnce('bd', desert > .6, '🏜️ 사막에 들어섰습니다. 낮에는 목이 빨리 마릅니다');
  warnOnce('h', st.hunger < 20, '🍖 배가 고픕니다'); warnOnce('t', st.thirst < 20, '💧 목이 마릅니다');
  warnOnce('c', st.temp < 26, '🥶 몸이 차가워집니다. 불을 피우세요'); warnOnce('n', G.tod > .74 && G.tod < .8, '🌙 곧 밤이 됩니다. 늑대를 조심하세요');
  document.getElementById('vignette').classList.toggle('cold', st.temp < 24);
}
