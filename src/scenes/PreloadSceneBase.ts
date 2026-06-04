// Phaser se carga via CDN, no importar directamente

export abstract class PreloadSceneBase extends Phaser.Scene {
  protected nextSceneKey: string;

  constructor(key: string, nextSceneKey: string = "StartScene") {
    super({ key });
    this.nextSceneKey = nextSceneKey;
  }

  init(): void {
    this.cameras.main.setBackgroundColor("#000000");
  }

  preload(): void {
    // Encolar assets específicos del proyecto
    this.loadProjectAssets();
  }

  create(): void {
    // Assets cargados — transición inmediata
    this.onAssetsLoaded();
    this.scene.start(this.nextSceneKey);
  }

  /**
   * Método abstracto donde el hijo debe encolar sus assets (this.load.image, etc.)
   */
  protected abstract loadProjectAssets(): void;

  /**
   * Hook opcional que se ejecuta cuando la carga de assets finaliza.
   * Útil para procesar texturas (filtros, etc).
   */
  protected onAssetsLoaded(): void {}
}
