import { IodaStateDataset } from '../types';

const IODA_PROXY_URL = '/api/ioda/query';

// IODA datasource names (v2 API)
const DS_ACTIVE_PROBING = 'ping-slash24';
const DS_DARKNET = 'merit-nt'; // also 'ucsd-nt' on some deployments
const DS_BGP = 'bgp';

interface IodaSignalEntry {
  entityType?: string;
  entityCode?: string;
  entityName?: string;
  datasource: string;
  subtype?: string;
  from: number;
  until: number;
  step: number;
  values: string; // space-separated numeric string
}

interface IodaApiResponse {
  type: string;
  data?: IodaSignalEntry[][];
}

/**
 * Fetch live IODA telemetry for a given entity (country/state code).
 * Uses the server-side proxy to avoid CORS.
 */
export async function fetchIodaSignals(
  entityCode: string,
  fromTimestamp?: number,
  toTimestamp?: number
): Promise<IodaStateDataset> {
  const now = Math.floor(Date.now() / 1000);
  const from = fromTimestamp ?? now - 86400; // default: last 24h
  const to = toTimestamp ?? now;

  const res = await fetch(IODA_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityCode, fromTimestamp: from, toTimestamp: to }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `IODA API error ${res.status}`);
  }

  const raw: IodaApiResponse = await res.json();
  return parseIodaResponse(entityCode, raw);
}

/**
 * Parse raw IODA v2 API response into our IodaStateDataset format.
 * The v2 API returns: { data: [[ { datasource, values: "1 2 3", from, step, ... } ]] }.
 * Values are raw counts; we normalize each signal to a 0-100 index.
 */
export function parseIodaResponse(entityCode: string, raw: IodaApiResponse): IodaStateDataset {
  const entries = (raw.data?.[0] ?? []).filter((e) => e && typeof e.values === 'string');

  const toSeries = (datasource: string): [number, number][] => {
    const entry = entries.find((e) => e.datasource === datasource);
    if (!entry) return [];
    return seriesFromEntry(entry);
  };

  const activeProbing = toSeries(DS_ACTIVE_PROBING);
  const darknetRaw = toSeries(DS_DARKNET);
  const bgpRaw = toSeries(DS_BGP);

  // Prefer the richer darknet source when both are present
  const darknetTelescope = darknetRaw.length > 0 ? darknetRaw : toSeries('ucsd-nt');

  // Synchronize all series to the active probing timeline (fall back to bgp)
  const reference = activeProbing.length > 0 ? activeProbing : bgpRaw;
  const maxPoints = reference.length;

  const slice = (series: [number, number][]): [number, number][] => {
    if (series.length === 0) return reference.map(([ts]) => [ts, 100] as [number, number]);
    if (series.length === maxPoints) return series;
    // Align shorter series by timestamp match
    return reference.map(([ts]) => {
      const hit = series.find(([t]) => t === ts);
      return hit ? hit : [ts, 100];
    });
  };

  const ap = normalize(slice(activeProbing));
  const dt = normalize(slice(darknetTelescope));
  const bgp = normalize(slice(bgpRaw));

  return {
    entityId: entityCode,
    entityName: entityCode,
    signals: {
      activeProbing: ap,
      darknetTelescope: dt,
      bgpPrefixes: bgp,
    },
  };
}

/**
 * Convert an IODA entry (space-separated values string + from/step) into [ts, val] pairs.
 */
function seriesFromEntry(entry: IodaSignalEntry): [number, number][] {
  const tokens = entry.values.trim().split(/\s+/).map(Number);
  return tokens
    .filter((v) => Number.isFinite(v))
    .map((v, i) => [entry.from + i * entry.step, v] as [number, number]);
}

/**
 * Normalize a series to a 0-100 index relative to its 95th percentile baseline.
 * Raw IODA counts (probed /24s, visible prefixes) scale with the country's ASN
 * population, so we map the top of the range to 100.
 */
function normalize(series: [number, number][]): [number, number][] {
  if (series.length === 0) return [];
  const values = series.map(([, v]) => v).sort((a, b) => a - b);
  const baseline = values[Math.floor(values.length * 0.95)] || 1;

  return series.map(([ts, v]) => {
    const idx = Math.min(100, Math.round((v / baseline) * 1000) / 10);
    return [ts, idx];
  });
}