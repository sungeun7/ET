import { CLASSES } from './data.js';

/** 다음 레벨까지 필요 경험치 */
export function xpToNext(level) {
  return Math.round(30 + level * 20);
}

/** 적 처치 기본 경험치 */
export function killXpReward(enemy) {
  let xp = 16 + (enemy.level || 1) * 6;
  if (enemy.isBoss) xp = Math.round(xp * 2.4);
  return xp;
}

/**
 * 레벨에 맞는 기본 스탯 적용 (HP/MP 비율 유지)
 * stages.scaleStats 와 동일한 공식
 */
export function applyLevelStats(unit) {
  const cls = CLASSES[unit.classId];
  const lv = Math.max(0, (unit.level || 1) - 1);
  const boss = unit.isBoss ? 1.35 : 1;
  const maxHp = Math.round((cls.hp + lv * 3) * boss);
  const maxMp = Math.round((cls.mp + lv * 1.2) * (unit.isBoss ? 1.2 : 1));
  const hpRatio = unit.maxHp > 0 ? unit.hp / unit.maxHp : 1;
  const mpRatio = unit.maxMp > 0 ? unit.mp / unit.maxMp : 1;

  unit.maxHp = maxHp;
  unit.maxMp = maxMp;
  unit.hp = Math.min(maxHp, Math.max(1, Math.round(maxHp * hpRatio)));
  unit.mp = Math.min(maxMp, Math.round(maxMp * mpRatio));
  unit.atk = Math.round((cls.atk + lv * 0.7) * boss);
  unit.mag = Math.round((cls.mag + lv * 0.7) * boss);
  unit.def = Math.round((cls.def + lv * 0.45) * boss);
  unit.res = Math.round((cls.res + lv * 0.45) * boss);
}

/**
 * @returns {{ unit: object, gained: number, levelsGained: number, newLevel: number }[]}
 */
export function addXp(unit, amount) {
  if (!unit || amount <= 0) return [];
  if (unit.xp == null) unit.xp = 0;
  unit.xp += amount;
  let levelsGained = 0;
  let guard = 0;
  while (unit.xp >= xpToNext(unit.level) && guard++ < 50) {
    unit.xp -= xpToNext(unit.level);
    unit.level += 1;
    levelsGained += 1;
    applyLevelStats(unit);
  }
  return [
    {
      unit,
      gained: amount,
      levelsGained,
      newLevel: unit.level,
    },
  ];
}

/**
 * 막타 캐릭터에게 주 보상, 생존 아군에게 소량 지원 경험치
 * 막타 : 지원 = 약 5 : 1
 */
export function grantKillXp(units, killer, victim) {
  if (!killer || !victim) return [];
  if (killer.team !== 'player' || victim.team === 'player') return [];

  const total = killXpReward(victim);
  const killShare = total;
  const assistShare = Math.max(1, Math.floor(total * 0.2));
  const events = [];

  events.push(...addXp(killer, killShare).map((e) => ({ ...e, kind: 'kill' })));

  for (const u of units) {
    if (!u.alive || u.team !== 'player' || u.id === killer.id) continue;
    events.push(...addXp(u, assistShare).map((e) => ({ ...e, kind: 'assist' })));
  }
  return events;
}

export function createRosterProgress() {
  return {
    p1: { level: 1, xp: 0 },
    p2: { level: 1, xp: 0 },
    p3: { level: 1, xp: 0 },
    p4: { level: 1, xp: 0 },
    p5: { level: 1, xp: 0 },
  };
}

export function applyProgressToUnit(unit, progress) {
  if (!progress || unit.team !== 'player') {
    if (unit.xp == null) unit.xp = 0;
    return unit;
  }
  const p = progress[unit.id] || { level: 1, xp: 0 };
  unit.level = p.level || 1;
  unit.xp = p.xp || 0;
  applyLevelStats(unit);
  // 스테이지 시작 시 풀피/풀MP
  unit.hp = unit.maxHp;
  unit.mp = unit.maxMp;
  return unit;
}

export function syncProgressFromUnits(progress, units) {
  const next = { ...progress };
  for (const u of units) {
    if (u.team !== 'player') continue;
    next[u.id] = { level: u.level, xp: u.xp || 0 };
  }
  return next;
}
