// Zona horaria de Venezuela (UTC-4, sin DST desde 2007). Todos los formatos
// VET de la app convergen aquí para no duplicar la aritmética UTC-4.

const VET_TIMEZONE = 'America/Caracas';

const VET_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: VET_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const VET_FORMATTER_SECONDS = new Intl.DateTimeFormat('en-GB', {
  timeZone: VET_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function partValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes
): string {
  return parts.find((p) => p.type === type)?.value ?? '00';
}

/**
 * Formatea un timestamp unix (segundos) como "HH:mm VET".
 * Ej.: 2024-01-01 00:00 UTC -> "20:00 VET".
 */
export function formatVET(timestampSeconds: number): string {
  const parts = VET_FORMATTER.formatToParts(new Date(timestampSeconds * 1000));
  return `${partValue(parts, 'hour')}:${partValue(parts, 'minute')} VET`;
}

/**
 * Formatea un timestamp unix (segundos) como "HH:mm:ss VET" (para el reloj).
 */
export function formatVETClock(timestampSeconds: number): string {
  const parts = VET_FORMATTER_SECONDS.formatToParts(
    new Date(timestampSeconds * 1000)
  );
  return `${partValue(parts, 'hour')}:${partValue(parts, 'minute')}:${partValue(
    parts,
    'second'
  )} VET`;
}

/**
 * Hora local VET como decimal (p. ej. 03:30 VET -> 3.5). Se usa para el
 * filtro de variaciones de madrugada (01:00-06:00 VET).
 */
export function getVETHourDecimal(timestampSeconds: number): number {
  const parts = VET_FORMATTER.formatToParts(new Date(timestampSeconds * 1000));
  const hh = Number(partValue(parts, 'hour'));
  const mm = Number(partValue(parts, 'minute'));
  return hh + mm / 60;
}