// 아이템 / 제작법 정의
export const ITEMS = {
  // 재료
  wood: { name: '통나무', icon: '🪵', desc: '나무를 쳐서 얻는다. 모든 것의 시작.' },
  plank: { name: '판자', icon: '🟫', desc: '통나무를 켜서 만든 판자. 도구와 건축의 기본 재료.' },
  stick: { name: '막대기', icon: '🥢', desc: '판자를 다듬어 만든다. 도구의 손잡이.' },
  stone: { name: '돌', icon: '🪨', desc: '곡괭이로 바위를 캐서 얻는다.' },
  flint: { name: '부싯돌', icon: '🔹', desc: '바위를 캐다 보면 가끔 나온다. 창날로 쓴다.' },
  fiber: { name: '풀 섬유', icon: '🌾', desc: '질긴 풀. 밧줄을 꼴 수 있다.' },
  sap: { name: '수액', icon: '🍯', desc: '끈적한 나무 진액. 횃불 연료.' },
  rope: { name: '밧줄', icon: '🧶', desc: '섬유를 꼬아 만든 튼튼한 줄.' },
  hide: { name: '가죽', icon: '👜', desc: '동물에게서 얻는 가죽.' },
  ore: { name: '철광석', icon: '⛰️', desc: '돌곡괭이 이상으로 캘 수 있다. 화로에서 제련한다.' },
  ingot: { name: '철 주괴', icon: '🔩', desc: '제련한 철. 가장 좋은 도구의 재료.' },
  seed: { name: '씨앗', icon: '🌱', desc: '텃밭에 심으면 당근이 자란다.' },
  herb: { name: '약초', icon: '🌿', desc: '상처에 좋은 풀.' },
  // 음식
  berry: { name: '숲 열매', icon: '🫐', food: { hunger: 8, thirst: 4 }, desc: '새콤달콤한 열매. 루미가 좋아한다.' },
  mushroom: { name: '버섯', icon: '🍄', food: { hunger: 6 }, desc: '구워 먹으면 더 든든하다.' },
  carrot: { name: '당근', icon: '🥕', food: { hunger: 14, thirst: 3 }, desc: '텃밭에서 기른 당근.' },
  meat: { name: '생고기', icon: '🥩', food: { hunger: 10, hp: -8 }, desc: '날로 먹으면 탈이 난다. 구워 먹자.' },
  cooked_meat: { name: '구운 고기', icon: '🍖', food: { hunger: 38, hp: 5 }, desc: '노릇하게 구운 고기.' },
  roast_mushroom: { name: '구운 버섯', icon: '🍢', food: { hunger: 16 }, desc: '향긋하게 구운 버섯 꼬치.' },
  juice: { name: '열매 주스', icon: '🧃', food: { thirst: 32, hunger: 6 }, desc: '갈증을 시원하게 풀어준다.' },
  stew: { name: '모둠 스튜', icon: '🍲', food: { hunger: 65, thirst: 20, hp: 25 }, desc: '몸과 마음이 따뜻해지는 스튜.' },
  bandage: { name: '약초 붕대', icon: '🩹', food: { hp: 40 }, desc: '체력을 회복한다.' },
  // 도구: tier 0 나무 · 1 돌 · 2 철 / lvl = 채굴 등급 (바위 1 이상, 철광석 2 이상)
  pick_wood: { name: '나무 곡괭이', icon: '⛏️', tier: 0, tool: { kind: 'pick', lvl: 1, power: 6, dmg: 6, dur: 40 }, desc: '바위를 캘 수 있다. 철광석은 캐지 못한다.' },
  axe_wood: { name: '나무 도끼', icon: '🪓', tier: 0, tool: { kind: 'axe', lvl: 1, power: 9, dmg: 8, dur: 40 }, desc: '맨손보다 빠르게 나무를 벤다.' },
  sword_wood: { name: '나무 검', icon: '🗡️', tier: 0, tool: { kind: 'sword', dmg: 12, reach: 2.8, dur: 40 }, desc: '없는 것보다는 낫다.' },
  pick_stone: { name: '돌곡괭이', icon: '⛏️', tier: 1, tool: { kind: 'pick', lvl: 2, power: 11, dmg: 8, dur: 90 }, desc: '철광석까지 캘 수 있다.' },
  axe_stone: { name: '돌도끼', icon: '🪓', tier: 1, tool: { kind: 'axe', lvl: 2, power: 14, dmg: 12, dur: 90 }, desc: '나무를 빠르게 벤다.' },
  sword_stone: { name: '돌검', icon: '🗡️', tier: 1, tool: { kind: 'sword', dmg: 20, reach: 2.9, dur: 90 }, desc: '제법 쓸 만한 무기.' },
  spear: { name: '사냥용 창', icon: '🔱', tier: 1, tool: { kind: 'spear', dmg: 22, reach: 3.6, dur: 60 }, desc: '긴 사거리의 사냥 무기.' },
  pick_iron: { name: '철곡괭이', icon: '⛏️', tier: 2, tool: { kind: 'pick', lvl: 3, power: 24, dmg: 14, dur: 240 }, desc: '무엇이든 순식간에 캔다.' },
  axe_iron: { name: '철도끼', icon: '🪓', tier: 2, tool: { kind: 'axe', lvl: 3, power: 26, dmg: 18, dur: 240 }, desc: '훨씬 빠르게 나무를 벤다.' },
  sword_iron: { name: '철검', icon: '🗡️', tier: 2, tool: { kind: 'sword', dmg: 38, reach: 3, dur: 200 }, desc: '강력한 근접 무기.' },
  torch: { name: '횃불', icon: '🔥', tool: { kind: 'torch', dmg: 7, dur: 0 }, desc: '어둠을 밝히고 몸을 조금 데워준다.' },
  coat: { name: '가죽 외투', icon: '🧥', armor: { def: 0.4, warm: 22 }, desc: '추위와 공격을 막아준다. 사용하면 착용.' },
  // 설치물
  workbench: { name: '작업대', icon: '🛠️', place: true, desc: '도구를 만들려면 꼭 필요하다. 가방에서 사용해 설치.' },
  campfire: { name: '모닥불', icon: '🏕️', place: true, desc: '요리를 하고 몸을 녹인다. 늑대가 불을 무서워한다.' },
  furnace: { name: '화로', icon: '🧱', place: true, desc: '철광석을 구워 철 주괴로 만든다.' },
  tent: { name: '텐트', icon: '⛺', place: true, desc: '밤에 잠을 자고 부활 지점을 정한다.' },
  chest: { name: '보관 상자', icon: '🧰', place: true, desc: '아이템을 보관한다.' },
  plot: { name: '텃밭', icon: '🟤', place: true, desc: '씨앗을 심어 작물을 기른다.' },
  fence: { name: '나무 울타리', icon: '🚧', place: true, desc: '동물의 접근을 막는다.' },
  wall: { name: '나무 벽', icon: '🚪', place: true, desc: '튼튼한 나무 벽.' },
  floor: { name: '나무 바닥', icon: '🟧', place: true, desc: '평평한 바닥.' },
};
for (const k in ITEMS) {
  const it = ITEMS[k]; it.id = k;
  it.stack = it.tool || it.armor ? 1 : 99;
}

