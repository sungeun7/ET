export const TILE = 64;
export const COLS = 15;
export const ROWS = 10;

/** @typedef {'plains'|'forest'|'hill'|'fort'|'water'} TerrainId */

export const TERRAIN = {
  plains: { name: '평지', moveCost: 1, defBonus: 0, color: '#3d6b45', color2: '#355f3d' },
  forest: { name: '숲', moveCost: 2, defBonus: 1, color: '#2a5234', color2: '#23482d' },
  hill: { name: '언덕', moveCost: 2, defBonus: 2, color: '#5a6b3f', color2: '#4e5e36' },
  fort: { name: '요새', moveCost: 1, defBonus: 3, color: '#6a6a58', color2: '#585848' },
  water: { name: '물', moveCost: 99, defBonus: 0, color: '#2a5f6e', color2: '#245464' },
};

export const CLASSES = {
  knight: {
    id: 'knight',
    name: '기사',
    move: 3,
    hp: 28,
    atk: 10,
    mag: 1,
    def: 8,
    res: 2,
    rangeMin: 1,
    rangeMax: 1,
    color: '#6d8fd4',
    weapon: '물리',
  },
  fighter: {
    id: 'fighter',
    name: '전사',
    move: 4,
    hp: 24,
    atk: 11,
    mag: 1,
    def: 5,
    res: 2,
    rangeMin: 1,
    rangeMax: 1,
    color: '#d4a84b',
    weapon: '물리',
  },
  archer: {
    id: 'archer',
    name: '궁수',
    move: 4,
    hp: 20,
    atk: 9,
    mag: 1,
    def: 3,
    res: 3,
    rangeMin: 2,
    rangeMax: 2,
    color: '#5fb87a',
    weapon: '물리',
  },
  mage: {
    id: 'mage',
    name: '마법사',
    move: 4,
    hp: 18,
    atk: 2,
    mag: 11,
    def: 2,
    res: 6,
    rangeMin: 1,
    rangeMax: 2,
    color: '#c78be0',
    weapon: '마법',
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
    atk: cls.atk,
    mag: cls.mag,
    def: cls.def,
    res: cls.res,
    moved: false,
    acted: false,
    alive: true,
  };
}
