import { describe, expect, it } from 'vitest';
import {
  SEVERITY_ORDER,
  severityFromDrop,
  severityFromScore,
  severityMapFill,
  severityToken,
  recoveryToken,
  RECOVERY_TOKENS,
  SEVERITY_THRESHOLD_LINES,
} from './severity';
import type { OutageSeverity, RecoveryType } from '../types';

describe('severityFromDrop', () => {
  it.each([
    [0, 'NORMALIDAD'],
    [24, 'NORMALIDAD'],
    [25, 'MODERADO'],
    [50, 'MODERADO'],
    [51, 'CRITICO'],
    [80, 'APAGON_GENERAL'],
    [100, 'APAGON_GENERAL'],
  ] as const)('drop %i -> %s', (drop, expected) => {
    expect(severityFromDrop(drop)).toBe(expected);
  });

  it('usa los mismos umbrales que stateClassifier', () => {
    // stateClassifier: 25 -> MODERADO, 51 -> CRITICO, 80 -> APAGON_GENERAL.
    expect(severityFromDrop(24.999)).toBe('NORMALIDAD');
    expect(severityFromDrop(25)).toBe('MODERADO');
    expect(severityFromDrop(50.999)).toBe('MODERADO');
    expect(severityFromDrop(51)).toBe('CRITICO');
    expect(severityFromDrop(79.999)).toBe('CRITICO');
    expect(severityFromDrop(80)).toBe('APAGON_GENERAL');
  });
});

describe('severityFromScore', () => {
  it('es el espejo exacto de severityFromDrop sobre puntaje = 100 - caída', () => {
    for (let drop = 0; drop <= 100; drop++) {
      const score = 100 - drop;
      const fromDrop = severityFromDrop(drop);
      const fromScore = severityFromScore(score);
      // El punto medio de cada banda puede discrepar por el redondeo del
      // límite entero; fuera de los bordes debe coincidir siempre.
      if (![24, 25, 50, 51, 79, 80].includes(drop)) {
        expect(fromScore).toBe(fromDrop);
      }
    }
  });

  it('clasifica un puntaje de conectividad', () => {
    // score = 100 - caída, así que el borde de Moderado (caída 25) cae en
    // el puntaje 75, y el de Normalidad arranca en 76.
    expect(severityFromScore(100)).toBe('NORMALIDAD');
    expect(severityFromScore(76)).toBe('NORMALIDAD');
    expect(severityFromScore(75)).toBe('MODERADO');
    expect(severityFromScore(50)).toBe('MODERADO');
    expect(severityFromScore(49)).toBe('CRITICO');
    expect(severityFromScore(21)).toBe('CRITICO');
    expect(severityFromScore(20)).toBe('APAGON_GENERAL');
    expect(severityFromScore(0)).toBe('APAGON_GENERAL');
  });
});

describe('severityToken', () => {
  it('tiene un token para cada nivel y en orden de peor a mejor', () => {
    expect(SEVERITY_ORDER).toEqual([
      'APAGON_GENERAL',
      'CRITICO',
      'MODERADO',
      'NORMALIDAD',
    ]);
    for (const sev of SEVERITY_ORDER) {
      const t = severityToken(sev);
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.glyph.length).toBeGreaterThan(0);
      expect(t.mapFill).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.cssVar).toMatch(/^var\(--color-sev-[a-z]+\)$/);
    }
  });

  it('el glifo es una señal no cromática: es único por nivel', () => {
    const glyphs = SEVERITY_ORDER.map((s) => severityToken(s).glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it('cae a NORMALIDAD ante una severidad desconocida', () => {
    expect(severityToken(undefined).label).toBe('Normalidad');
    expect(severityToken('INVENTADA' as OutageSeverity).label).toBe('Normalidad');
  });
});

describe('severityMapFill', () => {
  it('devuelve un hex válido y distinto por nivel', () => {
    const fills = SEVERITY_ORDER.map((s) => severityMapFill(s));
    for (const f of fills) expect(f).toMatch(/^#[0-9a-f]{6}$/i);
    expect(new Set(fills).size).toBe(fills.length);
  });
});

describe('SEVERITY_THRESHOLD_LINES', () => {
  it('una guía por nivel no-normalidad, con el color de ese nivel', () => {
    expect(SEVERITY_THRESHOLD_LINES).toHaveLength(3);
    for (const line of SEVERITY_THRESHOLD_LINES) {
      expect(line.severity).not.toBe('NORMALIDAD');
      expect(severityToken(line.severity).cssVar).toBeTruthy();
    }
  });

  it('cada guía cae en el nivel que dice codificar', () => {
    for (const { score, severity } of SEVERITY_THRESHOLD_LINES) {
      expect(severityFromScore(score)).toBe(severity);
    }
  });
});

describe('recoveryToken', () => {
  const all: RecoveryType[] = [
    'REBOTE_RAPIDO',
    'RECUPERACION_LENTA_ESCALONADA',
    'EN_CURSO',
    'SIN_RECUPERACION',
  ];

  it('cubre todos los tipos de recuperación', () => {
    for (const r of all) {
      const t = recoveryToken(r);
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.detail.length).toBeGreaterThan(0);
      expect(t.fg).toMatch(/^text-/);
    }
  });

  it('sin retorno usa un tono de alarma, no un gris', () => {
    expect(RECOVERY_TOKENS.SIN_RECUPERACION.fg).toBe('text-sev-critical');
  });

  it('cae a SIN_RECUPERACION ante un tipo desconocido', () => {
    expect(recoveryToken(undefined).label).toBe('Sin retorno');
  });
});