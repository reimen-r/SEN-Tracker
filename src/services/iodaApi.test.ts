import { describe, it, expect } from 'vitest';
import { parseIodaResponse } from './iodaApi';

const SAMPLE_RESPONSE = {
  type: 'signals',
  data: [
    [
      {
        entityType: 'country',
        entityCode: 'VE',
        entityName: 'Venezuela',
        datasource: 'gtr',
        subtype: 'WEB_SEARCH',
        from: 1788040800,
        until: 1788129000,
        step: 1800,
        values: '1044346770 1123583854 1141677187 1208160520',
      },
      {
        entityType: 'country',
        entityCode: 'VE',
        entityName: 'Venezuela',
        datasource: 'merit-nt',
        subtype: '',
        from: 1788040800,
        until: 1788128400,
        step: 300,
        values: '446.6 479.4 463.2 470.2 450 442.4',
      },
      {
        entityType: 'country',
        entityCode: 'VE',
        entityName: 'Venezuela',
        datasource: 'bgp',
        subtype: '',
        from: 1788040800,
        until: 1788128400,
        step: 300,
        values: '25662 25662 25662 25662 25662',
      },
      {
        entityType: 'country',
        entityCode: 'VE',
        entityName: 'Venezuela',
        datasource: 'ping-slash24',
        subtype: '',
        from: 1788040800,
        until: 1788128400,
        step: 600,
        values: '7832 7854 7843 7881 7861 7842',
      },
    ],
  ],
  copyright: 'test',
};

describe('parseIodaResponse', () => {
  it('extracts the three signal series and normalizes to 0-100', () => {
    const dataset = parseIodaResponse('VE', SAMPLE_RESPONSE as any);

    expect(dataset.entityId).toBe('VE');
    expect(dataset.signals.activeProbing.length).toBeGreaterThan(0);
    expect(dataset.signals.darknetTelescope.length).toBeGreaterThan(0);
    expect(dataset.signals.bgpPrefixes.length).toBeGreaterThan(0);

    // Values normalized to 0-100 range
    const allAp = dataset.signals.activeProbing.map(([, v]) => v);
    const allDt = dataset.signals.darknetTelescope.map(([, v]) => v);
    const allBgp = dataset.signals.bgpPrefixes.map(([, v]) => v);
    expect(Math.max(...allAp)).toBeLessThanOrEqual(100);
    expect(Math.max(...allDt)).toBeLessThanOrEqual(100);
    expect(Math.max(...allBgp)).toBeLessThanOrEqual(100);
  });

  it('timestamps are monotonically increasing', () => {
    const dataset = parseIodaResponse('VE', SAMPLE_RESPONSE as any);
    const ts = dataset.signals.activeProbing.map(([t]) => t);
    for (let i = 1; i < ts.length; i++) {
      expect(ts[i]).toBeGreaterThan(ts[i - 1]);
    }
  });

  it('handles missing data gracefully', () => {
    const dataset = parseIodaResponse('VE', { type: 'signals', data: [[]] });
    expect(dataset.signals.activeProbing).toEqual([]);
    expect(dataset.signals.darknetTelescope).toEqual([]);
    expect(dataset.signals.bgpPrefixes).toEqual([]);
  });

  it('handles null data', () => {
    const dataset = parseIodaResponse('VE', { type: 'signals', data: null } as any);
    expect(dataset.signals.activeProbing).toEqual([]);
  });
});