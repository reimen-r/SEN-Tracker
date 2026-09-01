import { describe, it, expect } from 'vitest';
import { classifyState } from './stateClassifier';
import { IodaStateDataset } from '../types';

function makeDataset(
  entityId: string,
  entityName: string,
  signalValues: { ap: number[]; darknet: number[]; bgp: number[] },
  startTs = 1725040000
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

describe('classifyState', () => {
  it('clasifica NORMALIDAD con señales estables', () => {
    const stable = Array(20).fill(95);
    const result = classifyState(
      makeDataset('VE-A', 'Distrito Capital', { ap: stable, darknet: stable, bgp: Array(20).fill(99) })
    );
    expect(result.severity).toBe('NORMALIDAD');
    expect(result.dropPercentage).toBeLessThan(25);
  });

  it('detecta APAGON_GENERAL con drop >80%', () => {
    const result = classifyState(
      makeDataset('VE-V', 'Zulia', {
        ap: [...Array(10).fill(96), ...Array(10).fill(8)],
        darknet: [...Array(10).fill(96), ...Array(10).fill(8)],
        bgp: [...Array(10).fill(99), ...Array(10).fill(50)],
      })
    );
    expect(result.severity).toBe('APAGON_GENERAL');
    expect(result.dropPercentage).toBeGreaterThanOrEqual(80);
  });

  it('clasifica CRITICO entre 51% y 80% de drop', () => {
    const result = classifyState(
      makeDataset('VE-N', 'Miranda', {
        ap: [...Array(10).fill(96), ...Array(10).fill(35)],
        darknet: [...Array(10).fill(96), ...Array(10).fill(35)],
        bgp: [...Array(10).fill(99), ...Array(10).fill(80)],
      })
    );
    expect(result.severity).toBe('CRITICO');
  });

  it('clasifica MODERADO entre 25% y 50% de drop', () => {
    const result = classifyState(
      makeDataset('VE-G', 'Carabobo', {
        ap: [...Array(10).fill(96), ...Array(10).fill(55)],
        darknet: [...Array(10).fill(96), ...Array(10).fill(55)],
        bgp: [...Array(10).fill(99), ...Array(10).fill(90)],
      })
    );
    expect(result.severity).toBe('MODERADO');
  });

  it('filtra variaciones de madrugada con drop <40%', () => {
    // Inicio 03:00 VET (1704092400): la anomalía en el índice 10 cae a 05:30 VET.
    const result = classifyState(
      makeDataset(
        'VE-A',
        'Distrito Capital',
        {
          ap: [...Array(10).fill(96), ...Array(10).fill(65)],
          darknet: [...Array(10).fill(96), ...Array(10).fill(65)],
          bgp: Array(20).fill(99),
        },
        1704092400
      )
    );
    expect(result.severity).toBe('NORMALIDAD');
    expect(result.isNighttimeFalsePositiveFiltered).toBe(true);
  });

  it('NO filtra madrugada cuando el drop supera 40%', () => {
    const result = classifyState(
      makeDataset(
        'VE-A',
        'Distrito Capital',
        {
          ap: [...Array(10).fill(96), ...Array(10).fill(50)],
          darknet: [...Array(10).fill(96), ...Array(10).fill(50)],
          bgp: Array(20).fill(99),
        },
        1704092400
      )
    );
    expect(result.severity).toBe('MODERADO');
    expect(result.isNighttimeFalsePositiveFiltered).toBe(false);
  });

  it('filtra anomalía aislada de un solo ISP', () => {
    // AP cae >=20% mientras Darknet y BGP permanecen estables.
    const result = classifyState(
      makeDataset('VE-G', 'Carabobo', {
        ap: [...Array(10).fill(96), ...Array(10).fill(75)],
        darknet: Array(20).fill(96),
        bgp: Array(20).fill(99),
      })
    );
    expect(result.severity).toBe('NORMALIDAD');
    expect(result.isSingleIspIsolatedAnomaly).toBe(true);
  });

  it('clasifica REBOTE_RAPIDO para una restitución inmediata', () => {
    const result = classifyState(
      makeDataset('VE-G', 'Carabobo', {
        ap: [...Array(10).fill(96), ...Array(5).fill(30), ...Array(2).fill(96)],
        darknet: [...Array(10).fill(96), ...Array(5).fill(30), ...Array(2).fill(96)],
        bgp: [...Array(10).fill(99), ...Array(5).fill(60), ...Array(2).fill(99)],
      })
    );
    expect(result.severity).toBe('CRITICO');
    expect(result.recoveryType).toBe('REBOTE_RAPIDO');
  });
});