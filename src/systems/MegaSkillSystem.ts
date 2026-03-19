import GameSettings from "../config/GameSettings";

/**
 * Gorgon's Fury — Mega Skill system.
 * Charges by killing petrified enemies (combos charge faster).
 * When full: pauses game, shows overlay, tap to unleash spiral lightning
 * that destroys ALL enemies (petrified + alive).
 */
export class MegaSkillSystem {
  private scene: Phaser.Scene;
  private onActivate: () => void;

  // State
  private charge: number = 0;
  private maxCharge: number;
  private isReady: boolean = false;
  private isShowingOverlay: boolean = false;

  // Overlay elements
  private overlayBg!: Phaser.GameObjects.Rectangle | null;
  private overlayText!: Phaser.GameObjects.Text | null;
  private overlaySubtext!: Phaser.GameObjects.Text | null;
  private overlayGlow!: Phaser.GameObjects.Graphics | null;

  constructor(scene: Phaser.Scene, onActivate: () => void) {
    this.scene = scene;
    this.onActivate = onActivate;
    this.maxCharge = GameSettings.megaSkill.maxCharge;
  }

  /** Add charge when enemies are killed. combo = number of enemies in one wrath */
  addCharge(killCount: number): void {
    if (this.isReady || this.isShowingOverlay) return;

    const base = killCount * GameSettings.megaSkill.chargePerKill;
    // Combo bonus: if killed 2+ at once, multiply
    const multiplier =
      killCount >= 2 ? GameSettings.megaSkill.comboMultiplier : 1;
    this.charge += base * multiplier;

    if (this.charge >= this.maxCharge) {
      this.charge = this.maxCharge;
      this.isReady = true;
    }
  }

  getPercent(): number {
    return Math.min(this.charge / this.maxCharge, 1);
  }

  getIsReady(): boolean {
    return this.isReady;
  }

  getIsShowingOverlay(): boolean {
    return this.isShowingOverlay;
  }

  /** Show the activation overlay — pauses the game */
  showOverlay(): void {
    if (this.isShowingOverlay) return;
    this.isShowingOverlay = true;

    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    // Dark overlay
    this.overlayBg = this.scene.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0)
      .setDepth(300)
      .setInteractive();

    // Fade in
    this.scene.tweens.add({
      targets: this.overlayBg,
      fillAlpha: 0.7,
      duration: 400,
      ease: "Cubic.easeOut",
    });

    // Pulsing glow behind text
    this.overlayGlow = this.scene.add.graphics();
    this.overlayGlow.setDepth(301);

