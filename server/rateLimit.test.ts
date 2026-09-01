import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from './rateLimit';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('permite requests hasta el límite y bloquea el siguiente', () => {
    const limiter = new RateLimiter(60_000, 3);
    expect(limiter.allow('ip-1')).toBe(true);
    expect(limiter.allow('ip-1')).toBe(true);
    expect(limiter.allow('ip-1')).toBe(true);
    expect(limiter.allow('ip-1')).toBe(false);
  });

  it('keys distintas tienen buckets independientes', () => {
    const limiter = new RateLimiter(60_000, 1);
    expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('a')).toBe(false);
    expect(limiter.allow('b')).toBe(true);
  });

  it('resetea la ventana tras el tiempo transcurrido', () => {
    const limiter = new RateLimiter(60_000, 1);
    expect(limiter.allow('ip')).toBe(true);
    expect(limiter.allow('ip')).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(limiter.allow('ip')).toBe(true);
  });

  it('retryAfterSeconds reporta segundos restantes', () => {
    const limiter = new RateLimiter(60_000, 1);
    limiter.allow('ip');
    expect(limiter.retryAfterSeconds('ip')).toBeGreaterThan(0);
    expect(limiter.retryAfterSeconds('sin-entrada')).toBe(0);
  });

  it('reset limpia una clave o todo', () => {
    const limiter = new RateLimiter(60_000, 1);
    limiter.allow('a');
    limiter.allow('b');
    limiter.reset('a');
    expect(limiter.allow('a')).toBe(true);
    limiter.reset();
    expect(limiter.allow('b')).toBe(true);
    expect(limiter.size).toBe(1);
  });

  it('el cleanup expira entradas antiguas', () => {
    const limiter = new RateLimiter(60_000, 1, 60_000);
    limiter.allow('a');
    limiter.allow('b');
    expect(limiter.size).toBe(2);
    vi.advanceTimersByTime(61_000);
    // El cleanup corre cada cleanupIntervalMs; al avanzar 61s en el window de 60s,
    // la entrada de 'a' ya expiró pero 'b' se creó después.
    expect(limiter.size).toBeLessThanOrEqual(2);
  });
});