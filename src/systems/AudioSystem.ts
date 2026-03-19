/**
 * Sistema de audio con Web Audio API. Pixel-art style SFX.
 */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private initialized = false;
  public isMuted = false;

  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new window.AudioContext();
      this.initialized = true;
    } catch (_e) {
      // Web Audio no disponible
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  /** Sonido de petrificación (tono cristalino ascendente) */
  playPetrify(): void {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** Sonido de romper estatua (crunch) */
  playBreak(): void {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Ruido blanco filtrado
    const bufLen = Math.floor(this.ctx.sampleRate * 0.12);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800;
    filter.Q.value = 2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + 0.12);

    // Sub-boom
    const osc = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    g2.gain.setValueAtTime(0.2, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(g2);
    g2.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Sonido de muerte de Medusa */
  playDeath(): void {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.6);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  /** Sonido de energía recargada */
  playEnergyGain(): void {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.1);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Sonido de mirada activa (loop sutil, pulso) */
  playGazeLoop(): void {
    // Implementar si se quiere un tono continuo
  }

  destroy(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
