import { CLASSES } from './data.js';

export function getSkill(unit) {
  return CLASSES[unit.classId].skill;
}

export function getUlt(unit) {
  return CLASSES[unit.classId].ult;
}

export function canUseSkill(unit) {
  return unit.alive && !unit.skillUsed && !!getSkill(unit);
}

export function canUseUlt(unit) {
  return unit.alive && !unit.ultUsed && !!getUlt(unit);
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
