/**
 * Limitador de tasa en memoria por clave (IP, usuario, etc.).
 * El timer de limpieza se crea de forma perezosa y con .unref() para no
 * mantener vivo el proceso ni colgar los tests de Vitest.
 */
export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private map = new Map<string, RateLimitEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly windowMs = 60_000,
    private readonly max = 10,
    private readonly cleanupIntervalMs = 120_000
  ) {}

  /**
   * Devuelve true si la clave puede pasar, false si excedió el límite.
   */
  allow(key: string): boolean {
    this.ensureCleanup();
    const now = Date.now();
    const entry = this.map.get(key);
    if (!entry || now > entry.resetAt) {
      this.map.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (entry.count >= this.max) return false;
    entry.count += 1;
    return true;
  }

  /**
   * Devuelve los segundos restantes antes de que la ventana de `key` se resetee.
   */
  retryAfterSeconds(key: string): number {
    const entry = this.map.get(key);
    if (!entry) return 0;
    return Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000));
  }

  reset(key?: string): void {
    if (key === undefined) {
      this.map.clear();
      return;
    }
    this.map.delete(key);
  }

  get size(): number {
    return this.map.size;
  }

  private ensureCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, val] of this.map) {
        if (now > val.resetAt) this.map.delete(key);
      }
    }, this.cleanupIntervalMs);
    this.cleanupTimer.unref();
  }
}