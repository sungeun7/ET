import { CLASSES, TERRAIN } from './data.js';
import { effectiveStat, equipBonuses } from './items.js';

function powerOf(unit) {
  const cls = CLASSES[unit.classId];
  if (cls.weapon === '마법' || cls.weapon === '치유') return effectiveStat(unit, 'mag');
  return effectiveStat(unit, 'atk');
}

function resistOf(unit, isMagic) {
  return isMagic ? effectiveStat(unit, 'res') : effectiveStat(unit, 'def');
}

/**
 * @param {number} [mult=1]
 */
export function calcDamage(attacker, defender, map, mult = 1) {
  const atkClass = CLASSES[attacker.classId];
  const terrain = TERRAIN[map[defender.y][defender.x]];
  const isMagic = atkClass.weapon === '마법';
  const raw = powerOf(attacker) * mult - resistOf(defender, isMagic) - terrain.defBonus;
  const damage = Math.max(1, Math.round(raw) + (Math.random() < 0.2 ? 1 : 0));
  const hit = Math.random() < (mult > 1.5 ? 0.95 : 0.9);
  return {
    damage: hit ? damage : 0,
    hit,
    isMagic,
    terrainBonus: terrain.defBonus,
  };
}

/** 치유량 계산 */
export function calcHeal(healer, target, mult = 1) {
  const bonus = equipBonuses(healer).healBonus || 0;
  const base = effectiveStat(healer, 'mag') + 4 + bonus;
  const amount = Math.max(1, Math.round(base * mult));
  const missing = target.maxHp - target.hp;
  return Math.min(amount, missing);
}

export function canCounter(attacker, defender) {
  const defClass = CLASSES[defender.classId];
  if (defClass.heal) return false;
  const dist = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
  return dist >= defClass.rangeMin && dist <= defClass.rangeMax;
}

export function previewCombat(attacker, defender, map, mult = 1) {
  const atkClass = CLASSES[attacker.classId];
  const defClass = CLASSES[defender.classId];
  const terrain = TERRAIN[map[defender.y][defender.x]];
  const isMagic = atkClass.weapon === '마법';
  const est = Math.max(
    1,
    Math.round(powerOf(attacker) * mult - resistOf(defender, isMagic) - terrain.defBonus)
  );
  const counter = canCounter(attacker, defender) && mult <= 1;
  let counterEst = 0;
  if (counter) {
    const cMagic = defClass.weapon === '마법';
    const atkTerrain = TERRAIN[map[attacker.y][attacker.x]];
    counterEst = Math.max(
      1,
      powerOf(defender) - resistOf(attacker, cMagic) - atkTerrain.defBonus
    );
  }
  return { est, counter, counterEst, isMagic, terrainBonus: terrain.defBonus };
}

export function previewHeal(healer, target, mult = 1) {
  return { heal: calcHeal(healer, target, mult) };
}
