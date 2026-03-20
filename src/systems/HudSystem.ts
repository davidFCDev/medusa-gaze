import GameSettings from "../config/GameSettings";

/**
 * HUD del juego: barra de vida, barra de energía, iconos y score.
 * No contiene lógica de juego, solo visualización.
 */
export class HudSystem {
  private scene: Phaser.Scene;

  // Health bar
  private healthBarBg!: Phaser.GameObjects.Rectangle;
  private healthBarFill!: Phaser.GameObjects.Rectangle;
  private healthBarBorder!: Phaser.GameObjects.Rectangle;
  private healthIcon!: Phaser.GameObjects.Text;

  // Energy bar
  private energyBarBg!: Phaser.GameObjects.Rectangle;
  private energyBarFill!: Phaser.GameObjects.Rectangle;
  private energyBarBorder!: Phaser.GameObjects.Rectangle;
  private energyIcon!: Phaser.GameObjects.Text;
  private energyGlow!: Phaser.GameObjects.Graphics;

  // Mega charge state
  private megaChargePercent: number = 0;
  private megaGlowTimer: number = 0;
  private isMegaReady: boolean = false;
  private energyBarCenterX: number = 0;
  private energyBarY: number = 0;

  // Score
  private scoreBadge!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;

  // Revive indicator
  private reviveIcon!: Phaser.GameObjects.Text;
  private reviveGlow!: Phaser.GameObjects.Graphics;
  private hasRevive: boolean = false;

