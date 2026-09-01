import { Router } from 'express';
import { VENEZUELA_ENTITY_IDS } from '../src/data/entityRegistry';
import { TtlCache } from './cache';

const UPSTREAM_BASE = 'https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country';
const FETCH_TIMEOUT_MS = 15_000;
const CACHE_TTL_MS = 5 * 60_000;
const MAX_WINDOW_SECONDS = 7 * 86_400; // 7 días máximo

const ALLOWED_ENTITY_CODES = new Set<string>(['VE', ...VENEZUELA_ENTITY_IDS]);

function buildKey(entityCode: string, from: number, to: number): string {
  return `${entityCode}|${from}|${to}`;
}

export function createIodaProxyRouter(): Router {
  const router = Router();
  const cache = new TtlCache<unknown>(CACHE_TTL_MS);
  const inFlight = new Map<string, Promise<unknown>>();

  router.post('/query', async (req, res) => {
    try {
      const entityCode = String(req.body?.entityCode || 'VE').trim();
      if (!ALLOWED_ENTITY_CODES.has(entityCode)) {
        return res.status(400).json({
          error: `entityCode inválido: "${entityCode}". Use "VE" o un código de entidad federal venezolana (VE-A … VE-X).`,
        });
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const from = Number(req.body?.fromTimestamp ?? nowSec - 86_400);
      const to = Number(req.body?.toTimestamp ?? nowSec);

      if (
        !Number.isFinite(from) ||
        !Number.isFinite(to) ||
        from >= to ||
        to - from > MAX_WINDOW_SECONDS ||
        to > nowSec + 300
      ) {
        return res.status(400).json({
          error: 'Rango de tiempo inválido. Se permite hasta 7 días y no puede superar el presente.',
        });
      }

      const key = buildKey(entityCode, from, to);

      const cached = cache.get(key);
      if (cached !== undefined) {
        res.setHeader('Cache-Control', `max-age=${Math.floor(CACHE_TTL_MS / 1000)}`);
        return res.json(cached);
      }

      let pending = inFlight.get(key);
      if (!pending) {
        pending = (async () => {
          const url = `${UPSTREAM_BASE}/${entityCode}?from=${from}&until=${to}`;
          const upstream = await fetch(url, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            headers: {
              Accept: 'application/json',
              'User-Agent': 'SEN-Venezuela-IODA-Monitor/1.0',
            },
          });
          if (!upstream.ok) {
            const text = await upstream.text().catch(() => '');
            const err = new Error(`IODA API ${upstream.status}: ${upstream.statusText} ${text.slice(0, 200)}`);
            (err as Error & { status?: number }).status = upstream.status;
            throw err;
          }
          const data = await upstream.json();
          cache.set(key, data);
          return data;
        })().finally(() => {
          inFlight.delete(key);
        });
        inFlight.set(key, pending);
      }

      const data = await pending;
      res.setHeader('Cache-Control', `max-age=${Math.floor(CACHE_TTL_MS / 1000)}`);
      return res.json(data);
    } catch (err) {
      const status = (err as Error & { status?: number }).status || 500;
      const message =
        err instanceof Error ? err.message : 'Error al contactar la API de IODA.';
      return res.status(status).json({ error: message });
    }
  });

  return router;
}