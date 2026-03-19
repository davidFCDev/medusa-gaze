/**
 * Tutorial overlay — se muestra solo la primera vez que el jugador entra.
 * Fondo oscuro con instrucciones pixel-art y botón "FIGHT!".
 */
export class TutorialOverlay {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private onDismiss: () => void;

  constructor(scene: Phaser.Scene, isMobile: boolean, onDismiss: () => void) {
    this.scene = scene;
    this.onDismiss = onDismiss;
    this.create(isMobile);
  }

  private create(isMobile: boolean): void {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    // Dark overlay
    const bg = this.scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.82);
    bg.setDepth(500);

    const elements: Phaser.GameObjects.GameObject[] = [bg];

    // ── Title ──
    const title = this.scene.add
      .text(w / 2, h * 0.28, "MEDUSA'S GAZE", {
        fontFamily: "monospace",
        fontSize: "36px",
        color: "#00ff88",
        stroke: "#003322",
        strokeThickness: 6,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(501);
    elements.push(title);

    // ── Subtitle ──
    const subtitle = this.scene.add
      .text(w / 2, h * 0.33, "- HOW TO PLAY -", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#44aa66",
        stroke: "#002211",
        strokeThickness: 3,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(501);
    elements.push(subtitle);

    // ── Instructions (only 2) ──
    const instructions = isMobile
      ? [
          { text: "JOYSTICK to aim\nyour petrifying gaze" },
          { text: "TAP \ud83d\udc80 to unleash\nMedusa's Wrath" },
        ]
      : [
          { text: "WASD / ARROWS to aim\nyour petrifying gaze" },
          { text: "SPACE to unleash\nMedusa's Wrath" },
        ];

    const startY = h * 0.42;
    const rowHeight = h * 0.09;

    instructions.forEach((item, idx) => {
      const y = startY + idx * rowHeight;

      // Text (bigger, centered)
      const txt = this.scene.add
        .text(w / 2, y, item.text, {
          fontFamily: "monospace",
          fontSize: "26px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 4,
          lineSpacing: 6,
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(501);
      elements.push(txt);
    });

    // ── FIGHT button ──
    const btnY = h * 0.62;
    const btnW = 260;
    const btnH = 64;

    // Button border (pixel-art feel)
    const btnBorder = this.scene.add
      .rectangle(w / 2, btnY, btnW + 6, btnH + 6, 0x00ff88)
      .setDepth(501);
    elements.push(btnBorder);

    // Button fill
    const btnFill = this.scene.add
      .rectangle(w / 2, btnY, btnW, btnH, 0x003322)
      .setDepth(502);
    elements.push(btnFill);

    // Button text
    const btnText = this.scene.add
      .text(w / 2, btnY, "FIGHT!", {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#00ff88",
        stroke: "#001a11",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(503);
    elements.push(btnText);

    // ── Make button interactive ──
    btnFill.setInteractive({ useHandCursor: true });
    btnFill.on("pointerdown", () => this.dismiss());

    // Tap anywhere on BG also dismisses
    bg.setInteractive();
    bg.on("pointerdown", () => this.dismiss());

    // Container for easy cleanup
    this.container = this.scene.add.container(0, 0, elements);
    this.container.setDepth(500);

    // Fade in
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 300,
      ease: "Linear",
    });
  }

  private dismissed = false;

  private dismiss(): void {
    if (this.dismissed) return;
    this.dismissed = true;
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
    if (this.container) {
      this.container.destroy(true);
    }
  }
}
