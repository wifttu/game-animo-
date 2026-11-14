// 목표(튜토리얼 겸 진행) 시스템
import { on, emit } from './util.js';
const gain = (id) => (e) => e.id === id ? e.n : 0, is = (v) => (e) => e === v ? 1 : 0;
export const QUESTS = [
  { t: '물고기 낚기', d: '낚싯대를 들고 물가에서 행동 버튼을 누르세요. 찌가 가라앉으면(❗) 한 번 더 누릅니다.', ev: 'fish', m: () => 1, need: 1, xp: 15 },
  { t: '통나무 4개 모으기', d: '나무에 다가가 행동 버튼을 누르고 있으면 맨손으로도 벨 수 있습니다.', ev: 'gain', m: gain('wood'), need: 4, xp: 10 },
  { t: '판자 만들기', d: '🔨 제작 → 기초·재료에서 통나무를 판자로 만드세요.', ev: 'craft', m: is('plank'), need: 1, xp: 10 },
  { t: '막대기 만들기', d: '판자를 다듬어 막대기를 만드세요.', ev: 'craft', m: is('stick'), need: 1, xp: 10 },
  { t: '모닥불 설치하기', d: '통나무 3개와 막대기 2개. 가방에서 사용해 설치합니다.', ev: 'place', m: is('campfire'), need: 1, xp: 20 },
  { t: '생선 구워 먹기', d: '모닥불 근처에서 제작 → 음식·치료에서 생선을 굽고 먹어 보세요.', ev: 'eat', m: (e) => ['grilled_fish', 'grilled_trout', 'steamed_crayfish', 'gold_feast'].includes(e) ? 1 : 0, need: 1, xp: 20 },
  { t: '물 마시기', d: '낚싯대가 아닌 칸을 선택하고 물가에서 행동 버튼을 누르세요.', ev: 'drink', m: () => 1, need: 1, xp: 10 },
  { t: '작업대 만들어 설치하기', d: '판자 4개로 작업대를 만들고 설치하세요.', ev: 'place', m: is('workbench'), need: 1, xp: 20 },
  { t: '텐트 치기', d: '작업대 옆에서 텐트를 만드세요. (판자 4, 막대기 4, 풀 섬유 6)', ev: 'place', m: is('tent'), need: 1, xp: 30 },
  { t: '텐트에서 잠자기', d: '저녁이 되면 텐트에서 아침까지 잘 수 있습니다.', ev: 'sleep', m: () => 1, need: 1, xp: 30 },
  { t: '나무 곡괭이 만들기', d: '작업대 옆에서 제작 → 도구·장비. (판자 3, 막대기 2)', ev: 'craft', m: is('pick_wood'), need: 1, xp: 20 },
  { t: '돌 6개 캐기', d: '곡괭이를 선택하고 회색 바위를 캐세요.', ev: 'gain', m: gain('stone'), need: 6, xp: 20 },
  { t: '집 바닥 4칸 깔기', d: '이제 집을 지어 봅시다. 바닥을 2×2로 붙여 깔아 보세요.', ev: 'place', m: is('floor'), need: 4, xp: 30 },
  { t: '벽 6개 세우기', d: '바닥 가장자리에 벽을 세우세요. 회전 버튼으로 방향을 바꿉니다. 문 자리 한 곳은 비워 두세요.', ev: 'place', m: is('wall'), need: 6, xp: 30 },
  { t: '문 달기', d: '비워 둔 자리에 문을 설치하세요. 행동 버튼으로 여닫습니다.', ev: 'place', m: is('door'), need: 1, xp: 25 },
  { t: '지붕 4칸 올리기', d: '바닥 위에 서서 지붕을 올리세요. 지붕 아래는 따뜻한 실내입니다.', ev: 'place', m: is('roof'), need: 4, xp: 40 },
  { t: '침대 놓기', d: '집 안에 침대를 놓으세요. 텐트보다 푹 잘 수 있습니다.', ev: 'place', m: is('bed'), need: 1, xp: 30 },
  { t: '텃밭 만들기', d: '집 옆에 텃밭을 설치하고 씨앗을 심어 보세요.', ev: 'place', m: is('plot'), need: 1, xp: 25 },
  { t: '작물 수확하기', d: '다 자란 텃밭에 다가가 행동 버튼을 누르세요.', ev: 'harvest', m: () => 1, need: 1, xp: 50 },
  { t: '돌곡괭이 만들기', d: '돌 3개와 막대기 2개. 철광석을 캘 수 있게 됩니다.', ev: 'craft', m: is('pick_stone'), need: 1, xp: 25 },
  { t: '돌 무기 만들기', d: '작업대에서 돌검이나 사냥용 창을 만드세요.', ev: 'craft', m: (e) => e === 'sword_stone' || e === 'spear' ? 1 : 0, need: 1, xp: 25 },
  { t: '동물 사냥하기', d: '토끼, 사슴, 멧돼지를 사냥해 고기와 가죽을 얻으세요.', ev: 'kill', m: () => 1, need: 1, xp: 30 },
  { t: '화로 설치하기', d: '돌 8개로 화로를 만드세요.', ev: 'place', m: is('furnace'), need: 1, xp: 40 },
  { t: '철광석 3개 캐기', d: '주황빛 광맥이 박힌 바위는 높은 산에 있습니다. 돌곡괭이가 필요합니다.', ev: 'gain', m: gain('ore'), need: 3, xp: 40 },
  { t: '철 주괴 3개 제련하기', d: '화로 근처에서 철광석과 판자(연료)로 만드세요.', ev: 'gain', m: gain('ingot'), need: 3, xp: 50 },
  { t: '철 도구 만들기', d: '작업대에서 철곡괭이, 철도끼, 철검 중 하나를 만드세요.', ev: 'craft', m: (e) => e.endsWith('_iron') ? 1 : 0, need: 1, xp: 60 },
  { t: '루미 길들이기', d: '민트색 생물 루미에게 숲 열매를 3번 주면 친구가 됩니다.', ev: 'tame', m: () => 1, need: 1, xp: 60 },
  { t: '마을 상인에게 물건 팔기', d: '미니맵의 노란 표식이 마을입니다. 상인에게 다가가 행동 버튼을 누르고 물고기나 작물을 팔아 보세요.', ev: 'sell', m: () => 1, need: 1, xp: 40 },
  { t: '코인으로 물건 사기', d: '마을마다 파는 물건이 다릅니다. 모은 코인으로 필요한 것을 사 보세요.', ev: 'buy', m: () => 1, need: 1, xp: 40 },
  { t: '배를 타고 다른 섬으로 가기', d: '부두가 있는 항구 마을에서 배에 다가가 행동 버튼을 누르고, 지도에서 목적지를 고르세요.', ev: 'sail', m: () => 1, need: 1, xp: 60 },
];
export const QUEST_VER = 3; // 목표 구성이 바뀌면 올린다 (이전 저장의 목표 진행은 처음부터)
export const quest = { i: 0, n: 0 };
for (const ev of new Set(QUESTS.map(q => q.ev))) on(ev, (e) => {
  const q = QUESTS[quest.i]; if (!q || q.ev !== ev) return;
  quest.n += q.m(e);
  if (quest.n >= q.need) { quest.i++; quest.n = 0; emit('questDone', q); } else emit('questProg');
});
