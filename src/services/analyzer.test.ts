import { describe, it, expect } from 'vitest';
import { analyzeIodaDatasets, formatVET } from './analyzer';
import { IodaStateDataset } from '../types';

// Helper to create a simple dataset
function makeDataset(
  entityId: string,
  entityName: string,
  signalValues: { ap: number[]; darknet: number[]; bgp: number[] },
  startTs = 1725000000
): IodaStateDataset {
  const step = 900; // 15 min
  return {
    entityId,
    entityName,
    signals: {
      activeProbing: signalValues.ap.map((v, i) => [startTs + i * step, v]),
      darknetTelescope: signalValues.darknet.map((v, i) => [startTs + i * step, v]),
      bgpPrefixes: signalValues.bgp.map((v, i) => [startTs + i * step, v]),
    },
  };
}

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
});

describe('analyzeIodaDatasets', () => {
  it('returns NORMALIDAD for stable signals', () => {
    const stable = Array(20).fill(95);
    const dataset = makeDataset('VE-A', 'Distrito Capital', {
      ap: stable,
      darknet: stable,
      bgp: Array(20).fill(99),
    });

    const report = analyzeIodaDatasets([dataset]);
    expect(report.stateClassifications).toHaveLength(1);
    expect(report.stateClassifications[0].severity).toBe('NORMALIDAD');
    expect(report.executiveSummary.affectedStatesCount).toBe(0);
  });

  it('detects APAGON_GENERAL for >80% drop', () => {
    const normal = Array(10).fill(96);
    const collapsed = Array(10).fill(8); // ~92% drop
    const dataset = makeDataset('VE-V', 'Zulia', {
      ap: [...normal, ...collapsed],
      darknet: [...normal, ...collapsed],
      bgp: [...Array(10).fill(99), ...Array(10).fill(50)],
    });

    const report = analyzeIodaDatasets([dataset]);
    expect(report.stateClassifications[0].severity).toBe('APAGON_GENERAL');
    expect(report.executiveSummary.generalBlackoutStatesCount).toBe(1);
  });

  it('detects CRITICO for 51-80% drop', () => {
    const normal = Array(10).fill(96);
    const critical = Array(10).fill(35); // ~63% drop
    const dataset = makeDataset('VE-N', 'Miranda', {
      ap: [...normal, ...critical],
      darknet: [...normal, ...critical],
      bgp: [...Array(10).fill(99), ...Array(10).fill(80)],
    });

    const report = analyzeIodaDatasets([dataset]);
    expect(report.stateClassifications[0].severity).toBe('CRITICO');
    expect(report.executiveSummary.criticalStatesCount).toBe(1);
  });

  it('detects MODERADO for 25-50% drop', () => {
    const normal = Array(10).fill(96);
    const moderate = Array(10).fill(55); // ~42% drop
    // Use daytime start (13:40 VET) to avoid nighttime filter
    const dataset = makeDataset('VE-G', 'Carabobo', {
      ap: [...normal, ...moderate],
      darknet: [...normal, ...moderate],
      bgp: [...Array(10).fill(99), ...Array(10).fill(90)],
    }, 1725040000);

    const report = analyzeIodaDatasets([dataset]);
    expect(report.stateClassifications[0].severity).toBe('MODERADO');
    expect(report.executiveSummary.affectedStatesCount).toBe(1);
  });

  it('filters nighttime false positives (01:00-06:00 VET, drop <40%)', () => {
    // Start at 03:00 VET so anomaly at index 10 falls at 05:30 VET (within 01:00-06:00 window)
    // 2024-01-01 07:00 UTC = 03:00 VET
    const startTs = 1704092400;
    const normal = Array(10).fill(96);
    const nightDip = Array(10).fill(65); // ~32% drop, under 40% threshold
    const dataset = makeDataset('VE-A', 'Distrito Capital', {
      ap: [...normal, ...nightDip],
      darknet: [...normal, ...nightDip],
      bgp: Array(20).fill(99),
    }, startTs);

    const report = analyzeIodaDatasets([dataset]);
    expect(report.stateClassifications[0].severity).toBe('NORMALIDAD');
    expect(report.stateClassifications[0].isNighttimeFalsePositiveFiltered).toBe(true);
  });

  it('does NOT filter nighttime when drop >40%', () => {
    // Start at 03:00 VET so anomaly at index 10 falls at 05:30 VET (within 01:00-06:00 window)
    const startTs = 1704092400; // 03:00 VET
    const normal = Array(10).fill(96);
    const nightDrop = Array(10).fill(50); // ~48% drop, above 40% threshold
    const dataset = makeDataset('VE-A', 'Distrito Capital', {
      ap: [...normal, ...nightDrop],
      darknet: [...normal, ...nightDrop],
      bgp: Array(20).fill(99),
    }, startTs);

    const report = analyzeIodaDatasets([dataset]);
    expect(report.stateClassifications[0].severity).toBe('MODERADO');
    expect(report.stateClassifications[0].isNighttimeFalsePositiveFiltered).toBe(false);
  });

  it('filters single ISP isolated anomaly', () => {
    const normal = Array(20).fill(96);
    const ispDrop = [...Array(10).fill(96), ...Array(10).fill(78)]; // AP drops ~19%, darknet/bgp stay normal
    const dataset = makeDataset('VE-G', 'Carabobo', {
      ap: ispDrop,
      darknet: normal, // no darknet drop
      bgp: Array(20).fill(99), // no bgp drop
    });

    const report = analyzeIodaDatasets([dataset]);
    expect(report.stateClassifications[0].severity).toBe('NORMALIDAD');
    expect(report.stateClassifications[0].isSingleIspIsolatedAnomaly).toBe(true);
  });

  it('handles multiple states and sorts by severity', () => {
    const normal = Array(20).fill(96);
    const collapsed = Array(10).fill(96).concat(Array(10).fill(5)); // >90% drop
    const moderate = Array(10).fill(96).concat(Array(10).fill(55)); // ~42% drop

    const datasets = [
      makeDataset('VE-G', 'Carabobo', { ap: moderate, darknet: moderate, bgp: Array(20).fill(99) }),
      makeDataset('VE-V', 'Zulia', { ap: collapsed, darknet: collapsed, bgp: Array(10).fill(99).concat(Array(10).fill(50)) }),
      makeDataset('VE-A', 'Distrito Capital', { ap: normal, darknet: normal, bgp: Array(20).fill(99) }),
    ];

    const report = analyzeIodaDatasets(datasets);
    expect(report.stateClassifications).toHaveLength(3);
    // Should be sorted by drop percentage descending
    expect(report.stateClassifications[0].entity.id).toBe('VE-V');
    expect(report.stateClassifications[1].entity.id).toBe('VE-G');
    expect(report.stateClassifications[2].entity.id).toBe('VE-A');
  });

  it('generates markdown report', () => {
    const stable = Array(20).fill(95);
    const dataset = makeDataset('VE-A', 'Distrito Capital', {
      ap: stable,
      darknet: stable,
      bgp: Array(20).fill(99),
    });

    const report = analyzeIodaDatasets([dataset]);
    expect(report.markdownText).toContain('REPORTE TÉCNICO');
    expect(report.markdownText).toContain('Resumen Ejecutivo');
    expect(report.markdownText).toContain('Clasificación por Estado');
  });

  it('computes recovery analysis', () => {
    const normal = Array(10).fill(96);
    const dropped = Array(5).fill(20);
    const recovered = Array(5).fill(90); // recovery
    const dataset = makeDataset('VE-V', 'Zulia', {
      ap: [...normal, ...dropped, ...recovered],
      darknet: [...normal, ...dropped, ...recovered],
      bgp: [...Array(10).fill(99), ...Array(5).fill(60), ...Array(5).fill(95)],
    });

    const report = analyzeIodaDatasets([dataset]);
    expect(report.recoveryAnalysis.recoveryType).not.toBe('SIN_RECUPERACION');
    expect(report.recoveryAnalysis.restoredStatesCount).toBeGreaterThanOrEqual(1);
  });

  it('sets alert recommendation based on severity', () => {
    const stable = Array(20).fill(95);
    const dataset = makeDataset('VE-A', 'Distrito Capital', {
      ap: stable,
      darknet: stable,
      bgp: Array(20).fill(99),
    });

    const report = analyzeIodaDatasets([dataset]);
    expect(report.alertRecommendation).toContain('ESTADO VERDE');
  });

  it('produces consistent numeric classification (regression guard)', () => {
    const normal = Array(10).fill(96);
    const collapsed = Array(10).fill(8); // ~92% drop
    const dataset = makeDataset('VE-V', 'Zulia', {
      ap: [...normal, ...collapsed],
      darknet: [...normal, ...collapsed],
      bgp: [...Array(10).fill(99), ...Array(10).fill(50)],
    });

    const report = analyzeIodaDatasets([dataset]);
    const st = report.stateClassifications[0];

    expect(st.severity).toBe('APAGON_GENERAL');
    expect(st.dropPercentage).toBeGreaterThanOrEqual(80);
    expect(st.minimumScore).toBeLessThan(20);
    expect(st.anomalyStartTimestamp).toBeDefined();
    // executiveSummary debe coincidir con la clasificación por estado
    expect(report.executiveSummary.generalBlackoutStatesCount).toBe(1);
    expect(report.executiveSummary.affectedStatesCount).toBe(1);
    // El timestamp analizado debe ser el mismo en el report y el markdown
    expect(report.markdownText).toContain('Apagón General / Colapso');
  });
});
