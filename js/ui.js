// HUD · 패널 UI
import { G, on, DAY_LEN } from './util.js';
import { ITEMS, RECIPES, CATS, STATION_NAME, inv, HOTBAR, invCount, invAdd, canCraft } from './items.js';
import { useSlot, craft, xpNeed, actionHint, demolish, respawn, unequipArmor, doAction } from './actions.js';
import { stationNear, cancelBuild } from './structs.js';
import { NODE_TYPES } from './nodes.js';
import { QUESTS, quest } from './quests.js';
import { mapCanvas, HALF, SIZE, setQuality } from './world.js';
import { project } from './fx.js';
import { sfx } from './audio.js';
import { save, clearSave, saveSettings } from './save.js';
import { startLayoutEdit, applyLayout } from './layout.js';
import { setMusic } from './audio.js';

const $ = (id) => document.getElementById(id);
let panel = null, selSlot = 0, craftCat = 'tool', chest = null;
export const panelOpen = () => !!panel;

export function toast(msg, cls = '') {
  const box = $('toasts'), d = document.createElement('div'); d.className = 'toast ' + cls; d.textContent = msg;
  box.appendChild(d); while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => d.remove(), 2800);
}

const slotHTML = (s, i, cls = '', attr = 'data-slot') => {
  if (!s) return `<div class="slot ${cls}" ${attr}="${i}"></div>`;
  const it = ITEMS[s.id], dur = it.tool?.dur ? `<i><u style="width:${s.dur / it.tool.dur * 100}%"></u></i>` : '';
  return `<div class="slot ${cls} ${it.tier === 2 ? 't2' : ''}" ${attr}="${i}">${it.icon}${s.n > 1 ? `<b>${s.n}</b>` : ''}${dur}</div>`;
};
export function refreshHotbar() {
  $('hotbar').innerHTML = inv.slots.slice(0, HOTBAR).map((s, i) => slotHTML(s, i, i === inv.sel ? 'sel' : '')).join('');
  if (panel) renderPanel();
}

// ── 패널
export function openPanel(name, arg) {
  if (G.dead || !G.started || G.editing) return;
  cancelBuild(); panel = name; chest = name === 'inv' && arg?.data ? arg : null;
  if (name === 'craft' && typeof arg === 'string') craftCat = arg;
  $('panel').classList.remove('hidden'); G.paused = true; sfx('ui'); renderPanel();
}
export function closePanel() { if (!panel) return; panel = null; chest = null; $('panel').classList.add('hidden'); G.paused = false; save(); }

