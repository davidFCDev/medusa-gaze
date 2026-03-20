import GameSettings from "../config/GameSettings";
import { Direction, Medusa } from "../objects/Medusa";
import { AudioSystem } from "../systems/AudioSystem";
import { EnemySystem } from "../systems/EnemySystem";
import { EnergySystem } from "../systems/EnergySystem";
import { HudSystem } from "../systems/HudSystem";
import { MegaSkillSystem } from "../systems/MegaSkillSystem";
import { TutorialOverlay } from "../systems/TutorialOverlay";
import { VirtualJoystick } from "../systems/VirtualJoystick";
import { WrathButton } from "../systems/WrathButton";

export class MedusaScene extends Phaser.Scene {
  // Core objects
  private medusa!: Medusa;
  private enemySystem!: EnemySystem;
  private energySystem!: EnergySystem;
  private hudSystem!: HudSystem;
  private audioSystem!: AudioSystem;
  private joystick!: VirtualJoystick;
  private wrathButton!: WrathButton;
  private megaSkill!: MegaSkillSystem;

  // Game state
  private score: number = 0;
  private highScore: number = 0;
  private health: number = 0;
  private isGameOver: boolean = false;
  private isPlaying: boolean = false;
  private waveTimer: number = 0;
  private waveInterval: number = 15000;

  // Gaze
  private currentGazeDir: Direction | null = null;
  private currentGazeAngle: number | null = null; // free-aim angle (rad)

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

  // Mobile joystick gaze tracking
  private joystickGazeDir: Direction | null = null;
  private joystickGazeAngle: number | null = null;

  // Device
  private isMobile: boolean = false;

  // SDK
  private sdkReady: boolean = false;

  // Tutorial
  private tutorialSeen: boolean = false;
  private tutorialOverlay: TutorialOverlay | null = null;

  // Revive
  private reviveUsedThisRun: boolean = false;

  // Music
  private bgm!: Phaser.Sound.BaseSound;

  constructor() {
    super({ key: "MedusaScene" });
  }

  // ═══════════════════════════════════════════════════
  //  CREATE (assets ya cargados por PreloadScene)
  // ═══════════════════════════════════════════════════
  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.isMobile = !this.sys.game.device.os.desktop;

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
    this.energySystem = new EnergySystem();
    this.hudSystem = new HudSystem(this);

    // Joystick (solo mobile)
    this.joystick = new VirtualJoystick(this);

    // Wrath button (bottom-right)
    this.wrathButton = new WrathButton(this, () => this.activateWrath());

    // Mega skill (Gorgon's Fury)
    this.megaSkill = new MegaSkillSystem(this, () => this.executeMegaSkill());

    // Input
    this.setupInput();

    // Background music
    if (this.cache.audio.exists("bgm")) {
      this.bgm = this.sound.add("bgm", { loop: true, volume: 0.3 });
      this.bgm.play();
    }