// 제작 흐름: 맨손 벌목 → 판자·막대기·작업대 → 나무 도구 → 돌 → 돌 도구 → 철광석 → 화로 제련 → 철 도구
// station: null(맨손) | workbench | campfire | furnace
export const RECIPES = [
  { out: 'plank', n: 2, cat: 'mat', need: { wood: 1 } },
  { out: 'stick', n: 2, cat: 'mat', need: { plank: 1 } },
  { out: 'workbench', n: 1, cat: 'mat', need: { plank: 4 } },
  { out: 'rope', n: 1, cat: 'mat', need: { fiber: 3 } },
  { out: 'torch', n: 1, cat: 'mat', need: { stick: 1, sap: 1 } },
  { out: 'ingot', n: 1, cat: 'mat', station: 'furnace', need: { ore: 1, plank: 1 } },

  { out: 'pick_wood', n: 1, cat: 'tool', station: 'workbench', need: { plank: 3, stick: 2 } },
  { out: 'axe_wood', n: 1, cat: 'tool', station: 'workbench', need: { plank: 3, stick: 2 } },
  { out: 'sword_wood', n: 1, cat: 'tool', station: 'workbench', need: { plank: 2, stick: 1 } },
  { out: 'pick_stone', n: 1, cat: 'tool', station: 'workbench', need: { stone: 3, stick: 2 } },
  { out: 'axe_stone', n: 1, cat: 'tool', station: 'workbench', need: { stone: 3, stick: 2 } },
  { out: 'sword_stone', n: 1, cat: 'tool', station: 'workbench', need: { stone: 2, stick: 1 } },
  { out: 'spear', n: 1, cat: 'tool', station: 'workbench', need: { stick: 2, flint: 1, fiber: 1 } },
  { out: 'pick_iron', n: 1, cat: 'tool', station: 'workbench', need: { ingot: 3, stick: 2 } },
  { out: 'axe_iron', n: 1, cat: 'tool', station: 'workbench', need: { ingot: 3, stick: 2 } },
  { out: 'sword_iron', n: 1, cat: 'tool', station: 'workbench', need: { ingot: 2, stick: 1 } },
  { out: 'coat', n: 1, cat: 'tool', station: 'workbench', need: { hide: 4, rope: 2 } },

  { out: 'juice', n: 1, cat: 'food', need: { berry: 4 } },
  { out: 'bandage', n: 1, cat: 'food', need: { herb: 1, fiber: 2 } },
  { out: 'cooked_meat', n: 1, cat: 'food', station: 'campfire', need: { meat: 1 } },
  { out: 'roast_mushroom', n: 1, cat: 'food', station: 'campfire', need: { mushroom: 1, stick: 1 } },
  { out: 'stew', n: 1, cat: 'food', station: 'campfire', need: { cooked_meat: 1, carrot: 1, mushroom: 1 } },

  { out: 'campfire', n: 1, cat: 'build', need: { wood: 3, stick: 2 } },
  { out: 'furnace', n: 1, cat: 'build', station: 'workbench', need: { stone: 8 } },
  { out: 'chest', n: 1, cat: 'build', station: 'workbench', need: { plank: 8 } },
  { out: 'tent', n: 1, cat: 'build', station: 'workbench', need: { plank: 6, rope: 2, hide: 2 } },
  { out: 'plot', n: 1, cat: 'build', station: 'workbench', need: { plank: 4, fiber: 2 } },
  { out: 'fence', n: 2, cat: 'build', station: 'workbench', need: { plank: 2, stick: 2 } },
  { out: 'wall', n: 1, cat: 'build', station: 'workbench', need: { plank: 4 } },
  { out: 'floor', n: 2, cat: 'build', station: 'workbench', need: { plank: 3 } },
];
export const STATION_NAME = { workbench: '작업대', campfire: '모닥불', furnace: '화로' };
export const CATS = [['mat', '기초·재료'], ['tool', '도구·장비'], ['food', '음식·치료'], ['build', '건축']];

