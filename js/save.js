// 저장 / 불러오기 (localStorage)
import { G } from './util.js';
import { inv } from './items.js';
import { saveNodes, loadNodes } from './nodes.js';
import { addStruct } from './structs.js';
import { spawnAnimal } from './animals.js';
import { quest } from './quests.js';
import { heightAt } from './world.js';
const KEY = 'lumi-island-save-v1';

export const hasSave = () => { try { return !!localStorage.getItem(KEY); } catch { return false; } };
export const clearSave = () => { try { localStorage.removeItem(KEY); } catch { /* 저장소 사용 불가 */ } };
export function save() {
  if (!G.started || G.dead) return;
  const p = G.player;
  const data = { v: 1, clock: G.clock, tod: G.tod, day: G.day, stats: G.stats, spawn: G.spawn, armor: G.armor, pos: [p.pos.x, p.pos.z], yaw: p.cam.yaw,
    inv: inv.slots, sel: inv.sel, structs: G.structs.map(s => ({ type: s.type, x: s.x, z: s.z, rot: s.rot, data: s.data })),
    nodes: saveNodes(), pet: G.pet ? [G.pet.x, G.pet.z] : null, quest, settings: G.settings };
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* 저장소 사용 불가 */ }
}
export function loadSettings() { try { Object.assign(G.settings, JSON.parse(localStorage.getItem(KEY))?.settings); } catch { /* 없음 */ } }
export function load() {
  let d; try { d = JSON.parse(localStorage.getItem(KEY)); } catch { return false; }
  if (!d || d.v !== 1) return false;
  G.clock = d.clock; G.tod = d.tod; G.day = d.day; Object.assign(G.stats, d.stats); G.spawn = d.spawn; G.armor = d.armor;
  const p = G.player; p.pos.set(d.pos[0], heightAt(d.pos[0], d.pos[1]), d.pos[1]); p.cam.yaw = d.yaw || 0;
  d.inv.forEach((s, i) => { inv.slots[i] = s; }); inv.sel = d.sel || 0;
  for (const s of d.structs) addStruct(s.type, s.x, s.z, s.rot, s.data);
  loadNodes(d.nodes);
  if (d.pet) spawnAnimal('lumi', d.pet[0], d.pet[1], true);
  Object.assign(quest, d.quest);
  return true;
}
