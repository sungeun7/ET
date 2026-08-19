import { CLASSES } from './data.js';
import { canCounter } from './combat.js';
import {
  getAttackTilesFrom,
  getMoveTiles,
  manhattan,
  unitAt,
} from './pathfinding.js';

function estimateKillScore(attacker, defender, fromX, fromY) {
  const tempAtk = { ...attacker, x: fromX, y: fromY };
  const atkClass = CLASSES[attacker.classId];
  const isMagic = atkClass.weapon === '마법';
  const power = isMagic ? attacker.mag : attacker.atk;
  const resist = isMagic ? defender.res : defender.def;
  const dmg = Math.max(1, power - resist);
  let score = dmg * 10;
  if (defender.hp <= dmg) score += 80;
  if (defender.isBoss) score += 25;
  if (canCounter(tempAtk, defender)) {
    const defClass = CLASSES[defender.classId];
    const cMagic = defClass.weapon === '마법';
    const cPower = cMagic ? defender.mag : defender.atk;
    const cResist = cMagic ? attacker.res : attacker.def;
    score -= Math.max(1, cPower - cResist) * 4;
  }
  score -= manhattan({ x: fromX, y: fromY }, defender) * 0.5;
  return score;
}

/**
 * 적 유닛 한 명의 행동 결정
 * @returns {{ moveTo: {x:number,y:number}, attackTarget: object|null }}
 */
export function decideEnemyAction(map, units, enemy) {
  const cls = CLASSES[enemy.classId];
  const moveTiles = getMoveTiles(map, units, enemy, cls);
  const players = units.filter((u) => u.alive && u.team === 'player');

  let best = {
    score: -Infinity,
    moveTo: { x: enemy.x, y: enemy.y },
    attackTarget: null,
  };

  for (const m of moveTiles) {
    const attacks = getAttackTilesFrom(m.x, m.y, cls.rangeMin, cls.rangeMax);
    let attacked = false;
    for (const a of attacks) {
      const target = unitAt(units, a.x, a.y);
      if (!target || target.team !== 'player') continue;
      attacked = true;
      const score = estimateKillScore(enemy, target, m.x, m.y) + 20;
      if (score > best.score) {
        best = { score, moveTo: { x: m.x, y: m.y }, attackTarget: target };
      }
    }

    if (!attacked && players.length) {
      let nearest = players[0];
      let dist = manhattan(m, nearest);
      for (const p of players) {
        const d = manhattan(m, p);
        if (d < dist) {
          dist = d;
          nearest = p;
        }
      }
      const score = 40 - dist * 3;
      if (score > best.score) {
        best = { score, moveTo: { x: m.x, y: m.y }, attackTarget: null };
      }
    }
  }

  return best;
}
