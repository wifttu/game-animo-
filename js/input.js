// 입력: 터치 조이스틱 + 화면 드래그 카메라 + 키보드/마우스
export const input = { mx: 0, my: 0, lookX: 0, lookY: 0, zoom: 0, jump: false, sprint: false, action: false };
const keys = {};
import { G } from './util.js';
import { applyLayout } from './layout.js';

export function initInput(onAction, onKey) {
  const layer = document.getElementById('touch'), joy = document.getElementById('joy'), knob = document.getElementById('joyk');
  let joyId = null, jx = 0, jy = 0, R = 52; const look = new Map(); let pinch = 0;
  layer.addEventListener('pointerdown', e => {
    if (G.editing) return;
    layer.setPointerCapture(e.pointerId);
    // 조이스틱 기준 위치(사용자가 옮겼을 수 있음)에 따라 조작 영역을 정한다
    const r = joy.getBoundingClientRect(), bx = r.left + r.width / 2, by = r.top + r.height / 2;
    R = 52 * (G.settings.btnScale || 1);
    const inZone = G.settings.joyFixed ? Math.hypot(e.clientX - bx, e.clientY - by) < R * 1.7
      : (bx < innerWidth / 2 ? e.clientX < innerWidth * .45 : e.clientX > innerWidth * .55);
    if (e.pointerType !== 'mouse' && joyId === null && inZone) {
      joyId = e.pointerId; [jx, jy] = G.settings.joyFixed ? [bx, by] : [e.clientX, e.clientY];
      joy.style.left = jx + 'px'; joy.style.top = jy + 'px'; joy.classList.add('on'); knob.style.transform = '';
      if (G.settings.joyFixed) move(e);
    } else look.set(e.pointerId, [e.clientX, e.clientY]);
  });
  const move = (e) => {
    let dx = e.clientX - jx, dy = e.clientY - jy; const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; input.mx = dx / R; input.my = -dy / R;
  };
  layer.addEventListener('pointermove', e => {
    if (e.pointerId === joyId) { move(e);
    } else if (look.has(e.pointerId)) {
      const l = look.get(e.pointerId);
      if (look.size === 2) {
        const [a, b] = [...look.entries()].map(([id, v]) => id === e.pointerId ? [e.clientX, e.clientY] : v), d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) input.zoom -= (d - pinch) * .004; pinch = d;
      } else { input.lookX += e.clientX - l[0]; input.lookY += e.clientY - l[1]; }
      l[0] = e.clientX; l[1] = e.clientY;
    }
  });
  const up = e => {
    if (e.pointerId === joyId) { joyId = null; input.mx = input.my = 0; joy.classList.remove('on'); knob.style.transform = ''; applyLayout(); }
    look.delete(e.pointerId); pinch = 0;
  };
  layer.addEventListener('pointerup', up); layer.addEventListener('pointercancel', up);
  layer.addEventListener('wheel', e => { input.zoom += Math.sign(e.deltaY) * .08; }, { passive: true });
  document.addEventListener('contextmenu', e => e.preventDefault());

  // 버튼: 누르고 있으면 반복
  const hold = (id, fn, repeat) => {
    const el = document.getElementById(id); let iv = null;
    const stop = () => { clearInterval(iv); iv = null; el.classList.remove('down'); };
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('down'); fn(); if (repeat && !iv) iv = setInterval(fn, 120); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, stop);
  };
  hold('btnAct', onAction, true);
  hold('btnJump', () => { input.jump = true; });

  const kb = () => {
    input.mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    input.my = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    input.sprint = !!(keys.ShiftLeft || keys.ShiftRight); input.action = !!(keys.KeyE || keys.KeyF);
  };
  addEventListener('keydown', e => {
    if (e.repeat) return; keys[e.code] = true; kb();
    if (e.code === 'Space') { input.jump = true; e.preventDefault(); }
    if (e.code === 'KeyE' || e.code === 'KeyF') onAction();
    onKey(e.code);
  });
  addEventListener('keyup', e => { keys[e.code] = false; kb(); });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; kb(); });
}
