import GameSettings from "../config/GameSettings";

export type Direction = "up" | "down" | "left" | "right";

export class Medusa {
  private scene: Phaser.Scene;
  public sprite!: Phaser.GameObjects.Sprite;
  public direction: Direction = "down";
  public isGazing: boolean = false;
  public isDead: boolean = false;
  public isHit: boolean = false;
  private hitTimer: number = 0;
  private hitDuration: number = 300; // ms que dura la animación de hit

  /** Ángulo exacto de la mirada en radianes (free-aim) */
  public gazeAngleRad: number = Math.PI / 2; // default: down

  /** Cono gráfico de la mirada */
  public gazeCone!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.createSprite(x, y);
    this.createGazeCone();
    this.setupAnimations();
    this.playIdle("down");
  }

  private createSprite(x: number, y: number): void {
    this.sprite = this.scene.add.sprite(x, y, "medusa-idle", 0);
    this.sprite.setScale(GameSettings.medusa.scale);
    this.sprite.setDepth(10);
  }

  private createGazeCone(): void {
    this.gazeCone = this.scene.add.graphics();
    this.gazeCone.setDepth(5);
  }

  private setupAnimations(): void {
    const idleCfg = GameSettings.sprites.idle;
    const attackCfg = GameSettings.sprites.attack;
    const deathCfg = GameSettings.sprites.death;

    // Idle animations (4 frames per direction)
    for (const [dir, row] of Object.entries(idleCfg.directions)) {
      const startFrame = (row as number) * idleCfg.columns;
      this.scene.anims.create({
        key: `medusa-idle-${dir}`,
        frames: this.scene.anims.generateFrameNumbers("medusa-idle", {
          start: startFrame,
          end: startFrame + idleCfg.columns - 1,
        }),
        frameRate: 6,
        repeat: -1,
      });
    }

    // Attack animations (7 frames per direction)
    for (const [dir, row] of Object.entries(attackCfg.directions)) {
      const startFrame = (row as number) * attackCfg.columns;
      this.scene.anims.create({
        key: `medusa-attack-${dir}`,
        frames: this.scene.anims.generateFrameNumbers("medusa-attack", {
          start: startFrame,
          end: startFrame + attackCfg.columns - 1,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    // Death animations (6 frames per direction)
    for (const [dir, row] of Object.entries(deathCfg.directions)) {
      const startFrame = (row as number) * deathCfg.columns;
      this.scene.anims.create({
        key: `medusa-death-${dir}`,
        frames: this.scene.anims.generateFrameNumbers("medusa-death", {
          start: startFrame,
          end: startFrame + deathCfg.columns - 1,
        }),
        frameRate: 8,
        repeat: 0,
      });
    }

    // Hit animations (2 frames per direction)
    const hitCfg = GameSettings.sprites.hit;
    for (const [dir, row] of Object.entries(hitCfg.directions)) {
      const startFrame = (row as number) * hitCfg.columns;
      this.scene.anims.create({
        key: `medusa-hit-${dir}`,
        frames: this.scene.anims.generateFrameNumbers("medusa-hit", {
          start: startFrame,
          end: startFrame + hitCfg.columns - 1,
        }),
        frameRate: 6,
        repeat: -1,
      });
    }
  }

  /** Reproduce idle en la dirección actual */
  playIdle(dir?: Direction): void {
    if (dir) this.direction = dir;
    this.isGazing = false;
    this.sprite.play(`medusa-idle-${this.direction}`, true);
    this.hideGazeCone();
  }

  /** Reproduce ataque. angleRad = ángulo exacto (free‑aim). Sprite usa cardinal más cercano. */
  playAttack(dir: Direction, angleRad?: number): void {
    this.direction = dir;
    this.gazeAngleRad = angleRad ?? Medusa.dirToAngle(dir);
    this.isGazing = true;
    this.sprite.play(`medusa-attack-${this.direction}`, true);
    this.drawGazeCone();
  }

  /** Actualiza solo el ángulo del cono sin cambiar sprite (smooth joystick) */
  setGazeAngle(angleRad: number): void {
    this.gazeAngleRad = angleRad;
  }

  /** Convierte ángulo (rad) a dirección cardinal más cercana */
  static angleToDir(rad: number): Direction {
    const deg = Phaser.Math.RadToDeg(rad);
    // Normalizar a [0, 360)
    const n = ((deg % 360) + 360) % 360;
    if (n >= 315 || n < 45) return "right";
    if (n >= 45 && n < 135) return "down";
    if (n >= 135 && n < 225) return "left";
    return "up";
  }

  /** Convierte dirección cardinal a ángulo en radianes */
  static dirToAngle(dir: Direction): number {
    switch (dir) {
      case "right":
        return 0;
      case "down":
        return Math.PI / 2;
      case "left":
        return Math.PI;
      case "up":
        return -Math.PI / 2;
    }
  }

  /** Reproduce muerte */
  playDeath(): void {
    this.isDead = true;
    this.isGazing = false;
    this.isHit = false;
    this.hideGazeCone();
    this.sprite.play(`medusa-death-${this.direction}`, true);
  }

  /** Reproduce animación de hit (recibiendo daño) */
  playHit(): void {
    if (this.isDead || this.isHit) return;
    this.isHit = true;
    this.hitTimer = this.hitDuration;
    // Guardar si estaba gazing para restaurar después
    const wasGazing = this.isGazing;
    const currentDir = this.direction;
    this.sprite.play(`medusa-hit-${this.direction}`, true);
    // Tint rojo breve
    this.sprite.setTint(0xff6666);
  }

  /** Actualiza el timer de hit, restaura estado previo al terminar */
  updateHit(delta: number): void {
    if (!this.isHit) return;
    this.hitTimer -= delta;
    if (this.hitTimer <= 0) {
      this.isHit = false;
      this.sprite.clearTint();
      // Restaurar animación según estado
      if (this.isGazing) {
        this.sprite.play(`medusa-attack-${this.direction}`, true);
      } else {
        this.sprite.play(`medusa-idle-${this.direction}`, true);
      }
    }
  }

  /** Dibuja el cono de visión usando gazeAngleRad (free-aim) */
  drawGazeCone(): void {
    this.gazeCone.clear();

    const { gazeRange, gazeAngle } = GameSettings.medusa;
    const color = GameSettings.visual.gazeColor;
    const alpha = GameSettings.visual.gazeAlpha;

    const halfCone = Phaser.Math.DegToRad(gazeAngle);
    const startAngle = this.gazeAngleRad - halfCone;
    const endAngle = this.gazeAngleRad + halfCone;

    const x = this.sprite.x;
    const y = this.sprite.y;

    // Cono sólido
    this.gazeCone.fillStyle(color, alpha);
    this.gazeCone.beginPath();
    this.gazeCone.moveTo(x, y);
    this.gazeCone.arc(x, y, gazeRange, startAngle, endAngle, false);
    this.gazeCone.closePath();
    this.gazeCone.fillPath();

    // Borde del cono
    this.gazeCone.lineStyle(2, color, alpha * 2.5);
    this.gazeCone.beginPath();
    this.gazeCone.moveTo(x, y);
    this.gazeCone.arc(x, y, gazeRange, startAngle, endAngle, false);
    this.gazeCone.closePath();
    this.gazeCone.strokePath();
  }

  hideGazeCone(): void {
    this.gazeCone.clear();
  }

  /** Comprueba si un punto está dentro del cono de visión (free-aim) */
  isInGaze(targetX: number, targetY: number): boolean {
    if (!this.isGazing) return false;

    const { gazeRange, gazeAngle } = GameSettings.medusa;
    const x = this.sprite.x;
    const y = this.sprite.y;

    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > gazeRange) return false;

    const angleToTarget = Math.atan2(dy, dx);
    let diff = Phaser.Math.RadToDeg(angleToTarget - this.gazeAngleRad);

    // Normalizar a [-180, 180]
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;

    return Math.abs(diff) <= gazeAngle;
  }

  /** Devuelve ángulo central en radianes */
  getGazeCenterAngle(): number {
    return this.gazeAngleRad;
  }

  destroy(): void {
    this.sprite.destroy();
    this.gazeCone.destroy();
  }
}
