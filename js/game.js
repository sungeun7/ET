import { CLASSES, COLS, ROWS, TILE, buildMap } from './data.js';
import { TOTAL_STAGES, getStage } from './stages.js';
import { calcDamage, canCounter } from './combat.js';
import { decideEnemyAction } from './ai.js';
import {
  getAttackTilesAfterMove,
  getAttackTilesFrom,
  getMoveTiles,
  unitAt,
} from './pathfinding.js';
import { Renderer } from './render.js';
import { UI } from './ui.js';
import { sfx } from './audio.js';
import { getStageStory } from './story.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.ui = new UI();
    this.running = false;
    this.busy = false;
    this.stageNo = 1;
    this.state = this.createInitialState(1, false);
    this._bindUi();
    this._bindCanvas();
    this._last = performance.now();
    this.ui.setStageInfo(getStage(1));
    this.ui.syncMuteButton(sfx.enabled);
    requestAnimationFrame((t) => this.loop(t));
  }

  async _unlockAudio() {
    await sfx.unlock();
  }

  createInitialState(stageNo, started = false) {
    const stage = getStage(stageNo);
    return {
      stageNo,
      stage,
      map: buildMap(stage.layout),
      units: stage.units.map((u) => ({ ...u })),
      phase: 'player',
      mode: 'idle',
      selected: null,
      moveTiles: [],
      attackTiles: [],
      attackPreviewTiles: [],
      origin: null,
      over: false,
      started,
      result: null, // 'win' | 'clear' | 'lose' | null
    };
  }

  _bindUi() {
    document.getElementById('btnStart').addEventListener('click', async () => {
      await this._unlockAudio();
      sfx.uiClick();
      this.openStage(1);
    });
    document.getElementById('btnBriefing').addEventListener('click', async () => {
      await this._unlockAudio();
      sfx.uiClick();
      this.beginBattle();
    });
    document.getElementById('btnAgain').addEventListener('click', async () => {
      await this._unlockAudio();
      sfx.uiClick();
      this.onResultAction();
    });
    document.getElementById('btnRestart').addEventListener('click', async () => {
      await this._unlockAudio();
      sfx.uiClick();
      this.restartStage();
    });
    document.getElementById('btnEndTurn').addEventListener('click', async () => {
      await this._unlockAudio();
      sfx.endTurn();
      this.endPlayerTurn();
    });
    document.getElementById('btnMute').addEventListener('click', async () => {
      await this._unlockAudio();
      const on = sfx.toggle();
      this.ui.syncMuteButton(on);
      if (on) sfx.uiClick();
    });
  }

  _bindCanvas() {
    this.canvas.addEventListener('click', async (e) => {
      await this._unlockAudio();
      this.onClick(e);
    });
    this.canvas.addEventListener('mousemove', (e) => this.onMove(e));
    this.canvas.addEventListener('mouseleave', () => this.renderer.setHover(null));
    this.canvas.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      await this._unlockAudio();
      if (this.state.selected) sfx.cancel();
      this.cancelAction();
    });
  }

  /** 스테이지 선택 → 서사 브리핑 */
  openStage(stageNo = 1) {
    this.busy = false;
    this.running = false;
    this.stageNo = stageNo;
    this.state = this.createInitialState(stageNo, false);
    this.ui.hideTitle();
    this.ui.hideResult();
    this.ui.clearLog();
    this.ui.setStageInfo(this.state.stage);
    this.ui.setPhase('player', false);
    this.ui.btnEndTurn.disabled = true;
    this.ui.renderUnit(null, this.state.map);
    this.ui.renderCombatPreview(null, null, this.state.map);
    this.ui.showBriefing(this.state.stage);
  }

  /** 브리핑 확인 후 전투 시작 */
  beginBattle() {
    this.state.started = true;
    this.running = true;
    this.ui.hideBriefing();
    this.ui.setPhase('player', false);
    sfx.startBattle();
    setTimeout(() => sfx.phasePlayer(), 180);
    const story = getStageStory(this.state.stage);
    this.ui.log(`스테이지 ${this.stageNo} — ${story.title}`, 'phase');
    this.ui.log(story.body, 'phase');
  }

  start(stageNo = 1) {
    this.openStage(stageNo);
  }

  restartStage() {
    this.openStage(this.stageNo);
  }

  onResultAction() {
    if (this.state.result === 'win') {
      this.openStage(this.stageNo + 1);
      return;
    }
    if (this.state.result === 'clear') {
      this.ui.hideResult();
      this.ui.showTitle();
      this.stageNo = 1;
      this.state = this.createInitialState(1, false);
      this.ui.setStageInfo(getStage(1));
      return;
    }
    this.openStage(this.stageNo);
  }

  loop(t) {
    const dt = Math.min(0.05, (t - this._last) / 1000);
    this._last = t;
    this.renderer.update(dt);
    this.renderer.draw(this.state);
    requestAnimationFrame((nt) => this.loop(nt));
  }

  tileFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / TILE);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / TILE);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
    return { x, y };
  }

  onMove(e) {
    const tile = this.tileFromEvent(e);
    this.renderer.setHover(tile);
    if (!this.state.started || this.state.over || this.busy) return;
    if (this.state.mode === 'attack' && this.state.selected && tile) {
      const target = unitAt(this.state.units, tile.x, tile.y);
      if (target && target.team === 'enemy') {
        this.ui.renderCombatPreview(this.state.selected, target, this.state.map);
        return;
      }
    }
    if (this.state.mode !== 'attack') {
      this.ui.renderCombatPreview(null, null, this.state.map);
    }
  }

  onClick(e) {
    if (!this.state.started || this.state.over || this.busy) return;
    if (this.state.phase !== 'player') return;
    const tile = this.tileFromEvent(e);
    if (!tile) return;

    const clicked = unitAt(this.state.units, tile.x, tile.y);

    if (this.state.mode === 'idle') {
      if (clicked && clicked.team === 'player' && !clicked.acted) {
        this.selectUnit(clicked);
      } else if (clicked) {
        sfx.select();
        this.ui.renderUnit(clicked, this.state.map);
      }
      return;
    }

    if (this.state.mode === 'selected' || this.state.mode === 'move') {
      if (clicked && clicked.id === this.state.selected.id) {
        this.enterAttackOrWait(this.state.selected.x, this.state.selected.y);
        return;
      }
      if (clicked && clicked.team === 'player' && !clicked.acted) {
        this.selectUnit(clicked);
        return;
      }
      const canMove = this.state.moveTiles.some((t) => t.x === tile.x && t.y === tile.y);
      if (canMove && !clicked) {
        this.moveSelected(tile.x, tile.y);
        return;
      }
      sfx.cancel();
      this.cancelAction();
      return;
    }

    if (this.state.mode === 'attack') {
      if (clicked && clicked.team === 'enemy') {
        const inRange = this.state.attackTiles.some((t) => t.x === tile.x && t.y === tile.y);
        if (inRange) {
          const unit = this.state.selected;
          this.resolveAttack(unit, clicked).then(() => {
            if (unit.alive) this.finishUnit(unit);
            else {
              this.state.selected = null;
              this.state.mode = 'idle';
              this.checkEnd();
              if (!this.state.over && this.allPlayerActed()) this.endPlayerTurn();
            }
          });
          return;
        }
      }
      if (tile.x === this.state.selected.x && tile.y === this.state.selected.y) {
        const name = this.state.selected.name;
        sfx.wait();
        this.finishUnit(this.state.selected);
        this.ui.log(`${name}이(가) 대기합니다.`);
        return;
      }
      sfx.cancel();
      this.cancelAction();
    }
  }

  selectUnit(unit) {
    const cls = CLASSES[unit.classId];
    this.state.selected = unit;
    this.state.origin = { x: unit.x, y: unit.y };
    this.state.moveTiles = getMoveTiles(this.state.map, this.state.units, unit, cls);
    this.state.attackPreviewTiles = getAttackTilesAfterMove(
      this.state.map,
      this.state.units,
      unit,
      cls
    );
    this.state.attackTiles = [];
    this.state.mode = 'move';
    sfx.select();
    this.ui.renderUnit(unit, this.state.map);
    this.ui.renderCombatPreview(null, null, this.state.map);
  }

  moveSelected(x, y) {
    const unit = this.state.selected;
    unit.x = x;
    unit.y = y;
    sfx.move();
    this.enterAttackOrWait(x, y);
  }

  enterAttackOrWait(x, y) {
    const unit = this.state.selected;
    const cls = CLASSES[unit.classId];
    const attackTiles = getAttackTilesFrom(x, y, cls.rangeMin, cls.rangeMax);
    const hasTarget = attackTiles.some((t) => {
      const u = unitAt(this.state.units, t.x, t.y);
      return u && u.team === 'enemy';
    });
    this.state.moveTiles = [];
    this.state.attackPreviewTiles = [];
    this.state.attackTiles = attackTiles;
    this.state.mode = 'attack';
    this.ui.renderUnit(unit, this.state.map);
    if (!hasTarget) {
      sfx.wait();
      this.finishUnit(unit);
      this.ui.log(`${unit.name}이(가) 이동 후 대기합니다.`);
    }
  }

  cancelAction() {
    if (!this.state.selected) {
      this.state.mode = 'idle';
      return;
    }
    if (this.state.origin && this.state.mode !== 'idle') {
      this.state.selected.x = this.state.origin.x;
      this.state.selected.y = this.state.origin.y;
    }
    this.state.selected = null;
    this.state.origin = null;
    this.state.moveTiles = [];
    this.state.attackTiles = [];
    this.state.attackPreviewTiles = [];
    this.state.mode = 'idle';
    this.ui.renderCombatPreview(null, null, this.state.map);
  }

  finishUnit(unit) {
    if (!unit) return;
    unit.acted = true;
    unit.moved = true;
    this.state.selected = null;
    this.state.origin = null;
    this.state.moveTiles = [];
    this.state.attackTiles = [];
    this.state.attackPreviewTiles = [];
    this.state.mode = 'idle';
    this.ui.renderUnit(unit, this.state.map);
    this.ui.renderCombatPreview(null, null, this.state.map);
    this.checkEnd();
    if (!this.state.over && this.allPlayerActed()) {
      this.endPlayerTurn();
    }
  }

  allPlayerActed() {
    return this.state.units
      .filter((u) => u.alive && u.team === 'player')
      .every((u) => u.acted);
  }

  async resolveAttack(attacker, defender) {
    this.busy = true;
    const isMagic = CLASSES[attacker.classId].weapon === '마법';

    // 공격 액션 재생 → 임팩트 시 데미지 적용
    await this._playStrike(attacker, defender, isMagic, false);

    await wait(220);

    if (defender.alive && canCounter(attacker, defender)) {
      const counterMagic = CLASSES[defender.classId].weapon === '마법';
      await this._playStrike(defender, attacker, counterMagic, true);
      await wait(180);
    }

    this.busy = false;
    this.checkEnd();
  }

  /**
   * 공격 애니메이션 + 명중/피해 처리
   */
  async _playStrike(attacker, defender, isMagic, isCounter = false) {
    sfx.attack(isMagic);

    let resolved = null;
    const applyHit = () => {
      resolved = calcDamage(attacker, defender, this.state.map);
      this.renderer.triggerImpact(defender.id, resolved.hit);
      const dmgColor = isCounter ? '#ffd27a' : '#ffb4ae';
      if (!resolved.hit) {
        sfx.miss();
        this.renderer.addDamageFx(defender.x, defender.y, 'MISS', '#ccc');
        this.ui.log(
          isCounter
            ? `${attacker.name}의 반격이 빗나갔습니다.`
            : `${attacker.name}의 공격이 빗나갔습니다.`
        );
      } else {
        defender.hp = Math.max(0, defender.hp - resolved.damage);
        this.renderer.addDamageFx(defender.x, defender.y, `-${resolved.damage}`, dmgColor);
        this.ui.log(
          isCounter
            ? `${attacker.name}의 반격! ${defender.name} ${resolved.damage} 피해`
            : `${attacker.name}이(가) ${defender.name}에게 ${resolved.damage} 피해`,
          'damage'
        );
        if (defender.hp <= 0) {
          defender.alive = false;
          sfx.defeat();
          this.ui.log(`${defender.name}이(가) 쓰러졌습니다.`, 'damage');
        } else {
          sfx.hit();
        }
      }
    };

    const anim = this.renderer.playAttack(attacker, defender);
    const attackObj = this.renderer.attacks[this.renderer.attacks.length - 1];
    if (attackObj) attackObj.onImpact = applyHit;

    await anim;
    if (!resolved) applyHit();
  }

  checkEnd() {
    if (this.state.over) return true;
    const players = this.state.units.filter((u) => u.alive && u.team === 'player');
    const enemies = this.state.units.filter((u) => u.alive && u.team === 'enemy');
    if (enemies.length === 0) {
      this.state.over = true;
      if (this.stageNo >= TOTAL_STAGES) {
        this.state.result = 'clear';
        this.ui.showResult('clear', this.stageNo);
        sfx.clearAll();
        this.ui.log('전 스테이지 클리어!', 'phase');
      } else {
        this.state.result = 'win';
        this.ui.showResult('win', this.stageNo);
        sfx.win();
        this.ui.log(`스테이지 ${this.stageNo} 클리어!`, 'phase');
      }
      return true;
    }
    if (players.length === 0) {
      this.state.over = true;
      this.state.result = 'lose';
      this.ui.showResult('lose', this.stageNo);
      sfx.lose();
      this.ui.log('패배...', 'phase');
      return true;
    }
    return false;
  }

  async endPlayerTurn() {
    if (this.busy || this.state.over || this.state.phase !== 'player') return;
    this.cancelAction();
    this.state.phase = 'enemy';
    this.ui.setPhase('enemy');
    sfx.phaseEnemy();
    this.ui.log('적 페이즈', 'phase');
    this.busy = true;
    await wait(500);

    const enemies = this.state.units.filter((u) => u.alive && u.team === 'enemy');
    for (const enemy of enemies) {
      if (this.state.over) break;
      await this.runEnemy(enemy);
      await wait(280);
    }

    if (this.state.over) {
      this.busy = false;
      return;
    }

    for (const u of this.state.units) {
      if (u.team === 'player' && u.alive) {
        u.acted = false;
        u.moved = false;
      }
    }
    this.state.phase = 'player';
    this.state.mode = 'idle';
    this.busy = false;
    this.ui.setPhase('player');
    sfx.phasePlayer();
    this.ui.log('플레이어 페이즈', 'phase');
  }

  async runEnemy(enemy) {
    const decision = decideEnemyAction(this.state.map, this.state.units, enemy);
    this.state.selected = enemy;
    await wait(180);

    if (decision.moveTo.x !== enemy.x || decision.moveTo.y !== enemy.y) {
      enemy.x = decision.moveTo.x;
      enemy.y = decision.moveTo.y;
      sfx.move();
      this.ui.log(`${enemy.name} 이동`);
      await wait(220);
    }

    if (decision.attackTarget && decision.attackTarget.alive) {
      const target = this.state.units.find(
        (u) => u.id === decision.attackTarget.id && u.alive
      );
      if (target) {
        const cls = CLASSES[enemy.classId];
        const dist =
          Math.abs(enemy.x - target.x) + Math.abs(enemy.y - target.y);
        if (dist >= cls.rangeMin && dist <= cls.rangeMax) {
          await this.resolveAttack(enemy, target);
        }
      }
    }

    this.state.selected = null;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