  private barWidth = 340;
  private barHeight = 36;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createBars();
    this.createScore();
  }

  private createBars(): void {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    // Si la pantalla es 2:3 (base), no hay overlay → barras al top con margen mínimo.
    // Si es más alta (fullscreen), respetar safe area.
    const isTall = h > GameSettings.canvas.height + 10;
    const topOffset = isTall ? GameSettings.safeArea.top : 20;

    const iconOffset = 24;
    const barCenterX = w / 2 + iconOffset / 2;
    const barLeft = barCenterX - this.barWidth / 2;
    const iconX = barLeft - 22;

    // ── Health Bar (arriba) ──
    const healthY = topOffset + 16;

    this.healthIcon = this.scene.add
      .text(iconX, healthY, "❤", { fontSize: "30px", color: "#ff4444" })
      .setOrigin(0.5)
      .setDepth(100);

    this.healthBarBg = this.scene.add
      .rectangle(
        barCenterX,
        healthY,
        this.barWidth,
        this.barHeight,
        GameSettings.visual.barBg,
      )
      .setOrigin(0.5)
      .setDepth(100);

    this.healthBarFill = this.scene.add
      .rectangle(
        barLeft,
        healthY,
        this.barWidth,
        this.barHeight - 4,
        GameSettings.visual.healthBarColor,
      )
      .setOrigin(0, 0.5)
      .setDepth(101);

    this.healthBarBorder = this.scene.add
      .rectangle(barCenterX, healthY, this.barWidth + 4, this.barHeight + 4)
      .setStrokeStyle(2, GameSettings.visual.healthBarBorder)
      .setFillStyle(0x000000, 0)
      .setOrigin(0.5)
      .setDepth(102);

    // ── Revive indicator (right of health bar) ──
    const reviveX = barCenterX + this.barWidth / 2 + 28;
    this.reviveGlow = this.scene.add.graphics();
    this.reviveGlow.setDepth(99);
    this.reviveGlow.setAlpha(0);

    this.reviveIcon = this.scene.add
      .text(reviveX, healthY, "🧪", { fontSize: "28px" })
      .setOrigin(0.5)
      .setDepth(100)
      .setAlpha(0);

    // ── Energy Bar (debajo) ──
    const energyY = healthY + this.barHeight + 12;
    this.energyBarY = energyY;
    this.energyBarCenterX = barCenterX;

    // Glow behind energy bar (for mega charge)
    this.energyGlow = this.scene.add.graphics();
    this.energyGlow.setDepth(103);

    this.energyIcon = this.scene.add
      .text(iconX, energyY, "⚡", { fontSize: "30px" })
      .setOrigin(0.5)
      .setDepth(100);

    this.energyBarBg = this.scene.add
      .rectangle(
        barCenterX,
        energyY,
        this.barWidth,
        this.barHeight,
        GameSettings.visual.barBg,
      )
      .setOrigin(0.5)
      .setDepth(100);

    this.energyBarFill = this.scene.add
      .rectangle(
        barLeft,
        energyY,
        this.barWidth,
        this.barHeight - 4,
        GameSettings.visual.energyBarColor,
      )
      .setOrigin(0, 0.5)
      .setDepth(101);

    this.energyBarBorder = this.scene.add
      .rectangle(barCenterX, energyY, this.barWidth + 4, this.barHeight + 4)
      .setStrokeStyle(2, GameSettings.visual.energyBarBorder)
      .setFillStyle(0x000000, 0)
      .setOrigin(0.5)
      .setDepth(102);
  }

  private createScore(): void {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    // Centered horizontally, same Y as wrath button (h - 100)
    const badgeX = w / 2;
    const badgeY = h - 100;
    const badgeW = 140;
    const badgeH = 56;
    const radius = 16;

    // Badge background (rounded rect)
    this.scoreBadge = this.scene.add.graphics();
    this.scoreBadge.setDepth(100);
    // Dark semi-transparent bg
    this.scoreBadge.fillStyle(0x000000, 0.6);
    this.scoreBadge.fillRoundedRect(
      badgeX - badgeW / 2,
      badgeY - badgeH / 2,
      badgeW,
      badgeH,
      radius,
    );
    // Green border
    this.scoreBadge.lineStyle(2, 0x00ff88, 0.7);
    this.scoreBadge.strokeRoundedRect(
      badgeX - badgeW / 2,
      badgeY - badgeH / 2,
      badgeW,
      badgeH,
      radius,
    );

    this.scoreText = this.scene.add
      .text(badgeX, badgeY, "0", {
        fontFamily: "monospace",
        fontSize: "42px",
        color: "#00ff88",
        stroke: "#003322",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(101);
  }

  // ── Updates ──

  updateHealth(pct: number): void {
    this.healthBarFill.width = this.barWidth * Math.max(0, Math.min(1, pct));
    // Siempre roja
    this.healthBarFill.setFillStyle(GameSettings.visual.healthBarColor);
  }

  updateEnergy(pct: number): void {
    this.energyBarFill.width = this.barWidth * Math.max(0, Math.min(1, pct));
    if (this.isMegaReady) {
      // Multicolor cycling when mega is ready
      const t = Date.now() * 0.003;
      const r = Math.floor(Math.sin(t) * 50 + 100);
      const g = Math.floor(Math.sin(t + 2) * 80 + 175);
      const b = Math.floor(Math.sin(t + 4) * 50 + 100);
      const color = (r << 16) | (g << 8) | b;
      this.energyBarFill.setFillStyle(color);
    } else {
      this.energyBarFill.setFillStyle(GameSettings.visual.energyBarColor);
    }
  }

  updateScore(score: number, _highScore: number): void {
    this.scoreText.setText(`${score}`);
  }

  /** Update mega charge glow around energy bar */
  updateMegaCharge(pct: number, delta: number): void {
    this.megaChargePercent = Math.min(pct, 1);
    const wasReady = this.isMegaReady;
    this.isMegaReady = pct >= 1;

    // Flash when mega just became ready
    if (this.isMegaReady && !wasReady) {
      this.scene.cameras.main.flash(200, 0, 255, 100);
      this.energyBarBorder.setStrokeStyle(2, 0xffff00);
    } else if (!this.isMegaReady) {
      this.energyBarBorder.setStrokeStyle(
        2,
        GameSettings.visual.energyBarBorder,
      );
    }

    this.megaGlowTimer += delta;
    this.drawMegaGlow();
  }

  private drawMegaGlow(): void {
    this.energyGlow.clear();
    if (this.megaChargePercent <= 0.01) return;

    const cx = this.energyBarCenterX;
    const y = this.energyBarY;
    const halfW = this.barWidth / 2 + 4;
    const halfH = this.barHeight / 2 + 4;

    const pulse = Math.sin(this.megaGlowTimer * 0.005) * 0.2 + 0.8;

    if (this.isMegaReady) {
      // Rainbow glow when ready — very bright and wide
      const t = this.megaGlowTimer * 0.003;
      const r = Math.floor(Math.sin(t) * 55 + 200);
      const g = Math.floor(Math.sin(t + 2) * 80 + 175);
      const b = Math.floor(Math.sin(t + 4) * 55 + 200);
      const color = (r << 16) | (g << 8) | b;

      for (let i = 4; i >= 1; i--) {
        const spread = i * 6;
        const a = (0.5 / i) * pulse;
        this.energyGlow.fillStyle(color, a);
        this.energyGlow.fillRoundedRect(
          cx - halfW - spread,
          y - halfH - spread,
          (halfW + spread) * 2,
          (halfH + spread) * 2,
          8,
        );
      }
    } else {
      // Green glow, growing with charge — visible from ~20% charge
      const intensity = this.megaChargePercent;
      for (let i = 3; i >= 1; i--) {
        const spread = i * 5 * intensity;
        const a = intensity * (0.45 / i) * pulse;
        this.energyGlow.fillStyle(0x00ff88, a);
        this.energyGlow.fillRoundedRect(
          cx - halfW - spread,
          y - halfH - spread,
          (halfW + spread) * 2,
          (halfH + spread) * 2,
          8,
        );
      }
    }
  }

  flashEnergy(): void {
    this.scene.tweens.add({
      targets: this.energyBarFill,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
      ease: "Bounce",
    });
  }

  flashHealth(): void {
    // Detener tweens previos para evitar que alpha se quede bajo
    this.scene.tweens.killTweensOf(this.healthBarFill);
    this.healthBarFill.setAlpha(1);
    this.scene.tweens.add({
      targets: this.healthBarFill,
      alpha: 0.5,
      duration: 80,
      yoyo: true,
      ease: "Linear",
      onComplete: () => {
        this.healthBarFill.setAlpha(1);
      },
    });
  }

  /** Show/hide the revive potion icon */
  setReviveAvailable(available: boolean): void {
    if (available === this.hasRevive) return;
    this.hasRevive = available;

    if (available) {
      this.reviveIcon.setAlpha(1);
      this.reviveGlow.setAlpha(1);
    } else {
      this.reviveIcon.setAlpha(0);
      this.reviveGlow.setAlpha(0);
    }
  }

  destroy(): void {
    this.healthBarBg.destroy();
    this.healthBarFill.destroy();
    this.healthBarBorder.destroy();
    this.healthIcon.destroy();
    this.energyBarBg.destroy();
    this.energyBarFill.destroy();
    this.energyBarBorder.destroy();
    this.energyIcon.destroy();
    this.energyGlow.destroy();
    this.reviveIcon.destroy();
    this.reviveGlow.destroy();
    this.scoreBadge.destroy();
    this.scoreText.destroy();
  }
}
