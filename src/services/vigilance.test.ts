import { describe, it, expect, vi } from 'vitest';
import { OutageReport, OutageSeverity } from '../types';
import {
  detectEscalations,
  fetchNationalTelemetry,
  seedSeverityMap,
  severityRank,
} from './vigilance';

function report(
  states: { id: string; name: string; severity: OutageSeverity; drop: number }[]
): OutageReport {
  return {
    stateClassifications: states.map((s) => ({
      entity: { id: s.id, name: s.name },
      severity: s.severity,
      dropPercentage: s.drop,
    })),
  } as unknown as OutageReport;
}

describe('severityRank', () => {
  it('ordena la severidad de menor a mayor', () => {
    expect(severityRank('NORMALIDAD')).toBe(0);
    expect(severityRank('MODERADO')).toBe(1);
    expect(severityRank('CRITICO')).toBe(2);
    expect(severityRank('APAGON_GENERAL')).toBe(3);
  });
});

describe('seedSeverityMap', () => {
  it('construye el mapa inicial desde el reporte', () => {
    const map = seedSeverityMap(
      report([
        { id: 'VE-A', name: 'Dtto. Capital', severity: 'CRITICO', drop: 60 },
        { id: 'VE-V', name: 'Zulia', severity: 'NORMALIDAD', drop: 3 },
      ])
    );
    expect(map.get('VE-A')).toBe('CRITICO');
    expect(map.get('VE-V')).toBe('NORMALIDAD');
  });
});

describe('detectEscalations', () => {
  it('notifica solo subidas de severidad', () => {
    const prev = seedSeverityMap(
      report([
        { id: 'VE-A', name: 'Dtto. Capital', severity: 'NORMALIDAD', drop: 3 },
        { id: 'VE-V', name: 'Zulia', severity: 'CRITICO', drop: 70 },
      ])
    );
    const next = report([
      { id: 'VE-A', name: 'Dtto. Capital', severity: 'CRITICO', drop: 62 },
      { id: 'VE-V', name: 'Zulia', severity: 'NORMALIDAD', drop: 4 },
    ]);

    const { escalations, nextSeverityMap } = detectEscalations(prev, next);

    expect(escalations).toHaveLength(1);
    expect(escalations[0]).toContain('Dtto. Capital');
    expect(escalations[0]).toContain('CRITICO');
    // Zulia bajó de severidad: no se notifica, pero el mapa se actualiza.
    expect(nextSeverityMap.get('VE-V')).toBe('NORMALIDAD');
  });

  it('no notifica cuando la severidad se mantiene o baja', () => {
    const prev = seedSeverityMap(
      report([
        { id: 'VE-G', name: 'Carabobo', severity: 'MODERADO', drop: 40 },
        { id: 'VE-B', name: 'Anzoátegui', severity: 'CRITICO', drop: 70 },
      ])
    );
    const next = report([
      { id: 'VE-G', name: 'Carabobo', severity: 'MODERADO', drop: 41 },
      { id: 'VE-B', name: 'Anzoátegui', severity: 'NORMALIDAD', drop: 5 },
    ]);

    const { escalations } = detectEscalations(prev, next);
    expect(escalations).toHaveLength(0);
  });

  it('no emite falsa alarma si el estado no estaba en el mapa previo', () => {
    const prev = seedSeverityMap(
      report([{ id: 'VE-A', name: 'Dtto. Capital', severity: 'NORMALIDAD', drop: 2 }])
    );
    const next = report([
      { id: 'VE-A', name: 'Dtto. Capital', severity: 'NORMALIDAD', drop: 2 },
      { id: 'VE-N', name: 'Miranda', severity: 'APAGON_GENERAL', drop: 85 },
    ]);

    const { escalations } = detectEscalations(prev, next);
    expect(escalations).toHaveLength(0);
  });
});

describe('fetchNationalTelemetry', () => {
  it('consulta en lotes del tamaño indicado y omite las que fallan', async () => {
    const ids = ['VE-A', 'VE-B', 'VE-C', 'VE-D', 'VE-E'];
    const fetchEntity = vi.fn(async (id: string) => ({
      entityId: id,
      entityName: id,
      signals: { activeProbing: [], darknetTelescope: [], bgpPrefixes: [] },
    }));
    fetchEntity.mockRejectedValueOnce(new Error('timeout')); // VE-A falla

    const datasets = await fetchNationalTelemetry(
      ids.map((id) => ({ id })),
      fetchEntity,
      2
    );

    expect(fetchEntity).toHaveBeenCalledTimes(5);
    expect(datasets.map((d) => d.entityId)).toEqual(['VE-B', 'VE-C', 'VE-D', 'VE-E']);
  });

  it('devuelve vacío cuando todas fallan', async () => {
    const fetchEntity = vi.fn(async () => {
      throw new Error('down');
    });
    const datasets = await fetchNationalTelemetry(
      [{ id: 'VE-A' }, { id: 'VE-B' }],
      fetchEntity
    );
    expect(datasets).toEqual([]);
  });
});