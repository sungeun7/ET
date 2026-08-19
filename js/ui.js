import { CLASSES, TERRAIN } from './data.js';
import { TOTAL_STAGES } from './stages.js';
import { previewCombat, previewHeal } from './combat.js';
import { getDefeatText, getStageStory, getVictoryText } from './story.js';
import { canUseSkill, canUseUlt, getSkill, getUlt, isHealAction, strikeMult } from './skills.js';
import { ITEMS, effectiveStat, listInventory } from './items.js';

export class UI {
  constructor() {
    this.unitPanel = document.getElementById('unitPanel');
    this.combatPreview = document.getElementById('combatPreview');
    this.battleLog = document.getElementById('battleLog');
    this.phaseLabel = document.getElementById('phaseLabel');
    this.phaseBanner = document.getElementById('phaseBanner');
    this.titleOverlay = document.getElementById('titleOverlay');
    this.briefingOverlay = document.getElementById('briefingOverlay');
    this.briefingAct = document.getElementById('briefingAct');
    this.briefingTitle = document.getElementById('briefingTitle');
    this.briefingText = document.getElementById('briefingText');
    this.resultOverlay = document.getElementById('resultOverlay');
    this.resultTitle = document.getElementById('resultTitle');
    this.resultText = document.getElementById('resultText');
    this.btnEndTurn = document.getElementById('btnEndTurn');
    this.btnAgain = document.getElementById('btnAgain');
    this.stageLabel = document.getElementById('stageLabel');
    this.actionBar = document.getElementById('actionBar');
    this.btnNormal = document.getElementById('btnNormal');
    this.btnSkill = document.getElementById('btnSkill');
    this.btnUlt = document.getElementById('btnUlt');
    this.btnWaitUnit = document.getElementById('btnWaitUnit');
    this.inventoryPanel = document.getElementById('inventoryPanel');
  }

  showTitle() {
    this.titleOverlay.hidden = false;
    this.hideBriefing();
    this.hideActionBar();
  }

  hideTitle() {
    this.titleOverlay.hidden = true;
  }

  showBriefing(stage) {
    const story = getStageStory(stage);
    this.briefingOverlay.hidden = false;
    this.briefingAct.textContent = `STAGE ${stage.stage}/${TOTAL_STAGES} · ${story.act}`;
    this.briefingTitle.textContent = story.title;
    this.briefingText.textContent = story.body;
  }

  hideBriefing() {
    if (this.briefingOverlay) this.briefingOverlay.hidden = true;
  }

  showActionBar(unit, mode = 'attack') {
    if (!this.actionBar || !unit) return;
    this.actionBar.hidden = false;
    const skill = getSkill(unit);
    const ult = getUlt(unit);
    this.btnSkill.textContent = skill ? `스킬 · ${skill.name}` : '스킬';
    this.btnUlt.textContent = ult ? `필살기 · ${ult.name}` : '필살기';
    this.btnSkill.disabled = !canUseSkill(unit);
    this.btnUlt.disabled = !canUseUlt(unit);
    this.btnSkill.title = skill?.desc || '';
    this.btnUlt.title = ult?.desc || '';
    this.btnNormal.textContent = CLASSES[unit.classId].heal ? '치유' : '일반 공격';
    this.setActionMode(mode);
  }

  hideActionBar() {
    if (this.actionBar) this.actionBar.hidden = true;
  }

  setActionMode(mode) {
    const map = {
      attack: this.btnNormal,
      heal: this.btnNormal,
      skill: this.btnSkill,
      ultimate: this.btnUlt,
    };
    for (const btn of [this.btnNormal, this.btnSkill, this.btnUlt]) {
      btn?.classList.remove('active');
    }
    map[mode]?.classList.add('active');
  }

  setStageInfo(stage) {
    if (!this.stageLabel || !stage) return;
    const boss = stage.isBoss ? ' · 관문' : '';
    this.stageLabel.textContent = `STAGE ${stage.stage}/${TOTAL_STAGES} — ${stage.name}${boss}`;
  }

