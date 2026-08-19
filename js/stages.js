import { CLASSES, COLS, createUnit } from './data.js';

/** 맵 템플릿: layout + 아군/적 스폰 후보 */
export const MAP_TEMPLATES = [
  {
    id: 'plains',
    name: '운명의 초원',
    layout: [
      '...............',
      '..F..H....F....',
      '.FFF......FFF..',
      '....W..........',
      '..F.WWW....H...',
      '....WWW.....C..',
      '..H........FF..',
      '....F..H...FFF.',
      '...........F...',
      '...............',
    ],
    playerSpawns: [[1, 7], [2, 8], [1, 8], [2, 7]],
    enemySpawns: [[12, 2], [13, 1], [13, 3], [11, 2], [12, 5], [14, 4], [10, 1], [11, 6]],
  },
  {
    id: 'river',
    name: '혼돈의 강',
    layout: [
      '.......W.......',
      '...F...W...H...',
      '..FFF..W..FFF..',
      '.......W.......',
      '..H....W....C..',
      '.......W.......',
      '..F....W...FF..',
      '.......W.......',
      '...H...W...F...',
      '.......W.......',
    ],
    playerSpawns: [[1, 4], [2, 5], [1, 6], [2, 3]],
    enemySpawns: [[13, 4], [12, 3], [12, 5], [14, 2], [14, 6], [11, 1], [11, 7], [13, 8]],
  },
  {
    id: 'forest',
    name: '마법의 숲',
    layout: [
      '.F.F.F.F.F.F.F.',
      'F.F.F.F.F.F.F.F',
      '.F...F...F...F.',
      'F.F.F.F.F.F.F.F',
      '.F...C...F...F.',
      'F.F.F.F.F.F.F.F',
      '.F...F...F...F.',
      'F.F.F.F.F.F.F.F',
      '.F.F.F.F.F.F.F.',
      '...............',
    ],
    playerSpawns: [[0, 9], [1, 9], [2, 9], [1, 8]],
    enemySpawns: [[13, 0], [14, 1], [12, 2], [14, 3], [11, 0], [13, 4], [12, 6], [14, 7]],
  },
  {
    id: 'hills',
    name: '예언의 언덕',
    layout: [
      '....H.....H....',
      '..H...H.....H..',
      'H...........H.H',
      '...H.....H.....',
      '.....C.........',
      '..H........H...',
      'H.....H........',
      '....H.....H..H.',
      '..H.........H..',
      '...............',
    ],
    playerSpawns: [[1, 8], [2, 7], [0, 7], [2, 9]],
    enemySpawns: [[13, 1], [12, 2], [14, 0], [11, 3], [13, 5], [14, 6], [12, 7], [10, 1]],
  },
  {
    id: 'fortress',
    name: '검은 성채',
    layout: [
      '.....CCCCC.....',
      '....C.....C....',
      '...C..HHH..C...',
      '...C.......C...',
      '...C..C.C..C...',
      '...C.......C...',
      '...C..HHH..C...',
      '....C.....C....',
      '.....CCCCC.....',
      '...............',
    ],
    playerSpawns: [[1, 4], [2, 5], [1, 5], [2, 3]],
    enemySpawns: [[7, 4], [6, 3], [8, 3], [6, 5], [8, 5], [7, 2], [7, 6], [5, 4]],
  },
  {
    id: 'crossroads',
    name: '운명의 갈림길',
    layout: [
      '...............',
      '...F.....F.....',
      '..FFF...FFF....',
      '.......H.......',
      'WWWW...C...WWWW',
      '.......H.......',
      '..FFF...FFF....',
      '...F.....F.....',
      '...............',
      '...............',
    ],
    playerSpawns: [[1, 2], [2, 1], [1, 7], [2, 8]],
    enemySpawns: [[12, 2], [13, 1], [12, 7], [13, 8], [11, 4], [14, 4], [10, 3], [10, 5]],
  },
  {
    id: 'lake',
    name: '검영의 호수',
    layout: [
      '...............',
      '....WWWWW......',
      '...WWWWWWW.....',
      '..WWWWWWWWW....',
      '..WWW...WWW....',
      '..WWWWWWWWW.C..',
      '...WWWWWWW.....',
      '....WWWWW......',
      '..F.........F..',
      '...............',
    ],
    playerSpawns: [[1, 1], [2, 0], [1, 8], [2, 9]],
    enemySpawns: [[13, 2], [14, 4], [12, 5], [13, 7], [11, 1], [14, 8], [10, 9], [12, 0]],
  },
  {
    id: 'canyon',
    name: '폭풍의 협곡',
    layout: [
      'HHH.........HHH',
      'HH...........HH',
      'H.....F.......H',
      '......FFF......',
      'H......C......H',
      '......FFF......',
      'H.....F.......H',
      'HH...........HH',
      'HHH.........HHH',
      '...............',
    ],
    playerSpawns: [[3, 9], [4, 8], [5, 9], [4, 9]],
    enemySpawns: [[10, 1], [11, 2], [9, 0], [12, 3], [10, 5], [11, 6], [9, 7], [12, 4]],
  },
  {
    id: 'ruins',
    name: '상아의 폐허',
    layout: [
      'C...F.....F...C',
      '.H...........H.',
      '..C...WWW...C..',
      '......WWW......',
      'F.H...C.C...H.F',
      '......WWW......',
      '..C...WWW...C..',
      '.H...........H.',
      'C...F.....F...C',
      '...............',
    ],
    playerSpawns: [[1, 9], [2, 8], [3, 9], [2, 9]],
    enemySpawns: [[12, 1], [13, 0], [11, 2], [14, 3], [12, 6], [13, 7], [11, 5], [10, 0]],
  },
  {
    id: 'bridge',
    name: '운명의 다리',
    layout: [
      'WWWWWW...WWWWWW',
      'WWWWWW...WWWWWW',
      'WWWWWW...WWWWWW',
      'WWWWWW.H.WWWWWW',
      '.......C.......',
      'WWWWWW.H.WWWWWW',
      'WWWWWW...WWWWWW',
      'WWWWWW...WWWWWW',
      'WWWWWW...WWWWWW',
      '...............',
    ],
    playerSpawns: [[1, 4], [2, 4], [0, 4], [3, 4]],
    enemySpawns: [[13, 4], [12, 4], [14, 4], [11, 4], [12, 3], [12, 5], [10, 4], [13, 2]],
  },
];

