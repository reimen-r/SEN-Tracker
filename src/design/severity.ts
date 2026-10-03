import type { OutageSeverity, RecoveryType } from '../types';

/**
 * Fuente única de verdad para la presentación de severidad y recuperación.
 *
 * Antes estas relaciones vivían en cuatro sitios (SeverityBadge.BADGE_CONFIG,
 * SeverityBadge.getSeverityFillColor, la cadena ternaria de ReportView y el
 * KPI strip de App) y las de recuperación en otras tres, que no coincidían
 * entre sí. Todo componente debe leer de aquí.
 *
 * Las clases están escritas como literales completos a propósito: Tailwind
 * escanea el código fuente, no el runtime, y una clase construida por
 * concatenación no se compila nunca.
 */

export interface SeverityToken {
  /** Etiqueta corta para chips y tablas. */
  readonly label: string;
  /** Texto largo con el umbral numérico, para tooltips y badges grandes. */
  readonly labelWithThreshold: string;
  readonly fg: string;
  readonly surface: string;
  readonly border: string;
  /** Relleno sólido para el mapa SVG. */
  readonly mapFill: string;
  /** Nombre de la custom property del color de texto, para atributos SVG. */
  readonly cssVar: string;
  /** Frase corta que acompaña al valor, para no depender sólo del color. */
  readonly glyph: string;
}

export const SEVERITY_TOKENS: Record<OutageSeverity, SeverityToken> = {
  APAGON_GENERAL: {
    label: 'Apagón general',
    labelWithThreshold: 'Apagón general (>80%)',
    fg: 'text-sev-blackout',
    surface: 'bg-sev-blackout-surface',
    border: 'border-sev-blackout',
    mapFill: '#dc2626',
    cssVar: 'var(--color-sev-blackout)',
    glyph: '!!',
  },
  CRITICO: {
    label: 'Crítico',
    labelWithThreshold: 'Crítico (51–80%)',
    fg: 'text-sev-critical',
    surface: 'bg-sev-critical-surface',
    border: 'border-sev-critical',
    mapFill: '#ea580c',
    cssVar: 'var(--color-sev-critical)',
    glyph: '!',
  },
  MODERADO: {
    label: 'Moderado',
    labelWithThreshold: 'Moderado (25–50%)',
    fg: 'text-sev-moderate',
    surface: 'bg-sev-moderate-surface',
    border: 'border-sev-moderate',
    mapFill: '#d97706',
    cssVar: 'var(--color-sev-moderate)',
    glyph: '~',
  },
  NORMALIDAD: {
    label: 'Normalidad',
    labelWithThreshold: 'Normalidad (0–24%)',
    fg: 'text-sev-normal',
    surface: 'bg-sev-normal-surface',
    border: 'border-sev-normal',
    mapFill: '#059669',
    cssVar: 'var(--color-sev-normal)',
    glyph: '=',
  },
};

/** Orden de peor a mejor. Usado para ordenar resultados por gravedad. */
export const SEVERITY_ORDER: readonly OutageSeverity[] = [
  'APAGON_GENERAL',
  'CRITICO',
  'MODERADO',
  'NORMALIDAD',
];

/** Rango numérico por severidad, para derivar color desde un porcentaje. */
const SEVERITY_THRESHOLDS: ReadonlyArray<readonly [number, OutageSeverity]> = [
  [80, 'APAGON_GENERAL'],
  [51, 'CRITICO'],
  [25, 'MODERADO'],
];

/**
 * Deriva la severidad desde el porcentaje de caída usando los mismos
 * umbrales que `stateClassifier` (>80, >51, >25). Antes esto era un ternario
 * repetido en ReportView que podía divergir del clasificador.
 */
export function severityFromDrop(dropPercentage: number): OutageSeverity {
  for (const [threshold, severity] of SEVERITY_THRESHOLDS) {
    if (dropPercentage >= threshold) return severity;
  }
  return 'NORMALIDAD';
}

export function severityToken(severity?: OutageSeverity): SeverityToken {
  return SEVERITY_TOKENS[severity ?? 'NORMALIDAD'] ?? SEVERITY_TOKENS.NORMALIDAD;
}

/** Relleno del mapa SVG para una severidad. */
export function severityMapFill(severity?: OutageSeverity): string {
  return severityToken(severity).mapFill;
}

/* --- Nivel de alerta nacional ---------------------------------------------
   El nivel nacional se decidía en tres archivos con tres umbrales distintos
   (>=5 / >=3 / >=2) y una etiqueta que contradecía su propio color: el header
   imprimía "MODERADO" en el tono de crítico. A 2 estados afectados, el header
   decía MODERADO en naranja mientras el panel de debajo decía normal en
   verde. Vive aquí para que no pueda volver a divergir. */

export type NationalAlertLevel = 'CRITICO' | 'MODERADO' | 'NORMALIDAD';

export interface NationalAlertToken {
  readonly label: string;
  readonly fg: string;
  readonly surface: string;
  readonly border: string;
  readonly glyph: string;
}

