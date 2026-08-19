import { CLASSES, COLS, ROWS, buildMap, isHealer } from './data.js';
import { TOTAL_STAGES, getStage } from './stages.js';
import { calcDamage, calcHeal, canCounter, previewHeal } from './combat.js';
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
import {
  canUseSkill,
  canUseUlt,
  isAoeHeal,
  isHealAction,
  regenMp,
  spendMp,
  strikeFx,
  strikeLabel,
  strikeMpCost,
  strikeMult,
} from './skills.js';
import {
  ITEMS,
  STARTER_INVENTORY,
  addToInventory,
  canEquip,
  listInventory,
  rewardsForStage,
} from './items.js';
import {
  applyProgressToUnit,
  createRosterProgress,
  grantKillXp,
  syncProgressFromUnits,
} from './xp.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.ui = new UI();
    this.running = false;
    this.busy = false;
    this.stageNo = 1;
    this.strikeKind = 'normal';
    this.inventory = { ...STARTER_INVENTORY };
    this.rosterProgress = createRosterProgress();
    this.state = this.createInitialState(1, false);
    this._bindUi();
    this._bindCanvas();
    this._last = performance.now();
    this.ui.setStageInfo(getStage(1));
    this.ui.syncMuteButton(sfx.enabled);
    this.ui.renderInventory(this.inventory, null);
    requestAnimationFrame((t) => this.loop(t));
  }

  async _unlockAudio() {
    await sfx.unlock();
  }

  createInitialState(stageNo, started = false) {
    const stage = getStage(stageNo);
    const units = stage.units.map((u) => {
      const copy = {
        ...u,
        equip: { ...(u.equip || { weapon: null, armor: null }) },
        xp: u.xp ?? 0,
      };
      if (copy.team === 'player') applyProgressToUnit(copy, this.rosterProgress);
      else if (copy.xp == null) copy.xp = 0;
      return copy;
    });
    return {
      stageNo,
      stage,
      map: buildMap(stage.layout),
      units,
      phase: 'player',
      mode: 'idle',
      selected: null,
      moveTiles: [],
      attackTiles: [],
      attackPreviewTiles: [],
      origin: null,
      over: false,
      started,
      result: null,
    };
  }

  _bindUi() {
    document.getElementById('btnStart').addEventListener('click', async () => {
      await this._unlockAudio();
      sfx.uiClick();
      this.inventory = { ...STARTER_INVENTORY };
      this.rosterProgress = createRosterProgress();
      this.openStage(1);
    });
    document.getElementById('btnBriefing').addEventListener('click', async () => {
      await this._unlockAudio();
      sfx.briefing();
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

    document.getElementById('btnNormal').addEventListener('click', async () => {
      await this._unlockAudio();
      sfx.uiClick();
      this.setStrikeKind('normal');
    });
    document.getElementById('btnSkill').addEventListener('click', async () => {
      await this._unlockAudio();
      if (!this.state.selected || !canUseSkill(this.state.selected)) return;
      sfx.select();
      this.setStrikeKind('skill');
    });
    document.getElementById('btnUlt').addEventListener('click', async () => {
      await this._unlockAudio();
      if (!this.state.selected || !canUseUlt(this.state.selected)) return;
      sfx.select();
      this.setStrikeKind('ultimate');
    });
    document.getElementById('btnWaitUnit').addEventListener('click', async () => {
      await this._unlockAudio();
      if (!this.state.selected || this.busy) return;
      sfx.wait();
      this.finishUnit(this.state.selected);
    });

    document.getElementById('inventoryPanel').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-item-action]');
      if (!btn) return;
      await this._unlockAudio();
      const id = btn.getAttribute('data-item-id');
      const action = btn.getAttribute('data-item-action');
      if (action === 'use') this.useConsumable(id);
      else if (action === 'equip') this.equipItem(id);
      else if (action === 'unequip') this.unequipSlot(btn.getAttribute('data-slot'));
    });
    document.getElementById('unitPanel').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-item-action="unequip"]');
      if (!btn) return;
      await this._unlockAudio();
      this.unequipSlot(btn.getAttribute('data-slot'));
    });
  }

  setStrikeKind(kind) {
    if (!this.state.selected) return;
    if (kind === 'skill' && !canUseSkill(this.state.selected)) return;
    if (kind === 'ultimate' && !canUseUlt(this.state.selected)) return;
    this.strikeKind = kind;
    const heal = isHealAction(this.state.selected, kind);
    this.state.mode = heal ? (kind === 'normal' ? 'heal' : kind) : kind === 'normal' ? 'attack' : kind;
    this.ui.setActionMode(kind === 'normal' ? (heal ? 'heal' : 'attack') : kind);
    this.ui.renderCombatPreview(null, null, this.state.map);
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
      this.onRightClick(e);
    });
  }

  openStage(stageNo = 1) {
    this.busy = false;
    this.running = false;
    this.stageNo = stageNo;
    this.strikeKind = 'normal';
    this.state = this.createInitialState(stageNo, false);
    this.ui.hideTitle();
    this.ui.hideResult();
    this.ui.hideActionBar();
    this.ui.clearLog();
    this.ui.setStageInfo(this.state.stage);
    this.ui.setPhase('player', false);
    this.ui.btnEndTurn.disabled = true;
    this.ui.renderUnit(null, this.state.map);
    this.ui.renderCombatPreview(null, null, this.state.map);
    this.ui.renderInventory(this.inventory, null);
    this.ui.showBriefing(this.state.stage);
    sfx.briefing();
  }

  beginBattle() {
    this.state.started = true;
    this.running = true;
    this.ui.hideBriefing();
    this.ui.setPhase('player', false);
    sfx.startBattle();
    setTimeout(() => sfx.phasePlayer(), 180);
    const story = getStageStory(this.state.stage);
    this.ui.showNarration(`스테이지 ${this.stageNo} — ${story.title}`, story.body);
  }

  restartStage() {
    this.openStage(this.stageNo);
  }

  onResultAction() {
    if (this.state.result === 'win') {
      this.rosterProgress = syncProgressFromUnits(this.rosterProgress, this.state.units);
      const gains = rewardsForStage(this.stageNo);
      this.inventory = addToInventory(this.inventory, gains);
      const names = Object.entries(gains)
        .map(([id, n]) => `${ITEMS[id]?.name || id}×${n}`)
        .join(', ');
      if (names) this.ui.log(`전리품: ${names}`, 'phase');
      this.openStage(this.stageNo + 1);
      return;
    }
    if (this.state.result === 'clear') {
      this.ui.hideResult();
      this.ui.showTitle();
      this.stageNo = 1;
      this.inventory = { ...STARTER_INVENTORY };
      this.rosterProgress = createRosterProgress();
      this.state = this.createInitialState(1, false);
      this.ui.setStageInfo(getStage(1));
      this.ui.renderInventory(this.inventory, null);
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
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    // object-fit:contain / 레터박스 보정 (비율 유지 시 offset=0)
    const scale = Math.min(rect.width / cw, rect.height / ch);
    const dispW = cw * scale;
    const dispH = ch * scale;
    const offX = (rect.width - dispW) / 2;
    const offY = (rect.height - dispH) / 2;
    const px = (e.clientX - rect.left - offX) / scale;
    const py = (e.clientY - rect.top - offY) / scale;
    if (px < -2 || py < -2 || px > cw + 2 || py > ch + 2) return null;
    return this.renderer.pickTile(px, py, this.state.map, this.state.units);
  }

  onMove(e) {
    const tile = this.tileFromEvent(e);
    this.renderer.setHover(tile);
    if (!this.state.started || this.state.over || this.busy) return;
    const targeting = ['attack', 'skill', 'ultimate', 'heal'].includes(this.state.mode);
    if (this.state.selected && tile) {
      const target = unitAt(this.state.units, tile.x, tile.y);
      const kind =
        this.state.mode === 'skill'
          ? 'skill'
          : this.state.mode === 'ultimate'
            ? 'ultimate'
            : 'normal';

      // 이동 선택 중: 이동 후 공격 가능한 적 미리보기
      if (
        (this.state.mode === 'move' || this.state.mode === 'selected') &&
        target &&
        target.team === 'enemy' &&
        !isHealAction(this.state.selected, 'normal') &&
        this.findApproachTile(this.state.selected, target)
      ) {
        this.ui.renderCombatPreview(this.state.selected, target, this.state.map, 'normal');
        return;
      }

      if (targeting) {
        if (target && isHealAction(this.state.selected, kind) && target.team === 'player') {
          this.ui.renderCombatPreview(this.state.selected, target, this.state.map, kind);
          return;
        }
        if (target && !isHealAction(this.state.selected, kind) && target.team === 'enemy') {
          this.ui.renderCombatPreview(this.state.selected, target, this.state.map, kind);
          return;
        }
      }
    }
    if (!targeting) this.ui.renderCombatPreview(null, null, this.state.map);
  }

  onClick(e) {
    if (!this.state.started || this.state.over || this.busy) return;
    if (this.state.phase !== 'player') return;
    const tile = this.tileFromEvent(e);
    if (!tile) return;
    const clicked = unitAt(this.state.units, tile.x, tile.y);

    if (this.state.mode === 'idle') {
      if (clicked && clicked.team === 'player' && !clicked.acted) this.selectUnit(clicked);
      else if (clicked) {
        sfx.select();
        this.ui.renderUnit(clicked, this.state.map);
        this.ui.renderInventory(this.inventory, clicked);
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
      // 사거리(이동 포함) 안 적 클릭 → 자동 이동 후 공격
      if (
        clicked &&
        clicked.team === 'enemy' &&
        !isHealAction(this.state.selected, 'normal')
      ) {
        const approach = this.findApproachTile(this.state.selected, clicked);
        if (approach) {
          this.autoMoveAndAttack(approach.x, approach.y, clicked);
          return;
        }
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

    if (['attack', 'skill', 'ultimate', 'heal'].includes(this.state.mode)) {
      const kind =
        this.state.mode === 'skill'
          ? 'skill'
          : this.state.mode === 'ultimate'
            ? 'ultimate'
            : 'normal';
      const heal = isHealAction(this.state.selected, kind);

      if (heal) {
        // 기본 치유 모드: 자기 칸/빈 칸 → 마법 없이 대기
        // 스킬·필살기: 자기 치유 허용
        if (kind === 'normal' && (
          (tile.x === this.state.selected.x && tile.y === this.state.selected.y) ||
          !clicked
        )) {
          sfx.wait();
          this.finishUnit(this.state.selected);
          return;
        }
        if (clicked && clicked.team === 'player') {
          const dist =
            Math.abs(clicked.x - this.state.selected.x) +
            Math.abs(clicked.y - this.state.selected.y);
          const cls = CLASSES[this.state.selected.classId];
          const ok =
            dist === 0 || (dist >= cls.rangeMin && dist <= cls.rangeMax);
          if (ok) {
            const unit = this.state.selected;
            this.resolveHeal(unit, clicked, kind).then(() => {
              if (unit.alive) this.finishUnit(unit);
            });
            return;
          }
        }
        if (kind !== 'normal' && tile.x === this.state.selected.x && tile.y === this.state.selected.y) {
          sfx.wait();
          this.finishUnit(this.state.selected);
          return;
        }
        sfx.cancel();
        this.ui.log('아군을 치유하거나 대기(자기 칸/대기 버튼)로 종료하세요.');
        return;
      } else if (clicked && clicked.team === 'enemy') {
        const inRange = this.state.attackTiles.some((t) => t.x === tile.x && t.y === tile.y);
        if (inRange) {
          const unit = this.state.selected;
          this.resolveAttack(unit, clicked, kind).then(() => {
            if (unit.alive) this.finishUnit(unit);
            else {
              this.state.selected = null;
              this.state.mode = 'idle';
              this.ui.hideActionBar();
              this.checkEnd();
              if (!this.state.over && this.allPlayerActed()) this.endPlayerTurn();
            }
          });
          return;
        }
      }

      if (tile.x === this.state.selected.x && tile.y === this.state.selected.y) {
        sfx.wait();
        this.finishUnit(this.state.selected);
        return;
      }
      sfx.cancel();
      this.cancelAction();
    }
  }

  /**
   * 우클릭: 스킬 선택·사용
   * - 대상 위 → 자동 이동 후 스킬
   * - 빈 칸/자기 → 스킬 조준 모드
   * - 조준 중 빈 칸 → 취소
   */
  onRightClick(e) {
    if (!this.state.started || this.state.over || this.busy) return;
    if (this.state.phase !== 'player') return;

    const tile = this.tileFromEvent(e);
    const unit = this.state.selected;
    if (!unit || unit.acted) {
      if (unit) {
        sfx.cancel();
        this.cancelAction();
      }
      return;
    }

    if (!canUseSkill(unit)) {
      this.ui.log(`${unit.name}의 MP가 부족합니다.`);
      return;
    }

    const clicked = tile ? unitAt(this.state.units, tile.x, tile.y) : null;
    const heal = isHealAction(unit, 'skill');
    const mode = this.state.mode;

    if (mode === 'selected' || mode === 'move') {
      if (heal && clicked && clicked.team === 'player') {
        const approach = this.findApproachTile(unit, clicked);
        if (approach) {
          this.autoMoveAndStrike(approach.x, approach.y, clicked, 'skill');
          return;
        }
      }
      if (!heal && clicked && clicked.team === 'enemy') {
        const approach = this.findApproachTile(unit, clicked);
        if (approach) {
          this.autoMoveAndStrike(approach.x, approach.y, clicked, 'skill');
          return;
        }
      }
      this.armSkillMode();
      return;
    }

    if (['attack', 'skill', 'ultimate', 'heal'].includes(mode)) {
      if (heal && clicked && clicked.team === 'player') {
        const dist =
          Math.abs(clicked.x - unit.x) + Math.abs(clicked.y - unit.y);
        const cls = CLASSES[unit.classId];
        const ok = dist === 0 || (dist >= cls.rangeMin && dist <= cls.rangeMax);
        if (ok) {
          this.strikeKind = 'skill';
          this.state.mode = 'skill';
          this.ui.setActionMode('skill');
          this.resolveHeal(unit, clicked, 'skill').then(() => {
            if (unit.alive) this.finishUnit(unit);
          });
          return;
        }
      }
      if (!heal && clicked && clicked.team === 'enemy') {
        const inRange = this.state.attackTiles.some((t) => t.x === tile.x && t.y === tile.y);
        if (inRange) {
          this.strikeKind = 'skill';
          this.state.mode = 'skill';
          this.ui.setActionMode('skill');
          this.resolveAttack(unit, clicked, 'skill').then(() => {
            if (unit.alive) this.finishUnit(unit);
            else {
              this.state.selected = null;
              this.state.mode = 'idle';
              this.ui.hideActionBar();
              this.checkEnd();
              if (!this.state.over && this.allPlayerActed()) this.endPlayerTurn();
            }
          });
          return;
        }
      }
      // 스킬 모드가 아니면 스킬로 전환, 이미 스킬이면 취소
      if (mode !== 'skill') {
        this.setStrikeKind('skill');
        return;
      }
      sfx.cancel();
      this.cancelAction();
    }
  }

  /** 현재 위치에서 스킬 조준 (이동 단계면 그 자리에서 공격 단계 진입) */
  armSkillMode() {
    const unit = this.state.selected;
    if (!unit || !canUseSkill(unit)) return;
    if (this.state.mode === 'move' || this.state.mode === 'selected') {
      const cls = CLASSES[unit.classId];
      this.state.moveTiles = [];
      this.state.attackPreviewTiles = [];
      this.state.attackTiles = getAttackTilesFrom(unit.x, unit.y, cls.rangeMin, cls.rangeMax);
      this.ui.showActionBar(unit, isHealAction(unit, 'normal') ? 'heal' : 'attack');
      this.ui.btnNormal.textContent = cls.heal ? '치유' : '일반 공격';
    }
    this.setStrikeKind('skill');
    sfx.select();
  }

  /**
   * 이동 가능 칸 중 대상을 공격/치유할 수 있는 최적 위치
   */
  findApproachTile(unit, target) {
    if (!unit || !target || !target.alive) return null;
    const cls = CLASSES[unit.classId];
    const candidates = [];
    for (const m of this.state.moveTiles) {
      const occ = unitAt(this.state.units, m.x, m.y);
      if (occ && occ.id !== unit.id) continue;
      const dist = Math.abs(m.x - target.x) + Math.abs(m.y - target.y);
      if (dist < cls.rangeMin || dist > cls.rangeMax) continue;
      candidates.push(m);
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      const aStay = a.x === unit.x && a.y === unit.y ? 0 : 1;
      const bStay = b.x === unit.x && b.y === unit.y ? 0 : 1;
      if (aStay !== bStay) return aStay - bStay;
      const da = Math.abs(a.x - unit.x) + Math.abs(a.y - unit.y);
      const db = Math.abs(b.x - unit.x) + Math.abs(b.y - unit.y);
      if (da !== db) return da - db;
      return (b.left || 0) - (a.left || 0);
    });
    return candidates[0];
  }

  async autoMoveAndAttack(x, y, enemy) {
    return this.autoMoveAndStrike(x, y, enemy, 'normal');
  }

  async autoMoveAndStrike(x, y, target, kind = 'normal') {
    const unit = this.state.selected;
    if (!unit || this.busy) return;
    if (kind === 'skill' && !canUseSkill(unit)) {
      this.ui.log(`${unit.name}의 MP가 부족합니다.`);
      return;
    }
    this.busy = true;
    if (unit.x !== x || unit.y !== y) {
      unit.x = x;
      unit.y = y;
      sfx.move();
      await wait(220);
    }
    this.state.moveTiles = [];
    this.state.attackPreviewTiles = [];
    this.state.attackTiles = [];
    this.strikeKind = kind;
    this.state.mode = kind === 'normal' ? 'attack' : kind;
    this.ui.hideActionBar();
    this.busy = false;

    const heal = isHealAction(unit, kind);
    if (heal) {
      await this.resolveHeal(unit, target, kind);
      if (unit.alive) this.finishUnit(unit);
      return;
    }

    await this.resolveAttack(unit, target, kind);
    if (unit.alive) this.finishUnit(unit);
    else {
      this.state.selected = null;
      this.state.mode = 'idle';
      this.ui.hideActionBar();
      this.checkEnd();
      if (!this.state.over && this.allPlayerActed()) this.endPlayerTurn();
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
    this.strikeKind = 'normal';
    this.ui.hideActionBar();
    sfx.select();
    this.ui.renderUnit(unit, this.state.map);
    this.ui.renderCombatPreview(null, null, this.state.map);
    this.ui.renderInventory(this.inventory, unit);
  }

  moveSelected(x, y) {
    this.state.selected.x = x;
    this.state.selected.y = y;
    sfx.move();
    this.enterAttackOrWait(x, y);
  }

  enterAttackOrWait(x, y) {
    const unit = this.state.selected;
    const cls = CLASSES[unit.classId];
    let attackTiles = getAttackTilesFrom(x, y, cls.rangeMin, cls.rangeMax);
    // 성직자: 스킬/필살기로만 자기 치유 — 기본 범위는 아군 타일
    if (cls.heal) {
      // 자기 칸은 대기용으로 쓰므로 기본 치유 타일에서 제외 (다른 아군만)
    }

    const hasTarget = attackTiles.some((t) => {
      const u = unitAt(this.state.units, t.x, t.y);
      if (cls.heal) return u && u.team === 'player' && u.id !== unit.id && u.hp < u.maxHp;
      return u && u.team === 'enemy';
    });

    this.state.moveTiles = [];
    this.state.attackPreviewTiles = [];
    this.state.attackTiles = attackTiles;
    this.strikeKind = 'normal';
    this.state.mode = cls.heal ? 'heal' : 'attack';
    this.ui.renderUnit(unit, this.state.map);
    this.ui.renderInventory(this.inventory, unit);

    // 성직자도 치유 대상이 없으면 마법 없이 바로 대기
    if (!hasTarget) {
      sfx.wait();
      this.finishUnit(unit);
      return;
    }

    this.ui.showActionBar(unit, cls.heal ? 'heal' : 'attack');
    this.ui.btnNormal.textContent = cls.heal ? '치유' : '일반 공격';
  }

  cancelAction() {
    if (!this.state.selected) {
      this.state.mode = 'idle';
      this.ui.hideActionBar();
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
    this.strikeKind = 'normal';
    this.ui.hideActionBar();
    this.ui.renderCombatPreview(null, null, this.state.map);
    this.ui.renderInventory(this.inventory, null);
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
    this.strikeKind = 'normal';
    this.ui.hideActionBar();
    this.ui.renderUnit(unit, this.state.map);
    this.ui.renderCombatPreview(null, null, this.state.map);
    this.ui.renderInventory(this.inventory, null);
    this.checkEnd();
    if (!this.state.over && this.allPlayerActed()) this.endPlayerTurn();
  }

  allPlayerActed() {
    return this.state.units
      .filter((u) => u.alive && u.team === 'player')
      .every((u) => u.acted);
  }

  async resolveHeal(healer, target, kind = 'normal') {
    this.busy = true;
    this.ui.hideActionBar();
    const mult = strikeMult(healer, kind);
    const fx = strikeFx(healer, kind);
    const label = strikeLabel(healer, kind);
    const cost = strikeMpCost(healer, kind);

    if (cost > 0 && !spendMp(healer, cost)) {
      this.ui.log(`${healer.name}의 MP가 부족합니다.`);
      this.busy = false;
      this.ui.showActionBar(healer, kind === 'normal' ? 'heal' : kind);
      return;
    }
    if (cost > 0) this.ui.log(`${healer.name} MP -${cost} (${healer.mp}/${healer.maxMp})`);

    if (kind === 'ultimate') sfx.ultimate();
    else if (kind === 'skill') sfx.skill();
    else sfx.heal();

    const targets = isAoeHeal(healer, kind)
      ? this.state.units.filter((u) => {
          if (!u.alive || u.team !== healer.team) return false;
          const d = Math.abs(u.x - healer.x) + Math.abs(u.y - healer.y);
          const cls = CLASSES[healer.classId];
          return d <= cls.rangeMax;
        })
      : [target];

    let resolved = false;
    const apply = () => {
      resolved = true;
      for (const t of targets) {
        const amount = calcHeal(healer, t, mult);
        if (amount <= 0) {
          this.ui.log(`${t.name}은(는) 이미 기운이 넘칩니다.`);
          continue;
        }
        t.hp = Math.min(t.maxHp, t.hp + amount);
        this.renderer.triggerImpact(t.id, true, kind !== 'normal');
        this.renderer.addDamageFx(this.state.map, t.x, t.y, `+${amount}`, '#9fe8b0');
        this.ui.log(`${healer.name}의 ${label}! ${t.name} HP +${amount}`, 'phase');
      }
    };

    const focus = targets[0] || target;
    const anim = this.renderer.playAttack(healer, focus, this.state.map, fx);
    const attackObj = this.renderer.attacks[this.renderer.attacks.length - 1];
    if (attackObj) attackObj.onImpact = apply;
    await anim;
    if (!resolved) apply();

    this.busy = false;
    this.ui.renderUnit(healer, this.state.map);
  }

  async resolveAttack(attacker, defender, kind = 'normal') {
    this.busy = true;
    this.ui.hideActionBar();
    const isMagic = CLASSES[attacker.classId].weapon === '마법';
    const ok = await this._playStrike(attacker, defender, isMagic, false, kind);
    if (!ok) {
      this.busy = false;
      if (attacker.team === 'player' && !attacker.acted) {
        this.state.selected = attacker;
        this.ui.showActionBar(attacker, kind === 'normal' ? 'attack' : kind);
      }
      return;
    }
    await wait(kind === 'ultimate' ? 320 : 220);
    if (kind === 'normal' && defender.alive && canCounter(attacker, defender)) {
      const counterMagic = CLASSES[defender.classId].weapon === '마법';
      await this._playStrike(defender, attacker, counterMagic, true, 'normal');
      await wait(180);
    }
    this.busy = false;
    this.checkEnd();
  }

  async _playStrike(attacker, defender, isMagic, isCounter = false, kind = 'normal') {
    const mult = isCounter ? 1 : strikeMult(attacker, kind);
    const fx = isCounter
      ? CLASSES[attacker.classId].id === 'mage'
        ? 'magic'
        : CLASSES[attacker.classId].id === 'archer'
          ? 'arrow'
          : 'slash'
      : strikeFx(attacker, kind);

    if (!isCounter) {
      const cost = strikeMpCost(attacker, kind);
      if (cost > 0 && !spendMp(attacker, cost)) {
        this.ui.log(`${attacker.name}의 MP가 부족합니다.`);
        return false;
      }
      if (cost > 0) this.ui.log(`${attacker.name} MP -${cost} (${attacker.mp}/${attacker.maxMp})`);
    }

    if (kind === 'ultimate' && !isCounter) sfx.ultimate();
    else if (kind === 'skill' && !isCounter) sfx.skill();
    else sfx.attack(isMagic);

    let resolved = null;
    const applyHit = () => {
      resolved = calcDamage(attacker, defender, this.state.map, mult);
      this.renderer.triggerImpact(defender.id, resolved.hit, kind !== 'normal');
      const dmgColor =
        kind === 'ultimate' ? '#7dffc0' : kind === 'skill' ? '#9ec8ff' : isCounter ? '#ffd27a' : '#ffb4ae';
      const label = isCounter ? '반격' : strikeLabel(attacker, kind);
      if (!resolved.hit) {
        sfx.miss();
        this.renderer.addDamageFx(this.state.map, defender.x, defender.y, 'MISS', '#ccc');
        this.ui.log(`${attacker.name}의 ${label}이(가) 빗나갔습니다.`);
      } else {
        defender.hp = Math.max(0, defender.hp - resolved.damage);
        this.renderer.addDamageFx(
          this.state.map,
          defender.x,
          defender.y,
          `-${resolved.damage}`,
          dmgColor
        );
        this.ui.log(
          `${attacker.name}의 ${label}! ${defender.name} ${resolved.damage} 피해`,
          'damage'
        );
        if (defender.hp <= 0) {
          defender.alive = false;
          sfx.defeat();
          this.ui.log(`${defender.name}이(가) 쓰러졌습니다.`, 'damage');
          if (attacker.team === 'player' && defender.team === 'enemy') {
            this._awardKillXp(attacker, defender);
          }
        } else sfx.hit();
      }
    };

    const anim = this.renderer.playAttack(attacker, defender, this.state.map, fx);
    const attackObj = this.renderer.attacks[this.renderer.attacks.length - 1];
    if (attackObj) attackObj.onImpact = applyHit;
    await anim;
    if (!resolved) applyHit();
    return true;
  }

  _awardKillXp(killer, victim) {
    const events = grantKillXp(this.state.units, killer, victim);
    this.rosterProgress = syncProgressFromUnits(this.rosterProgress, this.state.units);
    const lines = [];
    let title = '';
    for (const ev of events) {
      if (ev.kind === 'kill') {
        title = `${ev.unit.name} 경험치 +${ev.gained}`;
        this.renderer.addDamageFx(
          this.state.map,
          ev.unit.x,
          ev.unit.y,
          `+${ev.gained}XP`,
          '#f0c35c'
        );
      } else {
        lines.push(`${ev.unit.name} 지원 +${ev.gained}`);
        this.renderer.addDamageFx(
          this.state.map,
          ev.unit.x,
          ev.unit.y,
          `+${ev.gained}`,
          '#c9b87a'
        );
      }
      if (ev.levelsGained > 0) {
        sfx.win();
        lines.push(`${ev.unit.name} 레벨 업! → Lv.${ev.newLevel}`);
        this.renderer.addDamageFx(
          this.state.map,
          ev.unit.x,
          ev.unit.y,
          `Lv.${ev.newLevel}`,
          '#7dffc0'
        );
      }
    }
    if (title || lines.length) {
      this.ui.showXp(title || lines[0], title ? lines.join('\n') : lines.slice(1).join('\n'));
    }
    if (this.state.selected) this.ui.renderUnit(this.state.selected, this.state.map);
  }

  useConsumable(itemId) {
    if (this.busy || this.state.over || this.state.phase !== 'player') return;
    const item = ITEMS[itemId];
    if (!item || item.type !== 'consumable') return;
    if (!(this.inventory[itemId] > 0)) return;
    const unit = this.state.selected;
    if (!unit || unit.team !== 'player' || !unit.alive || unit.acted) {
      this.ui.log('행동 가능한 아군을 선택한 뒤 아이템을 사용하세요.');
      return;
    }
    if (unit.hp >= unit.maxHp) {
      this.ui.log(`${unit.name}은(는) 이미 기운이 넘칩니다.`);
      return;
    }
    const heal = Math.min(item.heal, unit.maxHp - unit.hp);
    unit.hp += heal;
    this.inventory[itemId] -= 1;
    if (this.inventory[itemId] <= 0) delete this.inventory[itemId];
    sfx.itemUse();
    this.renderer.addDamageFx(this.state.map, unit.x, unit.y, `+${heal}`, '#9fe8b0');
    this.ui.log(`${unit.name}이(가) ${item.name} 사용 (HP +${heal})`, 'phase');
    this.finishUnit(unit);
  }

  equipItem(itemId) {
    if (this.busy || this.state.phase !== 'player') return;
    const item = ITEMS[itemId];
    const unit = this.state.selected;
    if (!item || !unit || unit.team !== 'player') return;
    if (!canEquip(item, unit)) {
      this.ui.log(`${unit.name}은(는) ${item.name}을(를) 장착할 수 없습니다.`);
      return;
    }
    if (!(this.inventory[itemId] > 0)) return;
    const slot = item.type === 'weapon' ? 'weapon' : 'armor';
    const prev = unit.equip[slot];
    if (prev) this.inventory[prev] = (this.inventory[prev] || 0) + 1;
    unit.equip[slot] = itemId;
    this.inventory[itemId] -= 1;
    if (this.inventory[itemId] <= 0) delete this.inventory[itemId];
    sfx.equip();
    this.ui.log(`${unit.name}이(가) ${item.name} 장착`, 'phase');
    this.ui.renderUnit(unit, this.state.map);
    this.ui.renderInventory(this.inventory, unit);
  }

  unequipSlot(slot) {
    const unit = this.state.selected;
    if (!unit || !slot) return;
    const id = unit.equip[slot];
    if (!id) return;
    this.inventory[id] = (this.inventory[id] || 0) + 1;
    unit.equip[slot] = null;
    sfx.equip();
    this.ui.log(`${unit.name}이(가) 장비 해제`, 'phase');
    this.ui.renderUnit(unit, this.state.map);
    this.ui.renderInventory(this.inventory, unit);
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
    this.busy = true;
    // 적 턴 시작 시 적 MP 회복
    for (const u of this.state.units) {
      if (u.alive && u.team === 'enemy') regenMp(u);
    }
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
        regenMp(u);
      }
    }
    this.state.phase = 'player';
    this.state.mode = 'idle';
    this.busy = false;
    this.ui.setPhase('player');
    sfx.phasePlayer();
  }

  async runEnemy(enemy) {
    if (isHealer(enemy)) {
      // 적 성직자: 부상 아군(적팀) 치유 우선
      const allies = this.state.units.filter(
        (u) => u.alive && u.team === 'enemy' && u.hp < u.maxHp
      );
      if (allies.length) {
        allies.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        const target = allies[0];
        const cls = CLASSES[enemy.classId];
        const dist = Math.abs(enemy.x - target.x) + Math.abs(enemy.y - target.y);
        if (dist >= cls.rangeMin && dist <= cls.rangeMax) {
          await this.resolveHeal(enemy, target, canUseSkill(enemy) ? 'skill' : 'normal');
          return;
        }
      }
    }

    const decision = decideEnemyAction(this.state.map, this.state.units, enemy);
    this.state.selected = enemy;
    await wait(180);

    if (decision.moveTo.x !== enemy.x || decision.moveTo.y !== enemy.y) {
      enemy.x = decision.moveTo.x;
      enemy.y = decision.moveTo.y;
      sfx.move();
      await wait(220);
    }

    if (decision.attackTarget && decision.attackTarget.alive) {
      const target = this.state.units.find(
        (u) => u.id === decision.attackTarget.id && u.alive
      );
      if (target) {
        const cls = CLASSES[enemy.classId];
        const dist = Math.abs(enemy.x - target.x) + Math.abs(enemy.y - target.y);
        if (dist >= cls.rangeMin && dist <= cls.rangeMax) {
          let kind = 'normal';
          if (enemy.isBoss && canUseUlt(enemy) && Math.random() < 0.45) kind = 'ultimate';
          else if (canUseSkill(enemy) && Math.random() < 0.35) kind = 'skill';
          await this.resolveAttack(enemy, target, kind);
        }
      }
    }
    this.state.selected = null;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

void listInventory;
void COLS;
void ROWS;
void previewHeal;
