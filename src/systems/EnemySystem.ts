import GameSettings from "../config/GameSettings";

export type EnemyState = "walking" | "petrifying" | "petrified";

export interface Enemy {
  sprite: Phaser.GameObjects.Arc;
  state: EnemyState;
  speed: number;
  /** Ángulo en radianes hacia Medusa */
  angle: number;
  /** Progreso de petrificación (0 → 1) */
  petrifyProgress: number;
  /** Puntos que vale */
  points: number;
}

export class EnemySystem {
  private scene: Phaser.Scene;
  public enemies: Enemy[] = [];
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private currentSpawnInterval: number;
  private currentSpeed: number;
  private wave: number = 0;
  private centerX: number;
  private centerY: number;
  private gameWidth: number;
  private gameHeight: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gameWidth = scene.cameras.main.width;
    this.gameHeight = scene.cameras.main.height;
    this.centerX = this.gameWidth / 2;
    this.centerY = this.gameHeight / 2;
    this.currentSpawnInterval = GameSettings.enemies.spawnInterval;
    this.currentSpeed = GameSettings.enemies.baseSpeed;
  }

  start(): void {
    this.scheduleNextSpawn();
  }

  private scheduleNextSpawn(): void {
    this.spawnTimer = this.scene.time.delayedCall(
      this.currentSpawnInterval,
      () => {
        this.spawnEnemy();
        this.scheduleNextSpawn();
      },
    );
  }

  private spawnEnemy(): void {
    const side = Phaser.Math.Between(0, 3); // 0=top, 1=right, 2=bottom, 3=left
    let x = 0;
    let y = 0;
    const margin = 60;

    switch (side) {
      case 0: // top
        x = Phaser.Math.Between(margin, this.gameWidth - margin);
        y = -margin;
        break;
      case 1: // right
        x = this.gameWidth + margin;
        y = Phaser.Math.Between(margin, this.gameHeight - margin);
        break;
      case 2: // bottom
        x = Phaser.Math.Between(margin, this.gameWidth - margin);
        y = this.gameHeight + margin;
        break;
      case 3: // left
        x = -margin;
        y = Phaser.Math.Between(margin, this.gameHeight - margin);
        break;
    }

    const size = GameSettings.enemies.size;

    // Enemigo placeholder: círculo pixel-art
    const sprite = this.scene.add.circle(x, y, size / 2, 0xcc3333);
    sprite.setStrokeStyle(3, 0x661111);
    sprite.setDepth(8);

    // Ángulo hacia el centro (Medusa)
    const angle = Math.atan2(this.centerY - y, this.centerX - x);

    const enemy: Enemy = {
      sprite,
      state: "walking",
      speed: this.currentSpeed + Phaser.Math.FloatBetween(-15, 15),
      angle,
      petrifyProgress: 0,
      points: GameSettings.enemies.pointsPerKill,
    };

    this.enemies.push(enemy);
  }

  update(delta: number): void {
    const dt = delta / 1000;

    for (const enemy of this.enemies) {
      if (enemy.state === "walking") {
        // Moverse hacia Medusa
        const vx = Math.cos(enemy.angle) * enemy.speed * dt;
        const vy = Math.sin(enemy.angle) * enemy.speed * dt;
        enemy.sprite.x += vx;
        enemy.sprite.y += vy;
      }

      if (enemy.state === "petrifying") {
        // Progreso de petrificación
        enemy.petrifyProgress += dt / (GameSettings.medusa.petrifyTime / 1000);

        // Interpolar color de rojo a gris
        const t = Math.min(enemy.petrifyProgress, 1);
        const r = Math.round(0xcc * (1 - t) + 0x88 * t);
        const g = Math.round(0x33 * (1 - t) + 0x88 * t);
        const b = Math.round(0x33 * (1 - t) + 0x88 * t);
        const color = (r << 16) | (g << 8) | b;
        enemy.sprite.setFillStyle(color);

        // Ralentizar movimiento
        const slowFactor = 1 - t * 0.9;
        const vx = Math.cos(enemy.angle) * enemy.speed * dt * slowFactor;
        const vy = Math.sin(enemy.angle) * enemy.speed * dt * slowFactor;
        enemy.sprite.x += vx;
        enemy.sprite.y += vy;

        if (enemy.petrifyProgress >= 1) {
          enemy.state = "petrified";
          enemy.sprite.setFillStyle(GameSettings.visual.petrifiedTint);
          enemy.sprite.setStrokeStyle(3, 0x555555);
        }
      }

      // Los petrified no se mueven
    }
  }

  /** Marca enemigos en el cono como "petrifying" */
  applyGaze(isInGaze: (x: number, y: number) => boolean): void {
    for (const enemy of this.enemies) {
      if (enemy.state === "walking") {
        if (isInGaze(enemy.sprite.x, enemy.sprite.y)) {
          enemy.state = "petrifying";
        }
      } else if (enemy.state === "petrifying") {
        // Si sale del cono, vuelve a walking (reset petrify)
        if (!isInGaze(enemy.sprite.x, enemy.sprite.y)) {
          enemy.state = "walking";
          enemy.petrifyProgress = 0;
          enemy.sprite.setFillStyle(0xcc3333);
          enemy.sprite.setStrokeStyle(3, 0x661111);
        }
      }
    }
  }

  /** Cuando la mirada se desactiva, los que se estaban petrificando vuelven a walking */
  cancelGaze(): void {
    for (const enemy of this.enemies) {
      if (enemy.state === "petrifying") {
        enemy.state = "walking";
        enemy.petrifyProgress = 0;
        enemy.sprite.setFillStyle(0xcc3333);
        enemy.sprite.setStrokeStyle(3, 0x661111);
      }
    }
  }

  /** Intenta romper estatuas en la línea del swipe. Devuelve puntos obtenidos. */
  tryBreakStatues(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): { points: number; broken: number } {
    const breakRadius = GameSettings.swipe.breakRadius;
    let points = 0;
    let broken = 0;
    const toRemove: Enemy[] = [];

    for (const enemy of this.enemies) {
      if (enemy.state !== "petrified") continue;

      // Distancia del enemigo a la línea del swipe
      const dist = this.pointToSegmentDist(
        enemy.sprite.x,
        enemy.sprite.y,
        x1,
        y1,
        x2,
        y2,
      );

      if (dist < breakRadius) {
        points += enemy.points;
        broken++;
        toRemove.push(enemy);

        // Efecto de rotura
        this.breakEffect(enemy.sprite.x, enemy.sprite.y);
      }
    }

    // Eliminar los rotos
    for (const enemy of toRemove) {
      enemy.sprite.destroy();
      const idx = this.enemies.indexOf(enemy);
      if (idx >= 0) this.enemies.splice(idx, 1);
    }

    return { points, broken };
  }

  /** Comprueba si algún enemigo walking/petrifying ha tocado a Medusa */
  checkCollisionWithMedusa(medusaX: number, medusaY: number): boolean {
    const hitRadius = GameSettings.enemies.hitRadius;
    for (const enemy of this.enemies) {
      if (enemy.state === "petrified") continue;
      const dx = enemy.sprite.x - medusaX;
      const dy = enemy.sprite.y - medusaY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hitRadius + GameSettings.enemies.size / 2) {
        return true;
      }
    }
    return false;
  }

  /** Efecto visual al romper estatua (partículas pixel art) */
  private breakEffect(x: number, y: number): void {
    const numParticles = 6;
    for (let i = 0; i < numParticles; i++) {
      const angle = (Math.PI * 2 * i) / numParticles;
      const speed = Phaser.Math.Between(80, 180);
      const size = Phaser.Math.Between(3, 8);

      const particle = this.scene.add.rectangle(x, y, size, size, 0x888888);
      particle.setDepth(12);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: 400,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }
  }

  /** Incrementar oleada */
  nextWave(): void {
    this.wave++;
    this.currentSpawnInterval = Math.max(
      GameSettings.enemies.minSpawnInterval,
      this.currentSpawnInterval * GameSettings.enemies.spawnAcceleration,
    );
    this.currentSpeed *= GameSettings.enemies.speedIncreasePerWave;
  }

  /** Distancia de un punto a un segmento */
  private pointToSegmentDist(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);

    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = ax + t * dx;
    const closestY = ay + t * dy;
    return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
  }

  getWave(): number {
    return this.wave;
  }

  reset(): void {
    for (const enemy of this.enemies) {
      enemy.sprite.destroy();
    }
    this.enemies = [];
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
      this.spawnTimer = null;
    }
    this.wave = 0;
    this.currentSpawnInterval = GameSettings.enemies.spawnInterval;
    this.currentSpeed = GameSettings.enemies.baseSpeed;
  }

  destroy(): void {
    this.reset();
  }
}
