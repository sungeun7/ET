/**
 * 오리지널 서사 — Rhapsody「Emerald Sword」의 서사 모티프
 * (전설의 검 탐구 · 운명의 날개 · 암흑과의 결전)를 각색.
 * 원곡 가사는 저작권상 인용하지 않습니다.
 */

export const PROLOGUE = {
  eyebrow: 'Quest for the Emerald Blade',
  title: '에메랄드 택틱스',
  lede:
    '어둠이 왕국을 덮을 때, 운명의 기사는 전설의 에메랄드 소드를 찾아 떠난다. ' +
    '산과 숲과 거센 파도를 건너, 빛의 문 앞에서 검은 왕과 맞서리라.',
  howTo: [
    '유닛 클릭 → 이동 가능 칸 표시',
    '노란 칸으로 이동 후 빨간 칸의 적 공격',
    '5스테이지마다 보스, 스테이지가 오를수록 적 강화',
  ],
};

export const EPILOGUE =
  '에메랄드의 불꽃이 하늘을 가른다. 검은 왕좌는 무너지고, 왕국에 다시 아침이 온다. ' +
  '운명의 기사는 검을 칼집에 넣으며 속삭인다 — 빛은 싸울 용기를 가진 자의 것이다.';

/** 5막 구조 (각 10스테이지) */
export const ACTS = [
  {
    id: 1,
    range: [1, 10],
    name: '제1막 · 운명의 부름',
    summary: '침략의 불길이 초원을 태운다. 기사는 검을 들고 동쪽의 예언을 향해 발을 내딛는다.',
  },
  {
    id: 2,
    range: [11, 20],
    name: '제2막 · 마법의 숲',
    summary: '고대의 속삭임이 깃든 숲을 가로지른다. 현자의 지혜만이 검의 행방을 밝힌다.',
  },
  {
    id: 3,
    range: [21, 30],
    name: '제3막 · 혼돈의 바다',
    summary: '갈라진 강과 폭풍의 협곡을 넘는다. 운명의 날개가 전장을 가른다.',
  },
  {
    id: 4,
    range: [31, 40],
    name: '제4막 · 상아의 문',
    summary: '성스러운 유적 너머, 에메랄드 소드가 잠든 성소가 열린다.',
  },
  {
    id: 5,
    range: [41, 50],
    name: '제5막 · 에메랄드의 불꽃',
    summary: '검은 왕좌 앞에서 최후의 결전이 시작된다. 빛이여, 검 안에서 깨어나라.',
  },
];

/** 보스·주요 스테이지 전용 장면 (그 외는 막 요약 + 지형 문장으로 생성) */
const BEATS = {
  1: {
    title: '새벽의 서약',
    body: '검은 깃발이 초원에 꽂힌다. 레온은 하늘로 손을 들어 맹세한다 — 에메랄드 소드를 찾아, 왕국에 아침을 되돌리겠다고.',
  },
  5: {
    title: '암흑의 파수꾼',
    body: '첫 관문의 보스가 길을 막는다. “전설의 검은 환상일 뿐”이라 비웃지만, 기사의 눈은 흔들리지 않는다.',
  },
  10: {
    title: '예언의 언덕',
    body: '언덕 위의 현자가 속삭인다. “검의 불꽃은 용기의 심장에서만 타오른다. 숲 너머로 가라.”',
  },
  15: {
    title: '숲의 그림자',
    body: '나뭇잎 사이로 적의 화살이 빗발친다. 아린의 시위가 울리고, 일행은 깊숙한 길을 열어젖힌다.',
  },
  20: {
    title: '현자의 시련',
    body: '마법의 숲 군주가 시험을 건다. 미라의 주문이 안개를 가르고, 다음 이정표 — 혼돈의 바다가 드러난다.',
  },
  25: {
    title: '갈라진 물의 다리',
    body: '다리가 흔들리고 강물이 포효한다. 카엘이 선두에서 돌격하며 외친다. “멈춰 서지 마라 — 운명은 앞으로만 열린다!”',
  },
  30: {
    title: '폭풍의 날개',
    body: '협곡을 메운 흑기사단. 레온은 하늘을 가리키며 동료들에게 말한다. “우리의 날개가 되어 주시오.”',
  },
  35: {
    title: '성소로 향하는 행군',
    body: '폐허 사이로 에메랄드 빛이 번쩍인다. 상아의 문이 가까이 있고, 적의 포위망은 더욱 두껍다.',
  },
  40: {
    title: '검의 각성',
    body: '성소의 수호자가 쓰러지자, 레온의 손에 푸른 불꽃이 감긴다. 에메랄드 소드가 잠에서 깨어난다.',
  },
  45: {
    title: '검은 성채',
    body: '왕좌를 지키는 최후의 군단. 검의 빛이 성벽을 물들이고, 일행은 마지막 돌격을 준비한다.',
  },
  50: {
    title: '에메랄드 소드의 결전',
    body: '검은 왕 아르카나가 왕좌에서 일어선다. “빛이여, 내 심장을 겨눠라!” — 운명의 기사가 에메랄드 불꽃으로 응한다.',
  },
};

