/**
 * In-game swipe tutorial — shown the first time an enemy is petrified.
 * Pauses the game, darkens the screen, highlights the petrified enemy,
 * and shows an animated swipe indicator.
 */
export class SwipeTutorial {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private onDismiss: () => void;
  private swipeLine!: Phaser.GameObjects.Graphics;
  private swipeTween!: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    targetX: number,
    targetY: number,
    onDismiss: () => void,
  ) {
    this.scene = scene;
    this.onDismiss = onDismiss;
    this.create(targetX, targetY);
  }

  private create(tx: number, ty: number): void {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    const elements: Phaser.GameObjects.GameObject[] = [];

    // Dark overlay
    const bg = this.scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7);
    bg.setDepth(400);
    elements.push(bg);

    // Highlight circle around petrified enemy (cutout feel)
    const highlight = this.scene.add.circle(tx, ty, 60, 0x000000, 0);
    highlight.setStrokeStyle(3, 0x00ff88, 0.9);
    highlight.setDepth(401);
    elements.push(highlight);

    // Pulsing glow ring
    const glowRing = this.scene.add.circle(tx, ty, 60, 0x000000, 0);
    glowRing.setStrokeStyle(2, 0x00ff88, 0.5);
    glowRing.setDepth(401);
    elements.push(glowRing);
    this.scene.tweens.add({
      targets: glowRing,
      scale: 1.4,
      alpha: 0,
      duration: 800,
      repeat: -1,
      ease: "Sine.easeOut",
    });

    // Animated swipe indicator — a dot that moves across the enemy
    const swipeLen = 140;
    const startX = tx - swipeLen / 2;
    const endX = tx + swipeLen / 2;

    // Swipe trail graphics
    this.swipeLine = this.scene.add.graphics();
    this.swipeLine.setDepth(402);
    elements.push(this.swipeLine);

    // Moving dot (finger indicator)
    const dot = this.scene.add.circle(startX, ty, 14, 0x00ff88, 0.9);
    dot.setDepth(403);
    elements.push(dot);

    // Trail effect behind dot
    const progress = { x: startX };
    this.swipeTween = this.scene.tweens.add({
      targets: progress,
      x: endX,
      duration: 700,
      delay: 300,
      repeat: -1,
      repeatDelay: 600,
      ease: "Power2",
      onUpdate: () => {
        dot.setPosition(progress.x, ty);
        // Draw trail
        this.swipeLine.clear();
        this.swipeLine.lineStyle(4, 0x00ff88, 0.6);
        this.swipeLine.beginPath();
        this.swipeLine.moveTo(startX, ty);
        this.swipeLine.lineTo(progress.x, ty);
        this.swipeLine.strokePath();
      },
      onRepeat: () => {
        this.swipeLine.clear();
      },
    });

    // Arrow heads at start and end
    const arrowL = this.scene.add
      .text(startX - 20, ty, ">", {
        fontFamily: "monospace",
        fontSize: "28px",
        color: "#00ff88",
        stroke: "#003322",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(402);
    elements.push(arrowL);

    const arrowR = this.scene.add
      .text(endX + 20, ty, ">", {
        fontFamily: "monospace",
        fontSize: "28px",
        color: "#00ff88",
        stroke: "#003322",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(402);
    elements.push(arrowR);

    // "SWIPE!" text above the enemy
    const label = this.scene.add
      .text(tx, ty - 90, "SWIPE!", {
        fontFamily: "monospace",
        fontSize: "32px",
        color: "#00ff88",
        stroke: "#003322",
        strokeThickness: 5,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(403);
    elements.push(label);

    // Container
    this.container = this.scene.add.container(0, 0, elements);
    this.container.setDepth(400);

    // Fade in
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 250,
      ease: "Linear",
    });

    // Tap anywhere to dismiss (with small delay to avoid instant dismiss)
    this.scene.time.delayedCall(400, () => {
      bg.setInteractive();
      bg.on("pointerdown", () => this.dismiss());
    });
  }

  private dismiss(): void {
    if (this.swipeTween) this.swipeTween.stop();

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 200,
      ease: "Linear",
      onComplete: () => {
        this.container.destroy(true);
        this.onDismiss();
      },
    });
  }

  destroy(): void {
    if (this.swipeTween) this.swipeTween.stop();
    if (this.container) {
      this.container.destroy(true);
    }
  }
}