function renderPanel() {
  const T = $('pTitle'), tabs = $('pTabs'), B = $('pBody'); tabs.innerHTML = '';
  const keep = B.scrollTop;
  if (panel === 'inv') {
    T.textContent = chest ? '보관 상자' : '가방';
    const s = inv.slots[selSlot], it = s && ITEMS[s.id];
    let acts = '';
    if (it) {
      if (it.food) acts += `<button class="primary" data-act="use">${it.id === 'bandage' ? '사용' : '먹기'}</button>`;
      if (it.place) acts += `<button class="primary" data-act="use">설치</button>`;
      if (it.armor) acts += `<button class="primary" data-act="use">착용</button>`;
      if (selSlot >= HOTBAR) acts += `<button class="ghostbtn" data-act="hot">단축 슬롯으로</button>`;
      if (chest) acts += `<button class="ghostbtn" data-act="store">상자에 넣기</button>`;
      acts += `<button class="ghostbtn" data-act="drop">버리기</button>`;
    }
    const st = it?.tool ? `<div class="chips">${it.tool.power ? `<span class="chip">채집력 ${it.tool.power}</span>` : ''}<span class="chip">공격력 ${it.tool.dmg}</span>${it.tool.dur ? `<span class="chip">내구도 ${s.dur}/${it.tool.dur}</span>` : ''}</div>` : '';
    const fd = it?.food ? `<div class="chips">${it.food.hunger ? `<span class="chip">🍖 +${it.food.hunger}</span>` : ''}${it.food.thirst ? `<span class="chip">💧 +${it.food.thirst}</span>` : ''}${it.food.hp ? `<span class="chip ${it.food.hp < 0 ? 'no' : ''}">❤️ ${it.food.hp > 0 ? '+' : ''}${it.food.hp}</span>` : ''}</div>` : '';
    B.innerHTML = `<div class="invwrap"><div>
      ${chest ? `<p class="gridcap">📦 상자 (눌러서 꺼내기)</p><div class="grid" style="margin-bottom:10px">${chest.data.slots.map((c, i) => slotHTML(c, i, '', 'data-chest')).join('')}</div><p class="gridcap">🎒 가방</p>` : ''}
      <div class="grid">${inv.slots.map((c, i) => slotHTML(c, i, (i === selSlot ? 'sel ' : '') + (i < HOTBAR ? 'hb' : ''))).join('')}</div>
      <p class="gridcap" style="margin-top:8px">윗줄 6칸이 단축 슬롯입니다 · 착용 중: ${G.armor ? `${ITEMS[G.armor].icon} ${ITEMS[G.armor].name} <button class="chip" data-act="unarmor">벗기</button>` : '없음'}</p></div>
      <div class="detail">${it ? `<div class="big">${it.icon}</div><h3>${it.name}${s.n > 1 ? ` ×${s.n}` : ''}</h3><p>${it.desc}</p>${st}${fd}<div class="acts">${acts}</div>` : '<p>아이템을 선택하세요.</p>'}</div></div>`;
  } else if (panel === 'craft') {
    T.textContent = '제작';
    tabs.innerHTML = CATS.map(([k, n]) => `<button data-cat="${k}" class="${k === craftCat ? 'on' : ''}">${n}</button>`).join('');
    B.innerHTML = RECIPES.map((r, i) => {
      if (r.cat !== craftCat) return '';
      const it = ITEMS[r.out], stOk = !r.station || stationNear(r.station), ok = stOk && canCraft(r);
      const chips = Object.entries(r.need).map(([k, n]) => `<span class="chip ${invCount(k) < n ? 'no' : ''}">${ITEMS[k].icon} ${ITEMS[k].name} ${invCount(k)}/${n}</span>`).join('');
      return `<div class="recipe ${ok ? '' : 'no'}"><div class="ic ${it.tier === 2 ? 't2' : ''}">${it.icon}</div><div class="info"><h4>${it.name}${r.n > 1 ? ` ×${r.n}` : ''} <small>${it.desc}</small></h4>
        <div class="chips">${r.station ? `<span class="chip ${stOk ? 'st' : 'no'}">${stOk ? '✔' : '✖'} ${STATION_NAME[r.station]} 필요</span>` : ''}${chips}</div></div>
        <button class="primary" data-craft="${i}" ${ok ? '' : 'disabled'}>제작</button></div>`;
    }).join('');
  } else if (panel === 'quest') {
    T.textContent = '목표';
    B.innerHTML = QUESTS.map((q, i) => `<div class="qrow ${i < quest.i ? 'done' : i === quest.i ? 'cur' : ''}"><span>${i < quest.i ? '✅' : i === quest.i ? '👉' : '🔒'}</span>
      <div><b>${i <= quest.i ? q.t : '???'}${i === quest.i && q.need > 1 ? ` (${quest.n}/${q.need})` : ''}</b>${i <= quest.i ? `<p>${q.d}</p>` : ''}</div></div>`).join('');
  } else if (panel === 'menu') {
    T.textContent = '설정';
    const row = (t, d, b) => `<div class="setrow"><div><b>${t}</b><p>${d}</p></div>${b}</div>`;
    B.innerHTML = row('효과음', '게임 내 소리', `<button class="ghostbtn" data-set="sound">${G.settings.sound ? '🔊 켜짐' : '🔇 꺼짐'}</button>`)
      + row('배경음악', '시간대에 따라 분위기가 바뀝니다', `<button class="ghostbtn" data-set="music">${G.settings.music ? '🎵 켜짐' : '🔇 꺼짐'}</button>`)
      + row('그래픽 품질', '높음: 빛 번짐·색 보정 효과 포함. 버벅이면 낮추세요', `<button class="ghostbtn" data-set="quality">${{ high: '✨ 높음', mid: '👍 보통', low: '⚡ 낮음' }[G.settings.quality]}</button>`)
      + row('버튼 위치', '조이스틱·행동·점프 버튼과 단축 슬롯을 원하는 곳으로 옮깁니다', `<button class="primary" data-set="layout">✋ 위치 편집</button>`)
      + row('조이스틱 방식', '자유: 터치한 곳에 나타남 · 고정: 정해 둔 위치에서만 조작', `<button class="ghostbtn" data-set="joy">${G.settings.joyFixed ? '📌 고정' : '👆 자유'}</button>`)
      + row('버튼 크기', '조이스틱과 조작 버튼의 크기', `<button class="ghostbtn" data-set="scale">${{ 0.85: '작게', 1: '보통', 1.2: '크게', 1.4: '아주 크게' }[G.settings.btnScale] || '보통'}</button>`)
      + row('전체 화면', '가로 모드로 플레이하는 것을 추천합니다', `<button class="ghostbtn" data-set="full">⛶ 전환</button>`)
      + row('저장', '게임은 자동으로 저장됩니다', `<button class="ghostbtn" data-set="save">💾 지금 저장</button>`)
      + row('처음부터 다시', '저장된 진행 상황을 모두 지웁니다', `<button class="ghostbtn" data-set="reset">🗑️ 초기화</button>`)
      + `<p style="opacity:.75;font-size:.9em;line-height:1.7;margin:12px 0 0">🌙 밤에는 춥고 늑대가 나타납니다. 모닥불 곁은 따뜻하고 늑대가 다가오지 못합니다.<br>🏃 조이스틱을 끝까지 밀면 달립니다 (PC: Shift).<br>🫐 루미에게 숲 열매를 3번 주면 함께 다니며 밤길을 밝히고 적과 싸워줍니다.<br>⛏️ 철광석은 고지대(산)에 있습니다. 화로에서 제련하세요.</p>`;
  }
  B.scrollTop = keep;
}

