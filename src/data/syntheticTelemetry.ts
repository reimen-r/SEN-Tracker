import { FederalEntity, IodaStateDataset } from '../types';
import { VENEZUELA_ENTITIES } from './entityRegistry';

/**
 * Fábrica de telemetría sintética. Es el único lugar que conoce la línea de
 * tiempo, la curva diurna base y el ruido determinista de las series; los
 * escenarios (presets y generador del modal) se expresan como perfiles
 * declarativos y se resuelven contra esta interfaz única.
 */

export type FederalRegion = FederalEntity['region'];

export const DEFAULT_TIMELINE = {
  startIso: '2026-08-30T04:00:00Z',
  stepSec: 15 * 60, // 15 min
  pointCount: 96, // 24 horas
} as const;

export interface TimelineSpec {
  startIso?: string;
  stepSec?: number;
  pointCount?: number;
}

export type RecoveryCurve = 'NONE' | 'FAST' | 'SLOW' | 'STAGGERED';

export interface RecoveryPhase {
  from: number; // índice inclusivo donde inicia la recuperación
  to?: number; // índice exclusivo donde termina (por defecto: fin del timeline)
  type: RecoveryCurve;
  regionRates?: Partial<Record<FederalRegion, number>>; // solo STAGGERED
  floor?: number; // multiplicador mínimo de la recuperación (por defecto: nivel del drop)
  gain?: number; // ganancia sobre el floor (por defecto: 1 - floor)
  darknetFactor?: number; // darknet = active * factor (por defecto 0.95)
  bgpFloor?: number; // BGP absoluto donde arranca la recuperación (por defecto: BGP de la ventana)
  bgpTarget?: number; // BGP absoluto objetivo (por defecto 99)
}

export interface StateTarget {
  stateId: string;
  active: number; // multiplicador 0..1 sobre la base
  darknet: number; // multiplicador 0..1 sobre la base
  bgp?: number; // valor absoluto 0..100 durante la ventana (por defecto 99)
}

export interface PerturbDrop {
  kind: 'drop';
  stateIds?: string[];
  exclude?: string[];
  region?: FederalRegion;
  from: number; // índice inclusivo de inicio del drop
  to?: number; // índice exclusivo de fin del drop (por defecto: fin del timeline)
  curve?: 'flat' | 'sine'; // sine devuelve la señal a la base en ambos extremos
  active: number; // multiplicador en el punto más profundo
  darknet?: number; // multiplicador (por defecto: active)
  bgp?: number; // BGP absoluto durante la ventana (por defecto 99)
  perState?: StateTarget[]; // sobrescrituras por estado
  recovery?: RecoveryPhase;
}

export interface PerturbCollapse {
  kind: 'collapse';
  from: number;
  to: number;
  severityFloor: number; // severidad base por estado (0.08)
  severityStep: number; // escalón de severidad según seed (0.015)
  bgpFloor: number; // BGP mínimo por estado (45)
  stateOverrides?: StateTarget[];
  recovery: RecoveryPhase;
}

export type Perturbation = PerturbDrop | PerturbCollapse;

export interface ScenarioProfile {
  timeline?: TimelineSpec;
  entityIds?: string[];
  perturbations: Perturbation[];
}

const round1 = (v: number): number => Math.round(v * 10) / 10;

function baseStartSeconds(startIso: string): number {
  return Math.floor(new Date(startIso).getTime() / 1000);
}

/** Curva diurna base + ruido determinista por estado. */
function basePoint(i: number, stepSec: number, stateSeed: number): { active: number; darknet: number; bgp: number } {
  const hourVET = (i * stepSec) / 3600;
  let baseFactor = 0.95 + 0.04 * Math.sin(((hourVET - 8) / 24) * Math.PI * 2);
  const noise = ((Math.sin(i * 1.3 + stateSeed) + 1) / 2) * 0.04;
  baseFactor = Math.min(1.0, Math.max(0.88, baseFactor + noise));
  return {
    active: baseFactor * 100,
    darknet: baseFactor * 100,
    bgp: 99 - (i % 2),
  };
}

function stateMatches(entity: FederalEntity, pert: PerturbDrop): boolean {
  if (pert.stateIds && !pert.stateIds.includes(entity.id)) return false;
  if (pert.exclude?.includes(entity.id)) return false;
  if (pert.region && entity.region !== pert.region) return false;
  return true;
}

function resolveDropTargets(entity: FederalEntity, pert: PerturbDrop): StateTarget {
  const fallback: StateTarget = {
    stateId: entity.id,
    active: pert.active,
    darknet: pert.darknet ?? pert.active,
    bgp: pert.bgp ?? 99,
  };
  return pert.perState?.find((t) => t.stateId === entity.id) ?? fallback;
}

function recoveryEnd(to: number | undefined, pointCount: number): number {
  return to ?? pointCount;
}

/** Fracción 0..1 que determina cuánto ha avanzado la recuperación en el índice i. */
function recoveryFraction(phase: RecoveryPhase, i: number, region: FederalRegion, pointCount: number): number {
  if (phase.type === 'NONE') return 0;
  const end = recoveryEnd(phase.to, pointCount);
  const progress = (i - phase.from) / Math.max(1, end - 1 - phase.from);
  switch (phase.type) {
    case 'FAST':
      return Math.min(1, (i - phase.from + 1) * 0.8); // rebote en ~2 puntos
    case 'SLOW':
      return progress;
    case 'STAGGERED': {
      const rate = phase.regionRates?.[region] ?? 1;
      return Math.min(1, progress * rate);
    }
    default:
      return 0;
  }
}