// 인벤토리
export const inv = { slots: Array(24).fill(null), sel: 0 };
export const HOTBAR = 6;

export function invCount(id, slots = inv.slots) {
  let n = 0; for (const s of slots) if (s && s.id === id) n += s.n; return n;
}
export function invAdd(id, n = 1, dur, slots = inv.slots) {
  const it = ITEMS[id];
  if (it.stack > 1) for (const s of slots) {
    if (n <= 0) break;
    if (s && s.id === id && s.n < it.stack) { const k = Math.min(n, it.stack - s.n); s.n += k; n -= k; }
  }
  for (let i = 0; i < slots.length && n > 0; i++) {
    if (!slots[i]) {
      const k = Math.min(n, it.stack);
      slots[i] = { id, n: k }; if (it.tool) slots[i].dur = dur ?? it.tool.dur;
      n -= k;
    }
  }
  return n; // 남은 수량 (가방이 가득 찬 경우)
}
export function invRemove(id, n = 1, slots = inv.slots) {
  for (let i = slots.length - 1; i >= 0 && n > 0; i--) {
    const s = slots[i];
    if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (s.n <= 0) slots[i] = null; }
  }
  return n === 0;
}
export const equipped = () => { const s = inv.slots[inv.sel]; return s ? ITEMS[s.id] : null; };
export function canCraft(r) { for (const k in r.need) if (invCount(k) < r.need[k]) return false; return true; }