const TERRAIN_LINES = {
  plains: '초원 위로 전운의 바람이 분다. 전진만이 검에 닿는 길이다.',
  river: '물이 길을 가른다. 용기는 강 너머에서 기다린다.',
  forest: '숲이 속삭인다. 그림자 속에서도 에메랄드의 약속을 잊지 마라.',
  hills: '높은 곳에서 왕국의 상처가 보인다. 내려가 싸울 시간이다.',
  fortress: '돌벽이 암흑의 뜻을 지킨다. 문을 부수고 빛을 들여보내라.',
  crossroads: '운명의 갈림길. 어느 쪽이든, 검은 왕을 향한 길이다.',
  lake: '고요한 호수에 검의 잔영이 비친다. 잠시 숨을 고르고 다시 일어선다.',
  canyon: '협곡의 메아리가 전쟁의 북소리처럼 울린다.',
  ruins: '옛 왕들의 돌이 깨어 있다. 그들의 축복이 발걸음을 재촉한다.',
  bridge: '좁은 다리 위, 한 걸음이 전장의 무게를 가른다.',
};

export function getAct(stageNo) {
  return ACTS.find((a) => stageNo >= a.range[0] && stageNo <= a.range[1]) || ACTS[0];
}

export function getStageStory(stage) {
  const act = getAct(stage.stage);
  const beat = BEATS[stage.stage];
  const terrainLine = TERRAIN_LINES[stage.mapId] || TERRAIN_LINES.plains;

  if (beat) {
    return {
      act: act.name,
      title: beat.title,
      body: beat.body,
    };
  }

  const bossHint = stage.isBoss
    ? ' 관문의 군주가 길을 가로막는다. 쓰러뜨려야만 에메랄드의 길이 열린다.'
    : '';

  return {
    act: act.name,
    title: stage.title,
    body: `${act.summary} ${terrainLine}${bossHint}`,
  };
}

export function getVictoryText(stageNo, isClear) {
  if (isClear) return EPILOGUE;
  if (stageNo === 40) {
    return '에메랄드 소드가 깨어났다. 이제 검은 왕좌를 향한 마지막 행군만이 남았다.';
  }
  if (stageNo % 10 === 0) {
    const next = getAct(stageNo + 1);
    return `막을 넘는다 — ${next.name}. ${next.summary}`;
  }
  if (stageNo % 5 === 0) {
    return '보스가 쓰러지고, 검의 불꽃이 한층 또렷해진다. 다음 전선으로.';
  }
  return '전장을 돌파했다. 에메랄드 소드를 향한 여정이 이어진다.';
}

export function getDefeatText(stageNo) {
  return `스테이지 ${stageNo}에서 전열이 무너졌다. 운명은 포기하는 자를 선택하지 않는다 — 다시 일어서라.`;
}
