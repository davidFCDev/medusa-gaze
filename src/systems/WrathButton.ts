import GameSettings from "../config/GameSettings";

/**
 * Medusa's Wrath button — bottom-right of screen.
 * Shows a circular button with cooldown sweep overlay.
 * Tap to shatter all petrified enemies.
 */
export class WrathButton {
  private scene: Phaser.Scene;
  private onActivate: () => void;

  // Visual elements
  private container!: Phaser.GameObjects.Container;
  private bgCircle!: Phaser.GameObjects.Arc;
  private icon!: Phaser.GameObjects.Text;
  private cooldownOverlay!: Phaser.GameObjects.Graphics;
  private hitArea!: Phaser.GameObjects.Arc;

  // State
  private cooldownRemaining: number = 0;
  private cooldownTotal: number;
  private isReady: boolean = true;

  // Position & size
  private cx: number;
  private cy: number;
  private radius: number = 60;

  constructor(scene: Phaser.Scene, onActivate: () => void) {
    this.scene = scene;
    this.onActivate = onActivate;
    this.cooldownTotal = GameSettings.wrath.cooldown;

    const w = scene.cameras.main.width;
    const h = scene.cameras.main.height;

    // Bottom-right, with margin
    this.cx = w - 115;
    this.cy = h - 100;

    this.create();
  }

  private create(): void {
    const elements: Phaser.GameObjects.GameObject[] = [];

    // Background circle — green ready state
    this.bgCircle = this.scene.add.circle(
      this.cx,
      this.cy,
      this.radius,
      0x0a3a1a,
      0.9,
    );
    this.bgCircle.setStrokeStyle(3, 0x44ff66, 0.9);
    this.bgCircle.setDepth(150);
    elements.push(this.bgCircle);

    // Cooldown sweep overlay (drawn via graphics)
    this.cooldownOverlay = this.scene.add.graphics();
    this.cooldownOverlay.setDepth(151);
    elements.push(this.cooldownOverlay);

    // Icon (skull/wrath symbol)
    this.icon = this.scene.add
      .text(this.cx, this.cy, "💀", {
        fontSize: "44px",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(152);
    elements.push(this.icon);

    // Invisible hit area (slightly bigger for easier taps)
    this.hitArea = this.scene.add.circle(
      this.cx,
      this.cy,
      this.radius + 12,
      0x000000,
      0,
    );
    this.hitArea.setDepth(153);
    this.hitArea.setInteractive();
    this.hitArea.on("pointerdown", () => this.tryActivate());
    elements.push(this.hitArea);

    this.container = this.scene.add.container(0, 0, elements);
    this.container.setDepth(150);
  }

  tryActivate(): void {
    if (!this.isReady) return;

    this.isReady = false;
    this.cooldownRemaining = this.cooldownTotal;

    // Flash effect on activation
    this.scene.tweens.add({
      targets: this.bgCircle,
      scale: 1.3,
      duration: 100,
      yoyo: true,
      ease: "Quad.easeOut",
    });

    // Shockwave from button
    const wave = this.scene.add.circle(
      this.cx,
      this.cy,
      this.radius,
      0x000000,
      0,
    );
    wave.setStrokeStyle(3, 0x44ff66, 0.8);
    wave.setDepth(149);
    this.scene.tweens.add({
      targets: wave,
      scale: 8,
      alpha: 0,
      duration: 400,
      ease: "Cubic.easeOut",
      onComplete: () => wave.destroy(),
    });

    this.onActivate();
  }

  update(delta: number): void {
    if (this.isReady) return;

    this.cooldownRemaining -= delta;
    if (this.cooldownRemaining <= 0) {
      this.cooldownRemaining = 0;
      this.isReady = true;

      // Ready flash — restore green look
      this.bgCircle.setFillStyle(0x0a3a1a, 0.9);
      this.bgCircle.setStrokeStyle(3, 0x44ff66, 0.9);
      this.icon.setAlpha(1);
      this.scene.tweens.add({
        targets: this.bgCircle,
        scale: 1.2,
        duration: 200,
        yoyo: true,
        ease: "Bounce.easeOut",
      });
    }

    // Draw cooldown sweep
    this.drawCooldownSweep();
  }

  private drawCooldownSweep(): void {
    this.cooldownOverlay.clear();

    if (this.isReady) return;

    const pct = this.cooldownRemaining / this.cooldownTotal;

    // Darken the button — greyed out on cooldown
    this.bgCircle.setFillStyle(0x111111, 0.7);
    this.bgCircle.setStrokeStyle(3, 0x333333, 0.4);
    this.icon.setAlpha(0.25);

    // Dark overlay covering whole circle (cooldown darkness)
    const sweepAngle = -Math.PI / 2; // start from top
    const endAngle = sweepAngle + Math.PI * 2 * (1 - pct);

    this.cooldownOverlay.fillStyle(0x000000, 0.55);
    this.cooldownOverlay.beginPath();
    this.cooldownOverlay.moveTo(this.cx, this.cy);
    this.cooldownOverlay.arc(
      this.cx,
      this.cy,
      this.radius,
      sweepAngle,
      sweepAngle + Math.PI * 2,
      false,
    );
    this.cooldownOverlay.closePath();
    this.cooldownOverlay.fillPath();

    // Ready portion arc (green, grows as cooldown fills)
    this.cooldownOverlay.fillStyle(0x0a3a1a, 0.7);
    this.cooldownOverlay.beginPath();
    this.cooldownOverlay.moveTo(this.cx, this.cy);
    this.cooldownOverlay.arc(
      this.cx,
      this.cy,
      this.radius,
      sweepAngle,
      endAngle,
      false,
    );
    this.cooldownOverlay.closePath();
    this.cooldownOverlay.fillPath();

    // Green border arc for ready portion
    this.cooldownOverlay.lineStyle(3, 0x44ff66, 0.8);
    this.cooldownOverlay.beginPath();
    this.cooldownOverlay.arc(
      this.cx,
      this.cy,
      this.radius,
      sweepAngle,
      endAngle,
      false,
    );
    this.cooldownOverlay.strokePath();
  }

  /** Returns true if the pointer is inside the button area */
  isInButtonArea(x: number, y: number): boolean {
    const dx = x - this.cx;
    const dy = y - this.cy;
    return Math.sqrt(dx * dx + dy * dy) <= this.radius + 25;
  }

  reset(): void {
    this.cooldownRemaining = 0;
    this.isReady = true;
    this.cooldownOverlay.clear();
    this.bgCircle.setFillStyle(0x0a3a1a, 0.9);
    this.bgCircle.setStrokeStyle(3, 0x44ff66, 0.9);
    this.icon.setAlpha(1);
  }

  destroy(): void {
    this.container?.destroy(true);
  }
}