  showResult(type, stageNo) {
    this.resultOverlay.hidden = false;
    this.hideBriefing();
    this.hideActionBar();
    if (type === 'win') {
      this.resultTitle.textContent = `스테이지 ${stageNo} 돌파`;
      this.resultText.textContent = getVictoryText(stageNo, false);
      this.btnAgain.textContent = '다음 여정';
    } else if (type === 'clear') {
      this.resultTitle.textContent = '에메랄드의 승리';
      this.resultText.textContent = getVictoryText(stageNo, true);
      this.btnAgain.textContent = '타이틀로';
    } else {
      this.resultTitle.textContent = '패배';
      this.resultText.textContent = getDefeatText(stageNo);
      this.btnAgain.textContent = '다시 도전';
    }
  }

  hideResult() {
    this.resultOverlay.hidden = true;
  }

  setPhase(phase, playBanner = true) {
    const player = phase === 'player';
    this.phaseLabel.textContent = player ? '플레이어 페이즈' : '적 페이즈';
    this.phaseLabel.classList.toggle('enemy', !player);
    this.btnEndTurn.disabled = !player;
    if (playBanner) this.showBanner(player ? '플레이어 페이즈' : '적 페이즈', !player);
  }

  syncMuteButton(enabled) {
    const btn = document.getElementById('btnMute');
    if (!btn) return;
    btn.textContent = enabled ? '소리 ON' : '소리 OFF';
    btn.classList.toggle('muted', !enabled);
    btn.setAttribute('aria-pressed', enabled ? 'false' : 'true');
  }

  showBanner(text, enemy = false) {
    this.phaseBanner.hidden = false;
    this.phaseBanner.textContent = text;
    this.phaseBanner.classList.toggle('enemy', enemy);
    this.phaseBanner.classList.remove('show');
    void this.phaseBanner.offsetWidth;
    this.phaseBanner.classList.add('show');
  }

  log(message, type = '') {
    const el = document.createElement('div');
    el.className = `entry ${type}`.trim();
    el.textContent = message;
    this.battleLog.prepend(el);
    while (this.battleLog.children.length > 40) {
      this.battleLog.lastChild.remove();
    }
  }

  clearLog() {
    this.battleLog.innerHTML = '';
  }

  renderUnit(unit, map) {
    if (!unit) {
      this.unitPanel.className = 'unit-panel empty';
      this.unitPanel.textContent = '유닛을 선택하세요';
      return;
    }
    const cls = CLASSES[unit.classId];
    const terrain = TERRAIN[map[unit.y][unit.x]];
    const pct = Math.max(0, unit.hp / unit.maxHp);
    const bossTag = unit.isBoss ? ' · BOSS' : '';
    const wpn = unit.equip?.weapon ? ITEMS[unit.equip.weapon]?.name : '없음';
    const arm = unit.equip?.armor ? ITEMS[unit.equip.armor]?.name : '없음';
    this.unitPanel.className = 'unit-panel';
    this.unitPanel.innerHTML = `
      <p class="unit-name">${unit.name}</p>
      <p class="unit-meta">Lv.${unit.level} ${cls.name}${bossTag} · ${unit.team === 'player' ? '아군' : '적군'} · ${terrain.name}</p>
      <div class="hp-bar ${unit.team === 'enemy' ? 'enemy' : ''}"><i style="transform:scaleX(${pct})"></i></div>
      <div class="stat-grid">
        <div class="stat-row"><span>HP</span><strong>${unit.hp}/${unit.maxHp}</strong></div>
        <div class="stat-row"><span>이동</span><strong>${cls.move}</strong></div>
        <div class="stat-row"><span>공격</span><strong>${effectiveStat(unit, 'atk')}</strong></div>
        <div class="stat-row"><span>마법</span><strong>${effectiveStat(unit, 'mag')}</strong></div>
        <div class="stat-row"><span>방어</span><strong>${effectiveStat(unit, 'def')}</strong></div>
        <div class="stat-row"><span>마방</span><strong>${effectiveStat(unit, 'res')}</strong></div>
        <div class="stat-row"><span>무기</span><strong>${wpn}</strong></div>
        <div class="stat-row"><span>방어구</span><strong>${arm}</strong></div>
      </div>
      ${
        unit.team === 'player'
          ? `<div class="equip-actions">
              ${unit.equip?.weapon ? `<button type="button" class="btn btn-ghost btn-xs" data-item-action="unequip" data-slot="weapon">무기 해제</button>` : ''}
              ${unit.equip?.armor ? `<button type="button" class="btn btn-ghost btn-xs" data-item-action="unequip" data-slot="armor">방어구 해제</button>` : ''}
            </div>`
          : ''
      }
    `;
  }

