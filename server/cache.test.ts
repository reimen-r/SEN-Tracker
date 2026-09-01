import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TtlCache } from './cache';

describe('TtlCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('guarda y recupera valores', () => {
    const cache = new TtlCache<string>(1_000);
    cache.set('k', 'v');
    expect(cache.get('k')).toBe('v');
    expect(cache.has('k')).toBe(true);
  });

  it('expira entradas tras el TTL', () => {
    const cache = new TtlCache<string>(1_000);
    cache.set('k', 'v');
    vi.advanceTimersByTime(1_001);
    expect(cache.get('k')).toBeUndefined();
    expect(cache.has('k')).toBe(false);
  });

  it('no expira antes del TTL', () => {
    const cache = new TtlCache<string>(5_000);
    cache.set('k', 'v');
    vi.advanceTimersByTime(4_000);
    expect(cache.get('k')).toBe('v');
  });

  it('delete y clear funcionan', () => {
    const cache = new TtlCache<string>(5_000);
    cache.set('a', '1');
    cache.set('b', '2');
    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(1);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('b')).toBeUndefined();
  });

  it('valores falsy se recuperan correctamente', () => {
    const cache = new TtlCache<number>(5_000);
    cache.set('cero', 0);
    expect(cache.get('cero')).toBe(0);
    expect(cache.has('cero')).toBe(true);
  });
});