const ENEMY_NAMES = {
  knight: ['흑갑 기사', '심연 근위', '그림자 창기', '암흑 기사', '파멸의 기수'],
  fighter: ['혼돈 광전사', '약탈의 칼날', '피의 돌격병', '저주의 검객', '어둠의 용병'],
  archer: ['밤의 사냥꾼', '독침 궁수', '그림자 석궁', '숲의 배신자', '침묵의 저격수'],
  mage: ['심연 술사', '흑염 마도사', '저주 주술사', '혼돈의 현자', '공허 대마도사'],
};

const BOSS_NAMES = [
  '파수꾼 다르곤', '그림자 여제 릴리스', '강철 군주 바르가스', '마녀 모르가나', '광풍의 드란도르',
  '빙염 군왕 카이로스', '성채주 올타로스', '독룡 니라스', '심판자 헬리온', '검은 왕 아르카나',
];

const STAGE_TITLE_PREFIX = [
  '서약', '추적', '돌파', '수호', '추격', '포위', '야습', '시련', '행군', '각성',
];

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function enemyCountFor(stage) {
  if (stage <= 3) return 3;
  if (stage <= 8) return 4;
  if (stage <= 15) return 5;
  if (stage <= 25) return 6;
  if (stage <= 35) return 7;
  if (stage <= 45) return 8;
  return 9;
}

function compositionFor(stage, count, rng) {
  const pool = ['fighter', 'fighter', 'knight', 'archer', 'mage'];
  if (stage >= 10) pool.push('archer', 'mage');
  if (stage >= 20) pool.push('knight', 'mage');
  if (stage >= 35) pool.push('knight', 'archer', 'mage');

  const classes = [];
  for (let i = 0; i < count; i++) classes.push(pick(rng, pool));

  // 보스 스테이지: 첫 유닛을 기사/마법사 보스 클래스로
  if (stage % 5 === 0) {
    classes[0] = stage % 10 === 0 ? 'mage' : 'knight';
  }
  return classes;
}

function scaleStats(base, level, isBoss = false) {
  const lv = level - 1;
  const boss = isBoss ? 1.35 : 1;
  return {
    hp: Math.round((base.hp + lv * 3) * boss),
    atk: Math.round((base.atk + lv * 0.7) * boss),
    mag: Math.round((base.mag + lv * 0.7) * boss),
    def: Math.round((base.def + lv * 0.45) * boss),
    res: Math.round((base.res + lv * 0.45) * boss),
    move: base.move,
    rangeMin: base.rangeMin,
    rangeMax: base.rangeMax,
    weapon: base.weapon,
  };
}

