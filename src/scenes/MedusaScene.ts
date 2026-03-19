import GameSettings from "../config/GameSettings";
import { Direction, Medusa } from "../objects/Medusa";
import { AudioSystem } from "../systems/AudioSystem";
import { EnemySystem } from "../systems/EnemySystem";
import { EnergySystem } from "../systems/EnergySystem";

export class MedusaScene extends Phaser.Scene {
  // Core objects
  private medusa!: Medusa;
  private enemySystem!: EnemySystem;
  private energySystem!: EnergySystem;
  private audioSystem!: AudioSystem;

  // Game state
  private score: number = 0;
  private highScore: number = 0;
  private isGameOver: boolean = false;
  private isPlaying: boolean = false;
  private waveTimer: number = 0;
  private waveInterval: number = 15000; // nueva oleada cada 15s

  // UI
  private scoreText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;

  // Input
  private swipeStartX: number = 0;
  private swipeStartY: number = 0;
  private isSwiping: boolean = false;
  private currentGazeDir: Direction | null = null;

  // Keyboard
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private keyGazeActive: boolean = false;

  // SDK
  private sdkReady: boolean = false;

  constructor() {
    super({ key: "MedusaScene" });
  }

  // ═══════════════════════════════════════════════════
  //  PRELOAD
  // ═══════════════════════════════════════════════════
  preload(): void {
    const assets = GameSettings.assets;
    const idle = GameSettings.sprites.idle;
    const attack = GameSettings.sprites.attack;
    const death = GameSettings.sprites.death;

    // Background
    this.load.image("background", assets.background);

    // Spritesheets
    this.load.spritesheet("medusa-idle", assets.medusaIdle, {
      frameWidth: idle.frameWidth,
      frameHeight: idle.frameHeight,
    });

    this.load.spritesheet("medusa-attack", assets.medusaAttack, {
      frameWidth: attack.frameWidth,
      frameHeight: attack.frameHeight,
    });

    this.load.spritesheet("medusa-death", assets.medusaDeath, {
      frameWidth: death.frameWidth,
      frameHeight: death.frameHeight,
    });
  }

  // ═══════════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════════
  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    const bg = this.add.image(w / 2, h / 2, "background");
    bg.setDisplaySize(w, h);
    bg.setDepth(0);

    // Audio
    this.audioSystem = new AudioSystem();

    // Medusa en el centro
    this.medusa = new Medusa(this, w / 2, h / 2);

    // Sistemas
    this.enemySystem = new EnemySystem(this);
    this.energySystem = new EnergySystem(this);

    // UI
    this.createUI();

    // Input
    this.setupInput();

    // SDK
    this.initSDK();

