import { CLASSES, TERRAIN } from './data.js';
import { TOTAL_STAGES } from './stages.js';
import { previewCombat } from './combat.js';
import { getDefeatText, getStageStory, getVictoryText } from './story.js';

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
  }

  showTitle() {
    this.titleOverlay.hidden = false;
    this.hideBriefing();
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

  setStageInfo(stage) {
    if (!this.stageLabel || !stage) return;
    const boss = stage.isBoss ? ' · 관문' : '';
    this.stageLabel.textContent = `STAGE ${stage.stage}/${TOTAL_STAGES} — ${stage.name}${boss}`;
  }

  showResult(type, stageNo) {
    this.resultOverlay.hidden = false;
    this.hideBriefing();
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
    this.unitPanel.className = 'unit-panel';
    this.unitPanel.innerHTML = `
      <p class="unit-name">${unit.name}</p>
      <p class="unit-meta">Lv.${unit.level} ${cls.name}${bossTag} · ${unit.team === 'player' ? '아군' : '적군'} · ${terrain.name}</p>
      <div class="hp-bar ${unit.team === 'enemy' ? 'enemy' : ''}"><i style="transform:scaleX(${pct})"></i></div>
      <div class="stat-grid">
        <div class="stat-row"><span>HP</span><strong>${unit.hp}/${unit.maxHp}</strong></div>
        <div class="stat-row"><span>이동</span><strong>${cls.move}</strong></div>
        <div class="stat-row"><span>공격</span><strong>${unit.atk}</strong></div>
        <div class="stat-row"><span>마법</span><strong>${unit.mag}</strong></div>
        <div class="stat-row"><span>방어</span><strong>${unit.def}</strong></div>
        <div class="stat-row"><span>마방</span><strong>${unit.res}</strong></div>
        <div class="stat-row"><span>사거리</span><strong>${cls.rangeMin === cls.rangeMax ? cls.rangeMax : `${cls.rangeMin}-${cls.rangeMax}`}</strong></div>
        <div class="stat-row"><span>상태</span><strong>${unit.acted ? '행동 완료' : '대기'}</strong></div>
      </div>
    `;
  }

  renderCombatPreview(attacker, defender, map) {
    if (!attacker || !defender) {
      this.combatPreview.className = 'combat-preview empty';
      this.combatPreview.textContent = '공격 대상을 지정하면 표시됩니다';
      return;
    }
    const p = previewCombat(attacker, defender, map);
    this.combatPreview.className = 'combat-preview';
    this.combatPreview.innerHTML = `
      <p class="unit-meta">${attacker.name} → ${defender.name}</p>
      <div class="stat-grid">
        <div class="stat-row"><span>예상 피해</span><strong>${p.est}</strong></div>
        <div class="stat-row"><span>속성</span><strong>${p.isMagic ? '마법' : '물리'}</strong></div>
        <div class="stat-row"><span>지형 보정</span><strong>-${p.terrainBonus}</strong></div>
        <div class="stat-row"><span>반격</span><strong>${p.counter ? `약 ${p.counterEst}` : '불가'}</strong></div>
      </div>
    `;
  }
}
