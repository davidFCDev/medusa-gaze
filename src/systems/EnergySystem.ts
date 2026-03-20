import GameSettings from "../config/GameSettings";

/**
 * Sistema de energía de Medusa (solo lógica, sin UI).
 * Se drena al usar la mirada, se rellena al romper estatuas.
 */
export class EnergySystem {
  private energy: number;
  private maxEnergy: number;

  constructor() {
    this.maxEnergy = GameSettings.energy.max;
    this.energy = this.maxEnergy;
  }

  /** Drena energía (al usar la mirada) */
  drain(delta: number): void {
    const dt = delta / 1000;
    this.energy -= GameSettings.energy.drainPerSecond * dt;
    if (this.energy < 0) this.energy = 0;
  }

  /** Regenera energía pasivamente (ojos cerrados) */
  regen(delta: number): void {
    const dt = delta / 1000;
    this.energy += GameSettings.energy.regenPerSecond * dt;
    if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
  }

  /** Añade energía al romper una estatua */
  addEnergy(amount: number): void {
    this.energy += amount;
    if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
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

  /** Set energy to a specific percentage (0-1) */
  setPercent(pct: number): void {
    this.energy = this.maxEnergy * Math.max(0, Math.min(1, pct));
  }

  reset(): void {
    this.energy = this.maxEnergy;
  }

  destroy(): void {
    // Nada que destruir — sin UI
  }
}