    // Comenzar juego
    this.startGame();
  }

  private createUI(): void {
    const safeY = GameSettings.safeArea.top;
    const w = this.cameras.main.width;

    // Score (centrado, debajo de la barra de energía)
    this.scoreText = this.add
      .text(w / 2, safeY + 52, "0", {
        fontFamily: "monospace",
        fontSize: "36px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(100);

    // High score (arriba derecha)
    this.highScoreText = this.add
      .text(w - 20, safeY + 52, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#aaaaaa",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(1, 0.5)
      .setDepth(100);

    // Wave indicator
    this.waveText = this.add
      .text(20, safeY + 52, "WAVE 1", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#88ff88",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0, 0.5)
      .setDepth(100);
  }

  // ═══════════════════════════════════════════════════
  //  INPUT — Tap/Arrows/WASD para mirar, Swipe/Space para romper
  // ═══════════════════════════════════════════════════
  private setupInput(): void {
    // ── Keyboard (PC) ──
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.spaceKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SPACE,
      );
    }

    // ── Touch/Mouse (Mobile + PC) ──
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      this.audioSystem.init(); // Inicializar audio en primer tap

      this.swipeStartX = pointer.x;
      this.swipeStartY = pointer.y;
      this.isSwiping = true;

      // Determinar dirección del tap respecto a Medusa
      const dir = this.getDirectionFromPointer(pointer.x, pointer.y);
      if (dir && this.energySystem.hasEnergy()) {
        this.currentGazeDir = dir;
        this.medusa.playAttack(dir);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver || !pointer.isDown) return;

      // Si está mirando, actualizar dirección si cambia cuadrante
      if (this.currentGazeDir && this.energySystem.hasEnergy()) {
        const dir = this.getDirectionFromPointer(pointer.x, pointer.y);
        if (dir && dir !== this.currentGazeDir) {
          this.currentGazeDir = dir;
          this.medusa.playAttack(dir);
        }
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;

      // Comprobar si fue un swipe
      if (this.isSwiping) {
        const dx = pointer.x - this.swipeStartX;
        const dy = pointer.y - this.swipeStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= GameSettings.swipe.minDistance) {
          // Es un swipe → romper estatuas
          const result = this.enemySystem.tryBreakStatues(
            this.swipeStartX,
            this.swipeStartY,
            pointer.x,
            pointer.y,
          );

          if (result.broken > 0) {
            this.score += result.points;
            this.energySystem.addEnergy(
              result.broken * GameSettings.energy.gainPerBreak,
            );
            this.audioSystem.playBreak();
            this.audioSystem.playEnergyGain();
            this.updateScoreUI();
            this.haptic();
          }
        }
      }

      // Dejar de mirar
      this.currentGazeDir = null;
      this.medusa.playIdle();
      this.enemySystem.cancelGaze();
      this.isSwiping = false;
    });
  }

  /** Determina la dirección cardinal más fuerte desde el centro de Medusa */
  private getDirectionFromPointer(px: number, py: number): Direction | null {
    const mx = this.medusa.sprite.x;
    const my = this.medusa.sprite.y;
    const dx = px - mx;
    const dy = py - my;

    // Zona muerta mínima (no activar si tap muy cerca de Medusa)
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return null;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? "right" : "left";
    } else {
      return dy > 0 ? "down" : "up";
    }
  }

  /** Keyboard: detecta dirección con Arrows/WASD, Space rompe estatuas */
  private handleKeyboard(): void {
    if (!this.input.keyboard) return;

    // Detectar dirección pulsada (prioridad: última tecla)
    let dir: Direction | null = null;
    if (this.cursors?.up?.isDown || this.wasd?.W?.isDown) dir = "up";
    if (this.cursors?.down?.isDown || this.wasd?.S?.isDown) dir = "down";
    if (this.cursors?.left?.isDown || this.wasd?.A?.isDown) dir = "left";
    if (this.cursors?.right?.isDown || this.wasd?.D?.isDown) dir = "right";

    if (dir && this.energySystem.hasEnergy()) {
      if (!this.keyGazeActive || dir !== this.currentGazeDir) {
        this.currentGazeDir = dir;
        this.medusa.playAttack(dir);
        this.audioSystem.init();
      }
      this.keyGazeActive = true;
    } else if (this.keyGazeActive && !dir) {
      // Soltar tecla → dejar de mirar
      this.keyGazeActive = false;
      this.currentGazeDir = null;
      this.medusa.playIdle();
      this.enemySystem.cancelGaze();
    }

    // Space → romper estatuas cercanas a Medusa
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      const mx = this.medusa.sprite.x;
      const my = this.medusa.sprite.y;
      const breakRange = GameSettings.swipe.breakRadius * 2;
      // Simular un swipe circular alrededor de Medusa
      const result = this.enemySystem.tryBreakStatues(
        mx - breakRange,
        my,
        mx + breakRange,
        my,
      );
      if (result.broken > 0) {
        this.score += result.points;
        this.energySystem.addEnergy(
          result.broken * GameSettings.energy.gainPerBreak,
        );
        this.audioSystem.playBreak();
        this.audioSystem.playEnergyGain();
        this.updateScoreUI();
        this.haptic();
      }
    }
  }

  // ═══════════════════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════════════════
  private startGame(): void {
    this.isPlaying = true;
    this.isGameOver = false;
    this.score = 0;
    this.waveTimer = 0;
    this.updateScoreUI();
    this.enemySystem.start();
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver || !this.isPlaying) return;

    // ── Keyboard input ──
    this.handleKeyboard();

    // ── Energía ──
    if (this.medusa.isGazing && this.energySystem.hasEnergy()) {
      this.energySystem.drain(delta);

      // Si se acabó la energía mientras miraba
      if (this.energySystem.isEmpty()) {
        this.currentGazeDir = null;
        this.medusa.playIdle();
        this.enemySystem.cancelGaze();
      }
    } else if (!this.medusa.isGazing) {
      this.energySystem.regen(delta);
    }

    // ── Mirada activa → petrificar enemigos en cono ──
    if (this.medusa.isGazing) {
      this.enemySystem.applyGaze((x, y) => this.medusa.isInGaze(x, y));
      this.medusa.drawGazeCone(); // Actualizar visual del cono
    }

    // ── Actualizar enemigos ──
    this.enemySystem.update(delta);

    // ── Colisiones → Game Over ──
    if (
      this.enemySystem.checkCollisionWithMedusa(
        this.medusa.sprite.x,
        this.medusa.sprite.y,
      )
    ) {
      this.triggerGameOver();
      return;
    }

    // ── Oleadas ──
    this.waveTimer += delta;
    if (this.waveTimer >= this.waveInterval) {
      this.waveTimer = 0;
      this.enemySystem.nextWave();
      this.waveText.setText(`WAVE ${this.enemySystem.getWave() + 1}`);

      // Flash del texto de wave
      this.tweens.add({
        targets: this.waveText,
        scale: 1.4,
        duration: 200,
        yoyo: true,
        ease: "Back",
      });
    }
  }

  // ═══════════════════════════════════════════════════
  //  GAME OVER
  // ═══════════════════════════════════════════════════
  private triggerGameOver(): void {
    this.isGameOver = true;
    this.isPlaying = false;

    // Animación muerte
    this.medusa.playDeath();
    this.audioSystem.playDeath();
    this.haptic();

    // Actualizar high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }

    // Parar spawns
    this.enemySystem.reset();

    // Flash rojo de pantalla
    this.cameras.main.flash(500, 255, 50, 50);

    // Enviar al SDK
    this.time.delayedCall(1000, () => {
      this.sdkGameOver();
    });
  }

  private restartGame(): void {
    // Limpiar todo
    this.enemySystem.reset();
    this.energySystem.reset();

    // Reset Medusa
    this.medusa.isDead = false;
    this.medusa.playIdle("down");

    // Reset state
    this.score = 0;
    this.waveTimer = 0;
    this.isGameOver = false;
    this.currentGazeDir = null;
    this.isSwiping = false;
    this.updateScoreUI();
    this.waveText.setText("WAVE 1");

    // Comenzar
    this.startGame();
  }

  // ═══════════════════════════════════════════════════
  //  UI
  // ═══════════════════════════════════════════════════
  private updateScoreUI(): void {
    this.scoreText.setText(`${this.score}`);
    if (this.highScore > 0) {
      this.highScoreText.setText(`BEST: ${this.highScore}`);
    }
  }

  // ═══════════════════════════════════════════════════
  //  SDK INTEGRATION
  // ═══════════════════════════════════════════════════
  private async initSDK(): Promise<void> {
    const sdk = (window as any).RemixSDK || (window as any).FarcadeSDK;
    if (!sdk) return;

    try {
      // Modo single player
      if (sdk.singlePlayer?.actions?.ready) {
        const gameInfo = await sdk.singlePlayer.actions.ready();

        // Cargar estado guardado
        if (gameInfo?.initialGameState?.gameState) {
          const state = gameInfo.initialGameState.gameState;
          if (typeof state.highScore === "number") {
            this.highScore = state.highScore;
            this.updateScoreUI();
          }
        }
      } else if (sdk.ready) {
        await sdk.ready();
        // Cargar gameState
        const gs = sdk.gameState;
        if (gs && typeof gs.highScore === "number") {
          this.highScore = gs.highScore;
          this.updateScoreUI();
        }
      }

      // Play Again
      if (sdk.onPlayAgain) {
        sdk.onPlayAgain(() => {
          this.restartGame();
        });
      }

      // Toggle Mute
      if (sdk.onToggleMute) {
        sdk.onToggleMute((data: { isMuted: boolean }) => {
          this.audioSystem.setMuted(data.isMuted);
        });
      }

      this.sdkReady = true;
    } catch (e) {
      console.warn("[MedusaScene] SDK init error:", e);
    }
  }

  private sdkGameOver(): void {
    const sdk = (window as any).RemixSDK || (window as any).FarcadeSDK;
    if (!sdk) return;

    // Guardar high score
    if (sdk.singlePlayer?.actions?.saveGameState) {
      sdk.singlePlayer.actions.saveGameState({
        gameState: { highScore: this.highScore },
      });
    }

    // Game Over
    if (sdk.singlePlayer?.actions?.gameOver) {
      sdk.singlePlayer.actions.gameOver({ score: this.score });
    }
  }

  private haptic(): void {
    const sdk = (window as any).RemixSDK || (window as any).FarcadeSDK;
    if (sdk?.hapticFeedback) {
      sdk.hapticFeedback();
    }
  }

  // ═══════════════════════════════════════════════════
  //  CLEANUP
  // ═══════════════════════════════════════════════════
  shutdown(): void {
    this.enemySystem?.destroy();
    this.energySystem?.destroy();
    this.medusa?.destroy();
    this.audioSystem?.destroy();
  }
}