let resetArmed = 0;
function panelClick(e) {
  const t = e.target.closest('[data-slot],[data-chest],[data-act],[data-cat],[data-craft],[data-set]'); if (!t) return;
  const d = t.dataset;
  if (d.slot !== undefined) { selSlot = +d.slot; sfx('ui'); }
  else if (d.chest !== undefined) { const c = chest.data.slots[+d.chest]; if (c) { const left = invAdd(c.id, c.n, c.dur); if (left) c.n = left; else chest.data.slots[+d.chest] = null; sfx('pick'); } }
  else if (d.cat) { craftCat = d.cat; $('pBody').scrollTop = 0; sfx('ui'); }
  else if (d.craft) craft(RECIPES[+d.craft]);
  else if (d.act) {
    const s = inv.slots[selSlot];
    if (d.act === 'unarmor') unequipArmor();
    else if (!s) return;
    else if (d.act === 'use') useSlot(selSlot);
    else if (d.act === 'drop') { inv.slots[selSlot] = null; sfx('ui'); }
    else if (d.act === 'hot') { [inv.slots[selSlot], inv.slots[inv.sel]] = [inv.slots[inv.sel], s]; selSlot = inv.sel; sfx('ui'); }
    else if (d.act === 'store') { const left = invAdd(s.id, s.n, s.dur, chest.data.slots); if (left) s.n = left; else inv.slots[selSlot] = null; sfx('pick'); }
  } else if (d.set) {
    const S = G.settings;
    if (d.set === 'sound') { S.sound = !S.sound; sfx('ui'); }
    if (d.set === 'music') { S.music = !S.music; setMusic(S.music); }
    if (d.set === 'quality') { S.quality = { high: 'mid', mid: 'low', low: 'high' }[S.quality]; setQuality(S.quality); }
    if (d.set === 'joy') S.joyFixed = !S.joyFixed;
    if (d.set === 'scale') { const o = [0.85, 1, 1.2, 1.4]; S.btnScale = o[(o.indexOf(S.btnScale) + 1) % o.length]; applyLayout(); }
    if (d.set === 'layout') { closePanel(); startLayoutEdit(); return; }
    saveSettings();
    if (d.set === 'full') { document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.().catch(() => toast('이 브라우저는 전체 화면을 지원하지 않습니다')); }
    if (d.set === 'save') { panel = null; G.paused = false; save(); G.paused = true; panel = 'menu'; toast('💾 저장했습니다'); }
    if (d.set === 'reset') { if (Date.now() - resetArmed < 4000) { G.started = false; clearSave(); location.reload(); return; } resetArmed = Date.now(); toast('한 번 더 누르면 모든 진행이 삭제됩니다', 'warn'); }
  }
  refreshHotbar();
}

