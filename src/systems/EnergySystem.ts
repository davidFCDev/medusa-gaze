import GameSettings from "../config/GameSettings";

/**
 * Sistema de energía / barra de poder de Medusa.
 * Se drena al usar la mirada, se rellena al romper estatuas.
 */
export class EnergySystem {
  private scene: Phaser.Scene;
  private energy: number;
  private maxEnergy: number;

  // UI elements
  private barBg!: Phaser.GameObjects.Rectangle;
  private barFill!: Phaser.GameObjects.Rectangle;
  private barBorder!: Phaser.GameObjects.Rectangle;
  private barIcon!: Phaser.GameObjects.Text;

  // Dimensiones de la barra
  private barWidth = 300;
  private barHeight = 24;
  private barX: number;
  private barY: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.maxEnergy = GameSettings.energy.max;
    this.energy = this.maxEnergy;

    const canvasW = scene.cameras.main.width;
    this.barX = canvasW / 2;
    this.barY = GameSettings.safeArea.top + 20;

    this.createUI();
  }

  private createUI(): void {
    // Icono ojo
    this.barIcon = this.scene.add
      .text(this.barX - this.barWidth / 2 - 30, this.barY, "👁", {
        fontSize: "22px",
      })
      .setOrigin(0.5)
      .setDepth(100);

    // Fondo de la barra
    this.barBg = this.scene.add.rectangle(
      this.barX,
      this.barY,
      this.barWidth,
      this.barHeight,
      GameSettings.visual.energyBarBg,
    );
    this.barBg.setOrigin(0.5);
    this.barBg.setDepth(100);

    // Relleno de la barra
    this.barFill = this.scene.add.rectangle(
      this.barX - this.barWidth / 2,
      this.barY,
      this.barWidth,
      this.barHeight - 4,
      GameSettings.visual.energyBarColor,
    );
    this.barFill.setOrigin(0, 0.5);
    this.barFill.setDepth(101);

    // Borde
    this.barBorder = this.scene.add.rectangle(
      this.barX,
      this.barY,
      this.barWidth + 4,
      this.barHeight + 4,
    );
    this.barBorder.setStrokeStyle(2, GameSettings.visual.energyBarBorder);
    this.barBorder.setFillStyle(0x000000, 0);
    this.barBorder.setOrigin(0.5);
    this.barBorder.setDepth(102);
  }

  /** Drena energía (al usar la mirada) */
  drain(delta: number): void {
    const dt = delta / 1000;
    this.energy -= GameSettings.energy.drainPerSecond * dt;
    if (this.energy < 0) this.energy = 0;
    this.updateBar();
  }

  /** Regenera energía pasivamente (ojos cerrados) */
  regen(delta: number): void {
    const dt = delta / 1000;
    this.energy += GameSettings.energy.regenPerSecond * dt;
    if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
    this.updateBar();
  }

  /** Añade energía al romper una estatua */
  addEnergy(amount: number): void {
    this.energy += amount;
    if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
    this.updateBar();

    // Flash visual
    this.scene.tweens.add({
      targets: this.barFill,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
      ease: "Bounce",
    });
  }

  /** ¿Queda energía? */
  hasEnergy(): boolean {
    return this.energy > 0;
  }

  /** ¿Está vacía? */
  isEmpty(): boolean {
    return this.energy <= 0;
  }

  getEnergy(): number {
    return this.energy;
  }

  getPercent(): number {
    return this.energy / this.maxEnergy;
  }

  private updateBar(): void {
    const pct = this.energy / this.maxEnergy;
    this.barFill.width = this.barWidth * pct;

    // Cambiar color según nivel
    if (pct > 0.5) {
      this.barFill.setFillStyle(GameSettings.visual.energyBarColor);
    } else if (pct > 0.25) {
      this.barFill.setFillStyle(0xffaa00); // naranja
    } else {
      this.barFill.setFillStyle(0xff3333); // rojo
    }
  }

  reset(): void {
    this.energy = this.maxEnergy;
    this.updateBar();
  }

  destroy(): void {
    this.barBg.destroy();
    this.barFill.destroy();
    this.barBorder.destroy();
    this.barIcon.destroy();
  }
}
