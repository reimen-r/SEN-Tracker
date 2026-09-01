import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadPersistedState,
  savePersistedState,
  clearPersistedState,
  PersistedAppState,
} from './storage';

function makeFakeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
}

function makeState(): PersistedAppState {
  return {
    scenarioTitle: 'Telemetría en Vivo IODA (24h)',
    datasets: [
      {
        entityId: 'VE-V',
        entityName: 'Zulia',
        signals: {
          activeProbing: [
            [1704067200, 95],
            [1704067500, 20],
          ],
          darknetTelescope: [
            [1704067200, 96],
            [1704067500, 18],
          ],
          bgpPrefixes: [
            [1704067200, 99],
            [1704067500, 60],
          ],
        },
      },
    ],
    selectedStateId: 'VE-V',
    activeView: 'dashboard',
  };
}

describe('storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeFakeStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('roundtrip guarda y recupera el estado', () => {
    const state = makeState();
    savePersistedState(state);
    const loaded = loadPersistedState();
    expect(loaded).toEqual(state);
  });

  it('devuelve null si no hay nada persistido', () => {
    expect(loadPersistedState()).toBeNull();
  });

  it('devuelve null con JSON corrupto', () => {
    localStorage.setItem('sen-ioda:v1:app', '{rotos:');
    expect(loadPersistedState()).toBeNull();
  });

  it('devuelve null con schema inválido (datasets rotos)', () => {
    localStorage.setItem(
      'sen-ioda:v1:app',
      JSON.stringify({
        scenarioTitle: 'x',
        datasets: [{ entityId: 'VE-V', entityName: 'Zulia', signals: { activeProbing: 'nope' } }],
        selectedStateId: 'VE-V',
        activeView: 'dashboard',
      })
    );
    expect(loadPersistedState()).toBeNull();
  });

  it('devuelve null con activeView inválido', () => {
    localStorage.setItem(
      'sen-ioda:v1:app',
      JSON.stringify({ ...makeState(), activeView: 'nope' })
    );
    expect(loadPersistedState()).toBeNull();
  });

  it('clear elimina la clave', () => {
    savePersistedState(makeState());
    clearPersistedState();
    expect(loadPersistedState()).toBeNull();
  });

  it('save no lanza si localStorage está lleno (QuotaExceededError)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => undefined,
    });
    expect(() => savePersistedState(makeState())).not.toThrow();
  });
});