/** 장비·소모 아이템 정의 */

export const ITEMS = {
  potion_s: {
    id: 'potion_s',
    name: '회복약',
    type: 'consumable',
    desc: 'HP 12 회복',
    heal: 12,
    icon: '약',
  },
  potion_l: {
    id: 'potion_l',
    name: '고급 회복약',
    type: 'consumable',
    desc: 'HP 28 회복',
    heal: 28,
    icon: '약+',
  },
  elixir: {
    id: 'elixir',
    name: '엘릭서',
    type: 'consumable',
    desc: 'HP 전 회복',
    heal: 999,
    icon: '엘',
  },
  iron_sword: {
    id: 'iron_sword',
    name: '철검',
    type: 'weapon',
    desc: '공격 +2',
    atk: 2,
    mag: 0,
    classes: ['knight', 'fighter'],
    icon: '검',
  },
  steel_blade: {
    id: 'steel_blade',
    name: '강철검',
    type: 'weapon',
    desc: '공격 +4',
    atk: 4,
    mag: 0,
    classes: ['knight', 'fighter'],
    icon: '검+',
  },
  longbow: {
    id: 'longbow',
    name: '장궁',
    type: 'weapon',
    desc: '공격 +3',
    atk: 3,
    mag: 0,
    classes: ['archer'],
    icon: '궁',
  },
  oak_staff: {
    id: 'oak_staff',
    name: '참나무 지팡이',
    type: 'weapon',
    desc: '마법 +3',
    atk: 0,
    mag: 3,
    classes: ['mage', 'cleric'],
    icon: '지',
  },
  emerald_rod: {
    id: 'emerald_rod',
    name: '에메랄드 로드',
    type: 'weapon',
    desc: '마법 +5',
    atk: 0,
    mag: 5,
    classes: ['mage', 'cleric'],
    icon: '지+',
  },
  leather_armor: {
    id: 'leather_armor',
    name: '가죽 갑옷',
    type: 'armor',
    desc: '방어 +1 / 마방 +1',
    def: 1,
    res: 1,
    classes: null,
    icon: '갑',
  },
  plate_mail: {
    id: 'plate_mail',
    name: '판금 갑옷',
    type: 'armor',
    desc: '방어 +3 / 마방 +1',
    def: 3,
    res: 1,
    classes: ['knight', 'fighter'],
    icon: '갑+',
  },
  mage_robe: {
    id: 'mage_robe',
    name: '마법 로브',
    type: 'armor',
    desc: '방어 +1 / 마방 +3',
    def: 1,
    res: 3,
    classes: ['mage', 'cleric', 'archer'],
    icon: '로',
  },
  holy_charm: {
    id: 'holy_charm',
    name: '성스러운 부적',
    type: 'armor',
    desc: '마방 +2 / 치유 보너스',
    def: 0,
    res: 2,
    healBonus: 3,
    classes: ['cleric'],
    icon: '부',
  },
};

export const STARTER_INVENTORY = {
  potion_s: 3,
  potion_l: 1,
  iron_sword: 1,
  leather_armor: 1,
  oak_staff: 1,
};

/** 스테이지 클리어 보상 */
export function rewardsForStage(stageNo) {
  const bag = { potion_s: 1 };
  if (stageNo % 3 === 0) bag.potion_l = (bag.potion_l || 0) + 1;
  if (stageNo % 5 === 0) bag.elixir = 1;
  if (stageNo === 5) bag.longbow = 1;
  if (stageNo === 10) bag.steel_blade = 1;
  if (stageNo === 15) bag.mage_robe = 1;
  if (stageNo === 20) bag.emerald_rod = 1;
  if (stageNo === 25) bag.plate_mail = 1;
  if (stageNo === 30) bag.holy_charm = 1;
  if (stageNo % 7 === 0) bag.leather_armor = (bag.leather_armor || 0) + 1;
  return bag;
}

export function addToInventory(inv, gains) {
  const next = { ...inv };
  for (const [id, n] of Object.entries(gains)) {
    next[id] = (next[id] || 0) + n;
  }
  return next;
}

export function canEquip(item, unit) {
  if (!item || (item.type !== 'weapon' && item.type !== 'armor')) return false;
  if (!item.classes) return true;
  return item.classes.includes(unit.classId);
}

export function equipBonuses(unit) {
  const b = { atk: 0, mag: 0, def: 0, res: 0, healBonus: 0 };
  for (const slot of ['weapon', 'armor']) {
    const id = unit.equip?.[slot];
    if (!id || !ITEMS[id]) continue;
    const it = ITEMS[id];
    b.atk += it.atk || 0;
    b.mag += it.mag || 0;
    b.def += it.def || 0;
    b.res += it.res || 0;
    b.healBonus += it.healBonus || 0;
  }
  return b;
}

/** 장비 반영 스탯 */
export function effectiveStat(unit, key) {
  const b = equipBonuses(unit);
  return (unit[key] || 0) + (b[key] || 0);
}

export function listInventory(inv) {
  return Object.entries(inv || {})
    .filter(([, n]) => n > 0)
    .map(([id, count]) => ({ item: ITEMS[id], count, id }))
    .filter((e) => e.item);
}
