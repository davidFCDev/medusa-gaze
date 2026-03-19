/**
 * Game Settings for Medusa's Gaze
 * Centralized configuration for all tunable game parameters
 */

export const GameSettings = {
  canvas: {
    width: 720,
    height: 1080,
  },

  safeArea: {
    top: 120,
  },

  // ── Medusa ──────────────────────────────────────────
  medusa: {
    /** Sprite frame size (cada frame del spritesheet) */
    frameSize: 128,
    /** Scale para mostrar en pantalla */
    scale: 1.8,
    /** Ángulo del cono de visión en grados (mitad a cada lado) */
    gazeAngle: 45,
    /** Alcance del cono de visión en px */
    gazeRange: 320,
    /** Tiempo (ms) que tarda en petrificar un enemigo */
    petrifyTime: 800,
  },

  // ── Energía ─────────────────────────────────────────
  energy: {
    /** Energía máxima */
    max: 100,
    /** Drenaje por segundo al usar la mirada */
    drainPerSecond: 18,
    /** Energía recuperada al romper una estatua */
    gainPerBreak: 25,
    /** Regeneración pasiva por segundo (ojos cerrados) */
    regenPerSecond: 3,
  },

  // ── Enemigos ────────────────────────────────────────
  enemies: {
    /** Velocidad base en px/s */
    baseSpeed: 60,
    /** Intervalo base de spawn en ms */
    spawnInterval: 2000,
    /** Intervalo mínimo de spawn (dificultad máxima) */
    minSpawnInterval: 600,
    /** Reducción de intervalo por oleada */
    spawnAcceleration: 0.95,
    /** Radio de colisión con Medusa para game over */
    hitRadius: 40,
    /** Tamaño del sprite del enemigo (hitbox) */
    size: 48,
    /** Puntos por enemigo destruido */
    pointsPerKill: 10,
    /** Incremento de velocidad por oleada */
    speedIncreasePerWave: 1.08,
    /** Distancia a Medusa para empezar a atacar */
    attackRange: 90,
    /** Scale del sprite enemigo */
    scale: 1.4,
  },

  // ── Swipe ───────────────────────────────────────────
  swipe: {
    /** Distancia mínima de swipe en px para romper estatua */
    minDistance: 30,
    /** Radio de detección: si el swipe pasa cerca de una estatua la rompe */
    breakRadius: 80,
  },

  // ── Visual ──────────────────────────────────────────
  visual: {
    /** Color del cono de visión */
    gazeColor: 0x00ff88,
    /** Alpha del cono de visión */
    gazeAlpha: 0.18,
    /** Color de la barra de energía */
    energyBarColor: 0x00ff88,
    /** Color de fondo de la barra de energía */
    energyBarBg: 0x222222,
    /** Color del enemigo petrificado */
    petrifiedTint: 0x888888,
    /** Color del borde de la barra de energía */
    energyBarBorder: 0x44aa66,
  },

  // ── Assets URLs ─────────────────────────────────────
  assets: {
    background:
      "https://remix.gg/blob/89c28be5-ba6a-4a5b-8024-bc07694d0f3b/temple-5dIWhWXZ0z-MStPZqsaUbl4RxANZ6vujBajTfLAZe.webp?ruK1",
    medusaIdle:
      "https://remix.gg/blob/89c28be5-ba6a-4a5b-8024-bc07694d0f3b/medusa-idle-88iVNuWq4X-wSrE1oVJ8rhFjGbwkL8qNtZe3WSIVQ.webp?teIU",
    medusaDeath:
      "https://remix.gg/blob/89c28be5-ba6a-4a5b-8024-bc07694d0f3b/medusa-death-M3EekDJGOo-8M3c1D7yzuA4dOfSJtCKuox4VR20ZV.webp?JGMw",
    medusaAttack:
      "https://remix.gg/blob/89c28be5-ba6a-4a5b-8024-bc07694d0f3b/medusa-gaze-attack-LdNGuYTsek-nfF2ViHdqEAwQjLLb9vyBiueVZ6qpI.webp?djbe",
    spartan:
      "https://remix.gg/blob/89c28be5-ba6a-4a5b-8024-bc07694d0f3b/spartan-1FxvCG9vwK-2tPnHMzsyHHHOADDz0IQoqFgQMEiny.webp?y4t7",
  },

  // ── Sprites config ──────────────────────────────────
  sprites: {
    idle: {
      frameWidth: 128,
      frameHeight: 128,
      columns: 4,
      rows: 4,
      /** Fila por dirección: 0=down, 1=left, 2=right, 3=up */
      directions: { down: 0, left: 1, right: 2, up: 3 },
    },
    death: {
      frameWidth: 128,
      frameHeight: 128,
      columns: 6,
      rows: 4,
      directions: { down: 0, left: 1, right: 2, up: 3 },
    },
    attack: {
      frameWidth: 128,
      frameHeight: 128,
      columns: 7,
      rows: 4,
      directions: { down: 0, left: 1, right: 2, up: 3 },
    },
    /** Spartan spritesheet: 832x1344, 13 cols x 21 rows, frame 64x64 */
    spartan: {
      frameWidth: 64,
      frameHeight: 64,
      columns: 13,
      rows: 21,
      walk: { up: 8, left: 9, down: 10, right: 11 },
      attack: { up: 4, left: 5, down: 6, right: 7 },
    },
  },
};

/**
 * Calcula dimensiones responsive para fullscreen.
 * Width siempre 720, height se expande para pantallas más altas.
 */
export function getResponsiveDimensions(): { width: number; height: number } {
  const BASE_WIDTH = GameSettings.canvas.width;
  const MIN_HEIGHT = GameSettings.canvas.height;
  const BASE_ASPECT = BASE_WIDTH / MIN_HEIGHT;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (vw <= 0 || vh <= 0) {
    return { width: BASE_WIDTH, height: MIN_HEIGHT };
  }

  const viewportAspect = vw / vh;

  if (viewportAspect >= BASE_ASPECT - 0.035) {
    return { width: BASE_WIDTH, height: MIN_HEIGHT };
  }

  const gameHeight = Math.round(BASE_WIDTH / viewportAspect);
  return { width: BASE_WIDTH, height: gameHeight };
}

export default GameSettings;
