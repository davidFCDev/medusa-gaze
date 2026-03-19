import GameSettings from "../config/GameSettings";
import { PreloadSceneBase } from "./PreloadSceneBase";

/**
 * PreloadScene — Carga todos los assets del juego mientras muestra
 * la animación de boot. Al terminar ambos, arranca MedusaScene.
 */
export class PreloadScene extends PreloadSceneBase {
  constructor() {
    super("PreloadScene", "MedusaScene");
  }

  protected loadProjectAssets(): void {
    const assets = GameSettings.assets;
    const idle = GameSettings.sprites.idle;
    const attack = GameSettings.sprites.attack;
    const death = GameSettings.sprites.death;
    const hit = GameSettings.sprites.hit;
    const spartan = GameSettings.sprites.spartan;

    // Background
    this.load.image("background", assets.background);

    // Medusa spritesheets
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

    this.load.spritesheet("medusa-hit", assets.medusaHit, {
      frameWidth: hit.frameWidth,
      frameHeight: hit.frameHeight,
    });

    // Spartan enemy spritesheet
    this.load.spritesheet("spartan", assets.spartan, {
      frameWidth: spartan.frameWidth,
      frameHeight: spartan.frameHeight,
    });

    // Background music
    this.load.audio(
      "bgm",
      "https://remix.gg/blob/89c28be5-ba6a-4a5b-8024-bc07694d0f3b/music1-hIoU1Slo12-Q5yywCkfNMVTkj5fj6ZzRZVT6hGZUG.mp3?0MlK",
    );
  }
}
