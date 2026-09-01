import { describe, it, expect } from 'vitest';
import { INCIDENT_PRESETS } from './venezuelaGrid';
import { generateScenario } from './syntheticTelemetry';
import { analyzeIodaDatasets } from '../services/analyzer';

describe('presets del SEN (contrato de clasificación)', () => {
  it('genera 24 entidades por preset con la línea de tiempo por defecto', () => {
    for (const preset of INCIDENT_PRESETS) {
      expect(preset.dataset).toHaveLength(24);
      const first = preset.dataset[0];
      expect(first.signals.activeProbing).toHaveLength(96);
      expect(first.signals.darknetTelescope).toHaveLength(96);
      expect(first.signals.bgpPrefixes).toHaveLength(96);
      // Timestamps monotónicos espaciados 15 min.
      const ts = first.signals.activeProbing.map(([t]) => t);
      expect(ts[1] - ts[0]).toBe(900);
    }
  });

  it('colapso nacional: >=20 estados en APAGON_GENERAL y Bolívar afectado', () => {
    const preset = INCIDENT_PRESETS.find((p) => p.id === 'preset-national-collapse')!;
    const report = analyzeIodaDatasets(preset.dataset);
    expect(report.executiveSummary.generalBlackoutStatesCount).toBeGreaterThanOrEqual(20);
    expect(report.alertRecommendation).toContain('ALERTA ROJA');
    const bolivar = report.stateClassifications.find((s) => s.entity.id === 'VE-F')!;
    expect(bolivar.severity).not.toBe('NORMALIDAD');
  });

  it('incidente occidental: 6 estados afectados y Zulia colapsado', () => {
    const preset = INCIDENT_PRESETS.find((p) => p.id === 'preset-western-trip')!;
    const report = analyzeIodaDatasets(preset.dataset);
    expect(report.executiveSummary.affectedStatesCount).toBe(6);
    const zulia = report.stateClassifications.find((s) => s.entity.id === 'VE-V')!;
    expect(zulia.severity).toBe('APAGON_GENERAL');
    const capital = report.stateClassifications.find((s) => s.entity.id === 'VE-A')!;
    expect(capital.severity).toBe('NORMALIDAD');
  });

  it('evento sectorial de la capital: caída moderada con restitución', () => {
    const preset = INCIDENT_PRESETS.find((p) => p.id === 'preset-capital-substation')!;
    const report = analyzeIodaDatasets(preset.dataset);
    const miranda = report.stateClassifications.find((s) => s.entity.id === 'VE-N')!;
    expect(miranda.severity).toBe('MODERADO');
    expect(miranda.recoveryType).not.toBe('SIN_RECUPERACION');
    // La restitución devuelve la señal a la base (no queda deprimida).
    const last = miranda.timeSeries[miranda.timeSeries.length - 1];
    expect(last.compositeScore).toBeGreaterThan(90);
  });

  it('ciclo circadiano nocturno: todos los estados en NORMALIDAD', () => {
    const preset = INCIDENT_PRESETS.find((p) => p.id === 'preset-circadian-night')!;
    const report = analyzeIodaDatasets(preset.dataset);
    expect(report.executiveSummary.affectedStatesCount).toBe(0);
    expect(report.stateClassifications.every((s) => s.severity === 'NORMALIDAD')).toBe(true);
  });

  it('ISP aislado: Carabobo en NORMALIDAD sin alerta nacional', () => {
    const preset = INCIDENT_PRESETS.find((p) => p.id === 'preset-isolated-isp')!;
    const report = analyzeIodaDatasets(preset.dataset);
    const carabobo = report.stateClassifications.find((s) => s.entity.id === 'VE-G')!;
    expect(carabobo.severity).toBe('NORMALIDAD');
    expect(report.executiveSummary.affectedStatesCount).toBe(0);
  });
});

describe('generateScenario (interfaz de la fábrica)', () => {
  it('respeta entityIds y timeline personalizados', () => {
    const datasets = generateScenario({
      entityIds: ['VE-V', 'VE-A'],
      timeline: { pointCount: 48 },
      perturbations: [],
    });
    expect(datasets).toHaveLength(2);
    expect(datasets.map((d) => d.entityId).sort()).toEqual(['VE-A', 'VE-V']);
    expect(datasets[0].signals.activeProbing).toHaveLength(48);
  });

  it('drop flat con recuperación FAST vuelve a la base', () => {
    const datasets = generateScenario({
      entityIds: ['VE-G'],
      perturbations: [
        {
          kind: 'drop',
          from: 10,
          to: 20,
          active: 0.4,
          darknet: 0.4,
          bgp: 60,
          recovery: { from: 20, type: 'FAST', darknetFactor: 1.0, bgpTarget: 99 },
        },
      ],
    });
    const ap = datasets[0].signals.activeProbing;
    const before = ap[0][1];
    const during = ap[15][1];
    const after = ap[30][1];
    expect(during).toBeLessThan(before * 0.5);
    expect(after).toBeGreaterThan(before * 0.98); // recuperado a la base
  });

  it('sin recovery el estado queda deprimido hasta el final', () => {
    const datasets = generateScenario({
      entityIds: ['VE-G'],
      perturbations: [{ kind: 'drop', from: 10, active: 0.4, darknet: 0.4, bgp: 60 }],
    });
    const ap = datasets[0].signals.activeProbing;
    expect(ap[30][1]).toBeLessThan(ap[0][1] * 0.5);
    expect(ap[90][1]).toBeLessThan(ap[0][1] * 0.5);
  });
});