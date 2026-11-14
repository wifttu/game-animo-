// 목표(튜토리얼 겸 진행) 시스템
import { on, emit } from './util.js';
const gain = (id) => (e) => e.id === id ? e.n : 0, is = (v) => (e) => e === v ? 1 : 0;
export const QUESTS = [
  { t: '통나무 3개 모으기', d: '나무에 다가가 행동 버튼을 누르고 있으면 맨손으로도 벨 수 있습니다.', ev: 'gain', m: gain('wood'), need: 3, xp: 10 },
  { t: '판자 만들기', d: '🔨 제작 → 기초·재료에서 통나무를 판자로 만드세요.', ev: 'craft', m: is('plank'), need: 1, xp: 10 },
  { t: '작업대 만들어 설치하기', d: '판자 4개로 작업대를 만들고, 가방에서 사용해 설치하세요.', ev: 'place', m: is('workbench'), need: 1, xp: 20 },
  { t: '막대기 만들기', d: '판자를 다듬어 막대기를 만드세요. 도구 손잡이로 쓰입니다.', ev: 'craft', m: is('stick'), need: 1, xp: 10 },
  { t: '나무 곡괭이 만들기', d: '작업대 근처에서 제작 → 도구·장비를 여세요. (판자 3, 막대기 2)', ev: 'craft', m: is('pick_wood'), need: 1, xp: 20 },
  { t: '돌 6개 캐기', d: '곡괭이를 단축 슬롯에서 선택하고 회색 바위를 캐세요.', ev: 'gain', m: gain('stone'), need: 6, xp: 20 },
  { t: '돌곡괭이 만들기', d: '돌 3개와 막대기 2개. 철광석을 캘 수 있게 됩니다.', ev: 'craft', m: is('pick_stone'), need: 1, xp: 25 },
  { t: '돌 무기 만들기', d: '작업대에서 돌검이나 사냥용 창을 만드세요.', ev: 'craft', m: (e) => e === 'sword_stone' || e === 'spear' ? 1 : 0, need: 1, xp: 25 },
  { t: '모닥불 설치하기', d: '통나무 3개와 막대기 2개. 밤의 추위와 늑대를 막아 줍니다.', ev: 'place', m: is('campfire'), need: 1, xp: 25 },
  { t: '음식 먹기', d: '열매 덤불에서 열매를 따서 먹어보세요.', ev: 'eat', m: () => 1, need: 1, xp: 10 },
  { t: '물 마시기', d: '물가에 가서 행동 버튼을 누르세요.', ev: 'drink', m: () => 1, need: 1, xp: 10 },
  { t: '동물 사냥하기', d: '토끼, 사슴, 멧돼지를 사냥해 고기와 가죽을 얻으세요.', ev: 'kill', m: () => 1, need: 1, xp: 30 },
  { t: '고기 굽기', d: '모닥불 근처에서 제작 → 음식·치료를 열어 고기를 구우세요.', ev: 'craft', m: is('cooked_meat'), need: 1, xp: 20 },
  { t: '화로 설치하기', d: '돌 8개로 화로를 만드세요. 철을 제련할 수 있습니다.', ev: 'place', m: is('furnace'), need: 1, xp: 40 },
  { t: '철광석 3개 캐기', d: '주황빛 광맥이 박힌 바위는 높은 산에 있습니다. 돌곡괭이가 필요합니다.', ev: 'gain', m: gain('ore'), need: 3, xp: 40 },
  { t: '철 주괴 3개 제련하기', d: '화로 근처에서 철광석과 판자(연료)로 철 주괴를 만드세요.', ev: 'gain', m: gain('ingot'), need: 3, xp: 50 },
  { t: '철 도구 만들기', d: '작업대에서 철곡괭이, 철도끼, 철검 중 하나를 만드세요.', ev: 'craft', m: (e) => e.endsWith('_iron') ? 1 : 0, need: 1, xp: 60 },
  { t: '텐트 설치하기', d: '판자, 밧줄(풀 섬유 3개), 가죽으로 텐트를 만드세요.', ev: 'place', m: is('tent'), need: 1, xp: 40 },
  { t: '텐트에서 잠자기', d: '저녁이 되면 텐트에서 아침까지 잘 수 있습니다.', ev: 'sleep', m: () => 1, need: 1, xp: 30 },
  { t: '루미 길들이기', d: '민트색 생물 루미에게 숲 열매를 3번 주면 친구가 됩니다.', ev: 'tame', m: () => 1, need: 1, xp: 60 },
  { t: '텃밭에서 수확하기', d: '텃밭을 설치하고 씨앗을 심어 당근을 수확하세요.', ev: 'harvest', m: () => 1, need: 1, xp: 60 },
];
export const quest = { i: 0, n: 0 };
for (const ev of new Set(QUESTS.map(q => q.ev))) on(ev, (e) => {
  const q = QUESTS[quest.i]; if (!q || q.ev !== ev) return;
  quest.n += q.m(e);
  if (quest.n >= q.need) { quest.i++; quest.n = 0; emit('questDone', q); } else emit('questProg');
});