export function showDeath(msg) { $('deathMsg').textContent = msg + ` (${G.day}일차)`; $('death').classList.remove('hidden'); }

export function initUI() {
  $('pBody').addEventListener('click', panelClick); $('pTabs').addEventListener('click', panelClick);
  $('pClose').addEventListener('click', closePanel);
  $('panel').addEventListener('pointerdown', (e) => { if (e.target.id === 'panel') closePanel(); });
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.open)));
  $('quest').addEventListener('click', () => openPanel('quest'));
  $('hotbar').addEventListener('pointerdown', (e) => {
    const t = e.target.closest('[data-slot]'); if (!t || G.editing) return; e.stopPropagation();
    const i = +t.dataset.slot, s = inv.slots[i];
    if (i === inv.sel && s && (ITEMS[s.id].food || ITEMS[s.id].place || ITEMS[s.id].armor)) useSlot(i); else { inv.sel = i; cancelBuild(); sfx('ui'); }
    refreshHotbar();
  });
  $('btnDemolish').addEventListener('click', demolish);
  $('bRot').addEventListener('click', () => { if (G.build) G.build.rot += Math.PI / 4; });
  $('bCancel').addEventListener('click', cancelBuild);
  $('bPlace').addEventListener('click', doAction);
  $('btnRespawn').addEventListener('click', () => { $('death').classList.add('hidden'); respawn(); });
  on('build', (v) => { $('buildbar').classList.toggle('hidden', !v); if (v) toast('🔨 위치를 정하고 설치 버튼을 누르세요'); });
  on('questDone', (q) => { toast(`🎉 목표 달성: ${q.t}`, 'big'); sfx('quest'); const el = $('quest'); el.classList.remove('done'); void el.offsetWidth; el.classList.add('done'); });
  refreshHotbar();
}

