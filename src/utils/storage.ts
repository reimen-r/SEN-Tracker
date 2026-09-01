import { IodaStateDataset } from '../types';

// Clave versionada: al cambiar el formato de datos, bumpar el sufijo.
const STORAGE_KEY = 'sen-ioda:v1:app';

export interface PersistedAppState {
  scenarioTitle: string;
  datasets: IodaStateDataset[];
  selectedStateId: string;
  activeView: 'dashboard' | 'report' | 'map';
}

function isSeries(v: unknown): v is [number, number][] {
  return (
    Array.isArray(v) &&
    v.every(
      (p) =>
        Array.isArray(p) &&
        p.length >= 2 &&
        typeof p[0] === 'number' &&
        typeof p[1] === 'number'
    )
  );
}

function isDataset(d: unknown): d is IodaStateDataset {
  if (!d || typeof d !== 'object') return false;
  const o = d as Record<string, unknown>;
  const signals = o.signals as Record<string, unknown> | undefined;
  return (
    typeof o.entityId === 'string' &&
    typeof o.entityName === 'string' &&
    !!signals &&
    isSeries(signals.activeProbing) &&
    isSeries(signals.darknetTelescope) &&
    isSeries(signals.bgpPrefixes)
  );
}

/**
 * Lee el estado persistido de la sesión. Devuelve null si no hay nada o si el
 * contenido está corrupto (JSON inválido o schema incorrecto) para que la app
 * degrade al estado por defecto sin crashear.
 */
export function loadPersistedState(): PersistedAppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.scenarioTitle !== 'string') return null;
    if (!Array.isArray(o.datasets) || !o.datasets.every(isDataset)) return null;
    if (typeof o.selectedStateId !== 'string') return null;
    const view = o.activeView;
    if (view !== 'dashboard' && view !== 'report' && view !== 'map') return null;
    return {
      scenarioTitle: o.scenarioTitle,
      datasets: o.datasets,
      selectedStateId: o.selectedStateId,
      activeView: view,
    };
  } catch {
    return null;
  }
}

export function savePersistedState(state: PersistedAppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // QuotaExceededError o localStorage no disponible: degradar sin romper.
  }
}

export function clearPersistedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}