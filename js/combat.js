import { CLASSES, TERRAIN } from './data.js';

function powerOf(unit) {
  const cls = CLASSES[unit.classId];
  return cls.weapon === '마법' ? unit.mag : unit.atk;
}

function resistOf(unit, isMagic) {
  return isMagic ? unit.res : unit.def;
}

export function calcDamage(attacker, defender, map) {
  const atkClass = CLASSES[attacker.classId];
  const terrain = TERRAIN[map[defender.y][defender.x]];
  const isMagic = atkClass.weapon === '마법';
  const raw = powerOf(attacker) - resistOf(defender, isMagic) - terrain.defBonus;
  const damage = Math.max(1, raw + (Math.random() < 0.2 ? 1 : 0));
  const hit = Math.random() < 0.9;
  return {
    damage: hit ? damage : 0,
    hit,
    isMagic,
    terrainBonus: terrain.defBonus,
  };
}

export function canCounter(attacker, defender) {
  const defClass = CLASSES[defender.classId];
  const dist = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
  return dist >= defClass.rangeMin && dist <= defClass.rangeMax;
}

export function previewCombat(attacker, defender, map) {
  const atkClass = CLASSES[attacker.classId];
  const defClass = CLASSES[defender.classId];
  const terrain = TERRAIN[map[defender.y][defender.x]];
  const isMagic = atkClass.weapon === '마법';
  const est = Math.max(1, powerOf(attacker) - resistOf(defender, isMagic) - terrain.defBonus);
  const counter = canCounter(attacker, defender);
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
