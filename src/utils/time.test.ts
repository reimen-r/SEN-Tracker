import { describe, it, expect } from 'vitest';
import { formatVET, formatVETClock, getVETHourDecimal } from './time';

describe('formatVET', () => {
  it('converts unix timestamp to VET (UTC-4)', () => {
    // 2024-01-01 00:00 UTC = 2023-12-31 20:00 VET
    const ts = 1704067200;
    expect(formatVET(ts)).toBe('20:00 VET');
  });

  it('handles midnight VET correctly', () => {
    // 2024-01-01 04:00 UTC = 2024-01-01 00:00 VET
    const ts = 1704081600;
    expect(formatVET(ts)).toBe('00:00 VET');
  });

  it('handles noon VET', () => {
    // 2024-01-01 16:00 UTC = 2024-01-01 12:00 VET
    const ts = 1704124800;
    expect(formatVET(ts)).toBe('12:00 VET');
  });

  it('zero-pads single-digit hours', () => {
    // 2024-01-01 08:00 UTC = 04:00 VET
    const ts = 1704096000;
    expect(formatVET(ts)).toBe('04:00 VET');
  });

  it('zero-pads single-digit minutes', () => {
    // 2024-01-01 04:07 UTC = 00:07 VET
    const ts = 1704082020;
    expect(formatVET(ts)).toBe('00:07 VET');
  });
});

describe('formatVETClock', () => {
  it('includes seconds', () => {
    // 2024-01-01 00:00:09 UTC = 2023-12-31 20:00:09 VET
    const ts = 1704067209;
    expect(formatVETClock(ts)).toBe('20:00:09 VET');
  });
});

describe('getVETHourDecimal', () => {
  it('computes decimal hour for morning VET', () => {
    // 2024-01-01 07:30 UTC = 03:30 VET
    const ts = 1704094200;
    expect(getVETHourDecimal(ts)).toBeCloseTo(3.5, 5);
  });

  it('computes decimal hour for afternoon VET', () => {
    // 2024-01-01 18:15 UTC = 14:15 VET
    const ts = 1704132900;
    expect(getVETHourDecimal(ts)).toBeCloseTo(14.25, 5);
  });

  it('handles day wrap at midnight VET', () => {
    // 2024-01-01 04:00 UTC = 00:00 VET
    const ts = 1704081600;
    expect(getVETHourDecimal(ts)).toBeCloseTo(0, 5);
  });

  it('handles late night VET', () => {
    // 2024-01-01 09:45 UTC = 05:45 VET (within madrugada window)
    const ts = 1704102300;
    expect(getVETHourDecimal(ts)).toBeCloseTo(5.75, 5);
  });
});