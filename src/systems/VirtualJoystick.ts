import GameSettings from "../config/GameSettings";
import type { Direction } from "../objects/Medusa";

/**
 * Joystick virtual flotante para mobile.
 * Aparece solo cuando el jugador toca la zona inferior-izquierda.
 * Devuelve una dirección cardinal (up/down/left/right) o null.
 */
export class VirtualJoystick {
  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;

  private direction: Direction | null = null;
  private angle: number | null = null; // ángulo exacto en radianes
  private active: boolean = false;
  private pointerId: number = -1;
  private baseX: number = 0;
  private baseY: number = 0;
  private radius: number;
  private deadZone: number;

  /** Zona válida para activar el joystick */
  private zoneMaxX: number;
  private zoneMinY: number;

  public readonly isMobile: boolean;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.radius = GameSettings.joystick.radius;
    this.deadZone = GameSettings.joystick.deadZone;
    this.isMobile = !scene.sys.game.device.os.desktop;

    const w = scene.cameras.main.width;
    const h = scene.cameras.main.height;
    this.zoneMaxX = w * 0.45;
    this.zoneMinY = h * 0.55;

    // Base (círculo exterior)
    this.base = scene.add.circle(
      0,
      0,
      this.radius,
      0xffffff,
      GameSettings.joystick.baseAlpha,
    );
    this.base.setStrokeStyle(2, 0xffffff, 0.3);
    this.base.setDepth(200);
    this.base.setVisible(false);

    // Thumb (círculo interior)
    this.thumb = scene.add.circle(
      0,
      0,
      this.radius * 0.4,
      0xffffff,
      GameSettings.joystick.thumbAlpha,
    );
    this.thumb.setDepth(201);
    this.thumb.setVisible(false);
  }

  /** Intenta reclamar un pointer. Devuelve true si está en la zona del joystick. */
  tryClaimPointer(pointer: Phaser.Input.Pointer): boolean {
    if (!this.isMobile) return false;
    if (this.pointerId !== -1) return false; // Ya tiene un pointer
    if (!this.isInZone(pointer.x, pointer.y)) return false;

    this.pointerId = pointer.id;
    this.baseX = pointer.x;
    this.baseY = pointer.y;
    this.base.setPosition(this.baseX, this.baseY);
    this.thumb.setPosition(this.baseX, this.baseY);
    this.base.setVisible(true);
    this.thumb.setVisible(true);
    this.active = true;
    this.direction = null;
    return true;
  }

  /** Actualiza la posición del thumb y calcula la dirección. */
  updatePointer(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;

    const dx = pointer.x - this.baseX;
    const dy = pointer.y - this.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp thumb dentro del radio
    let thumbX = pointer.x;
    let thumbY = pointer.y;
    if (dist > this.radius) {
      thumbX = this.baseX + (dx / dist) * this.radius;
      thumbY = this.baseY + (dy / dist) * this.radius;
    }
    this.thumb.setPosition(thumbX, thumbY);

    // Calcular dirección cardinal + ángulo exacto
    if (dist < this.deadZone) {
      this.direction = null;
      this.angle = null;
    } else {
      this.angle = Math.atan2(dy, dx);
      if (Math.abs(dx) > Math.abs(dy)) {
        this.direction = dx > 0 ? "right" : "left";
      } else {
        this.direction = dy > 0 ? "down" : "up";
      }
    }
  }

  /** Libera el pointer. Devuelve true si era del joystick. */
  releasePointer(pointer: Phaser.Input.Pointer): boolean {
    if (pointer.id !== this.pointerId) return false;

    this.pointerId = -1;
    this.direction = null;
    this.angle = null;
    this.active = false;
    this.base.setVisible(false);
    this.thumb.setVisible(false);
    return true;
  }

  /** ¿Este pointer pertenece al joystick? */
  isOwnPointer(pointerId: number): boolean {
    return this.pointerId === pointerId;
  }

  /** Dirección actual del joystick (null = centro / inactivo) */
  getDirection(): Direction | null {
    return this.direction;
  }

  /** Ángulo exacto del joystick en radianes (null = inactivo) */
  getAngle(): number | null {
    return this.angle;
  }

  /** ¿Está activo el joystick? */
  isActive(): boolean {
    return this.active;
  }

  private isInZone(x: number, y: number): boolean {
    return x < this.zoneMaxX && y > this.zoneMinY;
  }

  destroy(): void {
    this.base.destroy();
    this.thumb.destroy();
  }
}
