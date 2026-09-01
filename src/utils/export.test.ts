import { describe, it, expect } from 'vitest';
import { escapeCell, toCsv } from './export';

describe('escapeCell', () => {
  it('deja celdas simples intactas', () => {
    expect(escapeCell('Zulia')).toBe('Zulia');
    expect(escapeCell(80)).toBe('80');
    expect(escapeCell('-80')).toBe('-80');
  });

  it('protege contra inyección de fórmulas (= + @ y - no numérico)', () => {
    expect(escapeCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(escapeCell('+cmd')).toBe("'+cmd");
    expect(escapeCell('@stealth')).toBe("'@stealth");
    expect(escapeCell('-cmd')).toBe("'-cmd");
    // "-80" es un valor de caída legítimo: NO se prefija para no romper datos numéricos.
    expect(escapeCell('-80')).toBe('-80');
    expect(escapeCell('-2.5')).toBe('-2.5');
  });

  it('envuelve entre comillas celdas con comas o saltos', () => {
    expect(escapeCell('a,b')).toBe('"a,b"');
    expect(escapeCell('línea1\nlínea2')).toBe('"línea1\nlínea2"');
  });

  it('escapa comillas dobles internas', () => {
    expect(escapeCell('dijo "hola"')).toBe('"dijo ""hola"""');
  });
});

describe('toCsv', () => {
  it('serializa filas separadas por comas y saltos de línea', () => {
    const rows = [
      ['estado', 'drop'],
      ['Zulia', 88],
      ['Miranda', 35],
    ];
    expect(toCsv(rows)).toBe('estado,drop\nZulia,88\nMiranda,35');
  });

  it('aplica escape a celdas peligrosas', () => {
    const rows = [
      ['estado', 'nota'],
      ['Aragua', '=HIPERLINK("http://evil")'],
    ];
    const out = toCsv(rows);
    expect(out).toContain("'=HIPERLINK");
  });

  it('no genera BOM (se añade en el descargador)', () => {
    const out = toCsv([['a']]);
    expect(out.charCodeAt(0)).not.toBe(0xfeff);
  });
});