  renderCombatPreview(attacker, defender, map, kind = 'normal') {
    if (!attacker || !defender) {
      this.combatPreview.className = 'combat-preview empty';
      this.combatPreview.textContent = '대상을 지정하면 표시됩니다';
      return;
    }
    const mult = strikeMult(attacker, kind);
    if (isHealAction(attacker, kind)) {
      const h = previewHeal(attacker, defender, mult);
      this.combatPreview.className = 'combat-preview';
      this.combatPreview.innerHTML = `
        <p class="unit-meta">${attacker.name} → ${defender.name} (치유)</p>
        <div class="stat-grid">
          <div class="stat-row"><span>예상 회복</span><strong>+${h.heal}</strong></div>
          <div class="stat-row"><span>배율</span><strong>×${mult}</strong></div>
        </div>
      `;
      return;
    }
    const p = previewCombat(attacker, defender, map, mult);
    const label = kind === 'skill' ? '스킬' : kind === 'ultimate' ? '필살기' : '일반';
    this.combatPreview.className = 'combat-preview';
    this.combatPreview.innerHTML = `
      <p class="unit-meta">${attacker.name} → ${defender.name} (${label})</p>
      <div class="stat-grid">
        <div class="stat-row"><span>예상 피해</span><strong>${p.est}</strong></div>
        <div class="stat-row"><span>배율</span><strong>×${mult}</strong></div>
        <div class="stat-row"><span>속성</span><strong>${p.isMagic ? '마법' : '물리'}</strong></div>
        <div class="stat-row"><span>반격</span><strong>${p.counter ? `약 ${p.counterEst}` : '불가'}</strong></div>
      </div>
    `;
  }

  renderInventory(inv, selectedUnit) {
    if (!this.inventoryPanel) return;
    const entries = listInventory(inv);
    if (!entries.length) {
      this.inventoryPanel.innerHTML = '<p class="inv-empty">소지품이 없습니다</p>';
      return;
    }
    this.inventoryPanel.innerHTML = entries
      .map(({ item, count, id }) => {
        const canUse =
          item.type === 'consumable' &&
          selectedUnit &&
          selectedUnit.team === 'player' &&
          !selectedUnit.acted;
        const canEq =
          (item.type === 'weapon' || item.type === 'armor') &&
          selectedUnit &&
          selectedUnit.team === 'player' &&
          (!item.classes || item.classes.includes(selectedUnit.classId));
        return `
        <div class="inv-row">
          <div class="inv-info">
            <strong>${item.icon} ${item.name}</strong>
            <span>×${count} · ${item.desc}</span>
          </div>
          <div class="inv-btns">
            ${
              item.type === 'consumable'
                ? `<button type="button" class="btn btn-ghost btn-xs" data-item-action="use" data-item-id="${id}" ${canUse ? '' : 'disabled'}>사용</button>`
                : `<button type="button" class="btn btn-ghost btn-xs" data-item-action="equip" data-item-id="${id}" ${canEq ? '' : 'disabled'}>장착</button>`
            }
          </div>
        </div>`;
      })
      .join('');
  }
}
