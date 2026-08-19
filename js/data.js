export const TILE = 64;
export const COLS = 15;
export const ROWS = 10;
/** @deprecated iso 사용 — 호환용 */
export const MAP_PAD_TOP = 40;

/** @typedef {'plains'|'forest'|'hill'|'fort'|'water'} TerrainId */

/** elev: 아이소 고도 (완만한 단차) */
export const TERRAIN = {
  plains: {
    name: '평지',
    moveCost: 1,
    defBonus: 0,
    color: '#4a7d52',
    color2: '#3f6e47',
    elev: 3,
    sideL: '#2f5536',
    sideR: '#24432a',
  },
  forest: {
    name: '숲',
    moveCost: 2,
    defBonus: 1,
    color: '#2f6b3c',
    color2: '#275c33',
    elev: 7,
    sideL: '#1c4428',
    sideR: '#153520',
  },
  hill: {
    name: '언덕',
    moveCost: 2,
    defBonus: 2,
    color: '#6d7d48',
    color2: '#5f6e3e',
    elev: 11,
    sideL: '#454f2c',
    sideR: '#353c22',
  },
  fort: {
    name: '요새',
    moveCost: 1,
    defBonus: 3,
    color: '#7a7a62',
    color2: '#686853',
    elev: 15,
    sideL: '#4a4a3a',
    sideR: '#38382c',
  },
  water: {
    name: '물',
    moveCost: 99,
    defBonus: 0,
    color: '#3a7a8c',
    color2: '#326a7a',
    elev: 0,
    sideL: '#245560',
    sideR: '#1a4048',
  },
};

/**
 * 병종 — skill/ult 는 MP 소모
 * heal: true 이면 기본 행동이 아군 치유
 */
export const CLASSES = {
  knight: {
    id: 'knight',
    name: '기사',
    move: 3,
    hp: 28,
    mp: 14,
    atk: 10,
    mag: 1,
    def: 8,
    res: 2,
    rangeMin: 1,
    rangeMax: 1,
    color: '#6d8fd4',
    weapon: '물리',
    skill: {
      id: 'shield_bash',
      name: '방패 강타',
      desc: '방패로 강타해 1.7배 피해',
      mult: 1.7,
      fx: 'bash',
      mpCost: 4,
    },
    ult: {
      id: 'holy_charge',
      name: '성광의 돌격',
      desc: '빛의 돌격으로 2.5배 피해',
      mult: 2.5,
      fx: 'holy',
      mpCost: 8,
    },
  },
  fighter: {
    id: 'fighter',
    name: '전사',
    move: 4,
    hp: 24,
    mp: 12,
    atk: 11,
    mag: 1,
    def: 5,
    res: 2,
    rangeMin: 1,
    rangeMax: 1,
    color: '#d4a84b',
    weapon: '물리',
    skill: {
      id: 'double_slash',
      name: '연속 참격',
      desc: '두 번의 베기로 1.65배 피해',
      mult: 1.65,
      fx: 'double',
      mpCost: 4,
    },
    ult: {
      id: 'whirlwind',
      name: '광풍 회전참',
      desc: '회전 참격으로 2.4배 피해',
      mult: 2.4,
      fx: 'whirl',
      mpCost: 8,
    },
  },
  archer: {
    id: 'archer',
    name: '궁수',
    move: 4,
    hp: 20,
    mp: 14,
    atk: 9,
    mag: 1,
    def: 3,
    res: 3,
    rangeMin: 2,
    rangeMax: 2,
    color: '#5fb87a',
    weapon: '물리',
    skill: {
      id: 'pierce',
      name: '관통사',
      desc: '관통하는 화살로 1.7배 피해',
      mult: 1.7,
      fx: 'pierce',
      mpCost: 4,
    },
    ult: {
      id: 'arrow_rain',
      name: '유성 화살비',
      desc: '화살비로 2.5배 피해',
      mult: 2.5,
      fx: 'rain',
      mpCost: 8,
    },
  },
  mage: {
    id: 'mage',
    name: '마법사',
    move: 4,
    hp: 18,
    mp: 22,
    atk: 2,
    mag: 11,
    def: 2,
    res: 6,
    rangeMin: 1,
    rangeMax: 2,
    color: '#c78be0',
    weapon: '마법',
    skill: {
      id: 'arc_burst',
      name: '마력 폭발',
      desc: '마력 폭발로 1.75배 피해',
      mult: 1.75,
      fx: 'burst',
      mpCost: 5,
    },
    ult: {
      id: 'emerald_nova',
      name: '에메랄드 작렬',
      desc: '에메랄드 불꽃으로 2.6배 피해',
      mult: 2.6,
      fx: 'nova',
      mpCost: 10,
    },
  },
  cleric: {
    id: 'cleric',
    name: '성직자',
    move: 4,
    hp: 20,
    mp: 20,
    atk: 3,
    mag: 10,
    def: 3,
    res: 7,
    rangeMin: 1,
    rangeMax: 2,
    color: '#e8d48a',
    weapon: '치유',
    heal: true,
    skill: {
      id: 'heal_light',
      name: '치유의 빛',
      desc: '아군 1명 강하게 치유',
      mult: 1.6,
      fx: 'heal',
      mpCost: 5,
      heal: true,
    },
    ult: {
      id: 'divine_blessing',
      name: '신성 축복',
      desc: '범위 내 아군 전원 치유',
      mult: 1.35,
      fx: 'bless',
      heal: true,
      aoe: true,
      mpCost: 9,
    },
  },
};

const CHAR_TO_TERRAIN = {
  '.': 'plains',
  F: 'forest',
  H: 'hill',
  C: 'fort',
  W: 'water',
};

export function buildMap(layout) {
  return layout.map((row) =>
    [...row.padEnd(COLS, '.')].slice(0, COLS).map((ch) => CHAR_TO_TERRAIN[ch] || 'plains')
  );
}

export function createUnit(id, name, classId, team, x, y) {
  const cls = CLASSES[classId];
  return {
    id,
    name,
    classId,
    team,
    x,
    y,
    level: 1,
    isBoss: false,
    hp: cls.hp,
    maxHp: cls.hp,
    mp: cls.mp,
    maxMp: cls.mp,
    atk: cls.atk,
    mag: cls.mag,
    def: cls.def,
    res: cls.res,
    moved: false,
    acted: false,
    alive: true,
    equip: { weapon: null, armor: null },
  };
}

export function elevAt(map, x, y) {
  return TERRAIN[map[y][x]]?.elev ?? 4;
}

export function isHealer(unit) {
  return !!CLASSES[unit.classId]?.heal;
}
