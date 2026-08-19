import { CLASSES, COLS, ROWS, TERRAIN, TILE } from './data.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hover = null;
    this.animT = 0;
    this.fx = [];
    this.attacks = [];
    /** @type {Map<string, {dx:number,dy:number,flash:number,shake:number}>} */
    this.unitFx = new Map();
  }

  setHover(tile) {
    this.hover = tile;
  }

  addDamageFx(x, y, text, color = '#fff') {
    this.fx.push({
      type: 'text',
      x: x * TILE + TILE / 2,
      y: y * TILE + TILE / 2,
      text,
      color,
      life: 0.9,
      maxLife: 0.9,
    });
  }

  /**
   * 공격 액션 재생. 애니메이션이 끝날 때까지 Promise.
   */
  playAttack(attacker, defender) {
    const cls = CLASSES[attacker.classId];
    const kind =
      cls.id === 'mage' ? 'magic' : cls.id === 'archer' ? 'arrow' : 'slash';
    const duration = kind === 'slash' ? 0.38 : kind === 'arrow' ? 0.42 : 0.48;
    const ax = attacker.x * TILE + TILE / 2;
    const ay = attacker.y * TILE + TILE / 2;
    const dx = defender.x * TILE + TILE / 2;
    const dy = defender.y * TILE + TILE / 2;

    const anim = {
      kind,
      ax,
      ay,
      dx,
      dy,
      attackerId: attacker.id,
      defenderId: defender.id,
      color: cls.color,
      life: duration,
      maxLife: duration,
      impact: false,
    };
    this.attacks.push(anim);

    // 근접은 살짝 돌진
    if (kind === 'slash') {
      const ang = Math.atan2(dy - ay, dx - ax);
      this._setUnitFx(attacker.id, {
        dx: Math.cos(ang) * 14,
        dy: Math.sin(ang) * 14,
        flash: 0,
        shake: 0,
      });
    }

    return new Promise((resolve) => {
      anim.onDone = resolve;
    });
  }

  triggerImpact(defenderId, hit) {
    if (hit) {
      this._setUnitFx(defenderId, {
        dx: 0,
        dy: 0,
        flash: 0.28,
        shake: 0.28,
      });
      // 충격 파티클
      const unit = this._lastState?.units?.find((u) => u.id === defenderId);
      if (unit) {
        const cx = unit.x * TILE + TILE / 2;
        const cy = unit.y * TILE + TILE / 2;
        for (let i = 0; i < 8; i++) {
          const ang = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
          const spd = 40 + Math.random() * 50;
          this.fx.push({
            type: 'spark',
            x: cx,
            y: cy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            color: '#ffe8a0',
            life: 0.35 + Math.random() * 0.15,
            maxLife: 0.45,
            size: 2 + Math.random() * 2,
          });
        }
      }
    }
  }

  _setUnitFx(id, partial) {
    const cur = this.unitFx.get(id) || { dx: 0, dy: 0, flash: 0, shake: 0 };
    this.unitFx.set(id, { ...cur, ...partial });
  }

  update(dt) {
    this.animT += dt;

    this.fx = this.fx.filter((f) => {
      f.life -= dt;
      if (f.type === 'text') f.y -= 28 * dt;
      if (f.type === 'spark') {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vx *= 0.92;
        f.vy *= 0.92;
      }
      return f.life > 0;
    });

    this.attacks = this.attacks.filter((a) => {
      const prev = a.life;
      a.life -= dt;
      const progress = 1 - a.life / a.maxLife;
      // 임팩트 시점 (~70%)
      if (!a.impact && progress >= 0.7) {
        a.impact = true;
        if (a.onImpact) a.onImpact();
      }
      if (a.life <= 0) {
        this.unitFx.delete(a.attackerId);
        if (a.onDone) a.onDone();
        return false;
      }
      // 돌진 복귀
      if (a.kind === 'slash' && progress > 0.55) {
        const ufx = this.unitFx.get(a.attackerId);
        if (ufx) {
          ufx.dx *= 0.75;
          ufx.dy *= 0.75;
        }
      }
      void prev;
      return true;
    });

    for (const [id, ufx] of this.unitFx) {
      if (ufx.flash > 0) ufx.flash -= dt;
      if (ufx.shake > 0) ufx.shake -= dt;
      if (ufx.flash <= 0 && ufx.shake <= 0 && Math.abs(ufx.dx) < 0.5 && Math.abs(ufx.dy) < 0.5) {
        if (!this.attacks.some((a) => a.attackerId === id)) this.unitFx.delete(id);
      }
    }
  }

  draw(state) {
    this._lastState = state;
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawMap(state.map);
    this.drawHighlights(state);
    this.drawUnits(state);
    this.drawAttacks();
    this.drawHover(state);
    this.drawFx();
  }

  drawMap(map) {
    const { ctx } = this;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = TERRAIN[map[y][x]];
        const px = x * TILE;
        const py = y * TILE;
        const checker = (x + y) % 2 === 0;
        ctx.fillStyle = checker ? t.color : t.color2;
        ctx.fillRect(px, py, TILE, TILE);

        if (map[y][x] === 'forest') {
          ctx.fillStyle = 'rgba(20, 50, 30, 0.35)';
          ctx.beginPath();
          ctx.arc(px + 22, py + 28, 10, 0, Math.PI * 2);
          ctx.arc(px + 38, py + 34, 12, 0, Math.PI * 2);
          ctx.arc(px + 30, py + 18, 9, 0, Math.PI * 2);
          ctx.fill();
        } else if (map[y][x] === 'hill') {
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.beginPath();
          ctx.moveTo(px + 8, py + 48);
          ctx.lineTo(px + 28, py + 18);
          ctx.lineTo(px + 52, py + 48);
          ctx.fill();
        } else if (map[y][x] === 'fort') {
          ctx.strokeStyle = 'rgba(230, 210, 150, 0.35)';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 14, py + 14, TILE - 28, TILE - 28);
          ctx.fillStyle = 'rgba(230, 210, 150, 0.12)';
          ctx.fillRect(px + 14, py + 14, TILE - 28, TILE - 28);
        } else if (map[y][x] === 'water') {
          const wave = Math.sin(this.animT * 2 + x * 0.7 + y) * 2;
          ctx.fillStyle = 'rgba(180, 230, 255, 0.08)';
          ctx.fillRect(px + 8, py + 28 + wave, TILE - 16, 3);
        }

        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  drawHighlights(state) {
    const { ctx } = this;
    const pulse = 0.35 + Math.sin(this.animT * 3) * 0.08;

    if (state.mode === 'move' || state.mode === 'selected') {
      for (const t of state.moveTiles) {
        ctx.fillStyle = `rgba(255, 210, 64, ${pulse})`;
        ctx.fillRect(t.x * TILE, t.y * TILE, TILE, TILE);
      }
      for (const t of state.attackPreviewTiles) {
        const occupied = state.units.some(
          (u) => u.alive && u.team === 'enemy' && u.x === t.x && u.y === t.y
        );
        if (!occupied) continue;
        ctx.fillStyle = `rgba(210, 70, 60, ${pulse * 0.55})`;
        ctx.fillRect(t.x * TILE, t.y * TILE, TILE, TILE);
      }
    }

    if (state.mode === 'attack') {
      for (const t of state.attackTiles) {
        ctx.fillStyle = `rgba(210, 70, 60, ${pulse})`;
        ctx.fillRect(t.x * TILE, t.y * TILE, TILE, TILE);
      }
    }

    if (state.selected) {
      ctx.strokeStyle = '#f0c35c';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        state.selected.x * TILE + 3,
        state.selected.y * TILE + 3,
        TILE - 6,
        TILE - 6
      );
    }
  }

  drawUnits(state) {
    const { ctx } = this;
    for (const unit of state.units) {
      if (!unit.alive) continue;
      const cls = CLASSES[unit.classId];
      const ufx = this.unitFx.get(unit.id);
      let ox = ufx?.dx || 0;
      let oy = ufx?.dy || 0;
      if (ufx?.shake > 0) {
        ox += (Math.random() - 0.5) * 8;
        oy += (Math.random() - 0.5) * 8;
      }
      const cx = unit.x * TILE + TILE / 2 + ox;
      const cy = unit.y * TILE + TILE / 2 + oy;
      const dim = unit.team === 'player' && unit.acted ? 0.45 : 1;

      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 18, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = dim;
      const grad = ctx.createRadialGradient(cx - 4, cy - 6, 2, cx, cy, 20);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.15, cls.color);
      grad.addColorStop(1, shade(cls.color, -40));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = unit.team === 'player' ? '#f0c35c' : '#c4453a';
      ctx.stroke();
      if (unit.isBoss) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f0c35c';
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (ufx?.flash > 0) {
        ctx.globalAlpha = Math.min(0.7, ufx.flash * 2.5) * dim;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = dim;
      ctx.fillStyle = 'rgba(10, 16, 12, 0.85)';
      ctx.font = 'bold 13px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(glyph(cls.id), cx, cy + 1);

      const barW = 34;
      const ratio = unit.hp / unit.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(cx - barW / 2, cy + 22, barW, 5);
      ctx.fillStyle = unit.team === 'player' ? '#6ecf8e' : '#e07a70';
      ctx.fillRect(cx - barW / 2, cy + 22, barW * ratio, 5);

      ctx.globalAlpha = 1;
    }
  }

  drawAttacks() {
    const { ctx } = this;
    for (const a of this.attacks) {
      const p = 1 - a.life / a.maxLife;
      if (a.kind === 'slash') this._drawSlash(ctx, a, p);
      else if (a.kind === 'arrow') this._drawArrow(ctx, a, p);
      else this._drawMagic(ctx, a, p);
    }
  }

  _drawSlash(ctx, a, p) {
    const ang = Math.atan2(a.dy - a.ay, a.dx - a.ax);
    // 스윙 진행 0~1
    const swing = Math.min(1, p / 0.7);
    const start = ang - 1.1;
    const end = ang - 1.1 + 2.2 * swing;
    const cx = (a.ax + a.dx) / 2;
    const cy = (a.ay + a.dy) / 2;
    const r = 28;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(255, 240, 180, ${0.85 * (1 - p * 0.3)})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r, start, end);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 120, 80, ${0.7 * (1 - p * 0.2)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, start, end);
    ctx.stroke();

    if (p > 0.55 && p < 0.9) {
      const flash = 1 - Math.abs(p - 0.7) / 0.2;
      ctx.globalAlpha = flash * 0.7;
      ctx.fillStyle = '#fff6c8';
      ctx.beginPath();
      ctx.arc(a.dx - cx, a.dy - cy, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawArrow(ctx, a, p) {
    const t = Math.min(1, p / 0.75);
    const x = a.ax + (a.dx - a.ax) * t;
    const y = a.ay + (a.dy - a.ay) * t;
    const ang = Math.atan2(a.dy - a.ay, a.dx - a.ax);

    // trail
    ctx.strokeStyle = `rgba(220, 240, 200, ${0.35 * (1 - t)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.ax, a.ay);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = '#e8f0d8';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, 4);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-8, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5a8f4a';
    ctx.fillRect(-10, -1.5, 10, 3);
    ctx.restore();

    if (p > 0.7 && p < 0.95) {
      const flash = 1 - Math.abs(p - 0.8) / 0.15;
      ctx.globalAlpha = flash * 0.65;
      ctx.fillStyle = '#dfffc8';
      ctx.beginPath();
      ctx.arc(a.dx, a.dy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  _drawMagic(ctx, a, p) {
    const t = Math.min(1, easeOut(p / 0.8));
    const x = a.ax + (a.dx - a.ax) * t;
    const y = a.ay + (a.dy - a.ay) * t;
    const pulse = 0.5 + Math.sin(this.animT * 20) * 0.5;

    // orbiting sparks along path
    for (let i = 0; i < 5; i++) {
      const tt = Math.max(0, t - i * 0.08);
      const px = a.ax + (a.dx - a.ax) * tt;
      const py = a.ay + (a.dy - a.ay) * tt;
      ctx.globalAlpha = (1 - i * 0.18) * 0.55;
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(px, py, 5 - i * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 16);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.4, a.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 14 + pulse * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    if (p > 0.65) {
      const burst = Math.min(1, (p - 0.65) / 0.25);
      ctx.globalAlpha = (1 - burst) * 0.75;
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(a.dx, a.dy, 8 + burst * 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawHover(state) {
    if (!this.hover) return;
    const { x, y } = this.hover;
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    const { ctx } = this;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);

    const terrain = TERRAIN[state.map[y][x]];
    const unit = state.units.find((u) => u.alive && u.x === x && u.y === y);
    const label = unit
      ? `${unit.name} / ${terrain.name}`
      : `${terrain.name}  방어+${terrain.defBonus}`;

    ctx.font = '12px "Noto Sans KR", sans-serif';
    const tw = ctx.measureText(label).width + 16;
    let lx = x * TILE + 8;
    let ly = y * TILE - 10;
    if (ly < 16) ly = y * TILE + TILE + 16;
    if (lx + tw > COLS * TILE) lx = COLS * TILE - tw - 4;

    ctx.fillStyle = 'rgba(10, 18, 14, 0.88)';
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
        ctx.font = 'bold 18px "Cinzel", "Noto Sans KR", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
    }
  }
}

function glyph(classId) {
  return { knight: '기', fighter: '전', archer: '궁', mage: '마' }[classId] || '?';
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