    // Title
    this.overlayText = this.scene.add
      .text(w / 2, h * 0.38, "GORGON'S\nFURY", {
        fontFamily: "monospace",
        fontSize: "52px",
        color: "#00ff88",
        stroke: "#003322",
        strokeThickness: 8,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(302)
      .setAlpha(0);

    // Subtitle
    this.overlaySubtext = this.scene.add
      .text(w / 2, h * 0.5, "TAP TO UNLEASH", {
        fontFamily: "monospace",
        fontSize: "26px",
        color: "#aaffcc",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(302)
      .setAlpha(0);

    // Animate text in
    this.scene.tweens.add({
      targets: this.overlayText,
      alpha: 1,
      scaleX: { from: 0.5, to: 1 },
      scaleY: { from: 0.5, to: 1 },
      duration: 500,
      ease: "Back.easeOut",
      delay: 200,
    });

    this.scene.tweens.add({
      targets: this.overlaySubtext,
      alpha: { from: 0, to: 1 },
      duration: 400,
      delay: 500,
    });

    // Pulse the subtitle
    this.scene.tweens.add({
      targets: this.overlaySubtext,
      alpha: { from: 0.5, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      delay: 900,
    });

    // Draw pulsing glow circles
    this.animateOverlayGlow(w, h);

    // Tap to activate — wait a moment so player sees it
    this.scene.time.delayedCall(600, () => {
      this.overlayBg?.on("pointerdown", () => {
        this.executeSkill();
      });
    });
  }

  private animateOverlayGlow(w: number, h: number): void {
    if (!this.overlayGlow) return;

    let elapsed = 0;
    const timer = this.scene.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        if (!this.overlayGlow || !this.isShowingOverlay) {
          timer.destroy();
          return;
        }
        elapsed += 30;
        this.overlayGlow.clear();

        // Pulsing green rings
        const pulse = Math.sin(elapsed * 0.003) * 0.3 + 0.4;
        for (let i = 0; i < 3; i++) {
          const r = 60 + i * 40 + Math.sin(elapsed * 0.002 + i) * 15;
          const alpha = (0.25 - i * 0.07) * pulse;
          this.overlayGlow.lineStyle(3, 0x00ff88, alpha);
          this.overlayGlow.strokeCircle(w / 2, h * 0.43, r);
        }
      },
    });
  }

  /** Execute: spiral lightning, destroy overlay, callback */
  private executeSkill(): void {
    if (!this.isShowingOverlay) return;

    // Remove overlay immediately
    this.destroyOverlay();

    // Play the spiral lightning effect, then callback
    this.playSpiralLightning(() => {
      this.charge = 0;
      this.isReady = false;
      this.isShowingOverlay = false;
      this.onActivate();
    });
  }

  /** Green spiral lightning effect around Medusa */
  private playSpiralLightning(onComplete: () => void): void {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const cx = w / 2;
    const cy = h / 2;

    const gfx = this.scene.add.graphics();
    gfx.setDepth(250);

    // Camera flash
    this.scene.cameras.main.flash(300, 0, 255, 100);

    let elapsed = 0;
    const duration = 900; // ms
    const numBolts = 8;

    const timer = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        elapsed += 16;
        const progress = Math.min(elapsed / duration, 1);

        gfx.clear();

        // Growing spiral radius
        const maxRadius = Math.max(w, h) * 0.75;
        const currentRadius = maxRadius * progress;

        // Draw multiple lightning bolts spiraling outward
        for (let b = 0; b < numBolts; b++) {
          const baseAngle = (b / numBolts) * Math.PI * 2 + elapsed * 0.008;

          // Each bolt: jagged line from center outward
          const segments = 12;
          const points: { x: number; y: number }[] = [];

          for (let s = 0; s <= segments; s++) {
            const t = s / segments;
            const r = currentRadius * t;
            const angle = baseAngle + t * Math.PI * 1.5; // spiral
            const jitterX = (Math.random() - 0.5) * 20 * t;
            const jitterY = (Math.random() - 0.5) * 20 * t;
            points.push({
              x: cx + Math.cos(angle) * r + jitterX,
              y: cy + Math.sin(angle) * r + jitterY,
            });
          }

          // Draw outer glow
          gfx.lineStyle(6, 0x00ff88, 0.3 * (1 - progress * 0.5));
          gfx.beginPath();
          gfx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            gfx.lineTo(points[i].x, points[i].y);
          }
          gfx.strokePath();

          // Draw core bolt
          gfx.lineStyle(2, 0xaaffcc, 0.8 * (1 - progress * 0.5));
          gfx.beginPath();
          gfx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            gfx.lineTo(points[i].x, points[i].y);
          }
          gfx.strokePath();
        }

        // Center energy burst
        const burstAlpha = 0.4 * (1 - progress);
        gfx.fillStyle(0x00ff88, burstAlpha);
        gfx.fillCircle(cx, cy, 30 + progress * 50);

        if (progress >= 1) {
          timer.destroy();
          // Fade out
          this.scene.tweens.add({
            targets: gfx,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              gfx.destroy();
              onComplete();
            },
          });
        }
      },
    });
  }

  private destroyOverlay(): void {
    if (this.overlayBg) {
      this.overlayBg.destroy();
      this.overlayBg = null;
    }
    if (this.overlayText) {
      this.overlayText.destroy();
      this.overlayText = null;
    }
    if (this.overlaySubtext) {
      this.overlaySubtext.destroy();
      this.overlaySubtext = null;
    }
    if (this.overlayGlow) {
      this.overlayGlow.destroy();
      this.overlayGlow = null;
    }
  }

  reset(): void {
    this.charge = 0;
    this.isReady = false;
    this.isShowingOverlay = false;
    this.destroyOverlay();
  }

  destroy(): void {
    this.destroyOverlay();
  }
}