export function createScaledUnit(id, name, classId, team, x, y, level, isBoss = false) {
  const cls = CLASSES[classId];
  const stats = scaleStats(cls, level, isBoss);
  const unit = createUnit(id, name, classId, team, x, y);
  unit.level = level;
  unit.isBoss = isBoss;
  unit.hp = stats.hp;
  unit.maxHp = stats.hp;
  unit.atk = stats.atk;
  unit.mag = stats.mag;
  unit.def = stats.def;
  unit.res = stats.res;
  return unit;
}

const PLAYER_ROSTER = [
  { id: 'p1', name: '레온', classId: 'knight' },   // 운명의 기사
  { id: 'p2', name: '아린', classId: 'archer' },   // 숲의 눈
  { id: 'p3', name: '미라', classId: 'mage' },     // 현자의 계승자
  { id: 'p4', name: '카엘', classId: 'fighter' },  // 돌격의 날개
];

export function buildStage(stageNo) {
  const rng = mulberry32(stageNo * 9973 + 42);
  const template = MAP_TEMPLATES[(stageNo - 1) % MAP_TEMPLATES.length];
  const isBoss = stageNo % 5 === 0;
  const isFinal = stageNo === 50;
  const enemyLevel = stageNo;
  const playerLevel = Math.max(1, Math.ceil(stageNo * 0.85));

  const count = Math.min(
    enemyCountFor(stageNo) + (isBoss ? 1 : 0),
    template.enemySpawns.length
  );
  const classes = compositionFor(stageNo, count, rng);

  const enemies = classes.map((classId, i) => {
    const [x, y] = template.enemySpawns[i];
    const bossUnit = (isBoss && i === 0) || (isFinal && i === 0);
    const namePool = ENEMY_NAMES[classId];
    const name = bossUnit
      ? (isFinal ? '검은 왕 아르카나' : BOSS_NAMES[(stageNo / 5 - 1) % BOSS_NAMES.length])
      : `${pick(rng, namePool)}`;
    return createScaledUnit(
      `e${stageNo}_${i}`,
      name,
      classId,
      'enemy',
      x,
      y,
      enemyLevel + (bossUnit ? 2 : 0),
      bossUnit
    );
  });

  const players = PLAYER_ROSTER.map((p, i) => {
    const [x, y] = template.playerSpawns[i % template.playerSpawns.length];
    return createScaledUnit(p.id, p.name, p.classId, 'player', x, y, playerLevel, false);
  });

  const title = isFinal
    ? '에메랄드 소드의 결전'
    : isBoss
      ? `${STAGE_TITLE_PREFIX[(stageNo - 1) % STAGE_TITLE_PREFIX.length]} · 관문`
      : STAGE_TITLE_PREFIX[(stageNo - 1) % STAGE_TITLE_PREFIX.length];

  return {
    stage: stageNo,
    name: `${template.name}`,
    mapId: template.id,
    title,
    isBoss,
    isFinal,
    layout: template.layout,
    playerLevel,
    enemyLevel,
    units: [...players, ...enemies],
  };
}

export const TOTAL_STAGES = 50;

export const STAGES = Array.from({ length: TOTAL_STAGES }, (_, i) => buildStage(i + 1));

export function getStage(stageNo) {
  const n = Math.min(TOTAL_STAGES, Math.max(1, stageNo));
  return STAGES[n - 1];
}

/** 스폰 좌표가 맵 범위 안인지·중복 없는지 검증 */
export function validateStages() {
  const issues = [];
  for (const stage of STAGES) {
    const seen = new Set();
    for (const u of stage.units) {
      if (u.x < 0 || u.y < 0 || u.x >= COLS || u.y >= 10) {
        issues.push(`S${stage.stage} ${u.id} out of bounds`);
      }
      const key = `${u.x},${u.y}`;
      if (seen.has(key)) issues.push(`S${stage.stage} overlap ${key}`);
      seen.add(key);
    }
    if (stage.layout.length !== 10 || stage.layout.some((r) => r.length !== 15)) {
      issues.push(`S${stage.stage} bad layout size`);
    }
  }
  return issues;
}
