// 조작 버튼 배치: 저장된 위치 적용 + 드래그 편집 모드
import { G } from './util.js';
import { saveSettings } from './save.js';

const IDS = ['joy', 'btnAct', 'btnJump', 'btnDemolish', 'hotbar'];
const $ = (id) => document.getElementById(id);
const orient = () => innerWidth >= innerHeight ? 'land' : 'port';
const store = () => { const L = G.settings.layout ??= {}; return L[orient()] ??= {}; };

export function applyLayout() {
  const L = store();
  document.documentElement.style.setProperty('--bs', G.settings.btnScale || 1);
  for (const id of IDS) {
    const el = $(id), p = L[id];
    el.classList.toggle('custom', !!p);
    el.style.left = p ? p[0] * 100 + '%' : ''; el.style.top = p ? p[1] * 100 + '%' : '';
  }
}

export function startLayoutEdit() {
  G.editing = true; G.paused = true;
  $('hud').classList.add('editing'); $('layoutBar').classList.remove('hidden');
}
function finish() {
  G.editing = false; G.paused = false;
  $('hud').classList.remove('editing'); $('layoutBar').classList.add('hidden');
  saveSettings(); applyLayout();
}

export function initLayout() {
  for (const id of IDS) {
    const el = $(id); let drag = null;
    el.addEventListener('pointerdown', (e) => {
      if (!G.editing) return;
      e.stopImmediatePropagation(); e.preventDefault();
      const r = el.getBoundingClientRect();
      drag = [e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2), r.width / 2, r.height / 2];
      el.setPointerCapture(e.pointerId);
    }, true);
    el.addEventListener('pointermove', (e) => {
      if (!drag) return; e.stopImmediatePropagation();
      const x = Math.max(drag[2], Math.min(innerWidth - drag[2], e.clientX - drag[0])), y = Math.max(drag[3], Math.min(innerHeight - drag[3], e.clientY - drag[1]));
      store()[id] = [x / innerWidth, y / innerHeight]; applyLayout();
    }, true);
    const up = (e) => { if (drag) { drag = null; e.stopImmediatePropagation(); } };
    el.addEventListener('pointerup', up, true); el.addEventListener('pointercancel', up, true);
    el.addEventListener('click', (e) => { if (G.editing) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  }
  $('layoutDone').addEventListener('click', finish);
  $('layoutReset').addEventListener('click', () => { G.settings.layout[orient()] = {}; applyLayout(); });
  addEventListener('resize', applyLayout);
  applyLayout();
}