    // SDK + tutorial check
    this.initSDK();
  }

  // ═══════════════════════════════════════════════════
  //  INPUT — Joystick (mobile) + Keyboard (desktop)
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

    // ── Pointer events (joystick only) ──
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      this.audioSystem.init();

      if (this.isMobile) {
        // Skip if pointer is on the wrath button area
        if (this.wrathButton.isInButtonArea(pointer.x, pointer.y)) return;
        this.joystick.tryClaimPointer(pointer);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      if (this.isMobile && this.joystick.isOwnPointer(pointer.id)) {
        this.joystick.updatePointer(pointer);
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;

      if (this.isMobile && this.joystick.releasePointer(pointer)) {
        if (this.joystickGazeDir !== null) {
          this.joystickGazeDir = null;
          this.joystickGazeAngle = null;
          this.currentGazeDir = null;
          this.currentGazeAngle = null;
          this.medusa.playIdle();
          this.enemySystem.cancelGaze();
        }
      }
    });
  }

  /** Activate Medusa's Wrath — shatter all petrified enemies */
  private activateWrath(): void {
    const result = this.enemySystem.shatterAllPetrified();
    if (result.broken > 0) {
      this.score += result.points;
      this.energySystem.addEnergy(
        result.broken * GameSettings.wrath.energyPerKill,
      );
      this.audioSystem.playBreak();
      this.audioSystem.playKill();
      this.audioSystem.playEnergyGain();
      this.hudSystem.updateScore(this.score, this.highScore);
      this.hudSystem.flashEnergy();
      this.hudSystem.updateEnergy(this.energySystem.getPercent());
      this.haptic();

      // Charge mega skill with combo
      this.megaSkill.addCharge(result.broken);

      // If mega skill is ready, pause and show overlay
      if (
        this.megaSkill.getIsReady() &&
        !this.megaSkill.getIsShowingOverlay()
      ) {
        this.isPlaying = false;
        this.megaSkill.showOverlay();
      }
    }
  }

  /** Execute Gorgon's Fury — destroy ALL enemies */
  private executeMegaSkill(): void {
    const result = this.enemySystem.destroyAllEnemies();
    this.score += result.destroyed * GameSettings.megaSkill.bonusPoints;
    this.hudSystem.updateScore(this.score, this.highScore);
    this.audioSystem.playBreak();
    this.audioSystem.playKill();
    this.haptic();

    // Resume game
    this.isPlaying = true;
  }

  /** Keyboard: detecta dirección con Arrows/WASD (soporta diagonales), Space activates Wrath */
  private handleKeyboard(): void {
    if (!this.input.keyboard) return;

    // Space → activate Wrath
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.wrathButton.tryActivate();
    }

    // Acumular ejes X/Y para diagonales
    let dx = 0;
    let dy = 0;
    if (this.cursors?.up?.isDown || this.wasd?.W?.isDown) dy -= 1;
    if (this.cursors?.down?.isDown || this.wasd?.S?.isDown) dy += 1;
    if (this.cursors?.left?.isDown || this.wasd?.A?.isDown) dx -= 1;
    if (this.cursors?.right?.isDown || this.wasd?.D?.isDown) dx += 1;

    const hasInput = dx !== 0 || dy !== 0;

    if (hasInput && this.energySystem.hasEnergy()) {
      const angleRad = Math.atan2(dy, dx);
      const dir = Medusa.angleToDir(angleRad);

      if (!this.keyGazeActive || dir !== this.currentGazeDir) {
        this.currentGazeDir = dir;
        this.medusa.playAttack(dir, angleRad);
        this.audioSystem.init();
      } else {
        // Mismo sprite, actualizar solo ángulo del cono
        this.medusa.setGazeAngle(angleRad);
      }
      this.currentGazeAngle = angleRad;
      this.keyGazeActive = true;
    } else if (this.keyGazeActive && !hasInput) {
      this.keyGazeActive = false;
      this.stopGaze();
    }
  }

  /** Joystick: lee ángulo libre y aplica gaze (mobile) */
  private handleJoystick(): void {
    if (!this.joystick.isActive()) return;

    const angle = this.joystick.getAngle();
    const dir = this.joystick.getDirection();

    if (dir && angle !== null && this.energySystem.hasEnergy()) {
      const spriteDir = Medusa.angleToDir(angle);

      if (spriteDir !== this.joystickGazeDir) {
        // Cambio de sprite cardinal
        this.joystickGazeDir = spriteDir;
        this.currentGazeDir = spriteDir;
        this.medusa.playAttack(spriteDir, angle);
      } else {
        // Mismo sprite, solo actualizar ángulo del cono
        this.medusa.setGazeAngle(angle);
      }
      this.joystickGazeAngle = angle;
      this.currentGazeAngle = angle;
    } else if (this.joystickGazeDir !== null && !dir) {
      this.joystickGazeDir = null;
      this.joystickGazeAngle = null;
      this.stopGaze();
    }
  }

  /** Para la mirada y cancela petrificación */
  private stopGaze(): void {
    this.currentGazeDir = null;
    this.currentGazeAngle = null;
    this.medusa.playIdle();
    this.enemySystem.cancelGaze();
  }

  // ═══════════════════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════════════════
  private startGame(): void {
    this.isPlaying = true;
    this.isGameOver = false;
    this.score = 0;
    this.health = GameSettings.health.max;
    this.waveTimer = 0;
    this.hudSystem.updateScore(this.score, this.highScore);
    this.hudSystem.updateHealth(1);
    this.hudSystem.updateEnergy(1);
    this.enemySystem.start();
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver || !this.isPlaying) return;

    // ── Input ──
    this.handleKeyboard();
    if (this.isMobile) {
      this.handleJoystick();
    }

    // ── Wrath button cooldown ──
    this.wrathButton.update(delta);

    // ── Mega charge glow ──
    this.hudSystem.updateMegaCharge(this.megaSkill.getPercent(), delta);

    // ── Energía ──
    if (this.medusa.isGazing && this.energySystem.hasEnergy()) {
      this.energySystem.drain(delta);
      if (this.energySystem.isEmpty()) {
        this.stopGaze();
        this.keyGazeActive = false;
        this.joystickGazeDir = null;
        this.joystickGazeAngle = null;
      }
    } else if (!this.medusa.isGazing) {
      this.energySystem.regen(delta);
    }
    this.hudSystem.updateEnergy(this.energySystem.getPercent());

    // ── Mirada activa → petrificar enemigos en cono ──
    if (this.medusa.isGazing) {
      this.enemySystem.applyGaze((x, y) => this.medusa.isInGaze(x, y));
      this.medusa.drawGazeCone();
    }

    // ── Actualizar enemigos ──
    this.enemySystem.update(delta);

    // ── Actualizar hit de Medusa ──
    this.medusa.updateHit(delta);

    // ── Daño de enemigos atacando → drenar vida ──
    const attackers = this.enemySystem.countAttackersInRange(
      this.medusa.sprite.x,
      this.medusa.sprite.y,
    );
    if (attackers > 0) {
      const dt = delta / 1000;
      this.health -= GameSettings.health.damagePerSecond * attackers * dt;
      this.hudSystem.updateHealth(this.health / GameSettings.health.max);
      this.hudSystem.flashHealth();
      this.medusa.playHit();
      if (this.health <= 0) {
        this.health = 0;
        this.triggerGameOver();
        return;
      }
    }

    // ── Oleadas ──
    this.waveTimer += delta;
    if (this.waveTimer >= this.waveInterval) {
      this.waveTimer = 0;
      this.enemySystem.nextWave();
    }
  }

  // ═══════════════════════════════════════════════════
  //  GAME OVER
  // ═══════════════════════════════════════════════════
  private triggerGameOver(): void {
    // Check if revive is available (one per run)
    if (!this.reviveUsedThisRun && this.hasReviveAvailable()) {
      this.useRevive();
      return;
    }

    this.isGameOver = true;
    this.isPlaying = false;

    this.medusa.playDeath();
    this.audioSystem.playDeath();
    this.haptic();

    if (this.score > this.highScore) {
      this.highScore = this.score;
    }

    this.enemySystem.reset();
    this.cameras.main.flash(500, 255, 50, 50);

    this.time.delayedCall(1000, () => {
      this.sdkGameOver();
    });
  }

  // ═══════════════════════════════════════════════════
  //  REVIVE SYSTEM
  // ═══════════════════════════════════════════════════
  /** Check if player owns the permanent revive item */
  private hasReviveAvailable(): boolean {
    const sdk = (window as any).RemixSDK || (window as any).FarcadeSDK;
    if (!sdk) return false;
    return sdk.hasItem ? sdk.hasItem("revive") : false;
  }

  /** Update HUD revive indicator */
  private updateReviveIndicator(): void {
    const available = !this.reviveUsedThisRun && this.hasReviveAvailable();
    this.hudSystem.setReviveAvailable(available);
  }

  /** Use revive: consume one, play animation, kill all enemies, restore HP */
  private useRevive(): void {
    this.reviveUsedThisRun = true;
    this.isPlaying = false;
    this.hudSystem.setReviveAvailable(false);

    // Freeze everything
    this.haptic();

    // Dark flash
    this.cameras.main.flash(300, 0, 255, 100);

    // Medusa "hurt" tint
    this.medusa.sprite.setTint(0xff4444);

    // Phase 1: Pause briefly (300ms), then start revival
    this.time.delayedCall(300, () => {
      // Clear hit tint
      this.medusa.sprite.clearTint();

      // Green glow expanding from Medusa
      const cx = this.medusa.sprite.x;
      const cy = this.medusa.sprite.y;

      // Create shockwave rings
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(i * 200, () => {
          const ring = this.add.circle(cx, cy, 20, 0x000000, 0);
          ring.setStrokeStyle(4, 0x00ff88, 0.9);
          ring.setDepth(50);

          this.tweens.add({
            targets: ring,
            radius: 400 + i * 80,
            alpha: 0,
            duration: 800,
            ease: "Sine.easeOut",
            onUpdate: () => {
              ring.setStrokeStyle(4, 0x00ff88, ring.alpha);
            },
            onComplete: () => ring.destroy(),
          });
        });
      }

      // Green flash on Medusa — "revive glow"
      const glow = this.add.circle(cx, cy, 30, 0x00ff88, 0.6);
      glow.setDepth(49);
      this.tweens.add({
        targets: glow,
        radius: 120,
        alpha: 0,
        duration: 600,
        ease: "Cubic.easeOut",
        onComplete: () => glow.destroy(),
      });

      // Revive text
      const reviveText = this.add
        .text(cx, cy - 80, "🧪 REVIVE!", {
          fontFamily: "monospace",
          fontSize: "40px",
          color: "#00ff88",
          stroke: "#003322",
          strokeThickness: 6,
        })
        .setOrigin(0.5)
        .setDepth(60);

      this.tweens.add({
        targets: reviveText,
        y: cy - 140,
        alpha: 0,
        duration: 1200,
        ease: "Cubic.easeOut",
        onComplete: () => reviveText.destroy(),
      });

      // Phase 2: After shockwave (600ms), destroy all enemies
      this.time.delayedCall(600, () => {
        const result = this.enemySystem.destroyAllEnemies();
        this.score += result.points;
        this.hudSystem.updateScore(this.score, this.highScore);
        if (result.destroyed > 0) {
          this.audioSystem.playBreak();
          this.audioSystem.playKill();
        }

        // Restore health to 50%
        this.health = GameSettings.health.max * 0.5;
        this.hudSystem.updateHealth(this.health / GameSettings.health.max);

        // Restore energy to 50%
        this.energySystem.setPercent(0.5);
        this.hudSystem.updateEnergy(this.energySystem.getPercent());

        // Green camera flash
        this.cameras.main.flash(400, 0, 200, 100);

        // Medusa plays idle
        this.medusa.isDead = false;
        this.medusa.isHit = false;
        this.medusa.sprite.clearTint();
        this.medusa.playIdle("down");

        // Phase 3: Resume game after a short pause
        this.time.delayedCall(500, () => {
          this.isPlaying = true;
          this.enemySystem.start();
        });
      });
    });
  }

  private restartGame(): void {
    this.enemySystem.reset();
    this.energySystem.reset();

    this.medusa.isDead = false;
    this.medusa.isHit = false;
    this.medusa.sprite.clearTint();
    this.medusa.playIdle("down");

    this.score = 0;
    this.health = GameSettings.health.max;
    this.waveTimer = 0;
    this.isGameOver = false;
    this.currentGazeDir = null;
    this.currentGazeAngle = null;
    this.keyGazeActive = false;
    this.joystickGazeDir = null;
    this.joystickGazeAngle = null;

    // Reset wrath button
    this.wrathButton.reset();

    // Reset mega skill
    this.megaSkill.reset();
    this.hudSystem.updateMegaCharge(0, 0);

    this.hudSystem.updateScore(this.score, this.highScore);
    this.hudSystem.updateHealth(1);
    this.hudSystem.updateEnergy(1);

    // Reset revive for new run
    this.reviveUsedThisRun = false;
    this.updateReviveIndicator();

    // Restart BGM if not playing
    if (this.bgm && !this.bgm.isPlaying) {
      this.bgm.play();
    }

    this.startGame();
  }

  // ═══════════════════════════════════════════════════
  //  SDK INTEGRATION
  // ═══════════════════════════════════════════════════
  private async initSDK(): Promise<void> {
    const sdk = (window as any).RemixSDK || (window as any).FarcadeSDK;
    if (!sdk) {
      this.showTutorialOrStart();
      return;
    }

    // Safety timeout — if SDK.ready() hangs, start the game anyway
    let started = false;
    const safetyTimer = this.time.delayedCall(3000, () => {
      if (!started) {
        started = true;
        this.showTutorialOrStart();
      }
    });

    try {
      if (sdk.singlePlayer?.actions?.ready) {
        const gameInfo = await sdk.singlePlayer.actions.ready();
        if (gameInfo?.initialGameState?.gameState) {
          const state = gameInfo.initialGameState.gameState;
          if (typeof state.highScore === "number") {
            this.highScore = state.highScore;
            this.hudSystem.updateScore(this.score, this.highScore);
          }
          if (state.tutorialSeen === true) {
            this.tutorialSeen = true;
          }
        }
      } else if (sdk.ready) {
        await sdk.ready();
        const gs = sdk.gameState;
        if (gs) {
          if (typeof gs.highScore === "number") {
            this.highScore = gs.highScore;
            this.hudSystem.updateScore(this.score, this.highScore);
          }
          if (gs.tutorialSeen === true) {
            this.tutorialSeen = true;
          }
        }
      }

      if (sdk.onPlayAgain) {
        sdk.onPlayAgain(() => this.restartGame());
      }

      if (sdk.onToggleMute) {
        sdk.onToggleMute((data: { isMuted: boolean }) => {
          this.audioSystem.setMuted(data.isMuted);
          this.sound.mute = data.isMuted;
        });
      }

      // Listen for revive purchases
      if (sdk.onPurchaseComplete) {
        sdk.onPurchaseComplete(() => {
          this.updateReviveIndicator();
        });
      }

      // Update revive indicator with initial state
      this.updateReviveIndicator();

      this.sdkReady = true;
    } catch (e) {
      console.warn("[MedusaScene] SDK init error:", e);
    }

    // Cancel safety timer and start normally
    safetyTimer.destroy();
    if (!started) {
      started = true;
      this.showTutorialOrStart();
    }
  }

  /** Show tutorial overlay on first visit, otherwise start directly */
  private showTutorialOrStart(): void {
    if (this.tutorialSeen) {
      this.startGame();
      return;
    }

    this.tutorialOverlay = new TutorialOverlay(this, this.isMobile, () => {
      this.tutorialOverlay = null;
      this.tutorialSeen = true;
      this.saveTutorialSeen();
      this.startGame();
    });
  }

  /** Persist tutorialSeen flag alongside highScore */
  private saveTutorialSeen(): void {
    const sdk = (window as any).RemixSDK || (window as any).FarcadeSDK;
    if (!sdk?.singlePlayer?.actions?.saveGameState) return;
    sdk.singlePlayer.actions.saveGameState({
      gameState: {
        highScore: this.highScore,
        tutorialSeen: true,
      },
    });
  }

  private sdkGameOver(): void {
    const sdk = (window as any).RemixSDK || (window as any).FarcadeSDK;
    if (!sdk) return;

    if (sdk.singlePlayer?.actions?.saveGameState) {
      sdk.singlePlayer.actions.saveGameState({
        gameState: {
          highScore: this.highScore,
          tutorialSeen: true,
        },
      });
    }

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
    this.hudSystem?.destroy();
    this.joystick?.destroy();
    this.medusa?.destroy();
    this.audioSystem?.destroy();
    this.tutorialOverlay?.destroy();
    this.wrathButton?.destroy();
    this.megaSkill?.destroy();
    if (this.bgm?.isPlaying) this.bgm.stop();
  }
}