export const NATIONAL_ALERT_TOKENS: Record<NationalAlertLevel, NationalAlertToken> = {
  CRITICO: {
    label: 'Crítico',
    fg: 'text-sev-blackout',
    surface: 'bg-sev-blackout-surface',
    border: 'border-sev-blackout',
    glyph: '!!',
  },
  MODERADO: {
    label: 'Moderado',
    fg: 'text-sev-moderate',
    surface: 'bg-sev-moderate-surface',
    border: 'border-sev-moderate',
    glyph: '!',
  },
  NORMALIDAD: {
    label: 'Normalidad',
    fg: 'text-sev-normal',
    surface: 'bg-sev-normal-surface',
    border: 'border-sev-normal',
    glyph: '=',
  },
};

/** Umbrales del nivel nacional: 5+ apagones generales, o 3+ afectados. */
export function nationalAlertLevel(
  affectedStates: number,
  generalBlackoutStates: number,
): NationalAlertLevel {
  if (generalBlackoutStates >= 5) return 'CRITICO';
  if (affectedStates >= 3) return 'MODERADO';
  return 'NORMALIDAD';
}

export function nationalAlertToken(
  affectedStates: number,
  generalBlackoutStates: number,
): NationalAlertToken {
  return NATIONAL_ALERT_TOKENS[nationalAlertLevel(affectedStates, generalBlackoutStates)];
}

export interface RecoveryToken {
  readonly label: string;
  readonly fg: string;
  /** Descripción larga, usada en el gráfico de telemetría. */
  readonly detail: string;
}

export const RECOVERY_TOKENS: Record<RecoveryType, RecoveryToken> = {
  REBOTE_RAPIDO: {
    label: 'Rebote rápido',
    fg: 'text-sev-normal',
    detail: 'Despeje de falla local o recierre de protecciones.',
  },
  RECUPERACION_LENTA_ESCALONADA: {
    label: 'Lenta escalonada',
    fg: 'text-sev-moderate',
    detail: 'Energización progresiva de líneas 765 kV / 400 kV.',
  },
  EN_CURSO: {
    label: 'En curso',
    fg: 'text-info',
    detail: 'Restitución en curso: telemetría activa en ascenso en los últimos registros.',
  },
  SIN_RECUPERACION: {
    label: 'Sin retorno',
    fg: 'text-sev-critical',
    detail: 'Entidad con interrupción eléctrica prolongada.',
  },
};

export function recoveryToken(recoveryType?: RecoveryType): RecoveryToken {
  return RECOVERY_TOKENS[recoveryType ?? 'SIN_RECUPERACION'] ?? RECOVERY_TOKENS.SIN_RECUPERACION;
}

/* --- Umbrales, para copy que los mencione ------------------------------- */

export const SEVERITY_THRESHOLD_COPY: ReadonlyArray<{
  severity: OutageSeverity;
  text: string;
}> = [
  { severity: 'NORMALIDAD', text: 'Variación semanal 90–100% de señal.' },
  { severity: 'MODERADO', text: 'Drop de 25% a 50% (corte sectorial).' },
  { severity: 'CRITICO', text: 'Drop de 51% a 80% (apagón estatal).' },
  { severity: 'APAGON_GENERAL', text: 'Drop >80% (colapso de subestación o red troncal).' },
];

/* --- Puente entre espacio de caída y espacio de puntaje ------------------
   El clasificador razona sobre caída porcentual; el eje Y del gráfico razona
   sobre puntaje de conectividad (100 − caída). Sin esta conversión cada
   gráfico tenía que recalcular los límites a mano, y ya lo había hecho mal
   una vez: la línea de 50 estaba etiquetada "Moderado" cuando ese es el
   umbral de Crítico.

   La conversión es score = 100 − caída, así que los tres límites son
   100−80=20, 100−51=49 y 100−25=75. invertirlos es fácil y silencioso:
   por eso `severity.test.ts` comprueba que ambas funciones sean espejo
   punto por punto. */
const SCORE_THRESHOLDS: ReadonlyArray<readonly [number, OutageSeverity]> = [
  [20, 'APAGON_GENERAL'],
  [49, 'CRITICO'],
  [75, 'MODERADO'],
];

/** Igual que `severityFromDrop`, pero sobre puntaje de conectividad. */
export function severityFromScore(score: number): OutageSeverity {
  for (const [threshold, severity] of SCORE_THRESHOLDS) {
    if (score <= threshold) return severity;
  }
  return 'NORMALIDAD';
}

/**
 * Guías de umbral para el gráfico, en espacio de puntaje. Cada línea marca
 * dónde el nivel de severidad cambia, y lleva el color de ese nivel.
 */
export const SEVERITY_THRESHOLD_LINES: ReadonlyArray<{
  score: number;
  severity: OutageSeverity;
}> = [
  { score: 20, severity: 'APAGON_GENERAL' },
  { score: 49, severity: 'CRITICO' },
  { score: 75, severity: 'MODERADO' },
];

/**
 * Color de un token como valor CSS, para los atributos `stroke` / `fill` de
 * SVG donde no se puede usar una clase de Tailwind.
 */
export function tokenColor(severity: OutageSeverity): string {
  return severityToken(severity).cssVar;
}