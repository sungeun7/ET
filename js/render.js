import { CLASSES, COLS, ROWS, TERRAIN, elevAt } from './data.js';
import {
  ISO_H,
  diamondPoints,
  fromScreen,
  isoOrigin,
  sortDrawOrder,
  toScreen,
  ELEV_SCALE,
} from './iso.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hover = null;
    this.animT = 0;
    this.fx = [];
    this.attacks = [];
    this.screenFx = null;
    this.unitFx = new Map();
    this._origin = { ox: 0, oy: 0 };
    this._drawCells = sortDrawOrder(COLS, ROWS);
  }

  _syncOrigin() {
    this._origin = isoOrigin(this.canvas.width, this.canvas.height);
  }

  setHover(tile) {
    this.hover = tile;
  }

  pickTile(px, py, map, units = null) {
    this._syncOrigin();
    return fromScreen(px, py, map, this._origin.ox, this._origin.oy, units);
  }

  screenPos(map, x, y, ox = 0, oy = 0) {
    this._syncOrigin();
    const elev = elevAt(map, x, y);
    const p = toScreen(x, y, elev, this._origin.ox, this._origin.oy);
    return { cx: p.sx + ox, cy: p.sy + oy - 10, elev, sx: p.sx, sy: p.sy };
  }

  addDamageFx(map, x, y, text, color = '#fff') {
    const p = this.screenPos(map, x, y);
    this.fx.push({
      type: 'text',
      x: p.cx,
      y: p.cy - 22,
      text,
      color,
      life: 0.95,
      maxLife: 0.95,
    });
  }

  playAttack(attacker, defender, map, fxKind = 'slash') {
    const cls = CLASSES[attacker.classId];
    const a = this.screenPos(map, attacker.x, attacker.y);
    const d = this.screenPos(map, defender.x, defender.y);
    const duration =
      ['nova', 'holy', 'rain', 'whirl', 'bless'].includes(fxKind)
        ? 0.85
        : ['bash', 'double', 'burst', 'pierce', 'heal'].includes(fxKind)
          ? 0.58
          : fxKind === 'slash'
            ? 0.38
            : fxKind === 'arrow'
              ? 0.42
              : 0.48;

    const anim = {
      kind: fxKind,
      ax: a.cx,
      ay: a.cy,
      dx: d.cx,
      dy: d.cy,
      attackerId: attacker.id,
      defenderId: defender.id,
      color: cls.color,
      life: duration,
      maxLife: duration,
      impact: false,
    };
    this.attacks.push(anim);

    if (['slash', 'bash', 'double', 'holy', 'whirl'].includes(fxKind)) {
      const ang = Math.atan2(d.cy - a.cy, d.cx - a.cx);
      const push = fxKind === 'holy' || fxKind === 'whirl' ? 18 : 12;
      this._setUnitFx(attacker.id, {
        dx: Math.cos(ang) * push,
        dy: Math.sin(ang) * push,
        flash: 0,
        shake: 0,
        lift: fxKind === 'whirl' ? 8 : 0,
      });
    }

    if (fxKind === 'nova' || fxKind === 'holy' || fxKind === 'bless') {
      this.screenFx = { kind: fxKind, life: duration, maxLife: duration };
    }

    return new Promise((resolve) => {
      anim.onDone = resolve;
    });
  }

  triggerImpact(defenderId, hit, intense = false) {
    if (!hit) return;
    this._setUnitFx(defenderId, {
      dx: 0,
      dy: 0,
      flash: intense ? 0.4 : 0.28,
      shake: intense ? 0.4 : 0.28,
      lift: 0,
    });
    const unit = this._lastState?.units?.find((u) => u.id === defenderId);
    if (unit && this._lastState?.map) {
      const p = this.screenPos(this._lastState.map, unit.x, unit.y);
      const n = intense ? 14 : 8;
      for (let i = 0; i < n; i++) {
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.3;
        const spd = 40 + Math.random() * (intense ? 70 : 45);
        this.fx.push({
          type: 'spark',
          x: p.cx,
          y: p.cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 25,
          color: intense ? '#a8ffd0' : '#ffe8a0',
          life: 0.4 + Math.random() * 0.2,
          maxLife: 0.55,
          size: 2 + Math.random() * 2.5,
        });
      }
    }
  }

  _setUnitFx(id, partial) {
    const cur = this.unitFx.get(id) || { dx: 0, dy: 0, flash: 0, shake: 0, lift: 0 };
    this.unitFx.set(id, { ...cur, ...partial });
  }

  update(dt) {
    this.animT += dt;
    this.fx = this.fx.filter((f) => {
      f.life -= dt;
      if (f.type === 'text') f.y -= 32 * dt;
      if (f.type === 'spark') {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += 45 * dt;
        f.vx *= 0.92;
      }
      return f.life > 0;
    });
    if (this.screenFx) {
      this.screenFx.life -= dt;
      if (this.screenFx.life <= 0) this.screenFx = null;
    }
    this.attacks = this.attacks.filter((a) => {
      a.life -= dt;
      const progress = 1 - a.life / a.maxLife;
      if (!a.impact && progress >= 0.62) {
        a.impact = true;
        if (a.onImpact) a.onImpact();
      }
      if (a.life <= 0) {
        this.unitFx.delete(a.attackerId);
        if (a.onDone) a.onDone();
        return false;
      }
      if (['slash', 'bash', 'double', 'holy', 'whirl'].includes(a.kind) && progress > 0.55) {
        const ufx = this.unitFx.get(a.attackerId);
        if (ufx) {
          ufx.dx *= 0.78;
          ufx.dy *= 0.78;
          ufx.lift *= 0.85;
        }
      }
      return true;
    });
    for (const [id, ufx] of this.unitFx) {
      if (ufx.flash > 0) ufx.flash -= dt;
      if (ufx.shake > 0) ufx.shake -= dt;
      if (
        ufx.flash <= 0 &&
        ufx.shake <= 0 &&
        Math.abs(ufx.dx) < 0.5 &&
        Math.abs(ufx.dy) < 0.5 &&
        Math.abs(ufx.lift || 0) < 0.5
      ) {
        if (!this.attacks.some((a) => a.attackerId === id)) this.unitFx.delete(id);
      }
    }
  }

  draw(state) {
    this._lastState = state;
    this._syncOrigin();
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this._drawBackdrop(ctx, canvas);

    const unitMap = new Map();
    for (const u of state.units) {
      if (u.alive) unitMap.set(`${u.x},${u.y}`, u);
    }

    for (const cell of this._drawCells) {
      this._drawTileIso(ctx, state.map, cell.x, cell.y);
      this._drawTileHighlight(ctx, state, cell.x, cell.y);
      const unit = unitMap.get(`${cell.x},${cell.y}`);
      if (unit) this._drawUnitAt(ctx, state, unit);
    }

    this.drawAttacks();
    this.drawHover(state);
    this.drawFx();
    this._drawScreenFx(ctx, canvas);
  }

  _drawBackdrop(ctx, canvas) {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#243848');
    g.addColorStop(0.4, '#1a3028');
    g.addColorStop(1, '#0c1812');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 광원 느낌
    const light = ctx.createRadialGradient(
      canvas.width * 0.25,
      canvas.height * 0.1,
      20,
      canvas.width * 0.35,
      canvas.height * 0.4,
      canvas.width * 0.7
    );
    light.addColorStop(0, 'rgba(255, 230, 160, 0.1)');
    light.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  _drawScreenFx(ctx, canvas) {
    if (!this.screenFx) return;
    const p = 1 - this.screenFx.life / this.screenFx.maxLife;
    const alpha = p < 0.2 ? p / 0.2 : p > 0.7 ? (1 - p) / 0.3 : 1;
    ctx.save();
    ctx.globalAlpha = alpha * 0.28;
    ctx.fillStyle =
      this.screenFx.kind === 'nova'
        ? '#3dff9a'
        : this.screenFx.kind === 'bless'
          ? '#ffe9a0'
          : '#ffe08a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  _drawTileIso(ctx, map, x, y) {
    const tid = map[y][x];
    const t = TERRAIN[tid];
    const elev = t.elev;
    const h = elev * ELEV_SCALE;
    const { ox, oy } = this._origin;
    const { sx, sy } = toScreen(x, y, elev, ox, oy);
    const top = diamondPoints(sx, sy);
    const bot = diamondPoints(sx, sy + h);

    // 지면 투영 그림자 (남동)
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    const sh = diamondPoints(sx + 10, sy + h + 8);
    ctx.moveTo(sh.top.x, sh.top.y);
    ctx.lineTo(sh.right.x, sh.right.y);
    ctx.lineTo(sh.bottom.x, sh.bottom.y);
    ctx.lineTo(sh.left.x, sh.left.y);
    ctx.closePath();
    ctx.fill();

    // 왼쪽 벽 (서남 — 중간 밝기)
    ctx.fillStyle = t.sideL;
    ctx.beginPath();
    ctx.moveTo(top.left.x, top.left.y);
    ctx.lineTo(top.bottom.x, top.bottom.y);
    ctx.lineTo(bot.bottom.x, bot.bottom.y);
    ctx.lineTo(bot.left.x, bot.left.y);
    ctx.closePath();
    ctx.fill();
    // 왼쪽 벽 음영 그라데이션
    const lg = ctx.createLinearGradient(top.left.x, top.left.y, top.bottom.x, bot.bottom.y);
    lg.addColorStop(0, 'rgba(255,255,255,0.06)');
    lg.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(top.left.x, top.left.y);
    ctx.lineTo(top.bottom.x, top.bottom.y);
    ctx.lineTo(bot.bottom.x, bot.bottom.y);
    ctx.lineTo(bot.left.x, bot.left.y);
    ctx.closePath();
    ctx.fill();

    // 오른쪽 벽 (동남 — 더 어두움)
    ctx.fillStyle = t.sideR;
    ctx.beginPath();
    ctx.moveTo(top.right.x, top.right.y);
    ctx.lineTo(top.bottom.x, top.bottom.y);
    ctx.lineTo(bot.bottom.x, bot.bottom.y);
    ctx.lineTo(bot.right.x, bot.right.y);
    ctx.closePath();
    ctx.fill();
    const rg = ctx.createLinearGradient(top.right.x, top.top.y, bot.bottom.x, bot.bottom.y);
    rg.addColorStop(0, 'rgba(0,0,0,0.05)');
    rg.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(top.right.x, top.right.y);
    ctx.lineTo(top.bottom.x, top.bottom.y);
    ctx.lineTo(bot.bottom.x, bot.bottom.y);
    ctx.lineTo(bot.right.x, bot.right.y);
    ctx.closePath();
    ctx.fill();

    // 윗면 (북서 광원)
    const checker = (x + y) % 2 === 0;
    const base = checker ? t.color : t.color2;
    const tg = ctx.createLinearGradient(top.left.x, top.top.y, top.right.x, top.bottom.y);
    tg.addColorStop(0, shade(base, 40));
    tg.addColorStop(0.35, shade(base, 12));
    tg.addColorStop(0.7, base);
    tg.addColorStop(1, shade(base, -22));
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(top.top.x, top.top.y);
    ctx.lineTo(top.right.x, top.right.y);
    ctx.lineTo(top.bottom.x, top.bottom.y);
    ctx.lineTo(top.left.x, top.left.y);
    ctx.closePath();
    ctx.fill();

    // 윗면 가장자리 하이라이트
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(top.top.x, top.top.y);
    ctx.lineTo(top.left.x, top.left.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.moveTo(top.bottom.x, top.bottom.y);
    ctx.lineTo(top.right.x, top.right.y);
    ctx.stroke();

    // 지형 디테일
    if (tid === 'forest') this._drawTreesIso(ctx, sx, sy - 6);
    else if (tid === 'hill') {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy + 4);
      ctx.lineTo(sx, sy - 10);
      ctx.lineTo(sx + 10, sy + 4);
      ctx.fill();
    } else if (tid === 'fort') {
      ctx.fillStyle = 'rgba(230,210,150,0.22)';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 8);
      ctx.lineTo(sx + 10, sy);
      ctx.lineTo(sx, sy + 8);
      ctx.lineTo(sx - 10, sy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(t.sideL, 25);
      ctx.fillRect(sx - 4, sy - 22, 8, 14);
    } else if (tid === 'water') {
      const wave = Math.sin(this.animT * 2.2 + x + y) * 2;
      ctx.strokeStyle = 'rgba(180,230,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - 14, sy + wave);
      ctx.quadraticCurveTo(sx, sy - 4 + wave, sx + 14, sy + wave);
      ctx.stroke();
    }
  }

  _drawTreesIso(ctx, sx, sy) {
    for (const [dx, dy, r] of [
      [-8, 2, 9],
      [7, 4, 8],
      [0, -2, 10],
    ]) {
      ctx.fillStyle = '#3a2a18';
      ctx.fillRect(sx + dx - 1.5, sy + dy, 3, 7);
      const g = ctx.createRadialGradient(sx + dx, sy + dy - 6, 1, sx + dx, sy + dy - 4, r);
      g.addColorStop(0, '#5a9a60');
      g.addColorStop(1, '#1a3a22');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx + dx, sy + dy - 6, r, 0, Math.PI * 2);
      ctx.fill();
      // 캐노피 그림자
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(sx + dx + 3, sy + dy + 6, r * 0.7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawTileHighlight(ctx, state, x, y) {
    const pulse = 0.3 + Math.sin(this.animT * 3) * 0.1;
    const elev = elevAt(state.map, x, y);
    const { sx, sy } = toScreen(x, y, elev, this._origin.ox, this._origin.oy);
    const d = diamondPoints(sx, sy);

    const fillDiamond = (color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(d.top.x, d.top.y);
      ctx.lineTo(d.right.x, d.right.y);
      ctx.lineTo(d.bottom.x, d.bottom.y);
      ctx.lineTo(d.left.x, d.left.y);
      ctx.closePath();
      ctx.fill();
    };

    if (state.mode === 'move' || state.mode === 'selected') {
      if (state.moveTiles.some((t) => t.x === x && t.y === y)) {
        fillDiamond(`rgba(255, 210, 64, ${pulse})`);
      }
      if (
        state.attackPreviewTiles.some((t) => t.x === x && t.y === y) &&
        state.units.some((u) => u.alive && u.team === 'enemy' && u.x === x && u.y === y)
      ) {
        fillDiamond(`rgba(210, 70, 60, ${pulse * 0.5})`);
      }
    }

    if (['attack', 'skill', 'ultimate', 'heal'].includes(state.mode)) {
      if (state.attackTiles.some((t) => t.x === x && t.y === y)) {
        const healer = state.selected && CLASSES[state.selected.classId]?.heal;
        const color = healer
          ? `rgba(120, 220, 160, ${pulse})`
          : state.mode === 'ultimate'
            ? `rgba(80, 230, 160, ${pulse})`
            : state.mode === 'skill'
              ? `rgba(120, 170, 255, ${pulse})`
              : `rgba(210, 70, 60, ${pulse})`;
        fillDiamond(color);
      }
    }

    if (state.selected && state.selected.x === x && state.selected.y === y) {
      ctx.strokeStyle = '#f0c35c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(d.top.x, d.top.y);
      ctx.lineTo(d.right.x, d.right.y);
      ctx.lineTo(d.bottom.x, d.bottom.y);
      ctx.lineTo(d.left.x, d.left.y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  _drawUnitAt(ctx, state, unit) {
    const cls = CLASSES[unit.classId];
    const ufx = this.unitFx.get(unit.id);
    let ox = ufx?.dx || 0;
    let oy = (ufx?.dy || 0) - (ufx?.lift || 0);
    if (ufx?.shake > 0) {
      ox += (Math.random() - 0.5) * 6;
      oy += (Math.random() - 0.5) * 6;
    }
    const p = this.screenPos(state.map, unit.x, unit.y, ox, oy);
    const dim = unit.team === 'player' && unit.acted ? 0.5 : 1;
    this._drawUnitSprite(ctx, unit, cls, p.cx, p.cy, dim, ufx);
  }

  _drawUnitSprite(ctx, unit, cls, cx, cy, dim, ufx) {
    ctx.save();
    ctx.globalAlpha = dim;

    // 캐릭터 투영 그림자 (남동 방향)
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy + 18, 16, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // 다리 (음영)
    ctx.fillStyle = shade(cls.color, -50);
    ctx.fillRect(cx - 6, cy + 4, 4, 11);
    ctx.fillStyle = shade(cls.color, -35);
    ctx.fillRect(cx + 2, cy + 4, 4, 11);

    // 몸통 — 좌측 밝게 / 우측 어둡게
    const bodyG = ctx.createLinearGradient(cx - 12, cy - 10, cx + 12, cy + 8);
    bodyG.addColorStop(0, shade(cls.color, 45));
    bodyG.addColorStop(0.4, cls.color);
    bodyG.addColorStop(1, shade(cls.color, -40));
    ctx.fillStyle = bodyG;
    roundRect(ctx, cx - 10, cy - 10, 20, 18, 4);
    ctx.fill();
    // 몸 자체 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(cx + 2, cy - 8, 7, 14);

    // 머리
    const headG = ctx.createRadialGradient(cx - 3, cy - 20, 1, cx, cy - 18, 10);
    headG.addColorStop(0, '#ffe8d2');
    headG.addColorStop(0.6, '#e0a878');
    headG.addColorStop(1, '#a87048');
    ctx.fillStyle = headG;
    ctx.beginPath();
    ctx.arc(cx, cy - 18, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.arc(cx + 2, cy - 16, 8.5, -0.4, 1.2);
    ctx.fill();

    if (cls.id === 'knight') {
      ctx.fillStyle = shade(cls.color, 15);
      ctx.fillRect(cx - 9, cy - 27, 18, 5);
      ctx.fillRect(cx - 3, cy - 31, 6, 5);
    } else if (cls.id === 'archer') {
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + 11, cy - 2, 9, -1.1, 1.1);
      ctx.stroke();
    } else if (cls.id === 'mage') {
      ctx.fillStyle = '#e8d080';
      ctx.fillRect(cx + 9, cy - 22, 3, 26);
      ctx.beginPath();
      ctx.arc(cx + 10.5, cy - 24, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (cls.id === 'fighter') {
      ctx.fillStyle = '#c0c0c8';
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy - 4);
      ctx.lineTo(cx - 5, cy + 2);
      ctx.lineTo(cx - 13, cy + 5);
      ctx.fill();
    } else if (cls.id === 'cleric') {
      ctx.fillStyle = '#fff8e0';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 32);
      ctx.lineTo(cx + 7, cy - 22);
      ctx.lineTo(cx - 7, cy - 22);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d4a84b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 28);
      ctx.lineTo(cx, cy - 18);
      ctx.moveTo(cx - 4, cy - 24);
      ctx.lineTo(cx + 4, cy - 24);
      ctx.stroke();
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = unit.team === 'player' ? '#f0c35c' : '#c4453a';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 16, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (unit.isBoss) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#f0c35c';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 16, 16, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (ufx?.flash > 0) {
      ctx.globalAlpha = Math.min(0.7, ufx.flash * 2.5) * dim;
      ctx.fillStyle = '#fff';
      roundRect(ctx, cx - 12, cy - 30, 24, 46, 8);
      ctx.fill();
    }

    ctx.globalAlpha = dim;
    // 체력바 — 머리 위
    const barW = 28;
    const barH = 4;
    const headTop = cls.id === 'cleric' || cls.id === 'knight' ? cy - 36 : cy - 30;
    const ratio = Math.max(0, unit.hp / unit.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(cx - barW / 2, headTop - barH, barW, barH);
    ctx.fillStyle = unit.team === 'player' ? '#6ecf8e' : '#e07a70';
    ctx.fillRect(cx - barW / 2, headTop - barH, barW * ratio, barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - barW / 2 + 0.5, headTop - barH + 0.5, barW - 1, barH - 1);

    ctx.fillStyle = 'rgba(10,16,12,0.8)';
    ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph(cls.id), cx, cy - 1);
    ctx.restore();
  }

  drawAttacks() {
    const { ctx } = this;
    for (const a of this.attacks) {
      const p = 1 - a.life / a.maxLife;
      if (a.kind === 'heal' || a.kind === 'bless') this._drawHeal(ctx, a, p);
      else if (a.kind === 'slash') this._drawSlash(ctx, a, p);
      else if (a.kind === 'arrow') this._drawArrow(ctx, a, p);
      else if (a.kind === 'magic') this._drawMagic(ctx, a, p);
      else if (a.kind === 'bash') this._drawBash(ctx, a, p);
      else if (a.kind === 'double') {
        this._drawSlash(ctx, a, Math.min(1, p * 1.4));
        if (p > 0.35) this._drawSlash(ctx, { ...a, ax: a.ax + 6 }, Math.min(1, (p - 0.35) * 1.5));
      } else if (a.kind === 'pierce') this._drawPierce(ctx, a, p);
      else if (a.kind === 'burst') this._drawBurst(ctx, a, p);
      else if (a.kind === 'holy') this._drawHoly(ctx, a, p);
      else if (a.kind === 'whirl') this._drawWhirl(ctx, a, p);
      else if (a.kind === 'rain') this._drawRain(ctx, a, p);
      else if (a.kind === 'nova') this._drawNova(ctx, a, p);
      else this._drawSlash(ctx, a, p);
    }
  }

  _drawHeal(ctx, a, p) {
    const t = Math.min(1, p / 0.7);
    const x = a.ax + (a.dx - a.ax) * t;
    const y = a.ay + (a.dy - a.ay) * t;
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI * 2 * i) / 6 + this.animT * 3;
      const r = 8 + t * 12;
      ctx.fillStyle = `rgba(255, 240, 160, ${0.7 * (1 - t * 0.3)})`;
      ctx.beginPath();
      ctx.arc(x + Math.cos(ang) * r, y + Math.sin(ang) * r, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const g = ctx.createRadialGradient(x, y, 2, x, y, 18);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.4, '#ffe08a');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    if (p > 0.55) {
      const b = (p - 0.55) / 0.45;
      ctx.globalAlpha = 1 - b;
      ctx.strokeStyle = a.kind === 'bless' ? '#ffe9a0' : '#9f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(a.dx, a.dy, 10 + b * 36, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawSlash(ctx, a, p) {
    const ang = Math.atan2(a.dy - a.ay, a.dx - a.ax);
    const swing = Math.min(1, p / 0.7);
    const cx = (a.ax + a.dx) / 2;
    const cy = (a.ay + a.dy) / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(255,240,180,0.85)`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 26, ang - 1.1, ang - 1.1 + 2.2 * swing);
    ctx.stroke();
    ctx.restore();
  }

  _drawArrow(ctx, a, p) {
    const t = Math.min(1, p / 0.75);
    const x = a.ax + (a.dx - a.ax) * t;
    const y = a.ay + (a.dy - a.ay) * t;
    const ang = Math.atan2(a.dy - a.ay, a.dx - a.ax);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = '#e8f0d8';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, 4);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-8, -4);
    ctx.fill();
    ctx.restore();
  }

  _drawMagic(ctx, a, p) {
    const t = Math.min(1, easeOut(p / 0.8));
    const x = a.ax + (a.dx - a.ax) * t;
    const y = a.ay + (a.dy - a.ay) * t;
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 14);
    glow.addColorStop(0, '#fff');
    glow.addColorStop(0.4, a.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawBash(ctx, a, p) {
    const t = Math.min(1, p / 0.55);
    const x = a.ax + (a.dx - a.ax) * t;
    const y = a.ay + (a.dy - a.ay) * t;
    ctx.fillStyle = 'rgba(180,200,230,0.85)';
    ctx.beginPath();
    ctx.ellipse(x, y, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawPierce(ctx, a, p) {
    const t = Math.min(1, p / 0.7);
    const x = a.ax + (a.dx - a.ax) * t * 1.1;
    const y = a.ay + (a.dy - a.ay) * t * 1.1;
    ctx.strokeStyle = 'rgba(180,255,200,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a.ax, a.ay);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  _drawBurst(ctx, a, p) {
    this._drawMagic(ctx, a, p);
  }

  _drawHoly(ctx, a, p) {
    this._drawSlash(ctx, a, p);
    const glow = Math.sin(p * Math.PI);
    ctx.globalAlpha = glow * 0.65;
    const g = ctx.createRadialGradient(a.dx, a.dy, 4, a.dx, a.dy, 48);
    g.addColorStop(0, '#fff8d0');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(a.dx, a.dy, 48 * glow, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  _drawWhirl(ctx, a, p) {
    ctx.save();
    ctx.translate(a.ax, a.ay);
    ctx.rotate(p * Math.PI * 4);
    ctx.strokeStyle = 'rgba(255,200,100,0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawRain(ctx, a, p) {
    for (let i = 0; i < 10; i++) {
      const delay = (i % 5) * 0.05;
      const t = Math.min(1, Math.max(0, (p - delay) / 0.55));
      if (t <= 0) continue;
      const ox = ((i * 37) % 36) - 18;
      const y = a.dy - 60 + 60 * t;
      ctx.fillStyle = 'rgba(200,255,210,0.7)';
      ctx.fillRect(a.dx + ox, y, 2, 10);
    }
  }

  _drawNova(ctx, a, p) {
    const charge = Math.min(1, p / 0.35);
    ctx.strokeStyle = 'rgba(80,255,160,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(a.ax, a.ay, 8 + charge * 20, 0, Math.PI * 2);
    ctx.stroke();
    if (p > 0.35) {
      const t = (p - 0.35) / 0.65;
      const x = a.ax + (a.dx - a.ax) * Math.min(1, t * 1.3);
      const y = a.ay + (a.dy - a.ay) * Math.min(1, t * 1.3);
      const g = ctx.createRadialGradient(x, y, 2, x, y, 18);
      g.addColorStop(0, '#fff');
      g.addColorStop(0.3, '#5dffb0');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      if (t > 0.45) {
        const blast = (t - 0.45) / 0.55;
        ctx.globalAlpha = 1 - blast;
        ctx.strokeStyle = '#3dff9a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(a.dx, a.dy, 12 + blast * 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  drawHover(state) {
    if (!this.hover || !state.map) return;
    const { x, y } = this.hover;
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    const { ctx } = this;
    const elev = elevAt(state.map, x, y);
    const { sx, sy } = toScreen(x, y, elev, this._origin.ox, this._origin.oy);
    const d = diamondPoints(sx, sy);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(d.top.x, d.top.y);
    ctx.lineTo(d.right.x, d.right.y);
    ctx.lineTo(d.bottom.x, d.bottom.y);
    ctx.lineTo(d.left.x, d.left.y);
    ctx.closePath();
    ctx.stroke();

    const terrain = TERRAIN[state.map[y][x]];
    const unit = state.units.find((u) => u.alive && u.x === x && u.y === y);
    const label = unit
      ? `${unit.name} / ${terrain.name} (고도 ${terrain.elev})`
      : `${terrain.name}  방어+${terrain.defBonus}  고도 ${terrain.elev}`;
    ctx.font = '12px "Noto Sans KR", sans-serif';
    const tw = ctx.measureText(label).width + 16;
    let lx = sx - tw / 2;
    let ly = sy - ISO_H / 2 - 14;
    ctx.fillStyle = 'rgba(10,18,14,0.9)';
    roundRect(ctx, lx, ly - 14, tw, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#e7f0e8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, lx + 8, ly - 3);
  }

  drawFx() {
    const { ctx } = this;
    for (const f of this.fx) {
      const alpha = Math.max(0, f.life / (f.maxLife || 0.9));
      ctx.globalAlpha = alpha;
      if (f.type === 'spark') {
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size || 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = f.color;
        ctx.font = 'bold 17px "Cinzel", "Noto Sans KR", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
    }
  }
}

function glyph(classId) {
  return { knight: '기', fighter: '전', archer: '궁', mage: '마', cleric: '성' }[classId] || '?';
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt));
  const b = Math.min(255, Math.max(0, (n & 255) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function easeOut(t) {
  return 1 - (1 - Math.min(1, Math.max(0, t))) ** 2;
}
