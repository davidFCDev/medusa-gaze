import GameSettings from "../config/GameSettings";

export type EnemyState = "walking" | "attacking" | "petrifying" | "petrified";

/** Dirección visual del enemigo según su ángulo hacia Medusa */
type EnemyDir = "up" | "down" | "left" | "right";

export interface Enemy {
  sprite: Phaser.GameObjects.Sprite;
  state: EnemyState;
  speed: number;
  /** Ángulo en radianes hacia Medusa */
  angle: number;
  /** Dirección visual (para animaciones) */
  dir: EnemyDir;
  /** Progreso de petrificación (0 → 1) */
  petrifyProgress: number;
  /** Puntos que vale */
  points: number;
  /** Timer: tiempo restante petrificado antes de liberarse (ms) */
  petrifyTimer: number;
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
  private animsCreated: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gameWidth = scene.cameras.main.width;
    this.gameHeight = scene.cameras.main.height;
    this.centerX = this.gameWidth / 2;
    this.centerY = this.gameHeight / 2;
    this.currentSpawnInterval = GameSettings.enemies.spawnInterval;
    this.currentSpeed = GameSettings.enemies.baseSpeed;
  }

  /** Crea las animaciones del espartano (llamar tras preload) */
  createAnimations(): void {
    if (this.animsCreated) return;
    this.animsCreated = true;

    const cfg = GameSettings.sprites.spartan;
    const cols = cfg.columns;

    // Walk animations (4 dirs, 9 frames each)
    const walkFrames = cfg.walkFrames;
    for (const [dir, row] of Object.entries(cfg.walk)) {
      const start = (row as number) * cols;
      this.scene.anims.create({
        key: `spartan-walk-${dir}`,
        frames: this.scene.anims.generateFrameNumbers("spartan", {
          start,
          end: start + walkFrames - 1,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    // Attack animations (4 dirs, 8 frames each)
    const attackFrames = cfg.attackFrames;
    for (const [dir, row] of Object.entries(cfg.attack)) {
      const start = (row as number) * cols;
      this.scene.anims.create({
        key: `spartan-attack-${dir}`,
        frames: this.scene.anims.generateFrameNumbers("spartan", {
          start,
          end: start + attackFrames - 1,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  start(): void {
    this.createAnimations();
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

    // Ángulo y dirección visual hacia Medusa
    const angle = Math.atan2(this.centerY - y, this.centerX - x);
    const dir = this.angleToDir(angle);

    // Sprite espartano animado
    const sprite = this.scene.add.sprite(x, y, "spartan", 0);
    sprite.setScale(GameSettings.enemies.scale);
    sprite.setDepth(8);
    sprite.play(`spartan-walk-${dir}`);

    const enemy: Enemy = {
      sprite,
      state: "walking",
      speed: this.currentSpeed + Phaser.Math.FloatBetween(-15, 15),
      angle,
      dir,
      petrifyProgress: 0,
      points: GameSettings.enemies.pointsPerKill,
      petrifyTimer: 0,
    };

    this.enemies.push(enemy);
  }

  /** Convierte ángulo en radianes a dirección cardinal */
  private angleToDir(angle: number): EnemyDir {
    const deg = Phaser.Math.RadToDeg(angle);
    if (deg >= -45 && deg < 45) return "right";
    if (deg >= 45 && deg < 135) return "down";
    if (deg >= -135 && deg < -45) return "up";
    return "left";
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

        // ¿Llegó al rango de ataque?
        const dx = this.centerX - enemy.sprite.x;
        const dy = this.centerY - enemy.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= GameSettings.enemies.attackRange) {
          enemy.state = "attacking";
          enemy.sprite.play(`spartan-attack-${enemy.dir}`);
        }
      }

      // Attacking: se queda quieto haciendo la anim de ataque

      if (enemy.state === "petrifying") {
        // Progreso de petrificación
        enemy.petrifyProgress += dt / (GameSettings.medusa.petrifyTime / 1000);

        // Tint gradual de normal a gris
        const t = Math.min(enemy.petrifyProgress, 1);
        const gray = Math.round(0xff * (1 - t * 0.5));
        const tint = (gray << 16) | (gray << 8) | gray;
        enemy.sprite.setTint(tint);

        // Ralentizar movimiento
        const slowFactor = 1 - t * 0.9;
        const vx = Math.cos(enemy.angle) * enemy.speed * dt * slowFactor;
        const vy = Math.sin(enemy.angle) * enemy.speed * dt * slowFactor;
        enemy.sprite.x += vx;
        enemy.sprite.y += vy;

        if (enemy.petrifyProgress >= 1) {
          enemy.state = "petrified";
          enemy.petrifyTimer = GameSettings.wrath.petrifyDuration;
          enemy.sprite.setTint(GameSettings.visual.petrifiedTint);
          enemy.sprite.anims.pause();
        }
      }

      // Petrified: countdown to liberation
      if (enemy.state === "petrified") {
        enemy.petrifyTimer -= delta;

        // Visual: flash/crack as timer runs out (last 30%)
        const pct = enemy.petrifyTimer / GameSettings.wrath.petrifyDuration;
        if (pct < 0.3) {
          // Blink between gray and reddish to warn
          const blink = Math.sin(Date.now() * 0.015) > 0;
          enemy.sprite.setTint(
            blink ? 0xcc6666 : GameSettings.visual.petrifiedTint,
          );
        }

        if (enemy.petrifyTimer <= 0) {
          this.resumeEnemy(enemy);
        }
      }
    }
  }

  /** Marca enemigos en el cono como "petrifying" */
  applyGaze(isInGaze: (x: number, y: number) => boolean): void {
    for (const enemy of this.enemies) {
      if (enemy.state === "walking" || enemy.state === "attacking") {
        if (isInGaze(enemy.sprite.x, enemy.sprite.y)) {
          enemy.state = "petrifying";
        }
      } else if (enemy.state === "petrifying") {
        // Si sale del cono, vuelve a su estado correcto
        if (!isInGaze(enemy.sprite.x, enemy.sprite.y)) {
          this.resumeEnemy(enemy);
        }
      }
    }
  }

  /** Cuando la mirada se desactiva, los petrifying vuelven */
  cancelGaze(): void {
    for (const enemy of this.enemies) {
      if (enemy.state === "petrifying") {
        this.resumeEnemy(enemy);
      }
    }
  }

  /** Devuelve un enemigo a walking o attacking según distancia a Medusa */
  private resumeEnemy(enemy: Enemy): void {
    enemy.petrifyProgress = 0;
    enemy.sprite.clearTint();

    const dx = this.centerX - enemy.sprite.x;
    const dy = this.centerY - enemy.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= GameSettings.enemies.attackRange) {
      enemy.state = "attacking";
      enemy.sprite.play(`spartan-attack-${enemy.dir}`);
    } else {
      enemy.state = "walking";
      enemy.sprite.play(`spartan-walk-${enemy.dir}`);
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
        this.breakEffect(enemy.sprite.x, enemy.sprite.y, enemy.points);
      }
    }

    for (const enemy of toRemove) {
      enemy.sprite.destroy();
      const idx = this.enemies.indexOf(enemy);
      if (idx >= 0) this.enemies.splice(idx, 1);
    }

    // Combo effect: destruir múltiples de un swipe
    if (broken >= 2) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      this.comboEffect(midX, midY, broken);
      // Shake más intenso proporcional al combo
      this.scene.cameras.main.shake(200, 0.004 * broken);
    }

    return { points, broken };
  }

  /** Shatter ALL petrified enemies at once (Medusa's Wrath) */
  shatterAllPetrified(): { points: number; broken: number } {
    let points = 0;
    let broken = 0;
    const toRemove: Enemy[] = [];

    for (const enemy of this.enemies) {
      if (enemy.state !== "petrified") continue;
      points += enemy.points;
      broken++;
      toRemove.push(enemy);
      this.breakEffect(enemy.sprite.x, enemy.sprite.y, enemy.points);
    }

    for (const enemy of toRemove) {
      enemy.sprite.destroy();
      const idx = this.enemies.indexOf(enemy);
      if (idx >= 0) this.enemies.splice(idx, 1);
    }

    if (broken >= 2) {
      // Use center of screen for combo text
      this.comboEffect(this.centerX, this.centerY - 80, broken);
      this.scene.cameras.main.shake(250, 0.005 * broken);
    }

    return { points, broken };
  }

  /** Destroy ALL enemies (petrified AND alive) — Gorgon's Fury mega skill */
  destroyAllEnemies(): { points: number; destroyed: number } {
    let points = 0;
    let destroyed = 0;

    for (const enemy of this.enemies) {
      points += enemy.points;
      destroyed++;
      this.breakEffect(enemy.sprite.x, enemy.sprite.y, enemy.points);
    }

    // Destroy all sprites
    for (const enemy of this.enemies) {
      enemy.sprite.destroy();
    }
    this.enemies.length = 0;

    if (destroyed >= 2) {
      this.comboEffect(this.centerX, this.centerY - 80, destroyed);
      this.scene.cameras.main.shake(300, 0.008);
    }

    return { points, destroyed };
  }

  /** Comprueba colisión con Medusa (solo attacking hacen daño) */
  checkCollisionWithMedusa(medusaX: number, medusaY: number): boolean {
    const range = GameSettings.enemies.attackRange;
    for (const enemy of this.enemies) {
      if (enemy.state !== "attacking") continue;
      const dx = enemy.sprite.x - medusaX;
      const dy = enemy.sprite.y - medusaY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < range + GameSettings.enemies.size / 2) {
        return true;
      }
    }
    return false;
  }

  /** Cuenta cuántos enemigos attacking están en rango de Medusa */
  countAttackersInRange(medusaX: number, medusaY: number): number {
    const range = GameSettings.enemies.attackRange;
    let count = 0;
    for (const enemy of this.enemies) {
      if (enemy.state !== "attacking") continue;
      const dx = enemy.sprite.x - medusaX;
      const dy = enemy.sprite.y - medusaY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < range + GameSettings.enemies.size / 2) {
        count++;
      }
    }
    return count;
  }

  /** Efecto visual al romper estatua — explosión multicapa */
  breakEffect(x: number, y: number, points: number): void {
    // ── 1. Flash de impacto ──
    const flash = this.scene.add.circle(x, y, 8, 0xffffff, 1);
    flash.setDepth(15);
    this.scene.tweens.add({
      targets: flash,
      scale: 6,
      alpha: 0,
      duration: 250,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy(),
    });

    // ── 2. Anillo expansivo de polvo ──
    const ring = this.scene.add.circle(x, y, 10, 0x000000, 0);
    ring.setStrokeStyle(4, 0xaaaaaa, 0.7);
    ring.setDepth(13);
    this.scene.tweens.add({
      targets: ring,
      scale: 8,
      alpha: 0,
      duration: 400,
      ease: "Quad.easeOut",
      onComplete: () => ring.destroy(),
    });

    // ── 3. Fragmentos de piedra grandes (con gravedad) ──
    const chunkColors = [0x8a8a8a, 0x6e6e6e, 0xa0a0a0, 0x555555, 0x9e9e9e];
    const numChunks = 8;
    for (let i = 0; i < numChunks; i++) {
      const angle =
        (Math.PI * 2 * i) / numChunks + Phaser.Math.FloatBetween(-0.3, 0.3);
      const dist = Phaser.Math.Between(60, 150);
      const w = Phaser.Math.Between(6, 14);
      const h = Phaser.Math.Between(4, 10);
      const color = Phaser.Math.RND.pick(chunkColors);

      const chunk = this.scene.add.rectangle(x, y, w, h, color);
      chunk.setDepth(14);
      chunk.setAngle(Phaser.Math.Between(0, 360));

      const targetX = x + Math.cos(angle) * dist;
      const peakY = y - Phaser.Math.Between(40, 100);
      const finalY = y + Math.sin(angle) * dist + Phaser.Math.Between(20, 80);

      // Arco parabólico con rotación
      this.scene.tweens.add({
        targets: chunk,
        x: targetX,
        angle: chunk.angle + Phaser.Math.Between(-360, 360),
        duration: 500,
        ease: "Quad.easeOut",
      });
      this.scene.tweens.add({
        targets: chunk,
        y: { value: peakY, duration: 200, ease: "Quad.easeOut" },
      });
      this.scene.tweens.add({
        targets: chunk,
        y: { value: finalY, duration: 300, ease: "Bounce.easeOut", delay: 200 },
      });
      this.scene.tweens.add({
        targets: chunk,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        delay: 350,
        duration: 200,
        onComplete: () => chunk.destroy(),
      });
    }

    // ── 4. Esquirlas finas rápidas ──
    const numSplinters = 12;
    for (let i = 0; i < numSplinters; i++) {
      const angle =
        (Math.PI * 2 * i) / numSplinters + Phaser.Math.FloatBetween(-0.2, 0.2);
      const speed = Phaser.Math.Between(100, 220);
      const len = Phaser.Math.Between(2, 5);
      const shade = Phaser.Math.Between(100, 200);
      const color = (shade << 16) | (shade << 8) | shade;

      const splinter = this.scene.add.rectangle(x, y, len, 1, color);
      splinter.setDepth(14);
      splinter.setAngle(Phaser.Math.RadToDeg(angle));

      this.scene.tweens.add({
        targets: splinter,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 300,
        ease: "Power3",
        onComplete: () => splinter.destroy(),
      });
    }

    // ── 5. Chispas de energía verde (la energía de Medusa) ──
    const numSparks = 5;
    for (let i = 0; i < numSparks; i++) {
      const spark = this.scene.add.circle(
        x + Phaser.Math.Between(-15, 15),
        y + Phaser.Math.Between(-15, 15),
        Phaser.Math.Between(2, 4),
        GameSettings.visual.gazeColor,
        0.9,
      );
      spark.setDepth(15);

      this.scene.tweens.add({
        targets: spark,
        y: spark.y - Phaser.Math.Between(40, 90),
        x: spark.x + Phaser.Math.FloatBetween(-25, 25),
        alpha: 0,
        scale: 0.2,
        delay: Phaser.Math.Between(50, 200),
        duration: Phaser.Math.Between(300, 500),
        ease: "Sine.easeOut",
        onComplete: () => spark.destroy(),
      });
    }

    // ── 6. Nube de polvo que se disipa ──
    const numDust = 4;
    for (let i = 0; i < numDust; i++) {
      const dust = this.scene.add.circle(
        x + Phaser.Math.Between(-10, 10),
        y + Phaser.Math.Between(-10, 10),
        Phaser.Math.Between(8, 18),
        0x888888,
        0.25,
      );
      dust.setDepth(12);
      this.scene.tweens.add({
        targets: dust,
        scale: Phaser.Math.FloatBetween(2, 3.5),
        alpha: 0,
        y: dust.y - Phaser.Math.Between(15, 40),
        duration: Phaser.Math.Between(400, 600),
        ease: "Sine.easeOut",
        onComplete: () => dust.destroy(),
      });
    }

    // ── 7. Score popup flotante ──
    const scoreText = this.scene.add.text(x, y - 20, `+${points}`, {
      fontFamily: "monospace",
      fontSize: "28px",
      color: "#00ff88",
      stroke: "#003322",
      strokeThickness: 4,
    });
    scoreText.setOrigin(0.5);
    scoreText.setDepth(20);
    scoreText.setScale(0.5);

    this.scene.tweens.add({
      targets: scoreText,
      scale: 1.2,
      duration: 150,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: scoreText,
          y: y - 90,
          alpha: 0,
          scale: 0.8,
          duration: 600,
          ease: "Cubic.easeOut",
          onComplete: () => scoreText.destroy(),
        });
      },
    });

    // ── 8. Screen shake sutil ──
    this.scene.cameras.main.shake(120, 0.006);
  }

  /** Efecto combo al destruir múltiples estatuas de un swipe */
  private comboEffect(x: number, y: number, count: number): void {
    const label =
      count >= 4 ? "LEGENDARY!" : count >= 3 ? "TRIPLE!" : "COMBO x" + count;
    const color = count >= 4 ? "#ffdd00" : count >= 3 ? "#ff8800" : "#00ffaa";
    const stroke = count >= 4 ? "#664400" : count >= 3 ? "#662200" : "#004422";
    const size = count >= 4 ? "38px" : count >= 3 ? "34px" : "30px";

    const comboText = this.scene.add.text(x, y - 40, label, {
      fontFamily: "monospace",
      fontSize: size,
      color: color,
      stroke: stroke,
      strokeThickness: 5,
      fontStyle: "bold",
    });
    comboText.setOrigin(0.5);
    comboText.setDepth(21);
    comboText.setScale(0.3);

    this.scene.tweens.add({
      targets: comboText,
      scale: 1.4,
      duration: 200,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: comboText,
          y: y - 140,
          alpha: 0,
          scale: 1,
          duration: 800,
          ease: "Cubic.easeOut",
          onComplete: () => comboText.destroy(),
        });
      },
    });

    // Onda de choque extra para combos
    const shockwave = this.scene.add.circle(x, y, 15, 0x000000, 0);
    const shockColor = count >= 3 ? 0xffdd00 : 0x00ff88;
    shockwave.setStrokeStyle(3, shockColor, 0.8);
    shockwave.setDepth(13);
    this.scene.tweens.add({
      targets: shockwave,
      scale: 12,
      alpha: 0,
      duration: 500,
      ease: "Cubic.easeOut",
      onComplete: () => shockwave.destroy(),
    });
  }

  /** Incrementar oleada */
  nextWave(): void {
    this.wave++;
    this.currentSpawnInterval = Math.max(
      GameSettings.enemies.minSpawnInterval,
      this.currentSpawnInterval * GameSettings.enemies.spawnAcceleration,
    );
    this.currentSpeed *= GameSettings.enemies.speedIncreasePerWave;

    // Burst: aparecen varios enemigos de golpe al subir de oleada
    // Crece rápido: wave 1→3, wave 2→4, wave 4→5, wave 6→6...
    const burst = GameSettings.enemies.burstPerWave + Math.floor(this.wave / 2);
    for (let i = 0; i < burst; i++) {
      this.scene.time.delayedCall(i * 400, () => this.spawnEnemy());
    }
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