function applyDrop(entity: FederalEntity, i: number, pointCount: number, base: { active: number; darknet: number; bgp: number }, pert: PerturbDrop): { active: number; darknet: number; bgp: number } | null {
  if (!stateMatches(entity, pert)) return null;
  const target = resolveDropTargets(entity, pert);
  const end = recoveryEnd(pert.to, pointCount);
  const windowBgp = target.bgp ?? 99;

  if (i >= pert.from && i < end) {
    const depth =
      pert.curve === 'sine'
        ? Math.sin((Math.PI * (i - pert.from)) / Math.max(1, end - 1 - pert.from))
        : 1;
    const activeMult = 1 - (1 - target.active) * depth;
    const darknetMult = 1 - (1 - target.darknet) * depth;
    return {
      active: base.active * activeMult,
      darknet: base.darknet * darknetMult,
      bgp: windowBgp,
    };
  }

  if (pert.recovery && i >= pert.recovery.from && i < recoveryEnd(pert.recovery.to, pointCount)) {
    const f = recoveryFraction(pert.recovery, i, entity.region, pointCount);
    const floor = pert.recovery.floor ?? target.active;
    const gain = pert.recovery.gain ?? 1 - floor;
    const mult = floor + gain * f;
    const bgpFloor = pert.recovery.bgpFloor ?? windowBgp;
    const bgpTarget = pert.recovery.bgpTarget ?? 99;
    return {
      active: base.active * mult,
      darknet: base.darknet * mult * (pert.recovery.darknetFactor ?? 0.95),
      bgp: bgpFloor + (bgpTarget - bgpFloor) * f,
    };
  }

  return null;
}

function applyCollapse(entity: FederalEntity, i: number, pointCount: number, base: { active: number; darknet: number; bgp: number }, pert: PerturbCollapse, stateSeed: number): { active: number; darknet: number; bgp: number } | null {
  const override = pert.stateOverrides?.find((t) => t.stateId === entity.id);

  if (i >= pert.from && i < pert.to) {
    if (override) {
      return { active: base.active * override.active, darknet: base.darknet * override.darknet, bgp: override.bgp ?? 99 };
    }
    const severity = pert.severityFloor + (stateSeed % 7) * pert.severityStep;
    return {
      active: base.active * severity,
      darknet: base.darknet * (severity * 0.85),
      bgp: pert.bgpFloor + (stateSeed % 10),
    };
  }

  if (i >= pert.recovery.from && i < recoveryEnd(pert.recovery.to, pointCount)) {
    const f = recoveryFraction(pert.recovery, i, entity.region, pointCount);
    const mult = pert.recovery.floor! + pert.recovery.gain! * f;
    const bgpFloor = pert.recovery.bgpFloor ?? pert.bgpFloor;
    const bgpTarget = pert.recovery.bgpTarget ?? 99;
    return {
      active: base.active * mult,
      darknet: base.darknet * mult * (pert.recovery.darknetFactor ?? 0.95),
      bgp: bgpFloor + (bgpTarget - bgpFloor) * f,
    };
  }

  return null;
}

/**
 * Genera un dataset de telemetría sintética a partir de un perfil declarativo.
 * La línea de tiempo, la curva base y el ruido son compartidos por todos los
 * escenarios; cada perturbación recorta y deforma las señales por ventanas.
 */
export function generateScenario(profile: ScenarioProfile): IodaStateDataset[] {
  const timeline = { ...DEFAULT_TIMELINE, ...profile.timeline };
  const stepSec = timeline.stepSec;
  const pointCount = timeline.pointCount;
  const startTs = baseStartSeconds(timeline.startIso);

  const entities = profile.entityIds
    ? VENEZUELA_ENTITIES.filter((e) => profile.entityIds!.includes(e.id))
    : VENEZUELA_ENTITIES;

  return entities.map((entity) => {
    const stateSeed = entity.name.length * 7;
    const activeProbing: [number, number][] = [];
    const darknetTelescope: [number, number][] = [];
    const bgpPrefixes: [number, number][] = [];

    for (let i = 0; i < pointCount; i++) {
      const ts = startTs + i * stepSec;
      const base = basePoint(i, stepSec, stateSeed);
      let active = base.active;
      let darknet = base.darknet;
      let bgp = base.bgp;

      for (const pert of profile.perturbations) {
        const result =
          pert.kind === 'drop'
            ? applyDrop(entity, i, pointCount, base, pert)
            : applyCollapse(entity, i, pointCount, base, pert, stateSeed);
        if (result) {
          active = result.active;
          darknet = result.darknet;
          bgp = result.bgp;
        }
      }

      activeProbing.push([ts, round1(active)]);
      darknetTelescope.push([ts, round1(darknet)]);
      bgpPrefixes.push([ts, round1(bgp)]);
    }

    return {
      entityId: entity.id,
      entityName: entity.name,
      signals: { activeProbing, darknetTelescope, bgpPrefixes },
    };
  });
}