// ── 매 프레임 HUD 갱신
let mapT = 0, lastHint = '';
export function updateHUD(dt) {
  const st = G.stats, w = (id, v) => { $(id).style.width = Math.max(0, Math.min(100, v)) + '%'; };
  w('bHp', st.hp / st.maxHp * 100); w('bFood', st.hunger); w('bWater', st.thirst); w('bTemp', st.temp); w('bStam', st.stamina / st.maxStamina * 100);
  $('bHp').parentNode.parentNode.classList.toggle('low', st.hp < st.maxHp * .3);
  $('bFood').parentNode.parentNode.classList.toggle('low', st.hunger < 20); $('bWater').parentNode.parentNode.classList.toggle('low', st.thirst < 20);
  $('bTemp').parentNode.parentNode.classList.toggle('low', st.temp < 26);
  $('stam').classList.toggle('show', st.stamina < st.maxStamina - 1);
  $('lvlN').textContent = st.level; $('xpRing').style.strokeDashoffset = 100.5 * (1 - st.xp / xpNeed(st.level));
  const mins = Math.floor(G.tod * 1440), hh = String(Math.floor(mins / 60)).padStart(2, '0'), mm = String(Math.floor(mins % 60 / 10) * 10).padStart(2, '0');
  $('clockDay').textContent = G.day + '일차'; $('clockTime').textContent = `${hh}:${mm}`; $('clockIcon').textContent = G.night > .5 ? '🌙' : G.tod < .32 ? '🌅' : G.tod > .68 ? '🌇' : '☀️';
  const q = QUESTS[quest.i];
  const qh = q ? `<b>현재 목표</b><span>${q.t}${q.need > 1 ? `<em>${quest.n}/${q.need}</em>` : ''}</span>` : '<b>모든 목표 달성!</b><span>자유롭게 섬 생활을 즐기세요 🌴</span>';
  if ($('quest').dataset.h !== qh) { $('quest').dataset.h = qh; $('quest').innerHTML = qh; }
  // 대상 표시
  const t = G.target, tag = $('targetTag'), hint = actionHint().join('|');
  if (hint !== lastHint) { lastHint = hint; [$('actIcon').textContent, $('actLabel').textContent] = actionHint(); }
  $('btnDemolish').classList.toggle('hidden', t?.kind !== 'struct' || !!G.build);
  let shown = false;
  if (t && !G.build) {
    const o = t.o, top = t.kind === 'node' ? (NODE_TYPES[o.t].r ? 2.2 : .8) : t.kind === 'animal' ? 1.6 : 2.2, sp = project(t.x, (o.y ?? 0) + top, t.z);
    if (sp) {
      const label = t.kind === 'node' ? NODE_TYPES[o.t].label : t.kind === 'animal' ? o.S.name : o.S.label, max = t.kind === 'node' ? NODE_TYPES[o.t].hp : t.kind === 'animal' ? o.S.hp : 0;
      const html = label + (max > 1 && o.hp < max ? `<i><u style="width:${Math.max(0, o.hp / max * 100)}%"></u></i>` : '');
      if (tag.dataset.h !== html) { tag.dataset.h = html; tag.innerHTML = html; }
      tag.style.left = sp[0] + 'px'; tag.style.top = sp[1] + 'px'; shown = true;
    }
  }
  tag.classList.toggle('hidden', !shown);
  if ((mapT -= dt) < 0) { mapT = .15; drawMap(); }
}

function drawMap() {
  const cv = $('minimap'), x = cv.getContext('2d'), p = G.player, k = 110 / 75;
  x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#14406e'; x.fillRect(0, 0, 220, 220);
  x.setTransform(k, 0, 0, k, 110 - p.pos.x * k, 110 - p.pos.z * k);
  x.drawImage(mapCanvas, -HALF, -HALF, SIZE, SIZE);
  if (G.night > 0) { x.fillStyle = `rgba(8,14,40,${G.night * .45})`; x.fillRect(-HALF, -HALF, SIZE, SIZE); }
  const dot = (px, pz, c, r) => { x.fillStyle = c; x.beginPath(); x.arc(px, pz, r, 0, 7); x.fill(); x.lineWidth = .8; x.strokeStyle = '#fff'; x.stroke(); };
  for (const s of G.structs) if (s.S.act) dot(s.x, s.z, s.type === 'campfire' ? '#ff9a4a' : s.type === 'tent' ? '#ffe9a8' : '#c9a36a', 2.6);
  for (const a of G.animals) if (a.tamed) dot(a.x, a.z, '#7de0c4', 2.6); else if (a.kind === 'wolf' || a.angry > 0 && a.kind === 'boar') dot(a.x, a.z, '#ff4d4d', 2.4);
  x.translate(p.pos.x, p.pos.z); x.rotate(-p.rot + Math.PI);
  x.fillStyle = '#fff'; x.strokeStyle = '#123'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, -6); x.lineTo(4.2, 4.5); x.lineTo(0, 2.2); x.lineTo(-4.2, 4.5); x.closePath(); x.fill(); x.stroke();
}
