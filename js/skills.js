import { CLASSES } from './data.js';

/** 턴 시작 시 MP 자연 회복량 */
export const MP_REGEN = 2;

export function getSkill(unit) {
  return CLASSES[unit.classId].skill;
}

export function getUlt(unit) {
  return CLASSES[unit.classId].ult;
}

export function skillMpCost(unit) {
  return getSkill(unit)?.mpCost ?? 0;
}

export function ultMpCost(unit) {
  return getUlt(unit)?.mpCost ?? 0;
}

export function canUseSkill(unit) {
  const skill = getSkill(unit);
  if (!unit.alive || !skill) return false;
  return (unit.mp ?? 0) >= (skill.mpCost ?? 0);
}

export function canUseUlt(unit) {
  const ult = getUlt(unit);
  if (!unit.alive || !ult) return false;
  return (unit.mp ?? 0) >= (ult.mpCost ?? 0);
}

/** @returns {boolean} 소모 성공 여부 */
export function spendMp(unit, cost) {
  const need = cost ?? 0;
  if ((unit.mp ?? 0) < need) return false;
  unit.mp -= need;
  return true;
}

export function regenMp(unit, amount = MP_REGEN) {
  if (!unit?.alive) return;
  unit.mp = Math.min(unit.maxMp, (unit.mp ?? 0) + amount);
}

export function isHealAction(unit, kind) {
  const cls = CLASSES[unit.classId];
  if (kind === 'skill') return !!getSkill(unit)?.heal || !!cls.heal;
  if (kind === 'ultimate') return !!getUlt(unit)?.heal || !!cls.heal;
  return !!cls.heal;
}

export function isAoeHeal(unit, kind) {
  if (kind === 'ultimate') return !!getUlt(unit)?.aoe;
  if (kind === 'skill') return !!getSkill(unit)?.aoe;
  return false;
}

/** @param {'normal'|'skill'|'ultimate'} kind */
export function strikeMult(unit, kind) {
  if (kind === 'skill') return getSkill(unit)?.mult ?? 1;
  if (kind === 'ultimate') return getUlt(unit)?.mult ?? 1;
  return 1;
}

/** @param {'normal'|'skill'|'ultimate'} kind */
export function strikeLabel(unit, kind) {
  if (kind === 'skill') return getSkill(unit)?.name ?? '스킬';
  if (kind === 'ultimate') return getUlt(unit)?.name ?? '필살기';
  return CLASSES[unit.classId].heal ? '치유' : '공격';
}

/** @param {'normal'|'skill'|'ultimate'} kind */
export function strikeFx(unit, kind) {
  if (kind === 'skill') return getSkill(unit)?.fx ?? 'slash';
  if (kind === 'ultimate') return getUlt(unit)?.fx ?? 'holy';
  const id = unit.classId;
  if (id === 'cleric') return 'heal';
  if (id === 'mage') return 'magic';
  if (id === 'archer') return 'arrow';
  return 'slash';
}

/** @param {'normal'|'skill'|'ultimate'} kind */
export function strikeMpCost(unit, kind) {
  if (kind === 'skill') return skillMpCost(unit);
  if (kind === 'ultimate') return ultMpCost(unit);
  return 0;
}
