// 목표(튜토리얼 겸 진행) 시스템
import { on, emit } from './util.js';
const gain = (id) => (e) => e.id === id ? e.n : 0, is = (v) => (e) => e === v ? 1 : 0;
export const QUESTS = [
  { t: '나뭇가지 3개 줍기', d: '바닥의 나뭇가지에 다가가 행동 버튼을 누르세요.', ev: 'gain', m: gain('stick'), need: 3, xp: 10 },
  { t: '돌 3개 줍기', d: '주변에 굴러다니는 돌멩이를 모으세요.', ev: 'gain', m: gain('stone'), need: 3, xp: 10 },
  { t: '풀 섬유 1개 모으기', d: '길게 자란 억새풀을 뜯으면 섬유를 얻습니다.', ev: 'gain', m: gain('fiber'), need: 1, xp: 10 },
  { t: '돌도끼 만들기', d: '🔨 제작 메뉴에서 돌도끼를 만드세요.', ev: 'craft', m: is('axe_stone'), need: 1, xp: 20 },
  { t: '통나무 4개 모으기', d: '도끼를 단축 슬롯에서 선택하고 나무를 베세요.', ev: 'gain', m: gain('wood'), need: 4, xp: 20 },
  { t: '모닥불 설치하기', d: '모닥불을 제작한 뒤, 가방에서 사용해 설치하세요.', ev: 'place', m: is('campfire'), need: 1, xp: 25 },
  { t: '음식 먹기', d: '열매 덤불에서 열매를 따서 먹어보세요.', ev: 'eat', m: () => 1, need: 1, xp: 10 },
  { t: '물 마시기', d: '물가에 가서 행동 버튼을 누르세요.', ev: 'drink', m: () => 1, need: 1, xp: 10 },
  { t: '돌곡괭이 만들기', d: '바위를 캐려면 곡괭이가 필요합니다.', ev: 'craft', m: is('pick_stone'), need: 1, xp: 20 },
  { t: '작업대 설치하기', d: '밧줄(섬유 3개)과 통나무, 돌이 필요합니다.', ev: 'place', m: is('workbench'), need: 1, xp: 30 },
  { t: '사냥용 창 만들기', d: '부싯돌은 해변이나 고지대에서 찾을 수 있습니다.', ev: 'craft', m: is('spear'), need: 1, xp: 20 },
  { t: '동물 사냥하기', d: '토끼, 사슴, 멧돼지를 사냥해 고기와 가죽을 얻으세요.', ev: 'kill', m: () => 1, need: 1, xp: 30 },
  { t: '고기 굽기', d: '모닥불 근처에서 제작 메뉴를 열어 고기를 구우세요.', ev: 'craft', m: is('cooked_meat'), need: 1, xp: 20 },
  { t: '텐트 설치하기', d: '작업대 근처에서 텐트를 제작하세요. 가죽이 필요합니다.', ev: 'place', m: is('tent'), need: 1, xp: 40 },
  { t: '텐트에서 잠자기', d: '저녁이 되면 텐트에서 아침까지 잘 수 있습니다.', ev: 'sleep', m: () => 1, need: 1, xp: 30 },
  { t: '루미 길들이기', d: '민트색 생물 루미에게 숲 열매를 3번 주면 친구가 됩니다.', ev: 'tame', m: () => 1, need: 1, xp: 60 },
  { t: '화로 설치하기', d: '돌을 넉넉히 모아 화로를 만드세요.', ev: 'place', m: is('furnace'), need: 1, xp: 40 },
  { t: '철 주괴 2개 제련하기', d: '고지대의 철광석을 캐서 화로에서 제련하세요.', ev: 'gain', m: gain('ingot'), need: 2, xp: 50 },
  { t: '철 도구 만들기', d: '작업대에서 철도끼, 철곡괭이, 철검 중 하나를 만드세요.', ev: 'craft', m: (e) => e.endsWith('_iron') ? 1 : 0, need: 1, xp: 60 },
  { t: '텃밭에서 수확하기', d: '텃밭을 설치하고 씨앗을 심어 당근을 수확하세요.', ev: 'harvest', m: () => 1, need: 1, xp: 60 },
];
export const quest = { i: 0, n: 0 };
for (const ev of new Set(QUESTS.map(q => q.ev))) on(ev, (e) => {
  const q = QUESTS[quest.i]; if (!q || q.ev !== ev) return;
  quest.n += q.m(e);
  if (quest.n >= q.need) { quest.i++; quest.n = 0; emit('questDone', q); } else emit('questProg');
});
